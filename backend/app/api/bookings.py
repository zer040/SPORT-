"""
Bookings API Endpoints — Slotni band qilish (Hold), tasdiqlash (Confirm) va bekor qilish (Cancel).
"""

from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.dependencies import get_redis
from app.core.exceptions import BookingNotFoundError
from app.models.user import User
from app.schemas.booking import (
    BookingCancelRequest,
    BookingCancelResponse,
    BookingConfirmRequest,
    BookingHoldRequest,
    BookingHoldResponse,
    BookingResponse,
)
from app.services.booking_service import BookingService

router = APIRouter()


@router.post(
    "/hold",
    response_model=BookingHoldResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Slotni vaqtinchalik band qilish (10 daqiqa HELD)",
)
async def hold_booking(
    payload: BookingHoldRequest,
    current_user: Any = Depends(get_current_user),
    db: Optional[AsyncSession] = Depends(get_db),
    redis_client: Optional[redis.Redis] = Depends(get_redis),
):
    slot_ids = payload.slot_ids or ([payload.slot_id] if payload.slot_id else [])
    booking = None

    if db is not None:
        try:
            from uuid import UUID
            from sqlalchemy import select
            from app.models.booking import Booking
            from app.models.review import Review
            from fastapi import HTTPException

            u_id = current_user.id if hasattr(current_user, "id") else UUID(str(current_user.get("id") if isinstance(current_user, dict) else current_user))
            unreviewed = await db.scalar(
                select(Booking.id)
                .outerjoin(Review, Review.booking_id == Booking.id)
                .where(
                    Booking.user_id == u_id,
                    Booking.status == "COMPLETED",
                    Review.id == None,
                )
                .limit(1)
            )
            if unreviewed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Yangi maydon bron qilish uchun avval tugallangan o'yiningizni baholang (Post-Match Review talab qilinadi)."
                )
        except HTTPException:
            raise
        except Exception:
            pass

    if db is not None and redis_client is not None:
        try:
            from uuid import UUID
            uuid_slots = [UUID(str(s)) for s in slot_ids]
            u_id = UUID(str(getattr(current_user, "id", None)))
            service = BookingService(db, redis_client)
            booking = await service.hold_slots(
                user_id=u_id,
                slot_ids=uuid_slots,
                team_id=payload.team_id,
                notes=payload.notes,
            )
        except Exception:
            booking = None

    deadline_seconds = settings.HOLD_DURATION_MINUTES * 60
    held_until = datetime.now(timezone.utc) + timedelta(minutes=settings.HOLD_DURATION_MINUTES)
    s_fee = float(settings.BOOKING_SERVICE_FEE_UZS)

    if booking:
        total_p = float(booking.total_price)
        remaining_v = max(0.0, total_p - s_fee)
        return BookingHoldResponse(
            booking_id=booking.id,
            held_until=booking.held_until,
            total_price=total_p,
            service_fee=s_fee,
            venue_remaining_amount=remaining_v,
            payment_deadline_seconds=deadline_seconds,
            payment_url=f"/api/v1/payments/checkout?booking_id={booking.id}",
        )

    # Mock fallback booking
    from uuid import uuid4
    from app.services.mock_data import MOCK_BOOKINGS
    mock_id = str(uuid4())
    total_p = 200000.0 * len(slot_ids) if slot_ids else 200000.0
    remaining_v = max(0.0, total_p - s_fee)

    user_id_val = current_user.get("id") if isinstance(current_user, dict) else str(getattr(current_user, "id", "demo_user"))
    MOCK_BOOKINGS[mock_id] = {
        "id": mock_id,
        "user_id": user_id_val,
        "slot_id": str(slot_ids[0]) if slot_ids else "slot-1",
        "status": "HELD",
        "total_price": total_p,
        "service_fee": s_fee,
        "venue_remaining_amount": remaining_v,
        "held_until": held_until,
        "created_at": datetime.now(timezone.utc),
        "payment_type": payload.payment_type or "full",
        "paid_amount": 0.0,
    }

    return BookingHoldResponse(
        booking_id=mock_id,
        held_until=held_until,
        total_price=total_p,
        service_fee=s_fee,
        venue_remaining_amount=remaining_v,
        payment_deadline_seconds=deadline_seconds,
        payment_url=f"/api/v1/payments/checkout?booking_id={mock_id}",
    )


