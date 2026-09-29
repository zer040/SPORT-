"""
User Pydantic Schemas — foydalanuvchi profili CRUD.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class UserBase(BaseModel):
    """Foydalanuvchi bazaviy fieldlari."""
    full_name: str = Field(..., max_length=100)
    avatar_url: str | None = None


class UserCreate(UserBase):
    """Yangi foydalanuvchi yaratish (ichki — OTP verify'dan keyin)."""
    phone_number: str = Field(..., max_length=20)
    role: str = Field(default="player")


class UserUpdate(BaseModel):
    """Profil yangilash."""
    full_name: str | None = Field(default=None, max_length=100)
    avatar_url: str | None = None
    telegram_chat_id: int | None = None


class UserResponse(BaseModel):
    """Foydalanuvchi javob modeli."""
    id: Any
    phone_number: Optional[str] = None
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: str | None = None
    role: str = "player"
    rating: float = 5.0
    total_games: int = 0
    is_active: bool = True
    is_verified: bool = True
    is_profile_completed: bool = True
    has_seen_tutorial: bool = False
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserPublicResponse(BaseModel):
    """Boshqa foydalanuvchiga ko'rinadigan public profil."""
    id: UUID
    full_name: str
    avatar_url: str | None = None
    role: str
    rating: float
    total_games: int

    model_config = {"from_attributes": True}


class UserProfileResponse(UserResponse):
    """Joriy foydalanuvchining to'liq profili (o'zi uchun)."""
    telegram_chat_id: int | None = None
    last_login_at: datetime | None = None
    updated_at: datetime | None = None

    # Solo Play statistika (keyinroq qo'shiladi)
    reliability_score: Optional[float] = None
    solo_games_count: Optional[int] = None

    model_config = {"from_attributes": True}


class FCMTokenUpdate(BaseModel):
    """Firebase Cloud Messaging token yangilash."""
    fcm_token: str = Field(..., max_length=500, description="Firebase FCM device token")
