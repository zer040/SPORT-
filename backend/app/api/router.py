"""
API Router — barcha sub-router'larni birlashtiruvchi bosh router.
"""

from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.bookings import router as bookings_router
from app.api.matches import router as matches_router
from app.api.owner import router as owner_router
from app.api.payments.click import router as click_router
from app.api.payments.payme import router as payme_router
from app.api.pitches import router as pitches_router
from app.api.slots import router as slots_router
from app.api.solo_profile import router as solo_profile_router
from app.api.telegram_auth import router as telegram_auth_router
from app.api.venues import router as venues_router

api_router = APIRouter()

# ─── Auth ─────────────────────────────────────
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(telegram_auth_router, prefix="/auth/telegram", tags=["Telegram Auth"])

# ─── Venues ───────────────────────────────────
api_router.include_router(venues_router, prefix="/venues", tags=["Venues"])

# ─── Pitches ──────────────────────────────────
api_router.include_router(pitches_router, prefix="/pitches", tags=["Pitches"])

# ─── Slots ────────────────────────────────────
api_router.include_router(slots_router, prefix="/slots", tags=["Slots"])

# ─── Bookings ─────────────────────────────────
api_router.include_router(bookings_router, prefix="/bookings", tags=["Bookings"])

# ─── Owner Management ────────────────────────
api_router.include_router(owner_router, prefix="/owner", tags=["Owner Management"])

# ─── Admin Dashboard ─────────────────────────
api_router.include_router(admin_router, prefix="/admin", tags=["Admin Dashboard"])

# ─── Analytics & Live Metrics (Real-Time Redis & DB) ─────────
from app.api.analytics import router as analytics_router
api_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(analytics_router, prefix="/admin/analytics", tags=["Admin Real Analytics"])

# ─── Solo Play Matches ───────────────────────
api_router.include_router(matches_router, prefix="/matches", tags=["Solo Play Matches"])

# ─── Solo Profile ────────────────────────────
api_router.include_router(solo_profile_router, prefix="/solo-profile", tags=["Solo Profile"])

# ─── Payments ────────────────────────────────
from app.api.payments.checkout import router as checkout_router
api_router.include_router(click_router, prefix="/payments/click", tags=["Payments - Click"])
api_router.include_router(payme_router, prefix="/payments/payme", tags=["Payments - Payme"])
api_router.include_router(checkout_router, prefix="/payments", tags=["Payments - Checkout"])

# ─── Telegram Bot Webhook ────────────────────
from typing import Dict, Any
from app.services.telegram_bot import process_telegram_update

@api_router.post("/telegram-webhook", summary="Telegram Webhook update qabul qilish", tags=["Telegram Bot"])
async def telegram_webhook_handler(update: Dict[str, Any]):
    """Telegram serveridan kelgan yangilanishni dp.feed_update orqali qayta ishlash"""
    await process_telegram_update(update)
    return {"ok": True}

