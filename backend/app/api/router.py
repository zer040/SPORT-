"""
API Router — barcha sub-router'larni birlashtiruvchi bosh router.
"""

from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.admin_auth import router as admin_auth_router
from app.api.auth import router as auth_router
from app.api.bookings import router as bookings_router
from app.api.matches import router as matches_router
from app.api.owner import router as owner_router
from app.api.payments.click import router as click_router
from app.api.payments.payme import router as payme_router
from app.api.pitches import router as pitches_router
from app.api.reviews import router as reviews_router
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

# ─── Reviews & Ratings ────────────────────────
api_router.include_router(reviews_router, prefix="/reviews", tags=["Reviews & Ratings"])

# ─── Pitches ──────────────────────────────────
api_router.include_router(pitches_router, prefix="/pitches", tags=["Pitches"])

# ─── Slots ────────────────────────────────────
api_router.include_router(slots_router, prefix="/slots", tags=["Slots"])

# ─── Bookings ─────────────────────────────────
api_router.include_router(bookings_router, prefix="/bookings", tags=["Bookings"])

# ─── Owner Management ────────────────────────
api_router.include_router(owner_router, prefix="/owner", tags=["Owner Management"])

# ─── Admin Auth & Dashboard ──────────────────
api_router.include_router(admin_auth_router, prefix="/admin/auth", tags=["Admin Auth"])
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

# ─── iOS Live Activities & Dynamic Island ─────
from app.api.live_activity import router as live_activity_router
api_router.include_router(live_activity_router, prefix="/live-activities", tags=["Live Activities & Dynamic Island"])

# ─── Telegram Bot Webhook ────────────────────
from typing import Dict, Any
from app.services.telegram_bot import process_telegram_update

@api_router.post("/telegram-webhook", summary="Telegram Webhook update qabul qilish", tags=["Telegram Bot"])
@api_router.post("/telegram/webhook", summary="Telegram Webhook update qabul qilish (muqobil)", tags=["Telegram Bot"])
async def telegram_webhook_handler(update: Dict[str, Any]):
    """Telegram serveridan kelgan yangilanishni dp.feed_update orqali qayta ishlash"""
    await process_telegram_update(update)
    return {"ok": True}


# ─── Live Real-Time WebSockets (Owner-Player Instant Sync) ───
from fastapi import WebSocket, WebSocketDisconnect
from app.core.events import realtime_hub
from app.core.websocket_manager import ws_manager

@api_router.websocket("/ws/live")
async def live_websocket_endpoint(websocket: WebSocket):
    """
    Global Real-Time WebSocket:
    Owner slot yoki narxni o'zgartirganda barcha ulanganlar real vaqtda xabar oladi.
    Events: SLOT_UPDATED, VENUE_UPDATED
    """
    await realtime_hub.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep-alive ping/pong
    except WebSocketDisconnect:
        await realtime_hub.disconnect(websocket)
    except Exception:
        await realtime_hub.disconnect(websocket)


@api_router.websocket("/ws/venue/{venue_id}")
async def venue_websocket_endpoint(websocket: WebSocket, venue_id: str):
    """
    Venue-specific Real-Time WebSocket Room:
    Faqat shu venue sahifasini ochgan o'yinchilar shu venue'ning slot o'zgarishlarini oladi.
    Bu barcha broadcast o'rniga targeted event delivery ta'minlaydi.
    Events: slot:held, slot:booked, slot:released, slot:updated
    """
    await ws_manager.connect(websocket, venue_id)
    try:
        while True:
            msg = await websocket.receive_text()  # Keep-alive ping/pong
            # Owner ping yuborsa — pong qaytaramiz
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, venue_id)
    except Exception:
        ws_manager.disconnect(websocket, venue_id)

