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


# ─── iOS Live Activities & Dynamic Island Workers ─────────────

async def _async_trigger_30min_live_activities():
    """
    O'yinga 30 daqiqa qolganda Dynamic Island Live Activity'ga
    jonli taymer va match statusini jo'natish.
    Oyna: [now + 25 min ... now + 35 min]
    """
    from app.models.live_activity import LiveActivitySession
    from app.models.pitch import Pitch
    from app.models.venue import Venue
    from app.services.apns_live_activity_service import apns_live_activity_service

    async with async_session_factory() as session:
        now = datetime.now(timezone.utc)
        window_start = now + timedelta(minutes=20)
        window_end = now + timedelta(minutes=35)

        # 30 min qolgan confirmed bronlar uchun aktiv sessiyalar
        query = (
            select(LiveActivitySession)
            .join(Booking, LiveActivitySession.booking_id == Booking.id)
            .join(Slot, Booking.slot_id == Slot.id)
            .options(
                selectinload(LiveActivitySession.booking)
                .selectinload(Booking.slot)
                .selectinload(Slot.pitch)
                .selectinload(Pitch.venue)
            )
            .where(
                LiveActivitySession.status == "ACTIVE",
                LiveActivitySession.notified_30min.is_(False),
                Booking.status.in_(["CONFIRMED", "HELD"]),
                Slot.start_time >= window_start,
                Slot.start_time <= window_end,
            )
        )
        res = await session.execute(query)
        sessions = res.scalars().all()

        count = 0
        for act in sessions:
            booking = act.booking
            slot = booking.slot if booking else None
            pitch = slot.pitch if slot else None
            venue = pitch.venue if pitch else None

            venue_name = venue.name if venue else "SPORT+ Arena"
            pitch_name = pitch.name if pitch else "Maydon"
            start_time = slot.start_time if slot else (now + timedelta(minutes=30))

            try:
                push_res = await apns_live_activity_service.notify_match_30min_countdown(
                    push_token=act.push_token,
                    venue_name=venue_name,
                    pitch_name=pitch_name,
                    kickoff_time=start_time,
                    booking_id=str(act.booking_id),
                )
                act.notified_30min = True
                act.last_response = str(push_res)
                count += 1
            except Exception as e:
                logger.error(f"❌ Live Activity 30-min push yuborishda xatolik (session {act.id}): {e}")

        if count > 0:
            await session.commit()
            logger.info(f"📱 Sent 30-min match countdown to {count} Live Activity sessions.")
        return count


async def _async_cleanup_ended_live_activities():
    """
    O'yin vaqti tugagan sessiyalarni yopish va ekrandan olib tashlash.
    """
    from app.models.live_activity import LiveActivitySession
    from app.models.pitch import Pitch
    from app.models.venue import Venue
    from app.services.apns_live_activity_service import apns_live_activity_service

    async with async_session_factory() as session:
        now = datetime.now(timezone.utc)

        query = (
            select(LiveActivitySession)
            .join(Booking, LiveActivitySession.booking_id == Booking.id)
            .join(Slot, Booking.slot_id == Slot.id)
            .options(
                selectinload(LiveActivitySession.booking)
                .selectinload(Booking.slot)
                .selectinload(Slot.pitch)
                .selectinload(Pitch.venue)
            )
            .where(
                LiveActivitySession.status == "ACTIVE",
                Slot.end_time <= now,
            )
        )
        res = await session.execute(query)
        sessions = res.scalars().all()

        count = 0
        for act in sessions:
            booking = act.booking
            slot = booking.slot if booking else None
            pitch = slot.pitch if slot else None
            venue = pitch.venue if pitch else None
            venue_name = venue.name if venue else "SPORT+"

            try:
                await apns_live_activity_service.end_match_activity(
                    push_token=act.push_token,
                    venue_name=venue_name,
                    booking_id=str(act.booking_id),
                )
            except Exception as e:
                logger.debug(f"APNs end error: {e}")

            act.status = "ENDED"
            act.ended_at = now
            count += 1

        if count > 0:
            await session.commit()
            logger.info(f"🏁 Dismissed {count} ended Live Activity sessions.")
        return count


@celery_app.task(name="app.workers.booking_tasks.check_live_activity_deadlines")
def check_live_activity_deadlines():
    """Celery beat task — 30-min countdown tekshirish va tugaganlarni yopish."""
    loop = asyncio.get_event_loop()
    if loop.is_running():
        asyncio.ensure_future(_async_trigger_30min_live_activities())
        return asyncio.ensure_future(_async_cleanup_ended_live_activities())
    else:
        loop.run_until_complete(_async_trigger_30min_live_activities())
        return loop.run_until_complete(_async_cleanup_ended_live_activities())
