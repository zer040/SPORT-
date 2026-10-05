"""
Telegram Auth & Notification Service.
Telegram orqali 0 so'm xarajatli OTP autentifikatsiyasi va
Stadion egalariga (Owner) Telegram orqali jonli bron xabarnomasi yuborish.
"""

import json
import logging
import random
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

import httpx
import redis.asyncio as redis
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import (
    InvalidOTPError,
    OTPExpiredError,
    ValidationError,
)
from app.core.security import create_access_token, create_refresh_token
from app.models.solo_player_profile import SoloPlayerProfile
from app.models.user import User

logger = logging.getLogger(__name__)


class TelegramAuthService:
    def __init__(self, db: AsyncSession, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.bot_username = settings.TELEGRAM_BOT_USERNAME

    async def init_auth(self) -> Dict[str, Any]:
        """
        Telegram Deep-Link avtorizatsiyasini boshlash.
        Ilova uchun unikal auth_token va deep-link yaratadi.
        """
        auth_token = secrets.token_hex(16)
        key = f"tg_auth:{auth_token}"

        await self.redis.set(
            key,
            json.dumps({"status": "pending", "created_at": datetime.now(timezone.utc).isoformat()}),
            ex=300,  # 5 daqiqa amal qiladi
        )

        deep_link = f"tg://resolve?domain={self.bot_username}&start=auth_{auth_token}"
        web_link = f"https://t.me/{self.bot_username}?start=auth_{auth_token}"

        return {
            "success": True,
            "auth_token": auth_token,
            "bot_username": self.bot_username,
            "deep_link": deep_link,
            "web_link": web_link,
            "expires_in": 300,
        }

    async def process_telegram_bot_start(
        self,
        auth_token: str,
        telegram_id: int,
        first_name: str = "",
        last_name: str = "",
        username: str = "",
        phone_number: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Telegram botda /start auth_<token> bosilganda chaqiriladi.
        6-xonali OTP kod generatsiya qilinadi va Telegram foydalanuvchisiga yuboriladi.
        """
        auth_key = f"tg_auth:{auth_token}"
        exists = await self.redis.exists(auth_key)
        if not exists:
            # Token muddati o'tgan bo'lsa ham foydalanuvchini ro'yxatdan o'tkazamiz
            pass

        # 6-xonali kod generatsiya qilish
        if settings.APP_ENV == "development" and auth_token.startswith("dev"):
            code = "123456"
        else:
            code = f"{random.randint(100000, 999999)}"

        otp_key = f"tg_otp:{auth_token}"
        otp_payload = {
            "code": code,
            "telegram_id": telegram_id,
            "first_name": first_name,
            "last_name": last_name,
            "username": username,
            "phone_number": phone_number,
        }

        # OTP 180 soniya (3 daqiqa) saqlanadi
        await self.redis.set(otp_key, json.dumps(otp_payload), ex=180)
        await self.redis.set(auth_key, json.dumps({"status": "code_generated", "telegram_id": telegram_id}), ex=300)

        # Haqiqiy Telegram Bot API orqali xabar yuborish
        if self.bot_token:
            await self._send_telegram_otp_message(
                telegram_id=telegram_id,
                code=code,
            )

        logger.info(f"📱 Telegram OTP generated for TG User {telegram_id} ({first_name}): [{code}]")

        return {
            "success": True,
            "message": "Tasdiqlash kodi Telegram orqali yuborildi.",
            "code": code if settings.APP_ENV == "development" else None,
            "expires_in": 180,
        }

    async def verify_otp(
        self,
        auth_token: str,
        code: str,
        phone_number: Optional[str] = None,
        full_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Foydalanuvchi ilovada Telegram orqali olgan 6 xonali OTP kodini tasdiqlashi.
        Foydalanuvchini bazada topadi yoki yangi yaratadi va JWT token beradi.
        """
        otp_key = f"tg_otp:{auth_token}"
        stored_data = await self.redis.get(otp_key)

        data = None
        if stored_data:
            data = json.loads(stored_data.decode("utf-8") if isinstance(stored_data, bytes) else stored_data)
        else:
            # 1. Agar tg_otp:auth_<token> shaklida saqlangan bo'lsa
            if not auth_token.startswith("auth_"):
                alt_stored = await self.redis.get(f"tg_otp:auth_{auth_token}")
                if alt_stored:
                    data = json.loads(alt_stored.decode("utf-8") if isinstance(alt_stored, bytes) else alt_stored)

            # 2. session:<auth_token> orqali tekshirish
            if not data:
                session_code = await self.redis.get(f"session:{auth_token}")
                if not session_code and not auth_token.startswith("auth_"):
                    session_code = await self.redis.get(f"session:auth_{auth_token}")
                if session_code:
                    s_code = session_code.decode("utf-8") if isinstance(session_code, bytes) else session_code
                    if s_code == code.strip():
                        tg_id = await self.redis.get(f"otp:{s_code}")
                        if tg_id:
                            telegram_id_val = int(tg_id.decode("utf-8") if isinstance(tg_id, bytes) else tg_id)
                            data = {
                                "code": s_code,
                                "telegram_id": telegram_id_val,
                                "first_name": "",
                                "last_name": "",
                            }

            # 3. Haqiqiy Telegram Bot yaratgan otp:<code> kalitidan tekshirish (universal fallback)
            if not data:
                tg_id = await self.redis.get(f"otp:{code.strip()}")
                if tg_id:
                    telegram_id_val = int(tg_id.decode("utf-8") if isinstance(tg_id, bytes) else tg_id)
                    data = {
                        "code": code.strip(),
                        "telegram_id": telegram_id_val,
                        "first_name": "",
                        "last_name": "",
                    }

        if not data:
            raise OTPExpiredError("Tasdiqlash kodi eskirgan yoki topilmadi. Qaytadan urinib ko'ring.")

        if data["code"] != code.strip():
            raise InvalidOTPError("Kiritilgan tasdiqlash kodi noto'g'ri.")

        # Kod to'g'ri — OTP ni o'chiramiz
        await self.redis.delete(otp_key)
        await self.redis.delete(f"tg_otp:auth_{auth_token}")
        await self.redis.delete(f"tg_auth:{auth_token}")
        await self.redis.delete(f"otp:{code.strip()}")

        telegram_id = data["telegram_id"]
        tg_first_name = data.get("first_name", "")
        tg_last_name = data.get("last_name", "")

        # Foydalanuvchini qidirish
        query = select(User).where(User.telegram_id == telegram_id)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()

        is_new_user = False

        if not user:
            # Agar telefon raqam berilgan bo'lsa, telefon bo'yicha ham tekshiramiz
            if phone_number:
                ph_query = select(User).where(User.phone_number == phone_number)
                ph_res = await self.db.execute(ph_query)
                user = ph_res.scalar_one_or_none()
                if user:
                    user.telegram_id = telegram_id
                    user.is_verified = True

            if not user:
                # Yangi foydalanuvchi yaratish
                calculated_name = full_name or f"{tg_first_name} {tg_last_name}".strip() or f"Sportchi {str(telegram_id)[-4:]}"
                is_completed = bool(phone_number and full_name)

                user = User(
                    telegram_id=telegram_id,
                    phone_number=phone_number,
                    full_name=calculated_name,
                    role="player",
                    is_active=True,
                    is_verified=True,
                    is_profile_completed=is_completed,
                    last_login_at=datetime.now(timezone.utc),
                )
                self.db.add(user)
                await self.db.flush()

                # Solo Player profilini ochish
                solo_profile = SoloPlayerProfile(
                    user_id=user.id,
                    is_looking_for_game=False,
                    reliability_score=100.00,
                )
                self.db.add(solo_profile)
                is_new_user = True
        else:
            user.last_login_at = datetime.now(timezone.utc)
            user.is_verified = True
            if phone_number and not user.phone_number:
                user.phone_number = phone_number
            if full_name and not user.full_name:
                user.full_name = full_name

        await self.db.commit()
        await self.db.refresh(user)

        # JWT Tokenlar
        payload = {
            "sub": str(user.id),
            "role": user.role,
            "telegram_id": user.telegram_id,
            "phone": user.phone_number,
        }
        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "is_new_user": is_new_user,
            "is_profile_completed": user.is_profile_completed,
            "user": {
                "id": str(user.id),
                "telegram_id": user.telegram_id,
                "phone_number": user.phone_number,
                "full_name": user.full_name,
                "role": user.role,
                "avatar_url": user.avatar_url,
                "rating": float(user.rating),
                "is_profile_completed": user.is_profile_completed,
            },
        }

    async def complete_profile(
        self,
        user_id: UUID,
        phone_number: str,
        full_name: str,
    ) -> Dict[str, Any]:
        """Yangi ro'yxatdan o'tgan foydalanuvchi profilini to'ldirish."""
        phone = phone_number.strip().replace(" ", "").replace("-", "")
        if not phone.startswith("+998") or len(phone) != 13:
            raise ValidationError("Telefon raqami +998901234567 formatida bo'lishi kerak.")

        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise ValidationError("Foydalanuvchi topilmadi.")

        user.phone_number = phone
        user.full_name = full_name.strip()
        user.is_profile_completed = True

        await self.db.commit()
        await self.db.refresh(user)

        return {
            "success": True,
            "message": "Profil muvaffaqiyatli saqlandi.",
            "user": {
                "id": str(user.id),
                "phone_number": user.phone_number,
                "full_name": user.full_name,
                "role": user.role,
                "is_profile_completed": user.is_profile_completed,
            },
        }

    async def notify_owner_of_booking(
        self,
        owner_telegram_id: int,
        booking_id: UUID,
        venue_name: str,
        pitch_name: str,
        start_time_str: str,
        end_time_str: str,
        customer_name: str,
        customer_phone: str,
        service_fee: float,
        remaining_balance: float,
    ) -> bool:
        """
        10,000 UZS kafolat to'lovi to'langach, maydon egasiga Telegram orqali
        tasdiqlash / rad etish tugmalari bilan tezkor xabar yuborish.
        """
        if not self.bot_token or not owner_telegram_id:
            logger.info(f"Owner notification simulated for TG ID {owner_telegram_id} on booking {booking_id}")
            return True

        message_text = (
            f"⚡ <b>Yangi Bron Qilindi!</b>\n\n"
            f"🏟 <b>Stadion:</b> {venue_name} ({pitch_name})\n"
            f"⏰ <b>Vaqt:</b> {start_time_str} - {end_time_str}\n"
            f"👤 <b>Mijoz:</b> {customer_name} ({customer_phone})\n\n"
            f"🛡 <b>Platforma kafolat to'lovi:</b> {service_fee:,.0f} UZS (To'langan)\n"
            f"💵 <b>Joyida olinadigan summa:</b> {remaining_balance:,.0f} UZS\n\n"
            f"<i>Iltimos, 5 daqiqa ichida bronni tasdiqlang yoki rad eting:</i>"
        )

        inline_keyboard = {
            "inline_keyboard": [
                [
                    {"text": "✅ Tasdiqlayman", "callback_data": f"owner_confirm:{booking_id}"},
                    {"text": "❌ Rad etish", "callback_data": f"owner_reject:{booking_id}"},
                ]
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
                resp = await client.post(
                    url,
                    json={
                        "chat_id": owner_telegram_id,
                        "text": message_text,
                        "parse_mode": "HTML",
                        "reply_markup": inline_keyboard,
                    },
                )
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Error sending Telegram notification to owner: {e}")
            return False

    async def _send_telegram_otp_message(self, telegram_id: int, code: str):
        """Telegram Bot API orqali OTP yuborish."""
        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        text = (
            f"⚽ <b>Sport+ | Avtorizatsiya Kodi</b>\n\n"
            f"Sizning bir martalik kirish kodingiz:\n\n"
            f"👉 <code>{code}</code> 👈\n\n"
            f"⏱ Kod <b>3 daqiqa</b> davomida amal qiladi.\n"
            f"Xavfsizlik uchun ushbu kodni hech kimga aytmang!"
        )

        inline_keyboard = {
            "inline_keyboard": [
                [
                    {
                        "text": "📲 Ilovaga qaytish (Avto-kod)",
                        "url": f"sportplus://auth?code={code}",
                    }
                ]
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    url,
                    json={
                        "chat_id": telegram_id,
                        "text": text,
                        "parse_mode": "HTML",
                        "reply_markup": inline_keyboard,
                    },
                )
        except Exception as e:
            logger.warn(f"Failed to send Telegram message via bot API: {e}")