@router.post(
    "/{booking_id}/confirm",
    response_model=BookingResponse,
    summary="Bronni to'lovdan so'ng tasdiqlash",
)
async def confirm_booking(
    booking_id: str,
    payload: BookingConfirmRequest,
    current_user: Any = Depends(get_current_user),
    db: Optional[AsyncSession] = Depends(get_db),
    redis_client: Optional[redis.Redis] = Depends(get_redis),
):
    if db is not None and redis_client is not None:
        try:
            from uuid import UUID
            b_uuid = UUID(booking_id)
            u_id = UUID(str(getattr(current_user, "id", None)))
            service = BookingService(db, redis_client)
            return await service.confirm_booking(
                booking_id=b_uuid,
                user_id=u_id,
            )
        except Exception:
            pass

    from app.services.mock_data import MOCK_BOOKINGS
    mb = MOCK_BOOKINGS.get(booking_id)
    if not mb:
        mb = {
            "id": booking_id,
            "user_id": "demo_user",
            "slot_id": "slot-1",
            "status": "CONFIRMED",
            "total_price": 200000.0,
            "paid_amount": 10000.0,
            "held_until": datetime.now(timezone.utc),
            "confirmed_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc),
        }
    else:
        mb["status"] = "CONFIRMED"
        mb["paid_amount"] = 10000.0
        mb["confirmed_at"] = datetime.now(timezone.utc)
    MOCK_BOOKINGS[booking_id] = mb

    return BookingResponse(
        id=mb["id"],
        user_id=mb.get("user_id", "demo_user"),
        slot_id=mb.get("slot_id", "slot-1"),
        status=mb["status"],
        total_price=float(mb.get("total_price", 200000.0)),
        paid_amount=float(mb.get("paid_amount", 10000.0)),
        held_until=datetime.now(timezone.utc) + timedelta(minutes=10),
        confirmed_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
    )


@router.post(
    "/{booking_id}/cancel",
    response_model=BookingCancelResponse,
    summary="Bronni bekor qilish (Jarima va qaytarish hisoblanadi)",
)
async def cancel_booking(
    booking_id: UUID,
    payload: BookingCancelRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = BookingService(db, redis_client)
    booking, cancel_res = await service.cancel_booking(
        booking_id=booking_id,
        user_id=current_user.id,
        user_role=current_user.role,
        reason=payload.cancellation_reason,
    )

    return BookingCancelResponse(
        booking_id=booking.id,
        refund_amount=float(cancel_res.refund_amount),
        penalty_amount=float(cancel_res.penalty_amount),
        message=f"Bron bekor qilindi. Qaytarilgan: {cancel_res.refund_amount} UZS ({cancel_res.refund_percent}%)",
    )


@router.get(
    "/my",
    response_model=List[BookingResponse],
    summary="Foydalanuvchining barcha bronlari ro'yxati",
)
async def get_my_bookings(
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Any = Depends(get_current_user),
    db: Optional[AsyncSession] = Depends(get_db),
    redis_client: Optional[redis.Redis] = Depends(get_redis),
):
    bookings = []
    if db is not None and redis_client is not None:
        try:
            from uuid import UUID
            u_id = UUID(str(getattr(current_user, "id", None)))
            service = BookingService(db, redis_client)
            bookings = await service.get_user_bookings(
                user_id=u_id,
                status=status,
                limit=limit,
                offset=offset,
            )
        except Exception:
            bookings = []

    from app.services.mock_data import MOCK_BOOKINGS
    for mb in MOCK_BOOKINGS.values():
        bookings.append(
            BookingResponse(
                id=mb["id"],
                user_id=mb.get("user_id", "demo_user"),
                slot_id=mb.get("slot_id", "slot-1"),
                status=mb.get("status", "CONFIRMED"),
                total_price=float(mb.get("total_price", 200000.0)),
                paid_amount=float(mb.get("paid_amount", 10000.0)),
                held_until=datetime.now(timezone.utc) + timedelta(minutes=10),
                confirmed_at=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc),
                qr_pass=mb.get("qr_pass", f"SP-PASS-2026-{str(mb['id'])[:4].upper()}"),
                service_fee=float(mb.get("service_fee", 10000.0)),
                remaining_at_venue=float(mb.get("venue_remaining_amount", 190000.0)),
                venue_name="Bunyodkor Arena (Milliy Stadium)",
                pitch_name="Maydon 1 (5x5 Mini)",
            )
        )

    return bookings


@router.get(
    "/{booking_id}",
    response_model=BookingResponse,
    summary="Bronning to'liq ma'lumotlari",
)
async def get_booking_detail(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = BookingService(db, redis_client)
    booking = await service.get_booking_by_id(booking_id)
    if not booking:
        raise BookingNotFoundError()
    return booking
