"""
Matchmaking Service — Solo Play va jamoaviy ochiq o'yinlar mexanizmi.

Imkoniyatlar:
- Host-Based Match: Mavjud booking asosida do'stlar va solo o'yinchilarni to'plash.
- Draft Match: Hali maydon band qilinmagan holda geopozitsiya bo'yicha jamoa yig'ish.
- Concurrency Protection: Redis MatchLock yordamida parallel join so'rovlarida race condition oldi olinadi.
- Quorum Engine: Kvorum yig'ilganda avtomatik QUORUM_MET holatiga o'tish va Escrow bloklash.
- PostGIS Geolocation: Foydalanuvchining lokatsiyasi bo'yicha radiusda o'yinlarni qidirish.
"""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_DWithin, ST_GeogFromText
import redis.asyncio as redis
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.distributed_lock import MatchLock
from app.core.exceptions import (
    AlreadyParticipantError,
    InsufficientPermissionError,
    MatchClosedError,
    MatchFullError,
    MatchNotFoundError,
    NotParticipantError,
    SoloPlayerBannedError,
    ValidationError,
)
from app.models.booking import Booking
from app.models.escrow_payment import EscrowPayment
from app.models.match_participant import MatchParticipant
from app.models.pitch import Pitch
from app.models.public_match import PublicMatch
from app.models.slot import Slot
from app.models.solo_player_profile import SoloPlayerProfile
from app.models.user import User
from app.schemas.match import MatchCreateDraft, MatchCreateHostBased, MatchJoinRequest
from app.services.cancellation_service import calculate_cancellation

logger = logging.getLogger(__name__)


