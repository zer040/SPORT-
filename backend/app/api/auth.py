"""
Auth API Endpoints — OTP yuborish, tasdiqlash, JWT yangilash va profil ma'lumotlari.
Credential login (Owner/Admin uchun username+password) ham shu modulda.
"""

import secrets
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
import redis.asyncio as redis
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.dependencies import get_redis
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
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


# ─── Credential Login (Owner / Admin uchun) ──────────────────────────────────

class CredentialsLoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Login (username)")
    password: str = Field(..., min_length=6, description="Parol")


@router.post(
    "/login-credentials",
    summary="Owner/Admin uchun username + parol bilan kirish",
)
async def login_with_credentials(
    payload: CredentialsLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Faqat Owner va Admin roli uchun.
    Player bu yo'nalishdan foydalana olmaydi — ular Telegram OTP orqali kiradi.
    """
    result = await db.execute(
        select(User).where(User.username == payload.username.strip().lower())
    )
    user = result.scalar_one_or_none()

    # Xavfsizlik: ikkala xatoni ham bir xil xabar bilan qaytaramiz
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login yoki parol noto'g'ri",
        )

    if user.role.lower() not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu kirish usuli faqat maydon egalari va adminlar uchun",
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login yoki parol noto'g'ri",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hisob bloklangan. Administrator bilan bog'laning.",
        )

    # Last login yangilash
    from datetime import datetime, timezone
    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(last_login_at=datetime.now(timezone.utc))
    )
    await db.commit()

    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role}
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "status": "EXISTING_USER",
        "user": {
            "id": str(user.id),
            "full_name": user.full_name,
            "username": user.username,
            "role": user.role,
            "is_credentials_set": user.is_credentials_set,
            "avatar_url": user.avatar_url,
        },
    }



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
        return {
            "id": current_user.get("id"),
            "telegram_id": current_user.get("telegram_id"),
            "phone_number": current_user.get("phone_number"),
            "full_name": current_user.get("full_name") or f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip(),
            "first_name": current_user.get("first_name"),
            "last_name": current_user.get("last_name"),
            "avatar_url": current_user.get("avatar_url"),
            "role": current_user.get("role", "player"),
            "rating": float(current_user.get("rating", 5.0)),
            "total_games": current_user.get("total_games", 0),
            "is_active": current_user.get("is_active", True),
            "is_verified": current_user.get("is_verified", True),
            "is_profile_completed": current_user.get("is_profile_completed", True),
            "has_seen_tutorial": current_user.get("has_seen_tutorial", False),
            "username": current_user.get("username"),
            "is_credentials_set": current_user.get("is_credentials_set", False),
            "created_at": current_user.get("created_at"),
        }
    fn = current_user.first_name or (current_user.full_name.split()[0] if current_user.full_name else "")
    ln = current_user.last_name or (" ".join(current_user.full_name.split()[1:]) if current_user.full_name and len(current_user.full_name.split()) > 1 else "")
    return {
        "id": current_user.id,
        "telegram_id": current_user.telegram_id,
        "phone_number": current_user.phone_number,
        "full_name": current_user.full_name,
        "first_name": fn,
        "last_name": ln,
        "avatar_url": current_user.avatar_url,
        "role": current_user.role,
        "rating": float(current_user.rating) if current_user.rating else 5.0,
        "total_games": current_user.total_games,
        "is_active": current_user.is_active,
        "is_verified": True,
        "is_profile_completed": current_user.is_profile_completed,
        "has_seen_tutorial": getattr(current_user, "has_seen_tutorial", False),
        "username": getattr(current_user, "username", None),
        "is_credentials_set": getattr(current_user, "is_credentials_set", False),
        "created_at": current_user.created_at,
    }



# ─── Telegram Bot OTP Auth ───────────────────────────────────

class VerifyTelegramOtpRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6, description="6-xonali OTP kod")

class CompleteRegistrationRequest(BaseModel):
    telegram_id: int
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    phone_number: str = Field(..., min_length=13, max_length=13, pattern=r"^\+998\d{9}$")


@router.post(
    "/telegram-start",
    summary="Telegram avtorizatsiyani boshlash (Deep-link va bot ma'lumotlari)",
)
async def telegram_start(
    db: Optional[AsyncSession] = Depends(get_db),
    redis_client: Optional[redis.Redis] = Depends(get_redis),
):
    """
    Mobil ilovadan Telegram orqali kirish bosilganda chaqiriladi.
    Bot username va sessiya deep-linkini qaytaradi.
    """
    bot_username = getattr(settings, "TELEGRAM_BOT_USERNAME", "sport_plus_uz_bot")
    session_id = secrets.token_hex(8)

    if redis_client:
        try:
            await redis_client.setex(f"tg_session:{session_id}", 600, "INITIATED")
        except Exception:
            pass

    deep_link = f"tg://resolve?domain={bot_username}&start=auth_{session_id}"
    web_link = f"https://t.me/{bot_username}?start=auth_{session_id}"

    return {
        "success": True,
        "bot_username": bot_username,
        "session_id": session_id,
        "deep_link": deep_link,
        "web_link": web_link,
        "message": "Telegram sessiyasi boshlandi",
    }


@router.post("/verify-telegram-otp", summary="Telegram OTP kodini tasdiqlash")
async def verify_telegram_otp(
    payload: VerifyTelegramOtpRequest,
    db: Optional[AsyncSession] = Depends(get_db),
):
    """
    Spec flow:
      1. Read Redis `otp:<code>` → telegram_id
      2. Delete immediately (one-time use)
      3. If user exists & is_profile_completed: return EXISTING_USER + JWT + full profile
      4. If user missing or incomplete: return NEW_USER + telegram_id
    """
    telegram_id_str = await bot_redis.get(f"otp:{payload.code}")

    if not telegram_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kod eskirgan yoki noto'g'ri kiritilgan",
        )

    telegram_id = int(telegram_id_str)

    # Immediately delete — one-time use
    await bot_redis.delete(f"otp:{payload.code}")

    # Find user in DB
    user = None
    if db is not None:
        try:
            result = await db.execute(
                select(User).where(User.telegram_id == telegram_id)
            )
            user = result.scalar_one_or_none()
        except Exception:
            user = None

    # Fallback to persistent cache
    if not user:
        from app.services.user_cache import get_cached_user_by_telegram_id
        cached = get_cached_user_by_telegram_id(telegram_id)
        if cached and cached.get("is_profile_completed"):
            access_token = create_access_token(
                data={"sub": str(cached["id"]), "role": cached.get("role", "player"), "telegram_id": telegram_id}
            )
            refresh_token = create_refresh_token(data={"sub": str(cached["id"])})
            return {
                "status": "EXISTING_USER",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": cached,
                "show_welcome_back": True,
                "is_first_login": False,
            }

    # NEW_USER path: bazada bo'lmasa avtomatik yaratish
    if not user:
        if db is not None:
            try:
                from datetime import datetime, timezone
                from app.models.solo_player_profile import SoloPlayerProfile
                user = User(
                    telegram_id=telegram_id,
                    full_name=f"Sportchi {str(telegram_id)[-4:]}",
                    role="player",
                    is_active=True,
                    is_verified=True,
                    is_profile_completed=True,
                    last_login_at=datetime.now(timezone.utc),
                )
                db.add(user)
                await db.flush()
                solo_profile = SoloPlayerProfile(
                    user_id=user.id,
                    is_looking_for_game=False,
                    reliability_score=100.00,
                )
                db.add(solo_profile)
                await db.commit()
                await db.refresh(user)
            except Exception:
                user = None

    if not user:
        return {
            "status": "NEW_USER",
            "telegram_id": telegram_id,
        }

    # EXISTING_USER — issue JWT tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role, "telegram_id": user.telegram_id}
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return {
        "status": "EXISTING_USER",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(user.id),
            "telegram_id": user.telegram_id,
            "first_name": user.first_name or (user.full_name.split()[0] if user.full_name else ""),
            "last_name": user.last_name or (" ".join(user.full_name.split()[1:]) if user.full_name and len(user.full_name.split()) > 1 else ""),
            "phone_number": user.phone_number,
            "role": user.role,
        },
        "show_welcome_back": True,
        "is_first_login": False,
    }


@router.post("/complete-registration", summary="Yangi foydalanuvchi profilini to'ldirish")
async def complete_registration(
    payload: CompleteRegistrationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Spec flow:
      1. Accept telegram_id, first_name, last_name, phone_number
      2. Update/create user, set is_profile_completed = True
      3. Commit to DB, issue JWT tokens
    """
    full_name = f"{payload.first_name} {payload.last_name}".strip()
    user_id = f"tg_{payload.telegram_id}"

    if db is not None:
        try:
            result = await db.execute(
                select(User).where(User.telegram_id == payload.telegram_id)
            )
            user = result.scalar_one_or_none()

            if not user:
                user = User(
                    telegram_id=payload.telegram_id,
                    full_name=full_name,
                    first_name=payload.first_name,
                    last_name=payload.last_name,
                    phone_number=payload.phone_number,
                    role="player",
                    is_profile_completed=True,
                )
                db.add(user)
            else:
                user.full_name = full_name
                user.first_name = payload.first_name
                user.last_name = payload.last_name
                user.phone_number = payload.phone_number
                user.is_profile_completed = True

            await db.commit()
            await db.refresh(user)
            user_id = str(user.id)
        except Exception:
            user_id = f"tg_{payload.telegram_id}"

    # Persist to fallback cache
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

    access_token = create_access_token(
        data={"sub": user_id, "role": "player", "telegram_id": payload.telegram_id}
    )
    refresh_token = create_refresh_token(data={"sub": user_id})

    return {
        "status": "REGISTERED",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user_dict,
        "is_first_login": True,
        "show_welcome_back": False,
    }

