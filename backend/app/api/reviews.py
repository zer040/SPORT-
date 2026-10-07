"""
Reviews API Router — maydonlarni baholash, sharhlar va majburiy review logikasi.
"""

from datetime import datetime, timezone
import logging
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.booking import Booking
from app.models.pitch import Pitch
from app.models.review import Review
from app.models.slot import Slot
from app.models.user import User
from app.models.venue import Venue
from app.schemas.review import (
    PendingReviewItem,
    PendingReviewStatusResponse,
    ReviewCreate,
    ReviewResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _parse_uuid(val: Any) -> Optional[UUID]:
    if isinstance(val, UUID):
        return val
    try:
        return UUID(str(val))
    except (ValueError, TypeError):
        import uuid
        try:
            return uuid.uuid5(uuid.NAMESPACE_DNS, str(val))
        except Exception:
            return None


async def _recalculate_venue_ratings(venue_id: UUID, db: AsyncSession):
    """Stadionning o'rtacha reytingi va umumiy sharhlar sonini qayta hisoblash."""
    try:
        avg_res = await db.scalar(
            select(func.round(func.avg(Review.rating), 1)).where(Review.venue_id == venue_id)
        )
        count_res = await db.scalar(
            select(func.count(Review.id)).where(Review.venue_id == venue_id)
        )
        new_avg = float(avg_res) if avg_res is not None else 5.0
        new_cnt = int(count_res) if count_res is not None else 0

        await db.execute(
            update(Venue)
            .where(Venue.id == venue_id)
            .values(avg_rating=new_avg, total_reviews=new_cnt)
        )
        await db.commit()
    except Exception as e:
        logger.warning(f"Error recalculating venue ratings for {venue_id}: {e}")


@router.post(
    "",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Maydonga baho va sharh qoldirish (Majburiy reyting oqimi)",
)
async def create_review(
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Post-Match Review yuborish:
    1. Yulduzcha (1-5) majburiy
    2. Tezkor teglar (['yaxshi_chim', 'toza_dush']) va izoh (ixtiyoriy)
    3. Bitta bronga faqat 1 marta sharh yozish mumkin
    4. Venue reytingi va sharhlar soni avtomatik qayta hisoblanadi
    """
    raw_uid = current_user.id if hasattr(current_user, "id") else (current_user.get("id") if isinstance(current_user, dict) else current_user)
    user_id = _parse_uuid(raw_uid)

    # Agar booking_id ko'rsatilgan bo'lsa, tekshiramiz
    if payload.booking_id and db is not None:
        existing_review = await db.scalar(
            select(Review).where(Review.booking_id == payload.booking_id)
        )
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ushbu o'yin uchun allaqachon baho qoldirilgan."
            )

    review = Review(
        user_id=user_id,
        venue_id=payload.venue_id,
        booking_id=payload.booking_id,
        rating=payload.rating,
        comment=payload.comment.strip() if payload.comment else None,
        tags=payload.tags or [],
    )

    if db is not None:
        db.add(review)
        await db.commit()
        await db.refresh(review)
        await _recalculate_venue_ratings(payload.venue_id, db)

    user_name = getattr(current_user, "full_name", None)
    if not user_name and isinstance(current_user, dict):
        user_name = current_user.get("full_name")

    return ReviewResponse(
        id=review.id,
        user_id=review.user_id,
        venue_id=review.venue_id,
        booking_id=review.booking_id,
        rating=review.rating,
        comment=review.comment,
        tags=review.tags or [],
        created_at=review.created_at,
        user_name=user_name or "Foydalanuvchi",
        user_avatar=getattr(current_user, "avatar_url", None),
    )


@router.get(
    "/pending",
    response_model=PendingReviewStatusResponse,
    summary="Foydalanuvchida baholash kutilayotgan tugallangan o'yin bormi?",
)
async def check_pending_reviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Backend to'siq (Gatekeeper) & Trigger tekshiruvi:
    Foydalanuvchi o'yini tugagan (slot.end_time < now) bo'lsa va unga hali sharh berilmagan bo'lsa,
    has_pending = True qaytaradi.
    """
    raw_uid = current_user.id if hasattr(current_user, "id") else (current_user.get("id") if isinstance(current_user, dict) else current_user)
    user_id = _parse_uuid(raw_uid)

    if db is None or not user_id:
        return PendingReviewStatusResponse(has_pending=False)

    try:
        now = datetime.now(timezone.utc)

        # Foydalanuvchining CONFIRMED yoki COMPLETED bronlari
        stmt = (
            select(Booking)
            .options(
                selectinload(Booking.slot).selectinload(Slot.pitch).selectinload(Pitch.venue),
            )
            .where(
                Booking.user_id == user_id,
                Booking.status.in_(["CONFIRMED", "COMPLETED"]),
            )
            .order_by(Booking.created_at.desc())
            .limit(10)
        )
        res = await db.execute(stmt)
        bookings = res.scalars().all()

        for b in bookings:
            # Slot vaqti tugaganligini tekshirish
            is_finished = False
            if b.status == "COMPLETED":
                is_finished = True
            elif b.slot and b.slot.end_time:
                # slot.end_time o'tgan bo'lsa
                if b.slot.end_time < now:
                    is_finished = True

            if not is_finished:
                continue

            # Bu bronga sharh qoldirilganmi?
            already_reviewed = await db.scalar(
                select(Review.id).where(Review.booking_id == b.id)
            )
            if not already_reviewed:
                venue_obj = b.slot.pitch.venue if (b.slot and b.slot.pitch and b.slot.pitch.venue) else None
                venue_id = venue_obj.id if venue_obj else None
                venue_name = venue_obj.name if venue_obj else "Futbol Maydoni"
                pitch_name = b.slot.pitch.name if (b.slot and b.slot.pitch) else None

                if venue_id:
                    return PendingReviewStatusResponse(
                        has_pending=True,
                        pending_review=PendingReviewItem(
                            booking_id=b.id,
                            venue_id=venue_id,
                            venue_name=venue_name,
                            pitch_name=pitch_name,
                            start_time=b.slot.start_time if b.slot else None,
                            end_time=b.slot.end_time if b.slot else None,
                        ),
                    )

    except Exception as e:
        logger.warning(f"Error checking pending reviews: {e}")

    return PendingReviewStatusResponse(has_pending=False)


@router.get(
    "/venue/{venue_id}",
    response_model=List[ReviewResponse],
    summary="Maydonning barcha sharhlari ro'yxati",
)
async def list_venue_reviews(
    venue_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Stadion tafsilotlari sahifasidagi sharhlar ro'yxati."""
    items = []
    if db is not None:
        try:
            stmt = (
                select(Review)
                .options(selectinload(Review.user))
                .where(Review.venue_id == venue_id)
                .order_by(desc(Review.created_at))
                .limit(limit)
                .offset(offset)
            )
            res = await db.execute(stmt)
            reviews = res.scalars().all()

            for r in reviews:
                u_name = r.user.full_name if r.user else "Sport+ O'yinchisi"
                u_avatar = r.user.avatar_url if r.user else None
                items.append(
                    ReviewResponse(
                        id=r.id,
                        user_id=r.user_id,
                        venue_id=r.venue_id,
                        booking_id=r.booking_id,
                        rating=r.rating,
                        comment=r.comment,
                        tags=r.tags or [],
                        created_at=r.created_at,
                        user_name=u_name,
                        user_avatar=u_avatar,
                    )
                )
        except Exception as e:
            logger.warning(f"Error listing reviews for venue {venue_id}: {e}")

    return items
