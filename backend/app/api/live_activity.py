"""
Live Activity API Router — iOS Dynamic Island va Lock Screen integratsiyasi.
APNs push tokenlarini ro'yxatdan o'tkazish, yangilash va test push jo'natish.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.booking import Booking
from app.models.live_activity import LiveActivitySession
from app.models.pitch import Pitch
from app.models.slot import Slot
from app.models.user import User
from app.models.venue import Venue
from app.services.apns_live_activity_service import apns_live_activity_service

router = APIRouter()


# ─── Pydantic Schemas ──────────────────────────────────────────

class RegisterLiveActivityRequest(BaseModel):
    booking_id: uuid.UUID
    push_token: str = Field(..., description="APNs Live Activity hex push token")
    activity_id: Optional[str] = Field(None, description="iOS ActivityKit activity.id")
    device_os: Optional[str] = Field("iOS", description="Qurilma OT (default: iOS)")


class EndLiveActivityRequest(BaseModel):
    booking_id: uuid.UUID


class LiveActivityResponse(BaseModel):
    success: bool
    message: str
    session_id: Optional[uuid.UUID] = None
    notified_30min: Optional[bool] = None


# ─── Endpoints ─────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=LiveActivityResponse,
    summary="Live Activity APNs push tokenini ro'yxatdan o'tkazish",
)
async def register_live_activity(
    data: RegisterLiveActivityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Foydalanuvchi iPhone ilovasida Dynamic Island Live Activity boshlanganda,
    olingan APNs push tokenni backendga bog'lash.
    """
    # Bron mavjudligini tekshirish
    booking_stmt = (
        select(Booking)
        .options(
            selectinload(Booking.slot).selectinload(Slot.pitch).selectinload(Pitch.venue)
        )
        .where(Booking.id == data.booking_id)
    )
    booking_res = await db.execute(booking_stmt)
    booking = booking_res.scalar_one_or_none()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bron topilmadi",
        )

    # Foydalanuvchi ushbu bron egasimi (yoki admin/owner)?
    if str(booking.user_id) != str(current_user.id) and current_user.role not in ["ADMIN", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ushbu bron uchun ruxsat berilmagan",
        )

    # Mavjud aktiv sessiyani qidirish yoki yangisini yaratish
    session_stmt = select(LiveActivitySession).where(
        LiveActivitySession.booking_id == data.booking_id,
        LiveActivitySession.user_id == current_user.id,
        LiveActivitySession.status == "ACTIVE",
    )
    session_res = await db.execute(session_stmt)
    existing_session = session_res.scalar_one_or_none()

    if existing_session:
        # Tokenni yangilash
        existing_session.push_token = data.push_token
        if data.activity_id:
            existing_session.activity_id = data.activity_id
        session_obj = existing_session
    else:
        # Yangi Live Activity sessiyasi
        session_obj = LiveActivitySession(
            user_id=current_user.id,
            booking_id=data.booking_id,
            push_token=data.push_token,
            activity_id=data.activity_id,
            device_os=data.device_os or "iOS",
            status="ACTIVE",
            notified_30min=False,
        )
        db.add(session_obj)

    await db.commit()
    await db.refresh(session_obj)

    return LiveActivityResponse(
        success=True,
        message="Dynamic Island sessiyasi muvaffaqiyatli saqlandi",
        session_id=session_obj.id,
        notified_30min=session_obj.notified_30min,
    )


