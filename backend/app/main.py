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

    # Database initialization (PostGIS extension va jadvallar)
    try:
        from sqlalchemy import text
        from app.core.database import engine, Base
        async with engine.begin() as conn:
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            except Exception as ext_err:
                logger.debug(f"PostGIS extension skipped ({ext_err})")
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS btree_gist;"))
            except Exception as ext_err:
                logger.debug(f"btree_gist extension skipped ({ext_err})")
            await conn.run_sync(Base.metadata.create_all)
            # Safe schema update for existing tables
            schema_updates = [
                "ALTER TABLE slots ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'AVAILABLE';",
                "ALTER TABLE slots ADD COLUMN IF NOT EXISTS booking_source VARCHAR(20) DEFAULT 'APP';",
                "ALTER TABLE slots ADD COLUMN IF NOT EXISTS booked_by_name VARCHAR(100);",
                "ALTER TABLE slots ADD COLUMN IF NOT EXISTS booked_by_phone VARCHAR(20);",
                "ALTER TABLE slots ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;",
                "ALTER TABLE venues ADD COLUMN IF NOT EXISTS base_price_per_hour NUMERIC(12, 2) DEFAULT 200000.00;",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_credentials_set BOOLEAN DEFAULT false;",
                "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;",
                "ALTER TABLE venues ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;",
                "ALTER TABLE venues ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3, 1) DEFAULT 5.0;",
                "CREATE OR REPLACE VIEW venue_reviews AS SELECT * FROM reviews;",
            ]
            for stmt in schema_updates:
                try:
                    await conn.execute(text(stmt))
                except Exception as stmt_err:
                    logger.debug(f"Schema update statement skipped ({stmt_err})")

            # username ustuni uchun UNIQUE constraint (takroriy xatoni oldini olish)
            try:
                await conn.execute(text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_indexes
                            WHERE tablename = 'users' AND indexname = 'users_username_key'
                        ) THEN
                            CREATE UNIQUE INDEX users_username_key ON users(username) WHERE username IS NOT NULL;
                        END IF;
                    END $$;
                """))
            except Exception as idx_err:
                logger.debug(f"Index creation skipped ({idx_err})")
        logger.info("✅ PostGIS, btree_gist extension va Database jadvallari muvaffaqiyatli tekshirildi/yaratildi")
    except Exception as e:
        logger.warning(f"⚠️ Database ulanmadi yoki jadvallar yaratishda xatolik ({e}). Docker/PostgreSQL sozlamalarini tekshiring.")

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

        # Webhook URL berilgan bo'lsa -> Webhook o'rnatiladi
        use_webhook = bool(
            settings.TELEGRAM_WEBHOOK_URL
            and settings.TELEGRAM_WEBHOOK_URL.strip().startswith("http")
            and (settings.APP_ENV == "production" or "localhost" not in settings.TELEGRAM_WEBHOOK_URL)
        )
        if use_webhook:
            try:
                webhook_url = f"{settings.TELEGRAM_WEBHOOK_URL.rstrip('/')}{settings.API_V1_PREFIX}/telegram-webhook"
                logger.info(f"🔗 Telegram webhook o'rnatilmoqda: {webhook_url}")
                await setup_bot_webhook(webhook_url)
                webhook_success = True
                logger.info(f"✅ Telegram Webhook muvaffaqiyatli ishga tushirildi! ({webhook_url})")
            except Exception as e:
                logger.warning(f"⚠️ Telegram webhook sozlashda xatolik: {e}. Polling rejimiga o'tilmoqda...")
                webhook_success = False

        # Lokal (development) yoki Webhook o'rnatilmagan holatda -> Har doim POLLING
        if not webhook_success:
            logger.info("🤖 Telegram Bot Polling rejimida ishga tushirilmoqda...")
            async def _start_bot_background():
                try:
                    logger.info("🧹 Eski webhook tozalanmoqda...")
                    await bot.delete_webhook(drop_pending_updates=True)
                    logger.info("✅ Telegram Bot POLLING rejimida muvaffaqiyatli tinglashni boshladi!")
                    await dp.start_polling(bot)
                except asyncio.CancelledError:
                    logger.info("🛑 Telegram bot polling to'xtatildi.")
                except Exception as e:
                    logger.warning(f"⚠️ Telegram Bot fonida xatolik: {e}")

            bot_task = asyncio.create_task(_start_bot_background())

    # ─── Live Activity 30-min Countdown Periodic Scheduler ────
    async def _live_activity_periodic_worker():
        from app.workers.booking_tasks import (
            _async_trigger_30min_live_activities,
            _async_cleanup_ended_live_activities,
            _async_cleanup_expired_bookings,
        )
        logger.info("⏱️ Live Activity & Booking periodic worker ishga tushdi.")
        while True:
            try:
                await _async_trigger_30min_live_activities()
                await _async_cleanup_ended_live_activities()
                await _async_cleanup_expired_bookings()
            except asyncio.CancelledError:
                break
            except Exception as loop_err:
                logger.debug(f"Live activity worker tick xatoligi: {loop_err}")
            await asyncio.sleep(60)

    live_activity_task = asyncio.create_task(_live_activity_periodic_worker())

    logger.info("✅ Sport+ backend tayyor!")
    yield

    # Graceful shutdown
    logger.info("🛑 Sport+ backend to'xtamoqda...")
    if live_activity_task:
        live_activity_task.cancel()
        try:
            await live_activity_task
        except (asyncio.CancelledError, Exception):
            pass

    if bot_task:
        logger.info("🛑 Telegram bot polling to'xtatilmoqda...")
        bot_task.cancel()
        try:
            await bot_task
        except (asyncio.CancelledError, Exception):
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
        allow_origin_regex=".*",
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

    # ─── Root & Health Check ─────────────────
    @app.get("/", tags=["System"])
    async def root():
        return {
            "status": "online",
            "service": settings.APP_NAME,
            "version": "1.0.0",
            "environment": settings.APP_ENV,
            "docs_url": "/docs" if settings.DEBUG else None,
            "health_url": "/health",
            "admin_url": "/admin",
        }

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
