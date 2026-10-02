"""
Owner API Endpoints.
Maydon egalari (OWNER) uchun boshqaruv markazi:
- Biriktirilgan stadionlar va ularning parametrlarini tahrirlash (Venue Edit)
- Slotlar jadvali (barcha statuslar: AVAILABLE, LOCKED, BOOKED, MANUAL_BOOKED, BLOCKED)
- Offline slotlarni 1-bosishda yopish/ochish (BLOCKED)
- Offline qo'ng'iroq orqali kelgan o'yinlarni kiritish (Manual Book)
- Dinamik Smart Pricing bilan 30 kunlik slotlarni avtomatik generatsiya qilish
- Real-time WebSocket orqali o'yinchilar ilovasini soniyaning ulushida yangilash
"""

import asyncio
from datetime import datetime, time, timedelta, timezone
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.events import realtime_hub
from app.core.security import hash_password, verify_password
from app.models.booking import Booking
from app.models.pitch import Pitch
from app.models.slot import Slot
from app.models.user import User
from app.models.venue import Venue, VenueImage
from app.schemas.slot import SlotManualBookRequest, SmartPricingGenerateRequest
from app.schemas.venue import VenueUpdate

logger = logging.getLogger("sportplus.owner")

router = APIRouter()


class ToggleSlotBlockRequest(BaseModel):
    slot_id: UUID
    block: bool  # True = offline band qilish (BLOCKED), False = qayta ochish (AVAILABLE)


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
            "description": v.description or "",
            "address": v.address,
            "city": v.city,
            "district": v.district or "",
            "phone_number": v.phone_number or "",
            "facilities": v.facilities or {},
            "amenities": v.facilities or {},
            "base_price_per_hour": float(v.base_price_per_hour or 200000.0),
            "is_active": v.is_active,
            "total_bookings": v.total_bookings,
            "avg_rating": float(v.avg_rating or 5.0),
            "pitches_count": len(v.pitches),
            "pitches": [
                {
                    "id": str(p.id),
                    "name": p.name,
                    "size_type": p.size_type,
                    "price_per_hour": float(p.price_per_hour),
                }
                for p in v.pitches
            ],
            "images": [img.image_url for img in v.images],
        }
        for v in venues
    ]


