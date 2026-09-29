"""
Telegram Auth API Endpoints.
SMS xarajatini 0 ga tushirish: Telegram Deep-Link + OTP autentifikatsiyasi.
"""

from fastapi import APIRouter, Depends, status
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.dependencies import get_redis
from app.models.user import User
from app.schemas.telegram_auth import (
    CompleteProfileRequest,
    TelegramBotWebhookRequest,
    TelegramInitAuthResponse,
    TelegramSimulateStartRequest,
    TelegramVerifyOTPRequest,
)
from app.services.telegram_auth_service import TelegramAuthService

router = APIRouter()


@router.post(
    "/init",
    response_model=TelegramInitAuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Telegram Deep-Link avtorizatsiyasini boshlash",
)
async def init_telegram_auth(
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = TelegramAuthService(db, redis_client)
    return await service.init_auth()


@router.post(
    "/simulate-start",
    status_code=status.HTTP_200_OK,
    summary="Dev/Test: Telegram Botda /start bosilishini simulyatsiya qilish",
)
async def simulate_bot_start(
    payload: TelegramSimulateStartRequest,
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = TelegramAuthService(db, redis_client)
    return await service.process_telegram_bot_start(
        auth_token=payload.auth_token,
        telegram_id=payload.telegram_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        username=payload.username,
    )


@router.post(
    "/verify-otp",
    status_code=status.HTTP_200_OK,
    summary="Telegram orqali kelgan OTP kodini tekshirish va JWT olish",
)
async def verify_telegram_otp(
    payload: TelegramVerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = TelegramAuthService(db, redis_client)
    return await service.verify_otp(
        auth_token=payload.auth_token,
        code=payload.code,
        phone_number=payload.phone_number,
        full_name=payload.full_name,
    )


@router.post(
    "/complete-profile",
    status_code=status.HTTP_200_OK,
    summary="Telegram orqali yangi kirgan foydalanuvchi profilini to'ldirish",
)
async def complete_profile(
    payload: CompleteProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = TelegramAuthService(db, redis_client)
    return await service.complete_profile(
        user_id=current_user.id,
        phone_number=payload.phone_number,
        full_name=payload.full_name,
    )


@router.post(
    "/bot-webhook",
    status_code=status.HTTP_200_OK,
    summary="Telegram Bot Webhook Update qabul qilish",
)
async def telegram_bot_webhook(
    payload: TelegramBotWebhookRequest,
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = TelegramAuthService(db, redis_client)

    # 1. Start komandasi tekshiruvi: /start auth_<token>
    if payload.message and "text" in payload.message:
        text = payload.message.get("text", "")
        if text.startswith("/start auth_"):
            auth_token = text.replace("/start auth_", "").strip()
            user_info = payload.message.get("from", {})
            return await service.process_telegram_bot_start(
                auth_token=auth_token,
                telegram_id=user_info.get("id"),
                first_name=user_info.get("first_name", ""),
                last_name=user_info.get("last_name", ""),
                username=user_info.get("username", ""),
            )

    # 2. Callback query tekshiruvi (Owner confirm/reject tugmalari)
    if payload.callback_query:
        cb_data = payload.callback_query.get("data", "")
        from uuid import UUID
        from app.models.booking import Booking
        from sqlalchemy import select

        if cb_data.startswith("owner_confirm:"):
            booking_id_str = cb_data.replace("owner_confirm:", "").strip()
            b_query = select(Booking).where(Booking.id == UUID(booking_id_str))
            res = await db.execute(b_query)
            booking = res.scalar_one_or_none()
            if booking:
                booking.owner_confirmation_status = "ACCEPTED"
                booking.status = "CONFIRMED"
                await db.commit()
                return {"status": "ok", "action": "confirmed"}

        elif cb_data.startswith("owner_reject:"):
            booking_id_str = cb_data.replace("owner_reject:", "").strip()
            b_query = select(Booking).where(Booking.id == UUID(booking_id_str))
            res = await db.execute(b_query)
            booking = res.scalar_one_or_none()
            if booking:
                booking.owner_confirmation_status = "REJECTED"
                booking.status = "CANCELLED"
                booking.payment_status = "REFUNDED"
                await db.commit()
                return {"status": "ok", "action": "rejected_and_refunded"}

    return {"status": "ok"}
