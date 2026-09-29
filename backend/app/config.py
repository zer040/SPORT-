"""
Sport+ Application Settings.
Pydantic-settings orqali .env fayldan konfiguratsiya yuklash.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import json


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # ─── App ──────────────────────────────────────
    APP_NAME: str = "Sport+"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"
    API_V1_PREFIX: str = "/api/v1"

    # ─── Database ─────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://sportplus_user:sportplus_pass@localhost:5432/sportplus"

    # ─── Redis ────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ─── JWT ──────────────────────────────────────
    JWT_SECRET_KEY: str = "jwt-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ─── SuperAdmin Authentication ───────────────
    ADMIN_LOGIN: str = "admin_sportplus"
    ADMIN_PASSWORD: str = "SizningKuchliParolingiz!2026"

    # ─── Eskiz SMS ────────────────────────────────
    ESKIZ_EMAIL: str = ""
    ESKIZ_PASSWORD: str = ""
    ESKIZ_BASE_URL: str = "https://notify.eskiz.uz/api"

    # ─── Click Payment ────────────────────────────
    CLICK_MERCHANT_ID: str = ""
    CLICK_SERVICE_ID: str = ""
    CLICK_SECRET_KEY: str = ""

    # ─── Payme Payment ────────────────────────────
    PAYME_MERCHANT_ID: str = ""
    PAYME_MERCHANT_KEY: str = ""

    # ─── Telegram Bot ─────────────────────────────
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_BOT_USERNAME: str = "sport_plus_uz_bot"
    TELEGRAM_WEBHOOK_URL: str = ""
    BOOKING_SERVICE_FEE_UZS: float = 10000.0


    # ─── MinIO / S3 ──────────────────────────────
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "sportplus-media"

    # ─── RabbitMQ ─────────────────────────────────
    RABBITMQ_URL: str = "amqp://sportplus:sportplus_pass@localhost:5672/"

    # ─── CORS ─────────────────────────────────────
    CORS_ORIGINS: str = '["http://localhost:3000","http://localhost:8000"]'

    # ─── Booking ──────────────────────────────────
    BOOKING_HOLD_DURATION_SECONDS: int = 600  # 10 daqiqa
    HOLD_DURATION_MINUTES: int = 10

    # ─── Solo Play / Matchmaking ─────────────────
    SOLO_PLAY_MIN_PLAYERS: int = 6
    SOLO_PLAY_MAX_WAIT_HOURS: int = 48
    ESCROW_HOLD_DURATION_HOURS: int = 24

    # ─── Cancellation Policy ─────────────────────
    CANCELLATION_FREE_HOURS: int = 6        # 6+ soat qolsa — 100% qaytarish
    CANCELLATION_HALF_REFUND_HOURS: int = 2  # 2-6 soat qolsa — 50% jarima
    # 2 soatdan kam qolsa yoki no-show — 0% qaytarish

    # ─── Reliability Score ───────────────────────
    NO_SHOW_BAN_DAYS: int = 3               # No-show ban muddati (kun)
    RELIABILITY_SCORE_BONUS: float = 0.1    # O'z vaqtida kelganlik bonusi
    RELIABILITY_SCORE_PENALTY: float = 1.0  # No-show jarimasi
    RELIABILITY_MIN_FOR_SOLO: float = 3.0   # Solo Play uchun minimal ball

    # ─── Platform ────────────────────────────────
    PLATFORM_COMMISSION_PERCENT: float = 5.0  # Platforma komissiyasi (%)

    # ─── Firebase (Push Notifications) ───────────
    FIREBASE_CREDENTIALS_PATH: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from JSON string to list."""
        try:
            return json.loads(self.CORS_ORIGINS)
        except (json.JSONDecodeError, TypeError):
            return ["http://localhost:3000"]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }


# Singleton settings instance
settings = Settings()
