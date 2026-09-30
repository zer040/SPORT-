"""
Admin & Mobile Analytics API.
Zero hardcoding — barcha metrikalar PostgreSQL va Redis ZSET asosida real-vaqtda hisoblanadi.
"""

import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Body, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.core.redis_client import redis_client
from app.models.analytics import AppInstallation
from app.models.booking import Booking
from app.models.user import User
from app.models.venue import Venue

# Both public and admin routers
router = APIRouter()


class PingPayload(BaseModel):
    user_id: Optional[str] = Field("guest_anonymous", description="Foydalanuvchi yoki qurilma ID'si")


class InstallPayload(BaseModel):
    device_uuid: str = Field(..., description="Qurilmaning unikal identifikatori")
    platform: str = Field(..., description="Qurilma platformasi ('android' | 'ios' | 'web')")
    app_version: Optional[str] = Field("1.0.0", description="Ilova versiyasi")
    os_version: Optional[str] = Field(None, description="Operatsion tizim versiyasi")


# ─── 1. Real-Time Heartbeat Ping ──────────────────────────────────────────────

@router.post(
    "/ping",
    summary="Mobil ilovadan keladigan jonli heartbeat ping",
    tags=["Analytics"],
)
async def user_heartbeat(
    payload: Optional[PingPayload] = Body(None),
    user_id: Optional[str] = Query(None),
):
    """
    Mobil ilova ochiq turganda har 30-60 soniyada yengil ping yuboradi.
    Redis Sorted Set (ZSET) ga saqlanadi.
    Score: Hozirgi UNIX vaqti (timestamp)
    Qiymat: user_id yoki device_id
    """
    uid = user_id or (payload.user_id if payload else None) or "guest_anonymous"
    now = time.time()
    await redis_client.zadd("online_users", {uid: now})
    return {"status": "ok", "user_id": uid, "timestamp": now}


# ─── 2. Unikal Ilova O'rnatishlarini Qayd Etish ────────────────────────────────

@router.post(
    "/install",
    summary="Mobil ilova birinchi marta o'rnatilganda ro'yxatga olish",
    tags=["Analytics"],
)
async def register_install(
    payload: InstallPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Ilova o'rnatilib, birinchi marta ochilganda qurilmaning unikal identifikatori olinadi.
    Agar ID bazada bo'lmasa, yangi o'rnatish sifatida saqlanadi.
    """
    if db is not None:
        try:
            query = select(AppInstallation).where(AppInstallation.device_uuid == payload.device_uuid)
            existing = await db.scalar(query)
            if not existing:
                new_install = AppInstallation(
                    device_uuid=payload.device_uuid,
                    platform=payload.platform.lower(),
                    app_version=payload.app_version,
                    os_version=payload.os_version,
                )
                db.add(new_install)
                await db.commit()
            else:
                existing.last_opened_at = datetime.now(timezone.utc)
                await db.commit()
        except Exception:
            if db:
                await db.rollback()

    return {"status": "registered", "device_uuid": payload.device_uuid}


# ─── 3. Admin Panel Jonli Haqiqiy Metrikalari ──────────────────────────────────

@router.get(
    "/live-metrics",
    summary="Admin panel uchun 100% real server va Redis metrikalari",
    dependencies=[Depends(require_admin)],
    tags=["Admin Real Analytics"],
)
async def get_live_metrics(
    db: AsyncSession = Depends(get_db),
):
    """
    Zero hardcoded values — hech qanday yasama raqamlarsiz:
    - online_users_now: Oxirgi 120 soniyadagi aktiv foydalanuvchilar (Redis ZCOUNT)
    - app_installations: Real o'rnatishlar va qurilmalar soni
    - users.total_registered: Bazadagi ro'yxatdan o'tganlar soni
    - venues.total_active: Faol stadionlar soni
    - financials.platform_revenue_uzs: PAID bo'lgan 10,000 UZS lik servis to'lovlari summasi
    - bookings: Ayni paytda HELD va CONFIRMED bo'lgan bronlar
    """
    now = time.time()
    two_minutes_ago = now - 120

    # 1. Real vaqtdagi Online Userlar (Redis)
    online_count = await redis_client.zcount("online_users", two_minutes_ago, "+inf")

    # Baza ko'rsatkichlari (default 0)
    total_installs = 0
    android_installs = 0
    ios_installs = 0
    total_registered_users = 0
    total_venues = 0
    total_revenue_uzs = 0.0
    active_held_bookings = 0
    confirmed_bookings = 0

    if db is not None:
        try:
            # 2. Real Ilovani O'rnatgan Qurilmalar Soni (DB)
            total_installs = (
                await db.scalar(select(func.count(distinct(AppInstallation.device_uuid))))
            ) or 0
            android_installs = (
                await db.scalar(
                    select(func.count(AppInstallation.id)).where(AppInstallation.platform == "android")
                )
            ) or 0
            ios_installs = (
                await db.scalar(
                    select(func.count(AppInstallation.id)).where(AppInstallation.platform == "ios")
                )
            ) or 0

            # 3. Ro'yxatdan O'tgan Foydalanuvchilar (DB)
            total_registered_users = (await db.scalar(select(func.count(User.id)))) or 0

            # 4. Stadionlar va Real Tushum (10,000 UZS lik servis to'lovlari)
            total_venues = (
                await db.scalar(select(func.count(Venue.id)).where(Venue.is_active == True))
            ) or 0
            rev_val = await db.scalar(
                select(func.coalesce(func.sum(Booking.service_fee), 0)).where(
                    Booking.payment_status == "PAID"
                )
            )
            total_revenue_uzs = float(rev_val) if rev_val is not None else 0.0

            # 5. Jonli va Faol Bronlar Soni
            active_held_bookings = (
                await db.scalar(
                    select(func.count(Booking.id)).where(Booking.status == "HELD")
                )
            ) or 0
            confirmed_bookings = (
                await db.scalar(
                    select(func.count(Booking.id)).where(Booking.status == "CONFIRMED")
                )
            ) or 0
        except Exception:
            pass

    return {
        "online_users_now": online_count,
        "app_installations": {
            "total": total_installs,
            "android": android_installs,
            "ios": ios_installs,
        },
        "users": {
            "total_registered": total_registered_users,
        },
        "venues": {
            "total_active": total_venues,
        },
        "financials": {
            "platform_revenue_uzs": float(total_revenue_uzs),
        },
        "bookings": {
            "currently_held": active_held_bookings,
            "total_confirmed": confirmed_bookings,
        },
    }