class MatchmakingService:
    def __init__(self, db: AsyncSession, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client

    async def create_host_based_match(
        self,
        host_id: UUID,
        payload: MatchCreateHostBased,
    ) -> PublicMatch:
        """
        Host-Based match yaratish.
        Host allaqachon bron qilgan slotiga solo o'yinchilarni taklif qiladi va xarajatni bo'lishadi.
        """
        # Bronni va uning slotini tekshirish
        booking_query = (
            select(Booking)
            .options(
                selectinload(Booking.slot).selectinload(Slot.pitch).selectinload(Pitch.venue)
            )
            .where(Booking.id == payload.booking_id)
        )
        result = await self.db.execute(booking_query)
        booking = result.scalar_one_or_none()

        if not booking:
            raise ValidationError("Ko'rsatilgan bron topilmadi.")

        if booking.user_id != host_id:
            raise InsufficientPermissionError("Faqat bron egasi o'yin yarata oladi.")

        if booking.status not in ("HELD", "CONFIRMED"):
            raise ValidationError(f"Bron holati mos kelmaydi: {booking.status}")

        slot = booking.slot
        pitch = slot.pitch
        venue = pitch.venue

        match = PublicMatch(
            match_type="HOST_BASED",
            status="FORMING",
            host_id=host_id,
            booking_id=booking.id,
            venue_id=venue.id,
            pitch_id=pitch.id,
            slot_id=slot.id,
            location=venue.location,
            start_time=slot.start_time,
            end_time=slot.end_time,
            required_players=payload.required_players,
            confirmed_players=1,
            price_per_player=float(payload.price_per_player),
            total_pitch_price=float(booking.total_price),
            skill_level=payload.skill_level,
            gender_preference=payload.gender_preference,
            auto_approve=payload.auto_approve,
            description=payload.description,
        )
        self.db.add(match)
        await self.db.flush()

        # Hostni avtomatik ravishda birinchi ishtirokchi qilib qo'shish
        host_participant = MatchParticipant(
            match_id=match.id,
            user_id=host_id,
            status="PAID",
            role="HOST",
            paid_amount=float(payload.price_per_player),
            confirmed_arrival=False,
        )
        self.db.add(host_participant)

        await self.db.commit()
        await self.db.refresh(match)

        logger.info(f"Host-based match created: {match.id} by host {host_id}")
        return match

    async def create_draft_match(
        self,
        host_id: UUID,
        payload: MatchCreateDraft,
    ) -> PublicMatch:
        """
        Draft match yaratish.
        Maydon hali tanlanmagan yoki to'lanmagan. O'yinchilar to'plangach, maydon tanlanadi.
        """
        location_geom = WKTElement(f"POINT({payload.lon} {payload.lat})", srid=4326)

        match = PublicMatch(
            match_type="DRAFT",
            status="FORMING",
            host_id=host_id,
            booking_id=None,
            venue_id=None,
            pitch_id=None,
            slot_id=None,
            location=location_geom,
            start_time=payload.start_time,
            end_time=payload.end_time,
            required_players=payload.required_players,
            confirmed_players=1,
            price_per_player=float(payload.price_per_player),
            skill_level=payload.skill_level,
            gender_preference=payload.gender_preference,
            preferred_pitch_size=payload.preferred_pitch_size,
            auto_approve=payload.auto_approve,
            description=payload.description,
        )
        self.db.add(match)
        await self.db.flush()

        # Hostni birinchi ishtirokchi qilish
        host_participant = MatchParticipant(
            match_id=match.id,
            user_id=host_id,
            status="PAID" if payload.auto_approve else "APPROVED",
            role="HOST",
            paid_amount=float(payload.price_per_player),
        )
        self.db.add(host_participant)

        await self.db.commit()
        await self.db.refresh(match)

        logger.info(f"Draft match created: {match.id} by host {host_id}")
        return match

    async def join_match(
        self,
        match_id: UUID,
        user_id: UUID,
        payload: MatchJoinRequest,
    ) -> MatchParticipant:
        """
        Matchga qo'shilish.
        Race condition prevention uchun Redis MatchLock ishlatiladi.
        """
        lock = MatchLock(self.redis, str(match_id), str(user_id))

        async with lock:
            # 1. Foydalanuvchi ban holatini tekshirish
            profile_query = select(SoloPlayerProfile).where(
                SoloPlayerProfile.user_id == user_id
            )
            prof_res = await self.db.execute(profile_query)
            profile = prof_res.scalar_one_or_none()
            now = datetime.now(timezone.utc)

            if profile and profile.solo_play_ban_until and profile.solo_play_ban_until > now:
                raise SoloPlayerBannedError(
                    f"Siz {profile.solo_play_ban_until.strftime('%Y-%m-%d %H:%M')} gacha bloklangansiz."
                )

            # 2. Match ma'lumotlarini qulflab olish
            match_query = (
                select(PublicMatch)
                .options(selectinload(PublicMatch.participants))
                .where(PublicMatch.id == match_id)
                .with_for_update()
            )
            result = await self.db.execute(match_query)
            match = result.scalar_one_or_none()

            if not match:
                raise MatchNotFoundError()

            if match.status not in ("FORMING", "DRAFT"):
                raise MatchClosedError(f"Bu o'yinga qabul yopilgan (status: {match.status})")

            # Allaqachon a'zomi?
            existing = any(p.user_id == user_id and p.status != "CANCELLED" for p in match.participants)
            if existing:
                raise AlreadyParticipantError()

            # Joy bormi?
            if match.confirmed_players >= match.required_players:
                raise MatchFullError()

            # Ishtirokchi yaratish
            status = "PAID" if match.auto_approve else "PENDING"
            participant = MatchParticipant(
                match_id=match.id,
                user_id=user_id,
                status=status,
                role="PLAYER",
                player_position=payload.player_position,
                message=payload.message,
                paid_amount=float(match.price_per_player) if status == "PAID" else 0.00,
            )
            self.db.add(participant)

            if status == "PAID":
                match.confirmed_players += 1

                # Escrow hisob yozuvi yaratish
                escrow = EscrowPayment(
                    match_id=match.id,
                    user_id=user_id,
                    booking_id=match.booking_id,
                    amount=match.price_per_player,
                    status="HELD",
                    provider="payme",
                )
                self.db.add(escrow)

                # Kvorum tekshiruvi: hamma yig'ildimi?
                if match.confirmed_players >= match.required_players:
                    match.status = "QUORUM_MET"
                    logger.info(
                        f"Match {match.id} reached quorum! ({match.confirmed_players}/{match.required_players})"
                    )

            await self.db.commit()
            await self.db.refresh(participant)

            return participant

    async def leave_match(
        self,
        match_id: UUID,
        user_id: UUID,
    ) -> bool:
        """O'yindan chiqish va to'langan summani siyosat bo'yicha qaytarish."""
        match_query = (
            select(PublicMatch)
            .options(selectinload(PublicMatch.participants))
            .where(PublicMatch.id == match_id)
            .with_for_update()
        )
        result = await self.db.execute(match_query)
        match = result.scalar_one_or_none()

        if not match:
            raise MatchNotFoundError()

        participant = next(
            (p for p in match.participants if p.user_id == user_id and p.status != "CANCELLED"),
            None,
        )
        if not participant:
            raise NotParticipantError()

        if participant.role == "HOST":
            raise ValidationError("O'yin tashkilotchisi (Host) o'yindan chiqa olmaydi. O'yinni bekor qilishi mumkin.")

        # Jarima va qaytarishni hisoblash
        cancellation_res = calculate_cancellation(
            booking_total=Decimal(str(participant.paid_amount)),
            slot_start_time=match.start_time,
            cancelled_by="user",
        )

        participant.status = "CANCELLED"
        if match.confirmed_players > 1:
            match.confirmed_players -= 1

        # Agar kvorum met bo'lgan bo'lsa, yana forming'ga qaytadi
        if match.status == "QUORUM_MET":
            match.status = "FORMING"

        # Escrow yangilash
        escrow_query = select(EscrowPayment).where(
            EscrowPayment.match_id == match.id,
            EscrowPayment.user_id == user_id,
            EscrowPayment.status == "HELD",
        )
        escrow_res = await self.db.execute(escrow_query)
        escrow = escrow_res.scalar_one_or_none()

        if escrow:
            escrow.status = "REFUNDED" if cancellation_res.refund_percent == 100 else "PARTIALLY_REFUNDED"
            escrow.refund_amount = float(cancellation_res.refund_amount)
            escrow.refunded_at = datetime.now(timezone.utc)

        await self.db.commit()
        logger.info(f"User {user_id} left match {match.id}. Refund: {cancellation_res.refund_amount}")
        return True

    async def list_matches(
        self,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        radius_km: float = 15.0,
        skill_level: Optional[str] = None,
        status: str = "FORMING",
        limit: int = 20,
        offset: int = 0,
    ) -> List[PublicMatch]:
        """
        O'yinlar ro'yxatini filtrlash va PostGIS geolokatsiya orqali yaqinlarini topish.
        """
        query = (
            select(PublicMatch)
            .options(
                selectinload(PublicMatch.host),
                selectinload(PublicMatch.venue),
                selectinload(PublicMatch.pitch),
                selectinload(PublicMatch.participants),
            )
            .where(PublicMatch.status == status)
            .order_by(PublicMatch.start_time.asc())
            .limit(limit)
            .offset(offset)
        )

        if skill_level and skill_level != "ANY":
            query = query.where(
                (PublicMatch.skill_level == skill_level) | (PublicMatch.skill_level == "ANY")
            )

        # PostGIS ST_DWithin orqali radius bo'yicha masofa filtri
        if lat is not None and lon is not None:
            user_point = ST_GeogFromText(f"SRID=4326;POINT({lon} {lat})")
            query = query.where(
                ST_DWithin(PublicMatch.location, user_point, radius_km * 1000)
            )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_match_details(self, match_id: UUID) -> Optional[PublicMatch]:
        """Matchning to'liq ma'lumotlarini barcha participant va xabarlari bilan olish."""
        query = (
            select(PublicMatch)
            .options(
                selectinload(PublicMatch.host),
                selectinload(PublicMatch.venue),
                selectinload(PublicMatch.pitch),
                selectinload(PublicMatch.slot),
                selectinload(PublicMatch.participants).selectinload(MatchParticipant.user),
                selectinload(PublicMatch.chat_messages),
            )
            .where(PublicMatch.id == match_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
