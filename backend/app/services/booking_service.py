"""
Booking Service — Slotlarni bron qilish, tasdiqlash va bekor qilish biznes logikasi.

Xavfsizlik va Concurrency:
- Deadlock prevention: Har qanday bir nechta slot bron qilinganda ID bo'yicha deterministik tartiblash (ORDER BY id ASC).
- Redis Distributed Lock (Lua script + fencing token) va PostgreSQL SELECT FOR UPDATE kombinatsiyasi.
- Timezone muammolarini bartaraf qilish uchun barcha vaqtlar qat'iy UTC da saqlanadi va hisoblanadi.
- Real-time WebSocket broadcasting integratsiyasi.
"""

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.distributed_lock import SlotLock
from app.core.exceptions import (
    BookingAlreadyConfirmedError,
    BookingExpiredError,
    BookingNotFoundError,
    InsufficientPermissionError,
    SlotAlreadyHeldError,
    SlotNotAvailableError,
)
from app.core.websocket_manager import manager as ws_manager
from app.models.booking import Booking
from app.models.pitch import Pitch
from app.models.slot import Slot
from app.models.user import User
from app.models.venue import Venue
from app.services.cancellation_service import CancellationResult, calculate_cancellation

logger = logging.getLogger(__name__)


class BookingService:
    def __init__(self, db: AsyncSession, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client

    async def hold_slots(
        self,
        user_id: UUID,
        slot_ids: List[UUID],
        team_id: Optional[UUID] = None,
        notes: Optional[str] = None,
    ) -> Booking:
        """
        Bir yoki bir nechta slotni xavfsiz HELD holatiga o'tkazish.
        DEADLOCK PREVENTION: Slotlar qat'iy ID bo'yicha tartiblangan holda locklanadi.
        """
        if not slot_ids:
            raise SlotNotAvailableError("Kamida bitta slot tanlanishi kerak.")

        # 1. Deterministik tartiblash (Deadlock prevention)
        sorted_slot_ids = sorted(slot_ids, key=lambda s: str(s))
        hold_duration_seconds = settings.HOLD_DURATION_MINUTES * 60

        # 2. Redis Distributed Locks olish
        acquired_locks: List[SlotLock] = []
        try:
            for s_id in sorted_slot_ids:
                lock = SlotLock(
                    redis_client=self.redis,
                    slot_id=str(s_id),
                    user_id=str(user_id),
                    hold_duration=hold_duration_seconds,
                )
                if not await lock.acquire():
                    # Agar birorta lock olinmasa, oldingilarini tozalaymiz
                    for prev_lock in acquired_locks:
                        await prev_lock.release()
                    raise SlotAlreadyHeldError(
                        f"Slot {s_id} boshqa foydalanuvchi tomonidan band qilinmoqda."
                    )
                acquired_locks.append(lock)

            # 3. PostgreSQL Transaction: FOR UPDATE bilan slotlarni tekshirish va band qilish
            # ORDER BY id ASC bilan deadlock xavfi nolga tenglashtiriladi
            query = (
                select(Slot)
                .where(
                    Slot.id.in_(sorted_slot_ids),
                    Slot.is_available.is_(True),
                )
                .order_by(Slot.id.asc())
                .with_for_update()
            )
            result = await self.db.execute(query)
            slots = result.scalars().all()

            if len(slots) != len(sorted_slot_ids):
                raise SlotNotAvailableError(
                    "Tanlangan slotlardan ba'zilari allaqachon band yoki mavjud emas."
                )

            # 4. Narxlarni hisoblash va slotlarni mavjud emas deb belgilash
            total_price = Decimal("0.00")
            primary_slot = slots[0]

            for slot in slots:
                total_price += Decimal(str(slot.price))
                slot.is_available = False

            service_fee = float(settings.BOOKING_SERVICE_FEE_UZS)
            venue_remaining = max(0.0, float(total_price) - service_fee)

            held_until = datetime.now(timezone.utc) + timedelta(
                minutes=settings.HOLD_DURATION_MINUTES
            )

            # Booking yaratish (birlamchi slot bilan bog'lanadi)
            booking = Booking(
                user_id=user_id,
                team_id=team_id,
                slot_id=primary_slot.id,
                status="HELD",
                total_price=float(total_price),
                service_fee=service_fee,
                venue_remaining_amount=venue_remaining,
                paid_amount=0.00,
                payment_status="UNPAID",
                owner_confirmation_status="PENDING",
                held_until=held_until,
                notes=notes,
            )
            self.db.add(booking)
            await self.db.flush()

            # Multi-slot yozuvlarini booking_slots ga kiritish
            from sqlalchemy import text
            for s in slots:
                await self.db.execute(
                    text("INSERT INTO booking_slots (booking_id, slot_id) VALUES (:b_id, :s_id) ON CONFLICT DO NOTHING"),
                    {"b_id": booking.id, "s_id": s.id},
                )

            await self.db.commit()
            await self.db.refresh(booking)

            # 5. Real-time WebSocket orqali xabar yuborish
            # Slot tegishli bo'lgan pitch orqali venue topiladi
            pitch_query = (
                select(Slot)
                .options(selectinload(Slot.pitch))
                .where(Slot.id == primary_slot.id)
            )
            slot_res = await self.db.execute(pitch_query)
            loaded_slot = slot_res.scalar_one_or_none()
            if loaded_slot and loaded_slot.pitch:
                venue_id = str(loaded_slot.pitch.venue_id)
                await ws_manager.broadcast_slot_held(
                    venue_id=venue_id,
                    slot_id=str(primary_slot.id),
                    user_id=str(user_id),
                    held_until=held_until.isoformat(),
                )

            logger.info(
                f"Booking held successfully: {booking.id} (fee: {service_fee} UZS, remaining: {venue_remaining} UZS) by user {user_id} until {held_until}"
            )
            return booking

        except Exception as e:
            # Xatolik bo'lsa, barcha Redis qulflarini darhol bo'shatamiz
            for lock in acquired_locks:
                await lock.release()
            await self.db.rollback()
            logger.error(f"Error holding slots for user {user_id}: {e}")
            raise

    async def confirm_booking(
        self,
        booking_id: UUID,
        user_id: UUID,
        payment_amount: Optional[Decimal] = None,
    ) -> Booking:
        """
        HELD holatidagi bronni 10,000 UZS to'lovdan so'ng CONFIRMED holatiga o'tkazish
        va maydon egasiga Telegram orqali xabarnoma yuborish.
        """
        query = (
            select(Booking)
            .options(
                selectinload(Booking.user),
                selectinload(Booking.slot).selectinload(Slot.pitch).selectinload(Pitch.venue).selectinload(Venue.owner),
            )
            .where(Booking.id == booking_id)
            .with_for_update()
        )
        result = await self.db.execute(query)
        booking = result.scalar_one_or_none()

        if not booking:
            raise BookingNotFoundError()

        if booking.user_id != user_id:
            raise InsufficientPermissionError("Ushbu bron sizga tegishli emas.")

        if booking.status == "CONFIRMED":
            raise BookingAlreadyConfirmedError()

        if booking.status != "HELD":
            raise BookingExpiredError(f"Bron holati yaroqsiz: {booking.status}")

        now = datetime.now(timezone.utc)
        if now > booking.held_until:
            booking.status = "EXPIRED"
            if booking.slot:
                booking.slot.is_available = True
            await self.db.commit()
            raise BookingExpiredError("Bron vaqti tugagan. Qaytadan urinib ko'ring.")

        booking.status = "CONFIRMED"
        booking.confirmed_at = now
        booking.payment_status = "PAID"
        booking.paid_amount = float(payment_amount) if payment_amount else float(booking.service_fee or 10000.0)

        await self.db.commit()
        await self.db.refresh(booking)

        # Redis lockni tozalash
        lock = SlotLock(self.redis, str(booking.slot_id), str(user_id))
        await lock.release()

        # Maydon egasiga Telegram bildirishnoma yuborish
        try:
            venue = booking.slot.pitch.venue if booking.slot and booking.slot.pitch else None
            owner = venue.owner if venue else None
            if owner and (owner.telegram_id or owner.telegram_chat_id):
                owner_tg_id = owner.telegram_id or owner.telegram_chat_id
                from app.services.telegram_auth_service import TelegramAuthService
                tg_svc = TelegramAuthService(self.db, self.redis)
                await tg_svc.notify_owner_of_booking(
                    owner_telegram_id=owner_tg_id,
                    booking_id=booking.id,
                    venue_name=venue.name,
                    pitch_name=booking.slot.pitch.name,
                    start_time_str=booking.slot.start_time.strftime("%H:%M"),
                    end_time_str=booking.slot.end_time.strftime("%H:%M"),
                    customer_name=booking.user.full_name if booking.user else "Sportchi",
                    customer_phone=booking.user.phone_number if booking.user else "-",
                    service_fee=float(booking.service_fee or 10000.0),
                    remaining_balance=float(booking.venue_remaining_amount or 0.0),
                )
        except Exception as e:
            logger.warn(f"Failed to dispatch owner Telegram notification: {e}")

        # WebSocket orqali band qilinganligini e'lon qilish
        if booking.slot and booking.slot.pitch:
            venue_id = str(booking.slot.pitch.venue_id)
            await ws_manager.broadcast_slot_booked(
                venue_id=venue_id,
                slot_id=str(booking.slot_id),
                booking_id=str(booking.id),
            )

        logger.info(f"Booking confirmed: {booking.id} (fee paid: {booking.paid_amount}) for user {user_id}")
        return booking

    async def cancel_booking(
        self,
        booking_id: UUID,
        user_id: UUID,
        user_role: str = "player",
        reason: Optional[str] = None,
    ) -> tuple[Booking, CancellationResult]:
        """
        Bronni bekor qilish va jarima/qaytarish siyosatini qo'llash.
        """
        query = (
            select(Booking)
            .options(selectinload(Booking.slot).selectinload(Slot.pitch))
            .where(Booking.id == booking_id)
            .with_for_update()
        )
        result = await self.db.execute(query)
        booking = result.scalar_one_or_none()

        if not booking:
            raise BookingNotFoundError()

        # Ruxsat tekshiruvi: faqat egasi yoki admin/owner bekor qilishi mumkin
        if user_role not in ("admin", "owner") and booking.user_id != user_id:
            raise InsufficientPermissionError("Sizda ushbu bronni bekor qilish ruxsati yo'q.")

        if booking.status in ("CANCELLED", "COMPLETED", "EXPIRED"):
            raise SlotNotAvailableError(f"Bu bron allaqachon {booking.status} holatida.")

        cancelled_by = "owner" if user_role in ("admin", "owner") else "user"
        slot_start_time = booking.slot.start_time if booking.slot else datetime.now(timezone.utc)

        # Bekor qilish siyosati bo'yicha hisoblash
        cancellation_res = calculate_cancellation(
            booking_total=Decimal(str(booking.paid_amount or booking.total_price)),
            slot_start_time=slot_start_time,
            cancelled_by=cancelled_by,
        )

        booking.status = "CANCELLED"
        booking.cancelled_at = datetime.now(timezone.utc)
        booking.cancellation_reason = reason or cancellation_res.penalty_reason

        # Slotni qayta bo'shatish
        if booking.slot:
            booking.slot.is_available = True

        await self.db.commit()
        await self.db.refresh(booking)

        # Redis lock tozalash
        lock = SlotLock(self.redis, str(booking.slot_id), str(booking.user_id))
        await lock.release()

        # WebSocket xabari: Slot yana bo'shadi
        if booking.slot and booking.slot.pitch:
            venue_id = str(booking.slot.pitch.venue_id)
            await ws_manager.broadcast_slot_released(
                venue_id=venue_id,
                slot_id=str(booking.slot_id),
            )

        logger.info(
            f"Booking {booking.id} cancelled by {cancelled_by}. Refund: {cancellation_res.refund_amount} UZS ({cancellation_res.refund_percent}%)"
        )
        return booking, cancellation_res

    async def get_booking_by_id(self, booking_id: UUID) -> Optional[Booking]:
        """Bronni to'liq bog'liqliklari bilan olish."""
        query = (
            select(Booking)
            .options(
                selectinload(Booking.slot).selectinload(Slot.pitch),
                selectinload(Booking.user),
                selectinload(Booking.payments),
            )
            .where(Booking.id == booking_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_bookings(
        self,
        user_id: UUID,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Booking]:
        """Foydalanuvchining barcha bronlari ro'yxati."""
        query = (
            select(Booking)
            .options(
                selectinload(Booking.slot).selectinload(Slot.pitch),
            )
            .where(Booking.user_id == user_id)
            .order_by(Booking.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if status:
            query = query.where(Booking.status == status)

        result = await self.db.execute(query)
        return list(result.scalars().all())
