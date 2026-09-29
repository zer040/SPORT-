"""
Booking Worker Tasks — Orqa fonda bajariluvchi davriy vazifalar.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import async_session_factory
from app.models.booking import Booking
from app.models.public_match import PublicMatch
from app.models.slot import Slot
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _async_cleanup_expired_bookings():
    """
    HELD holatidagi eskirgan bronlarni bekor qilish.
    Vulnerability 2.2 Yechimi: 60 soniya Grace Period beriladi
    (to'lov paytidagi tarmoq kechikishini inobatga olish uchun).
    """
    async with async_session_factory() as session:
        grace_period_cutoff = datetime.now(timezone.utc) - timedelta(seconds=60)

        query = (
            select(Booking)
            .options(selectinload(Booking.slot))
            .where(
                Booking.status == "HELD",
                Booking.held_until < grace_period_cutoff,
            )
        )
        result = await session.execute(query)
        expired_bookings = result.scalars().all()

        count = 0
        for booking in expired_bookings:
            booking.status = "EXPIRED"
            booking.cancellation_reason = "To'lov vaqti tugagan (Auto-expired)"
            if booking.slot:
                booking.slot.is_available = True
            count += 1

        await session.commit()
        if count > 0:
            logger.info(f"🧹 Cleaned up {count} expired HELD bookings.")
        return count


async def _async_check_match_deadlines():
    """
    Solo Play: O'yinga 2 soat qolganida agar kvorum yig'ilmagan bo'lsa,
    o'yinni bekor qilish va qatnashchilarga to'liq pulini qaytarish.
    """
    async with async_session_factory() as session:
        cutoff = datetime.now(timezone.utc) + timedelta(hours=2)

        query = select(PublicMatch).where(
            PublicMatch.status == "FORMING",
            PublicMatch.start_time <= cutoff,
        )
        result = await session.execute(query)
        stale_matches = result.scalars().all()

        count = 0
        for match in stale_matches:
            match.status = "CANCELLED"
            match.cancellation_reason = "Belgilangan vaqt ichida kvorum yig'ilmadi."
            count += 1

        await session.commit()
        if count > 0:
            logger.info(f"⚽ Cancelled {count} under-quorum matches.")
        return count


@celery_app.task(name="app.workers.booking_tasks.cleanup_expired_bookings")
def cleanup_expired_bookings():
    loop = asyncio.get_event_loop()
    if loop.is_running():
        return asyncio.ensure_future(_async_cleanup_expired_bookings())
    else:
        return loop.run_until_complete(_async_cleanup_expired_bookings())


@celery_app.task(name="app.workers.booking_tasks.check_match_deadlines")
def check_match_deadlines():
    loop = asyncio.get_event_loop()
    if loop.is_running():
        return asyncio.ensure_future(_async_check_match_deadlines())
    else:
        return loop.run_until_complete(_async_check_match_deadlines())
