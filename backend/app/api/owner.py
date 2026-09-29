"""
Owner API Endpoints.
Maydon egalari (OWNER) uchun boshqaruv:
- Biriktirilgan stadionlar
- Offline slotlarni 1-bosishda yopish/ochish
- Kelgan 10,000 UZS kafolatli bronlarni tasdiqlash yoki rad etish
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
import redis.asyncio as redis
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.dependencies import get_redis
from app.models.booking import Booking
from app.models.pitch import Pitch
from app.models.slot import Slot
from app.models.user import User
from app.models.venue import Venue

router = APIRouter()


class ToggleSlotBlockRequest(BaseModel):
    slot_id: UUID
    block: bool  # True = offline band qilish, False = qayta ochish


class OwnerBookingActionRequest(BaseModel):
    action: str  # "CONFIRM" yoki "REJECT"
    reason: Optional[str] = None


@router.get(
    "/my-venues",
    summary="Maydon egasiga tegishli barcha stadionlar ro'yxati",
)
async def get_my_venues(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("owner", "admin", "OWNER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faqat maydon egalari (OWNER) va ADMIN uchun ruxsat berilgan.",
        )

    query = (
        select(Venue)
        .options(selectinload(Venue.pitches), selectinload(Venue.images))
        .where(Venue.owner_id == current_user.id)
    )
    result = await db.execute(query)
    venues = result.scalars().all()

    return [
        {
            "id": str(v.id),
            "name": v.name,
            "address": v.address,
            "city": v.city,
            "district": v.district,
            "is_active": v.is_active,
            "total_bookings": v.total_bookings,
            "avg_rating": float(v.avg_rating),
            "pitches_count": len(v.pitches),
            "images": [img.image_url for img in v.images],
        }
        for v in venues
    ]


@router.post(
    "/slots/toggle-block",
    summary="Maydon egasi tomonidan offline bron / slotni yopish (1-bosishda)",
)
async def toggle_slot_block(
    payload: ToggleSlotBlockRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("owner", "admin", "OWNER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q.")

    query = select(Slot).options(selectinload(Slot.pitch).selectinload(Pitch.venue)).where(Slot.id == payload.slot_id)
    result = await db.execute(query)
    slot = result.scalar_one_or_none()

    if not slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot topilmadi.")

    # Owner tekshiruvi (Admin bo'lmasa o'z stadionini tekshiramiz)
    if current_user.role not in ("admin", "ADMIN"):
        if slot.pitch.venue.owner_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu maydon sizga tegishli emas.")

    slot.is_available = not payload.block
    slot.source = "blocked" if payload.block else "auto"

    await db.commit()
    await db.refresh(slot)

    return {
        "success": True,
        "slot_id": str(slot.id),
        "is_available": slot.is_available,
        "source": slot.source,
        "message": "Slot offline band qilindi (yopildi)." if payload.block else "Slot qaytadan ochildi.",
    }


@router.get(
    "/pending-bookings",
    summary="10,000 UZS to'langan va maydon egasi tasdig'ini kutayotgan bronlar",
)
async def get_pending_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("owner", "admin", "OWNER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q.")

    query = (
        select(Booking)
        .options(
            selectinload(Booking.user),
            selectinload(Booking.slot).selectinload(Slot.pitch).selectinload(Pitch.venue),
        )
        .where(
            Booking.status.in_(["HELD", "CONFIRMED"]),
            Booking.owner_confirmation_status == "PENDING",
        )
        .order_by(Booking.created_at.desc())
    )
    result = await db.execute(query)
    bookings = result.scalars().all()

    # Agar admin bo'lmasa, faqat o'z venuesidagi bronlarni ko'radi
    filtered = []
    for b in bookings:
        venue = b.slot.pitch.venue if b.slot and b.slot.pitch else None
        if current_user.role in ("admin", "ADMIN") or (venue and venue.owner_id == current_user.id):
            filtered.append({
                "id": str(b.id),
                "customer_name": b.user.full_name if b.user else "Noma'lum",
                "customer_phone": b.user.phone_number if b.user else "-",
                "venue_name": venue.name if venue else "-",
                "pitch_name": b.slot.pitch.name if b.slot and b.slot.pitch else "-",
                "start_time": b.slot.start_time.isoformat() if b.slot else "-",
                "end_time": b.slot.end_time.isoformat() if b.slot else "-",
                "service_fee": float(b.service_fee or 10000.0),
                "remaining_at_venue": float(b.venue_remaining_amount or 0.0),
                "status": b.status,
                "owner_confirmation_status": b.owner_confirmation_status,
                "created_at": b.created_at.isoformat(),
            })

    return filtered


@router.post(
    "/bookings/{booking_id}/action",
    summary="Maydon egasi tomonidan bronni [Tasdiqlash] yoki [Rad etish]",
)
async def action_owner_booking(
    booking_id: UUID,
    payload: OwnerBookingActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("owner", "admin", "OWNER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q.")

    query = (
        select(Booking)
        .options(selectinload(Booking.slot).selectinload(Slot.pitch).selectinload(Pitch.venue))
        .where(Booking.id == booking_id)
    )
    res = await db.execute(query)
    booking = res.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bron topilmadi.")

    venue = booking.slot.pitch.venue if booking.slot and booking.slot.pitch else None
    if current_user.role not in ("admin", "ADMIN") and venue and venue.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu bron sizning maydoningizga tegishli emas.")

    action_upper = payload.action.upper()
    if action_upper == "CONFIRM":
        booking.owner_confirmation_status = "ACCEPTED"
        booking.status = "CONFIRMED"
        booking.confirmed_at = datetime.now(timezone.utc)
        message = "Bron muvaffaqiyatli tasdiqlandi. Mijoz kelishi kutilmoqda."
    elif action_upper == "REJECT":
        booking.owner_confirmation_status = "REJECTED"
        booking.status = "CANCELLED"
        booking.payment_status = "REFUNDED"
        booking.cancellation_reason = payload.reason or "Maydon egasi tomonidan rad etildi"
        # Slotni qaytarib ochamiz
        if booking.slot:
            booking.slot.is_available = True
        message = "Bron rad etildi. Mijozga 10,000 UZS avtomatik qaytarildi."
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Noma'lum amal. Faqat CONFIRM yoki REJECT.")

    await db.commit()
    await db.refresh(booking)

    return {
        "success": True,
        "booking_id": str(booking.id),
        "status": booking.status,
        "owner_confirmation_status": booking.owner_confirmation_status,
        "message": message,
    }
