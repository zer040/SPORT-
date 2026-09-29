"""
Auth API Endpoints — OTP yuborish, tasdiqlash, JWT yangilash va profil ma'lumotlari.
"""

from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.dependencies import get_redis
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User
from app.schemas.auth import (
    OTPSendRequest,
    OTPVerifyRequest,
    RefreshTokenRequest,
)
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.services.telegram_bot import redis_client as bot_redis

router = APIRouter()



@router.post(
    "/send-otp",
    status_code=status.HTTP_200_OK,
    summary="SMS tasdiqlash kodi yuborish",
)
async def send_otp(
    payload: OTPSendRequest,
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = AuthService(db, redis_client)
    return await service.send_otp(payload.phone_number)


@router.post(
    "/verify-otp",
    status_code=status.HTTP_200_OK,
    summary="OTP kodini tasdiqlash va JWT token olish",
)
async def verify_otp(
    payload: OTPVerifyRequest,
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = AuthService(db, redis_client)
    result = await service.verify_otp(payload.phone_number, payload.code)
    # Agar yangi user bo'lsa va ism berilgan bo'lsa, yangilaymiz
    if payload.full_name and result.get("is_new_user"):
        user_id = result["user"]["id"]
        from sqlalchemy import update
        from uuid import UUID
        await db.execute(
            update(User)
            .where(User.id == UUID(user_id))
            .values(full_name=payload.full_name)
        )
        await db.commit()
        result["user"]["full_name"] = payload.full_name

    return result


@router.post(
    "/refresh",
    status_code=status.HTTP_200_OK,
    summary="Access tokenni refresh qilish",
)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = AuthService(db, redis_client)
    return await service.refresh_tokens(payload.refresh_token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Joriy foydalanuvchi ma'lumotlarini olish",
)
async def get_me(
    current_user: Any = Depends(get_current_user),
):
    if isinstance(current_user, dict):
        return current_user
    first_name = current_user.full_name.split()[0] if current_user.full_name else ""
    last_name = " ".join(current_user.full_name.split()[1:]) if current_user.full_name and len(current_user.full_name.split()) > 1 else ""
    return {
        "id": current_user.id,
        "phone_number": current_user.phone_number,
        "full_name": current_user.full_name,
        "first_name": first_name,
        "last_name": last_name,
        "avatar_url": current_user.avatar_url,
        "role": current_user.role,
        "rating": float(current_user.rating) if current_user.rating else 5.0,
        "total_games": current_user.total_games,
        "is_active": current_user.is_active,
        "is_verified": True,
        "is_profile_completed": current_user.is_profile_completed,
        "has_seen_tutorial": getattr(current_user, "has_seen_tutorial", False),
        "created_at": current_user.created_at,
    }


# ─── Telegram Bot OTP Auth ───────────────────────────────────

class VerifyTelegramOtpRequest(BaseModel):
    code: str

class CompleteRegistrationRequest(BaseModel):
    telegram_id: int
    first_name: str
    last_name: str
    phone_number: str

@router.post("/verify-telegram-otp", summary="Telegram OTP kodini tasdiqlash")
async def verify_telegram_otp(
    payload: VerifyTelegramOtpRequest,
    db: Optional[AsyncSession] = Depends(get_db),
):
    # 1. Kodni Redis / xavfsiz keshtizimidan tekshirish
    telegram_id_str = await bot_redis.get(f"otp:{payload.code}")

    if not telegram_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kod eskirgan yoki noto'g'ri kiritilgan"
        )
    
    telegram_id = int(telegram_id_str)
    
    # 2. Kod ishlatib bo'lingach, Redis dan o'chirish (bir martalik bo'lishi uchun)
    await bot_redis.delete(f"otp:{payload.code}")

    # 3. Bazadan ushbu telegram_id bo'yicha foydalanuvchini qidirish
    user = None
    if db is not None:
        try:
            result = await db.execute(select(User).where(User.telegram_id == telegram_id))
            user = result.scalar_one_or_none()
        except Exception:
            user = None

    # Keshdan tekshirish (DB yo'q yoki xatolik bo'lsa)
    if not user:
        from app.services.user_cache import get_cached_user_by_telegram_id
        cached = get_cached_user_by_telegram_id(telegram_id)
        if cached and cached.get("is_profile_completed"):
            access_token = create_access_token(data={"sub": str(cached["id"]), "role": cached.get("role", "player")})
            refresh_token = create_refresh_token(data={"sub": str(cached["id"])})
            return {
                "status": "EXISTING_USER",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": cached,
                "show_welcome_back": True,
                "is_first_login": False
            }

    # 4. Agar user yangi bo'lsa yoki profil to'ldirilmagan bo'lsa:
    if not user or not user.is_profile_completed:
        return {
            "status": "NEW_USER",
            "telegram_id": telegram_id,
            "message": "Profilni to'ldiring"
        }

    # 5. Qayta kirgan eski foydalanuvchi -> JWT tokenlar beriladi
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    first_name = user.full_name.split()[0] if user.full_name else ""
    last_name = " ".join(user.full_name.split()[1:]) if user.full_name and len(user.full_name.split()) > 1 else ""
    user_full_name = user.full_name or f"{first_name} {last_name}".strip()

    return {
        "status": "EXISTING_USER",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(user.id),
            "full_name": user_full_name,
            "first_name": first_name,
            "last_name": last_name,
            "phone_number": user.phone_number,
            "role": user.role
        },
        "show_welcome_back": True,
        "is_first_login": False
    }

@router.post("/complete-registration", summary="Telegram orqali to'liq ro'yxatdan o'tish")
async def complete_registration(
    payload: CompleteRegistrationRequest,
    db: AsyncSession = Depends(get_db)
):
    full_name = f"{payload.first_name} {payload.last_name}".strip()

    user_id = f"tg_{payload.telegram_id}"
    if db is not None:
        try:
            # Foydalanuvchini qidirish
            result = await db.execute(select(User).where(User.telegram_id == payload.telegram_id))
            user = result.scalar_one_or_none()

            if not user:
                user = User(
                    telegram_id=payload.telegram_id,
                    full_name=full_name,
                    phone_number=payload.phone_number,
                    role="player",
                    is_profile_completed=True
                )
                db.add(user)
            else:
                user.full_name = full_name
                user.phone_number = payload.phone_number
                user.is_profile_completed = True

            await db.commit()
            await db.refresh(user)
            user_id = str(user.id)
        except Exception:
            user_id = f"tg_{payload.telegram_id}"

    # Doimiy keshga saqlash (DB o'chiq bo'lsa ham yo'qolmasligi uchun)
    from app.services.user_cache import save_cached_user
    user_dict = {
        "id": user_id,
        "telegram_id": payload.telegram_id,
        "full_name": full_name,
        "first_name": payload.first_name,
        "last_name": payload.last_name,
        "phone_number": payload.phone_number,
        "role": "player",
        "rating": 5.0,
        "total_games": 0,
        "is_active": True,
        "is_profile_completed": True,
        "is_verified": True,
    }
    save_cached_user(user_dict)

    # JWT berish
    access_token = create_access_token(data={"sub": user_id, "role": "player"})
    refresh_token = create_refresh_token(data={"sub": user_id})

    return {
        "status": "REGISTERED",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user_dict,
        "is_first_login": True,
        "show_welcome_back": False
    }




