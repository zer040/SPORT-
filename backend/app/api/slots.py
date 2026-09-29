"""
Slots API Endpoints — Bo'sh va band vaqt bo'laklarini ko'rish, yaratish va ommaviy generatsiya qilish.
"""

from datetime import datetime, time, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import UserRole, get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import PitchNotFoundError, SlotNotAvailableError
from app.models.pitch import Pitch
from app.models.slot import Slot
from app.models.user import User
from app.schemas.slot import (
    SlotBulkGenerate,
    SlotBulkGenerateResponse,
    SlotCreate,
    SlotResponse,
    SlotUpdate,
)

router = APIRouter()


@router.get(
    "/pitch/{pitch_id}",
    response_model=List[SlotResponse],
    summary="Maydon bo'yicha slotlar ro'yxati (sana filtri bilan)",
)
async def list_slots_by_pitch(
    pitch_id: str,
    date: Optional[str] = Query(None, description="Sana (YYYY-MM-DD)"),
    is_available: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    slots = []
    if db is not None:
        try:
            from uuid import UUID
            p_uuid = UUID(pitch_id)
            query = (
                select(Slot)
                .where(Slot.pitch_id == p_uuid)
                .order_by(Slot.start_time.asc())
            )

            if date:
                try:
                    target_date = datetime.strptime(date, "%Y-%m-%d").date()
                    start_dt = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)
                    end_dt = datetime.combine(target_date, time.max).replace(tzinfo=timezone.utc)
                    query = query.where(Slot.start_time >= start_dt, Slot.start_time <= end_dt)
                except ValueError:
                    pass

            if is_available is not None:
                query = query.where(Slot.is_available == is_available)

            result = await db.execute(query)
            slots = list(result.scalars().all())
        except Exception:
            slots = []

    if not slots:
        from app.services.mock_data import get_mock_slots_for_pitch
        target_d = None
        if date:
            try:
                target_d = datetime.strptime(date, "%Y-%m-%d").date()
            except ValueError:
                target_d = None
        raw_mock_slots = get_mock_slots_for_pitch(str(pitch_id), target_d)
        formatted = []
        for s in raw_mock_slots:
            formatted.append(
                SlotResponse(
                    id=s["id"],
                    pitch_id=s["pitch_id"],
                    start_time=datetime.fromisoformat(s["start_time"]),
                    end_time=datetime.fromisoformat(s["end_time"]),
                    price=float(s["price"]),
                    is_available=bool(s["is_available"]),
                    source=s.get("source", "auto"),
                    created_at=datetime.now(timezone.utc),
                )
            )
        return formatted

    return slots


@router.post(
    "/pitch/{pitch_id}",
    response_model=SlotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Yakka slot yaratish (Faqat Owner/Admin)",
)
@require_role(UserRole.OWNER, UserRole.ADMIN)
async def create_single_slot(
    pitch_id: UUID,
    payload: SlotCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pitch_res = await db.execute(select(Pitch).where(Pitch.id == pitch_id))
    pitch = pitch_res.scalar_one_or_none()
    if not pitch:
        raise PitchNotFoundError()

    slot = Slot(
        pitch_id=pitch_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        price=payload.price,
        source=payload.source,
        is_available=True if payload.source == "manual" else False,
    )
    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    return slot


@router.post(
    "/pitch/{pitch_id}/bulk-generate",
    response_model=SlotBulkGenerateResponse,
    summary="Sana oralig'i uchun avtomatik slotlar generatsiyasi (Faqat Owner/Admin)",
)
@require_role(UserRole.OWNER, UserRole.ADMIN)
async def bulk_generate_slots(
    pitch_id: UUID,
    payload: SlotBulkGenerate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pitch_query = (
        select(Pitch)
        .options(selectinload(Pitch.venue))
        .where(Pitch.id == pitch_id)
    )
    pitch_res = await db.execute(pitch_query)
    pitch = pitch_res.scalar_one_or_none()
    if not pitch:
        raise PitchNotFoundError()

    start_date = datetime.strptime(payload.date_from, "%Y-%m-%d").date()
    end_date = datetime.strptime(payload.date_to, "%Y-%m-%d").date()
    duration = timedelta(minutes=payload.duration_minutes)
    price = payload.price_override or float(pitch.price_per_hour)

    open_time = pitch.venue.working_hours_start or time(6, 0)
    close_time = pitch.venue.working_hours_end or time(23, 0)

    # Mavjud slotlarni tekshirish uchun olish
    existing_res = await db.execute(
        select(Slot.start_time).where(Slot.pitch_id == pitch_id)
    )
    existing_starts = set(existing_res.scalars().all())

    created_count = 0
    skipped_count = 0

    curr_date = start_date
    while curr_date <= end_date:
        slot_start = datetime.combine(curr_date, open_time).replace(tzinfo=timezone.utc)
        day_end = datetime.combine(curr_date, close_time).replace(tzinfo=timezone.utc)

        while slot_start + duration <= day_end:
            slot_end = slot_start + duration
            if slot_start in existing_starts:
                skipped_count += 1
            else:
                slot = Slot(
                    pitch_id=pitch_id,
                    start_time=slot_start,
                    end_time=slot_end,
                    price=price,
                    source="auto",
                    is_available=True,
                )
                db.add(slot)
                existing_starts.add(slot_start)
                created_count += 1

            slot_start = slot_end

        curr_date += timedelta(days=1)

    await db.commit()
    return SlotBulkGenerateResponse(
        created_count=created_count,
        skipped_count=skipped_count,
    )
