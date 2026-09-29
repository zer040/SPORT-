"""
Auth Service — Telefon raqami va OTP orqali autentifikatsiya,
SMS rate-limiting va JWT token generatsiyasi.
"""

import logging
import random
from datetime import datetime, timezone
from typing import Dict, Any

import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import (
    InvalidOTPError,
    InvalidTokenError,
    OTPExpiredError,
    OTPRateLimitError,
    ValidationError,
)
from app.core.security import create_access_token, create_refresh_token, verify_token
from app.models.solo_player_profile import SoloPlayerProfile
from app.models.user import User

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client

    async def send_otp(self, phone_number: str) -> Dict[str, Any]:
        """
        Telefon raqamiga bir martalik SMS tasdiqlash kodi yuborish.
        Rate-limit: Har bir raqam uchun 60 soniyada faqat bitta so'rov.
        """
        phone = phone_number.strip().replace(" ", "").replace("-", "")
        if not phone.startswith("+998") or len(phone) != 13:
            raise ValidationError("Telefon raqami +998901234567 formatida bo'lishi kerak.")

        # Rate limit tekshiruvi
        rate_key = f"otp_rate:{phone}"
        if await self.redis.exists(rate_key):
            ttl = await self.redis.ttl(rate_key)
            raise OTPRateLimitError(f"Iltimos, yangi kod so'rash uchun {ttl} soniya kuting.")

        # 6-xonali kod generatsiya qilish
        if settings.APP_ENV == "development" and phone == "+998901234567":
            code = "123456"
        else:
            code = f"{random.randint(100000, 999999)}"

        otp_key = f"otp:{phone}"
        # OTP 3 daqiqa davomida amal qiladi
        await self.redis.set(otp_key, code, ex=180)
        # Rate limit 60 soniya
        await self.redis.set(rate_key, "1", ex=60)

        # Productionda Eskiz yoki PlayMobile SMS API chaqiriladi
        logger.info(f"🔑 SMS OTP generated for {phone}: [{code}]")

        return {
            "success": True,
            "message": "Tasdiqlash kodi telefon raqamingizga yuborildi.",
            "phone_number": phone,
            "expires_in": 180,
        }

    async def verify_otp(self, phone_number: str, code: str) -> Dict[str, Any]:
        """
        OTP kodini tekshirish, foydalanuvchini ro'yxatdan o'tkazish/tizimga kiritish va token berish.
        """
        phone = phone_number.strip().replace(" ", "").replace("-", "")
        otp_key = f"otp:{phone}"

        stored_code = await self.redis.get(otp_key)
        if not stored_code:
            raise OTPExpiredError("Tasdiqlash kodi eskirgan yoki so'ralmagan.")

        stored_str = stored_code.decode("utf-8") if isinstance(stored_code, bytes) else str(stored_code)
        if stored_str != code.strip():
            raise InvalidOTPError("Kiritilgan tasdiqlash kodi noto'g'ri.")

        # Muvaffaqiyatli tekshirildi — ishlatilgan kodni o'chiramiz
        await self.redis.delete(otp_key)

        # Foydalanuvchini bazadan qidirish
        query = select(User).where(User.phone_number == phone)
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()

        is_new_user = False
        if not user:
            # Yangi foydalanuvchi yaratish
            user = User(
                phone_number=phone,
                full_name=f"Foydalanuvchi {phone[-4:]}",
                role="player",
                is_active=True,
                is_verified=True,
                last_login_at=datetime.now(timezone.utc),
            )
            self.db.add(user)
            await self.db.flush()

            # Solo Player profilini avtomatik yaratish
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

        await self.db.commit()
        await self.db.refresh(user)

        # JWT Tokenlar
        payload = {
            "sub": str(user.id),
            "role": user.role,
            "phone": user.phone_number,
        }
        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "is_new_user": is_new_user,
            "user": {
                "id": str(user.id),
                "phone_number": user.phone_number,
                "full_name": user.full_name,
                "role": user.role,
                "avatar_url": user.avatar_url,
                "rating": float(user.rating),
            },
        }

    async def refresh_tokens(self, refresh_token_str: str) -> Dict[str, str]:
        """Eski refresh token orqali yangi access token olish."""
        payload = verify_token(refresh_token_str, token_type="refresh")
        if not payload:
            raise InvalidTokenError("Refresh token yaroqsiz yoki muddati tugagan.")

        user_id = payload.get("sub")
        query = select(User).where(User.id == user_id, User.is_active.is_(True))
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise InvalidTokenError("Foydalanuvchi topilmadi yoki bloklangan.")

        new_payload = {
            "sub": str(user.id),
            "role": user.role,
            "phone": user.phone_number,
        }
        new_access = create_access_token(new_payload)
        new_refresh = create_refresh_token(new_payload)

        return {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "token_type": "bearer",
        }