@router.put(
    "/venues/{venue_id}",
    summary="Maydon egasi tomonidan stadion parametrlarini tahrirlash",
)
async def update_my_venue(
    venue_id: UUID,
    payload: VenueUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Owner stadion nomi, manzili, rasmlari, narxi va qulayliklarini (amenities) yangilaydi."""
    if current_user.role not in ("owner", "admin", "OWNER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q.")

    query = (
        select(Venue)
        .options(selectinload(Venue.images), selectinload(Venue.pitches))
        .where(Venue.id == venue_id)
    )
    res = await db.execute(query)
    venue = res.scalar_one_or_none()

    if not venue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stadion topilmadi.")

    if current_user.role not in ("admin", "ADMIN") and venue.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu stadion sizga tegishli emas.")

    # Maydon parametrlarini yangilash
    if payload.name is not None:
        venue.name = payload.name
    if payload.description is not None:
        venue.description = payload.description
    if payload.address is not None:
        venue.address = payload.address
    if payload.city is not None:
        venue.city = payload.city
    if payload.district is not None:
        venue.district = payload.district
    if payload.phone_number is not None:
        venue.phone_number = payload.phone_number
    if payload.base_price_per_hour is not None:
        venue.base_price_per_hour = payload.base_price_per_hour

    # Amenities / Facilities
    amenities_data = payload.amenities if payload.amenities is not None else payload.facilities
    if amenities_data is not None:
        current_fac = dict(venue.facilities or {})
        current_fac.update(amenities_data)
        venue.facilities = current_fac

    # Rasmlar boshqaruvi
    if payload.photos is not None:
        # Eski rasmlarni o'chirib yangilarini qo'shamiz
        await db.execute(delete(VenueImage).where(VenueImage.venue_id == venue.id))
        for idx, p_url in enumerate(payload.photos):
            if p_url.strip():
                db.add(
                    VenueImage(
                        venue_id=venue.id,
                        image_url=p_url.strip(),
                        is_primary=(idx == 0),
                        sort_order=idx,
                    )
                )

    await db.commit()
    await db.refresh(venue)

    # Real-time event va kesh tozalash
    await realtime_hub.notify_venue_change(
        str(venue.id),
        {
            "name": venue.name,
            "base_price_per_hour": float(venue.base_price_per_hour),
            "amenities": venue.facilities,
        },
    )

    return {
        "success": True,
        "venue_id": str(venue.id),
        "name": venue.name,
        "base_price_per_hour": float(venue.base_price_per_hour),
        "amenities": venue.facilities,
        "message": "Stadion muvaffaqiyatli yangilandi va real vaqtda o'yinchilarga aks etdi.",
    }


@router.get(
    "/venues/{venue_id}/slots",
    summary="Maydon bo'yicha barcha slotlar va bandliklar jadvali (Owner nazorati)",
)
async def get_venue_slots(
    venue_id: UUID,
    date: Optional[str] = Query(None, description="Sana (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("owner", "admin", "OWNER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q.")

    # Stadion va maydonchalarni tekshirish
    v_query = (
        select(Venue)
        .options(selectinload(Venue.pitches))
        .where(Venue.id == venue_id)
    )
    v_res = await db.execute(v_query)
    venue = v_res.scalar_one_or_none()

    if not venue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stadion topilmadi.")

    pitch_ids = [p.id for p in venue.pitches]
    if not pitch_ids:
        return []

    query = (
        select(Slot)
        .options(selectinload(Slot.pitch))
        .where(Slot.pitch_id.in_(pitch_ids))
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

    res = await db.execute(query)
    slots = res.scalars().all()

    return [
        {
            "id": str(s.id),
            "pitch_id": str(s.pitch_id),
            "pitch_name": s.pitch.name if s.pitch else "Maydon",
            "start_time": s.start_time.isoformat(),
            "end_time": s.end_time.isoformat(),
            "price": float(s.price),
            "is_available": s.is_available,
            "status": s.status or ("AVAILABLE" if s.is_available else "BOOKED"),
            "booking_source": s.booking_source or "APP",
            "booked_by_name": s.booked_by_name,
            "booked_by_phone": s.booked_by_phone,
            "is_recurring": s.is_recurring or False,
        }
        for s in slots
    ]


@router.post(
    "/slots/manual-book",
    summary="Qo'lda kiritilgan o'yinlar (Offline-to-Online sync: Aziz 90-123-45-67)",
)
async def manual_book_slot(
    payload: SlotManualBookRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Owner offline kelgan mijozni kiritadi, slot darhol MANUAL_BOOKED holatiga o'tadi."""
    if current_user.role not in ("owner", "admin", "OWNER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q.")

    query = (
        select(Slot)
        .options(selectinload(Slot.pitch).selectinload(Pitch.venue))
        .where(Slot.id == payload.slot_id)
    )
    res = await db.execute(query)
    slot = res.scalar_one_or_none()

    if not slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot topilmadi.")

    venue = slot.pitch.venue if slot.pitch else None
    if current_user.role not in ("admin", "ADMIN") and venue and venue.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu maydon sizga tegishli emas.")

    # Slotni band qilish
    slot.status = "MANUAL_BOOKED"
    slot.is_available = False
    slot.booking_source = "MANUAL_PHONE"
    slot.booked_by_name = payload.booked_by_name
    slot.booked_by_phone = payload.booked_by_phone
    slot.is_recurring = payload.is_recurring
    if payload.price is not None and payload.price > 0:
        slot.price = payload.price

    await db.commit()
    await db.refresh(slot)

    # Real-time WebSockets orqali barcha qidirayotgan o'yinchilarga xabar
    await realtime_hub.notify_slot_change(
        slot_id=str(slot.id),
        pitch_id=str(slot.pitch_id),
        status="MANUAL_BOOKED",
        is_available=False,
        price=float(slot.price),
        venue_id=str(venue.id) if venue else None,
    )

    # Agar mijoz Telegram botga ulangan bo'lsa, xabar yuborishga urinib ko'ramiz
    if payload.send_sms_notice and payload.booked_by_phone:
        async def _try_notify_client():
            try:
                from app.services.telegram_bot import bot
                clean_phone = payload.booked_by_phone.replace("+", "").replace(" ", "").replace("-", "")
                u_q = select(User).where(User.phone_number.contains(clean_phone[-9:]))
                u_res = await db.execute(u_q)
                client_user = u_res.scalar_one_or_none()
                if client_user and client_user.telegram_id:
                    v_name = venue.name if venue else "Maydon"
                    t_str = f"{slot.start_time.strftime('%H:%M')} - {slot.end_time.strftime('%H:%M')}"
                    msg = (
                        f"⚽ <b>SPORT+: Maydon band qilindi!</b>\n\n"
                        f"Maydon egasi sizga joy ajratdi:\n"
                        f"🏟 <b>{v_name}</b>\n"
                        f"⏰ <b>{t_str}</b>\n"
                        f"👤 {payload.booked_by_name} ({payload.booked_by_phone})\n\n"
                        f"<i>Ilovada ko'rish uchun SPORT+ ga kiring.</i>"
                    )
                    await bot.send_message(chat_id=client_user.telegram_id, text=msg, parse_mode="HTML")
            except Exception as e:
                logger.info(f"Telegram notice yuborilmadi (zaruratsiz): {e}")

        asyncio.create_task(_try_notify_client())

    return {
        "success": True,
        "slot_id": str(slot.id),
        "status": slot.status,
        "booked_by_name": slot.booked_by_name,
        "booked_by_phone": slot.booked_by_phone,
        "message": f"{payload.booked_by_name} uchun slot muvaffaqiyatli band qilindi va o'yinchilar ekranida qizil/band bo'ldi.",
    }


@router.post(
    "/slots/toggle-block",
    summary="Maydon egasi tomonidan slotni 1-bosishda yopish (BLOCKED) yoki ochish (AVAILABLE)",
)
async def toggle_slot_block(
    payload: ToggleSlotBlockRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("owner", "admin", "OWNER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q.")

    query = (
        select(Slot)
        .options(selectinload(Slot.pitch).selectinload(Pitch.venue))
        .where(Slot.id == payload.slot_id)
    )
    result = await db.execute(query)
    slot = result.scalar_one_or_none()

    if not slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot topilmadi.")

    venue = slot.pitch.venue if slot.pitch else None
    if current_user.role not in ("admin", "ADMIN") and venue and venue.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu maydon sizga tegishli emas.")

    slot.is_available = not payload.block
    slot.status = "BLOCKED" if payload.block else "AVAILABLE"
    slot.source = "blocked" if payload.block else "auto"

    await db.commit()
    await db.refresh(slot)

    # Real-time WebSocket event
    await realtime_hub.notify_slot_change(
        slot_id=str(slot.id),
        pitch_id=str(slot.pitch_id),
        status=slot.status,
        is_available=slot.is_available,
        price=float(slot.price),
        venue_id=str(venue.id) if venue else None,
    )

    return {
        "success": True,
        "slot_id": str(slot.id),
        "status": slot.status,
        "is_available": slot.is_available,
        "message": "Slot offline band qilindi (yopildi)." if payload.block else "Slot qaytadan ochildi.",
    }


@router.post(
    "/slots/smart-generate",
    summary="Dinamik Smart Pricing shabloni bilan 30 kunlik slotlarni avtomatik generatsiya qilish",
)
async def smart_generate_slots(
    payload: SmartPricingGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Kunduzgi (08:00 - 17:00): 100k, Prime-Time (17:00 - 23:00): 200k, Tungi (23:00 - 03:00): 150k.
    Kelgusi 30 kun uchun barcha 1 soatlik slotlar bir zumda shakllantiriladi.
    """
    if current_user.role not in ("owner", "admin", "OWNER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q.")

    p_query = (
        select(Pitch)
        .options(selectinload(Pitch.venue))
        .where(Pitch.id == payload.pitch_id)
    )
    p_res = await db.execute(p_query)
    pitch = p_res.scalar_one_or_none()

    if not pitch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maydoncha (Pitch) topilmadi.")

    venue = pitch.venue
    if current_user.role not in ("admin", "ADMIN") and venue and venue.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu maydon sizga tegishli emas.")

    today = datetime.now(timezone.utc).date()
    created_count = 0
    skipped_count = 0

    # Mavjud slotlar vaqtlarini oldindan olish
    existing_q = select(Slot.start_time).where(Slot.pitch_id == pitch.id)
    existing_res = await db.execute(existing_q)
    existing_times = set(existing_res.scalars().all())

    new_slots = []
    # 08:00 dan boshlab kechki 02:00 gacha (19 soat / kun)
    for day_offset in range(payload.days_ahead):
        cur_date = today + timedelta(days=day_offset)

        # 08:00 dan 23:00 gacha
        for hour in range(8, 24):
            s_time = datetime.combine(cur_date, time(hour, 0)).replace(tzinfo=timezone.utc)
            e_time = s_time + timedelta(hours=1)

            if s_time in existing_times:
                skipped_count += 1
                continue

            # Narxni aniqlash
            if 8 <= hour < 17:
                price = payload.day_price
            else:
                price = payload.prime_price

            new_slots.append(
                Slot(
                    pitch_id=pitch.id,
                    start_time=s_time,
                    end_time=e_time,
                    price=price,
                    is_available=True,
                    status="AVAILABLE",
                    booking_source="APP",
                    source="auto",
                )
            )

        # 00:00 dan 03:00 gacha (Tungi soatlar)
        next_day = cur_date + timedelta(days=1)
        for hour in range(0, 3):
            s_time = datetime.combine(next_day, time(hour, 0)).replace(tzinfo=timezone.utc)
            e_time = s_time + timedelta(hours=1)

            if s_time in existing_times:
                skipped_count += 1
                continue

            new_slots.append(
                Slot(
                    pitch_id=pitch.id,
                    start_time=s_time,
                    end_time=e_time,
                    price=payload.night_price,
                    is_available=True,
                    status="AVAILABLE",
                    booking_source="APP",
                    source="auto",
                )
            )

    if new_slots:
        db.add_all(new_slots)
        await db.commit()
        created_count = len(new_slots)

    await realtime_hub.invalidate_cache("slots:*")

    return {
        "success": True,
        "pitch_id": str(pitch.id),
        "days_ahead": payload.days_ahead,
        "created_count": created_count,
        "skipped_count": skipped_count,
        "message": f"Dinamik tariflar bilan {created_count} ta yangi slot muvaffaqiyatli generatsiya qilindi.",
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

    filtered = []
    for b in bookings:
        venue = b.slot.pitch.venue if b.slot and b.slot.pitch else None
        if current_user.role in ("admin", "ADMIN") or (venue and venue.owner_id == current_user.id):
            filtered.append(
                {
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
                }
            )

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
        if booking.slot:
            booking.slot.status = "BOOKED"
            booking.slot.is_available = False
        message = "Bron muvaffaqiyatli tasdiqlandi. Mijoz kelishi kutilmoqda."
    elif action_upper == "REJECT":
        booking.owner_confirmation_status = "REJECTED"
        booking.status = "CANCELLED"
        booking.payment_status = "REFUNDED"
        booking.cancellation_reason = payload.reason or "Maydon egasi tomonidan rad etildi"
        # Slotni qaytarib ochamiz
        if booking.slot:
            booking.slot.is_available = True
            booking.slot.status = "AVAILABLE"
        message = "Bron rad etildi. Mijozga 10,000 UZS avtomatik qaytarildi."
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Noma'lum amal. Faqat CONFIRM yoki REJECT.")

    await db.commit()
    await db.refresh(booking)

    if booking.slot:
        await realtime_hub.notify_slot_change(
            slot_id=str(booking.slot.id),
            pitch_id=str(booking.slot.pitch_id),
            status=booking.slot.status,
            is_available=booking.slot.is_available,
            price=float(booking.slot.price),
            venue_id=str(venue.id) if venue else None,
        )

    return {
        "success": True,
        "booking_id": str(booking.id),
        "status": booking.status,
        "owner_confirmation_status": booking.owner_confirmation_status,
        "message": message,
    }


# ─── Yangi: AVAILABLE slotlar narxini Smart Pricing bo'yicha bulk yangilash ───

class BulkPriceUpdateRequest(BaseModel):
    pitch_id: UUID
    day_price: float = Field(default=100000.0, description="08:00–17:00 narxi")
    prime_price: float = Field(default=200000.0, description="17:00–23:00 narxi")
    night_price: float = Field(default=150000.0, description="23:00–03:00 narxi")
    only_future: bool = Field(default=True, description="Faqat kelgusi slotlarni yangilash")


@router.post(
    "/slots/bulk-price-update",
    summary="Mavjud AVAILABLE slotlar narxini Smart Pricing bo'yicha bulk yangilash",
)
async def bulk_update_slot_prices(
    payload: BulkPriceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Owner narx shablonini o'zgartirganda, mavjud barcha AVAILABLE slotlar ham shu narxga o'tadi."""
    if current_user.role not in ("owner", "admin", "OWNER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q.")

    p_query = (
        select(Pitch)
        .options(selectinload(Pitch.venue))
        .where(Pitch.id == payload.pitch_id)
    )
    p_res = await db.execute(p_query)
    pitch = p_res.scalar_one_or_none()

    if not pitch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maydoncha topilmadi.")

    venue = pitch.venue
    if current_user.role not in ("admin", "ADMIN") and venue and venue.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu maydon sizga tegishli emas.")

    now = datetime.now(timezone.utc)
    q = select(Slot).where(
        Slot.pitch_id == pitch.id,
        Slot.status == "AVAILABLE",
    )
    if payload.only_future:
        q = q.where(Slot.start_time >= now)

    res = await db.execute(q)
    slots = res.scalars().all()

    updated_count = 0
    for slot in slots:
        hour = slot.start_time.hour
        if 8 <= hour < 17:
            new_price = payload.day_price
        elif 17 <= hour < 23:
            new_price = payload.prime_price
        else:
            new_price = payload.night_price

        if float(slot.price) != new_price:
            slot.price = new_price
            updated_count += 1

    if updated_count > 0:
        await db.commit()

    # Real-time event — o'yinchilar narx o'zgardi deb xabar oladi
    if venue:
        await realtime_hub.notify_venue_change(
            str(venue.id),
            {
                "day_price": payload.day_price,
                "prime_price": payload.prime_price,
                "night_price": payload.night_price,
                "updated_slots_count": updated_count,
            },
        )

    return {
        "success": True,
        "pitch_id": str(pitch.id),
        "updated_count": updated_count,
        "message": f"{updated_count} ta slot narxi Smart Pricing bo'yicha yangilandi va o'yinchilar ekranida real vaqtda aks etdi.",
    }


# ─── Bugungi kun bo'yicha slot statistikasi (Dashboard Pie Chart uchun) ───

@router.get(
    "/venues/{venue_id}/today-stats",
    summary="Owner dashboard uchun bugungi sana bo'yicha slot statistikasi",
)
async def get_today_slot_stats(
    venue_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("owner", "admin", "OWNER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q.")

    v_query = (
        select(Venue)
        .options(selectinload(Venue.pitches))
        .where(Venue.id == venue_id)
    )
    v_res = await db.execute(v_query)
    venue = v_res.scalar_one_or_none()

    if not venue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stadion topilmadi.")

    pitch_ids = [p.id for p in venue.pitches]
    if not pitch_ids:
        return {"total": 0, "available": 0, "booked": 0, "blocked": 0, "manual_booked": 0}

    today = datetime.now(timezone.utc).date()
    start_dt = datetime.combine(today, time.min).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(today, time.max).replace(tzinfo=timezone.utc)

    q = select(Slot).where(
        Slot.pitch_id.in_(pitch_ids),
        Slot.start_time >= start_dt,
        Slot.start_time <= end_dt,
    )
    res = await db.execute(q)
    slots = res.scalars().all()

    stats: Dict[str, int] = {
        "total": len(slots),
        "available": 0,
        "locked": 0,
        "booked": 0,
        "manual_booked": 0,
        "blocked": 0,
    }
    revenue_today = 0.0
    for s in slots:
        st = (s.status or "AVAILABLE").upper()
        if st in stats:
            stats[st] += 1
        if st in ("BOOKED", "MANUAL_BOOKED"):
            revenue_today += float(s.price)

    return {
        **stats,
        "revenue_today": revenue_today,
        "venue_id": str(venue_id),
    }


# ─── Manual Slot Yaratish (Taqvimga yangi soat qo'shish) ───

class ManualSlotCreateRequest(BaseModel):
    pitch_id: UUID
    start_time: datetime
    end_time: datetime
    price: float = Field(..., gt=0)
    status: str = Field(default="AVAILABLE")
    booked_by_name: Optional[str] = None
    booked_by_phone: Optional[str] = None


@router.post(
    "/slots/create",
    summary="Owner tomonidan taqvimga yangi vaqt sloti qo'shish",
)
async def owner_create_slot(
    payload: ManualSlotCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Owner taqvimda bo'sh ko'rinmagan soatni qo'lda qo'shadi."""
    if current_user.role not in ("owner", "admin", "OWNER", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ruxsat yo'q.")

    p_query = (
        select(Pitch)
        .options(selectinload(Pitch.venue))
        .where(Pitch.id == payload.pitch_id)
    )
    p_res = await db.execute(p_query)
    pitch = p_res.scalar_one_or_none()

    if not pitch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maydoncha topilmadi.")

    venue = pitch.venue
    if current_user.role not in ("admin", "ADMIN") and venue and venue.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu maydon sizga tegishli emas.")

    status_val = payload.status.upper()
    is_available = status_val == "AVAILABLE"
    booking_source = "MANUAL_PHONE" if status_val == "MANUAL_BOOKED" else "APP"

    new_slot = Slot(
        pitch_id=pitch.id,
        start_time=payload.start_time.replace(tzinfo=timezone.utc) if payload.start_time.tzinfo is None else payload.start_time,
        end_time=payload.end_time.replace(tzinfo=timezone.utc) if payload.end_time.tzinfo is None else payload.end_time,
        price=payload.price,
        is_available=is_available,
        status=status_val,
        booking_source=booking_source,
        booked_by_name=payload.booked_by_name,
        booked_by_phone=payload.booked_by_phone,
        source="manual",
    )
    db.add(new_slot)
    try:
        await db.commit()
        await db.refresh(new_slot)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Slot yaratishda xatolik (ehtimol vaqt kesishuvi): {str(e)}")

    # Real-time xabar
    await realtime_hub.notify_slot_change(
        slot_id=str(new_slot.id),
        pitch_id=str(new_slot.pitch_id),
        status=new_slot.status,
        is_available=new_slot.is_available,
        price=float(new_slot.price),
        venue_id=str(venue.id) if venue else None,
    )

    return {
        "success": True,
        "slot_id": str(new_slot.id),
        "status": new_slot.status,
        "start_time": new_slot.start_time.isoformat(),
        "end_time": new_slot.end_time.isoformat(),
        "price": float(new_slot.price),
        "message": "Yangi slot muvaffaqiyatli qo'shildi.",
    }


# ─── Owner/Admin: Login va Parol O'rnatish ────────────────────────────────────

class SetCredentialsRequest(BaseModel):
    username: str = Field(
        ..., min_length=3, max_length=50,
        pattern=r'^[a-z0-9_\.]+$',
        description="Faqat kichik harf, raqam va _ . belgisi. Masalan: arena_toshkent"
    )
    password: str = Field(..., min_length=8, description="Kamida 8 ta belgi")
    current_password: Optional[str] = Field(
        default=None,
        description="Agar oldin parol o'rnatilgan bo'lsa, eski parolni kiriting"
    )


@router.post(
    "/set-credentials",
    summary="Owner/Admin o'zi uchun login va parol o'rnatish yoki yangilash",
)
async def set_credentials(
    payload: SetCredentialsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lifecycle:
    1. Player Telegram orqali kiradi
    2. Admin CRM'dan rolni 'owner' ga o'zgartiradi
    3. Shundan so'ng bu endpoint paydo bo'ladi va Owner o'ziga login+parol yaratadi
    4. Keyingi safar ilovaga yoki veb-panelga login+parol bilan kiradi
    """
    if current_user.role.lower() not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faqat maydon egalari va adminlar kirish kaliti yarata oladi"
        )

    username_clean = payload.username.strip().lower()

    # Agar oldin parol o'rnatilgan bo'lsa, eski parolni tekshirish
    if current_user.is_credentials_set and current_user.password_hash:
        if not payload.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parolni o'zgartirish uchun eski parolni kiriting (current_password)"
            )
        if not verify_password(payload.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Eski parol noto'g'ri"
            )

    # Username band emasligini tekshirish
    existing_q = await db.execute(
        select(User).where(
            User.username == username_clean,
            User.id != current_user.id,  # o'zidan boshqa birov
        )
    )
    if existing_q.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"'{username_clean}' login allaqachon band. Boshqa login tanlang."
        )

    new_hash = hash_password(payload.password)

    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(
            username=username_clean,
            password_hash=new_hash,
            is_credentials_set=True,
        )
    )
    await db.commit()

    action = "yangilandi" if current_user.is_credentials_set else "yaratildi"
    return {
        "success": True,
        "username": username_clean,
        "is_credentials_set": True,
        "message": f"Login va parol muvaffaqiyatli {action}. Endi ilovaga yoki veb-panelga '{username_clean}' login orqali kira olasiz.",
    }
