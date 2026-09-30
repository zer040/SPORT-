"""
Sport+ — FastAPI Application Entry Point.
Dasturni ishga tushirish, middleware, exception handler va router'larni ulash.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.database import close_db, init_db
from app.core.dependencies import close_redis
from app.core.exceptions import SportPlusException

logger = logging.getLogger(__name__)

# ─── Logging sozlash ─────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup va shutdown hodisalari."""
    logger.info("🚀 Sport+ backend ishga tushmoqda...")

    # Development rejimida jadvallarni yaratish
    if settings.APP_ENV == "development":
        try:
            await init_db()
            logger.info("✅ Database jadvallar yaratildi (development mode)")
        except Exception as e:
            logger.warning(f"⚠️ Database ulanmadi ({e}). Docker/PostgreSQL yoqilganligini tekshiring.")

    # ─── Telegram Bot Integratsiyasi (Webhook -> Polling fallback) ───
    bot_task = None
    if settings.TELEGRAM_BOT_TOKEN:
        from app.services.telegram_bot import (
            bot,
            dp,
            setup_bot_webhook,
            remove_bot_webhook,
        )
        webhook_success = False

        # 1. Agar TELEGRAM_WEBHOOK_URL ko'rsatilgan bo'lsa, webhook o'rnatishga harakat qilamiz
        if settings.TELEGRAM_WEBHOOK_URL and settings.TELEGRAM_WEBHOOK_URL.startswith("http"):
            try:
                webhook_url = f"{settings.TELEGRAM_WEBHOOK_URL.rstrip('/')}{settings.API_V1_PREFIX}/telegram-webhook"
                logger.info(f"🔗 Telegram webhook o'rnatilmoqda: {webhook_url}")
                await setup_bot_webhook(webhook_url)
                webhook_success = True
                logger.info("✅ Telegram Webhook muvaffaqiyatli ishga tushirildi!")
            except Exception as e:
                logger.warning(f"⚠️ Telegram webhook sozlashda xatolik: {e}. Polling rejimiga o'tilmoqda...")
                webhook_success = False

        # 2. Agar Webhook sozlanmagan bo'lsa yoki xatolik bersa -> Avtomatik Polling rejimiga o'tamiz
        if not webhook_success:
            logger.info("🤖 Telegram Webhook ishlamayapti yoki berilmagan. Polling rejimiga o'tilmoqda...")
            async def _start_bot_background():
                try:
                    await asyncio.wait_for(bot.delete_webhook(drop_pending_updates=True), timeout=2.0)
                    await dp.start_polling(bot)
                    logger.info("✅ Telegram Bot POLLING rejimida muvaffaqiyatli ishga tushirildi!")
                except Exception as e:
                    logger.warning(f"⚠️ Telegram Bot fonida ulanish: {e}")

            bot_task = asyncio.create_task(_start_bot_background())

    logger.info("✅ Sport+ backend tayyor!")
    yield

    # Graceful shutdown
    logger.info("🛑 Sport+ backend to'xtamoqda...")
    if bot_task:
        logger.info("🛑 Telegram bot polling to'xtatilmoqda...")
        bot_task.cancel()
        try:
            await bot_task
        except (asyncio.CancelledError, Exception):
            pass
    elif settings.TELEGRAM_WEBHOOK_URL:
        try:
            from app.services.telegram_bot import remove_bot_webhook
            await remove_bot_webhook()
        except Exception:
            pass

    try:
        from app.services.telegram_bot import bot
        await bot.session.close()
    except Exception:
        pass

    try:
        await close_redis()
    except Exception:
        pass
    try:
        await close_db()
    except Exception:
        pass
    logger.info("✅ Barcha ulanishlar yopildi.")


def create_app() -> FastAPI:
    """Application factory — FastAPI instance yaratish."""

    app = FastAPI(
        title=settings.APP_NAME,
        description="Lokal futbol marketplace va booking platformasi — Solo Play, Matchmaking, Split Payment",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # ─── CORS Middleware ──────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ─── Exception Handlers ──────────────────
    @app.exception_handler(SportPlusException)
    async def sport_plus_exception_handler(request: Request, exc: SportPlusException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": exc.status_code,
                    "message": exc.detail,
                },
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Kutilmagan xatolik: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": 500,
                    "message": "Ichki server xatoligi." if not settings.DEBUG else str(exc),
                },
            },
        )

    # ─── Health Check ────────────────────────
    @app.get("/health", tags=["System"])
    async def health_check():
        return {
            "status": "healthy",
            "service": settings.APP_NAME,
            "version": "1.0.0",
            "environment": settings.APP_ENV,
        }

    # ─── Static Fayllarni ulash (Rasmlar, uploads, admin) ──
    from pathlib import Path
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    static_path = Path(__file__).resolve().parent / "static"
    static_path.mkdir(parents=True, exist_ok=True)
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

    admin_dir = static_path / "admin"
    admin_index = admin_dir / "index.html"

    # Admin Panel routes
    @app.get("/admin", include_in_schema=False)
    @app.get("/admin/", include_in_schema=False)
    async def serve_admin_panel():
        if admin_index.exists():
            return FileResponse(str(admin_index), media_type="text/html")
        return JSONResponse({"status": "ready", "message": "Admin paneli tayyorlanmoqda."})

    # Fail-safe static routes for admin.css and admin.js
    @app.get("/admin.css", include_in_schema=False)
    @app.get("/admin/admin.css", include_in_schema=False)
    async def serve_admin_css():
        return FileResponse(str(admin_dir / "admin.css"), media_type="text/css")

    @app.get("/admin.js", include_in_schema=False)
    @app.get("/admin/admin.js", include_in_schema=False)
    async def serve_admin_js():
        return FileResponse(str(admin_dir / "admin.js"), media_type="text/javascript")

    # ─── API Router'larni ulash ──────────────
    from app.api.router import api_router

    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return app


# Uvicorn uchun app instance
app = create_app()
