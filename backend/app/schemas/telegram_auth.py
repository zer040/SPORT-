"""
Telegram Auth Pydantic Schemas.
"""

from typing import Optional
from pydantic import BaseModel, Field


class TelegramInitAuthResponse(BaseModel):
    success: bool = True
    auth_token: str
    bot_username: str
    deep_link: str
    web_link: str
    expires_in: int = 300


class TelegramBotWebhookRequest(BaseModel):
    update_id: int
    message: Optional[dict] = None
    callback_query: Optional[dict] = None


class TelegramSimulateStartRequest(BaseModel):
    auth_token: str = Field(..., description="Ilovada yaratilgan auth_token")
    telegram_id: int = Field(default=987654321, description="Telegram user ID")
    first_name: str = Field(default="Alisher", description="Telegram ism")
    last_name: str = Field(default="Karimov", description="Telegram familiya")
    username: Optional[str] = Field(default="alisher_karimov")


class TelegramVerifyOTPRequest(BaseModel):
    auth_token: str = Field(..., description="Ilovada yaratilgan auth_token")
    code: str = Field(..., min_length=4, max_length=6, description="Telegramda kelgan 6 xonali kod")
    phone_number: Optional[str] = Field(default=None, description="Profil to'ldirish uchun telefon raqami (+998...)")
    full_name: Optional[str] = Field(default=None, description="Foydalanuvchi ism-familiyasi")


class CompleteProfileRequest(BaseModel):
    phone_number: str = Field(..., min_length=9, max_length=20, description="+998901234567 formatida")
    full_name: str = Field(..., min_length=2, max_length=100)