@router.post(
    "/end",
    response_model=LiveActivityResponse,
    summary="Live Activity sessiyasini yakunlash",
)
async def end_live_activity(
    data: EndLiveActivityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Dynamic Island sessiyasini yakunlash va APNs 'end' push jo'natish.
    """
    session_stmt = (
        select(LiveActivitySession)
        .options(
            selectinload(LiveActivitySession.booking)
            .selectinload(Booking.slot)
            .selectinload(Slot.pitch)
            .selectinload(Pitch.venue)
        )
        .where(
            LiveActivitySession.booking_id == data.booking_id,
            LiveActivitySession.user_id == current_user.id,
            LiveActivitySession.status == "ACTIVE",
        )
    )
    result = await db.execute(session_stmt)
    session_obj = result.scalar_one_or_none()

    if not session_obj:
        return LiveActivityResponse(
            success=True,
            message="Aktiv sessiya topilmadi yoki allaqachon yakunlangan",
        )

    venue_name = "SPORT+ Stadium"
    if session_obj.booking and session_obj.booking.slot and session_obj.booking.slot.pitch:
        venue_name = session_obj.booking.slot.pitch.venue.name

    # APNs orqali ekrandan olib tashlash
    await apns_live_activity_service.end_match_activity(
        push_token=session_obj.push_token,
        venue_name=venue_name,
        booking_id=str(data.booking_id),
    )

    session_obj.status = "ENDED"
    session_obj.ended_at = datetime.now(timezone.utc)
    await db.commit()

    return LiveActivityResponse(
        success=True,
        message="Dynamic Island sessiyasi yakunlandi",
        session_id=session_obj.id,
    )


@router.post(
    "/test-push/{booking_id}",
    summary="[Test/Dev] O'yinga 30 daqiqa qolganligi bo'yicha test push jo'natish",
)
async def send_test_30min_push(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Dasturchilar va test uchun: Ushbu bron uchun ro'yxatdan o'tgan iPhone qurilmaga
    30 daqiqalik match countdown bildirishnomasini simulyatsiya qilish.
    """
    booking_stmt = (
        select(Booking)
        .options(
            selectinload(Booking.slot).selectinload(Slot.pitch).selectinload(Pitch.venue)
        )
        .where(Booking.id == booking_id)
    )
    b_res = await db.execute(booking_stmt)
    booking = b_res.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Bron topilmadi")

    # Sessiyalarni olish
    s_stmt = select(LiveActivitySession).where(
        LiveActivitySession.booking_id == booking_id,
        LiveActivitySession.status == "ACTIVE",
    )
    s_res = await db.execute(s_stmt)
    sessions = s_res.scalars().all()

    if not sessions:
        raise HTTPException(
            status_code=400,
            detail="Ushbu bron uchun ro'yxatdan o'tgan aktiv Live Activity topilmadi. Avval ilovadan /register qiling.",
        )

    venue_name = "Bunyodkor Arena"
    pitch_name = "Maydon №1"
    start_time = datetime.now(timezone.utc)

    if booking.slot:
        start_time = booking.slot.start_time
        if booking.slot.pitch:
            pitch_name = booking.slot.pitch.name
            if booking.slot.pitch.venue:
                venue_name = booking.slot.pitch.venue.name

    results = []
    for s in sessions:
        res = await apns_live_activity_service.notify_match_30min_countdown(
            push_token=s.push_token,
            venue_name=venue_name,
            pitch_name=pitch_name,
            kickoff_time=start_time,
            booking_id=str(booking_id),
        )
        s.notified_30min = True
        s.last_response = str(res)
        results.append(res)

    await db.commit()

    return {
        "success": True,
        "sent_count": len(sessions),
        "venue": venue_name,
        "pitch": pitch_name,
        "results": results,
    }


@router.get(
    "/status/{booking_id}",
    summary="Bron bo'yicha Live Activity holatini ko'rish",
)
async def get_live_activity_status(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bron uchun Dynamic Island sessiyasi mavjudmi va xabardor qilinganmi tekshirish."""
    session_stmt = select(LiveActivitySession).where(
        LiveActivitySession.booking_id == booking_id,
        LiveActivitySession.user_id == current_user.id,
    ).order_by(LiveActivitySession.created_at.desc())
    res = await db.execute(session_stmt)
    session_obj = res.scalar_one_or_none()

    if not session_obj:
        return {"has_active_activity": False, "session": None}

    return {
        "has_active_activity": session_obj.status == "ACTIVE",
        "session": {
            "id": str(session_obj.id),
            "status": session_obj.status,
            "notified_30min": session_obj.notified_30min,
            "created_at": session_obj.created_at.isoformat(),
        },
    }
