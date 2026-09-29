"""
Match (Solo Play) Pydantic Schemas — matchmaking yaratish, qo'shilish, qidirish.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ─── Match Yaratish ──────────────────────────

class MatchCreateHostBased(BaseModel):
    """Host-Based match yaratish (slot allaqachon band qilingan)."""
    booking_id: UUID = Field(..., description="Mavjud booking ID (host'ning o'zi bron qilgan)")
    required_players: int = Field(..., ge=2, le=22, description="Kerakli o'yinchilar soni")
    price_per_player: float = Field(..., gt=0, description="Har bir o'yinchining ulushi (UZS)")
    skill_level: str = Field(
        default="ANY",
        pattern="^(BEGINNER|AMATEUR|PRO|ANY)$",
    )
    gender_preference: str = Field(
        default="ALL",
        pattern="^(MALE|FEMALE|ALL)$",
    )
    description: str | None = Field(default=None, max_length=500)
    auto_approve: bool = Field(default=False, description="Avtomatik qabul qilish")


class MatchCreateDraft(BaseModel):
    """Draft match yaratish (slot hali band qilinmagan, o'yinchilar yig'iladi)."""
    lat: float = Field(..., ge=-90, le=90, description="Taxminiy joylashuv kengligi")
    lon: float = Field(..., ge=-180, le=180, description="Taxminiy joylashuv uzunligi")
    start_time: datetime = Field(..., description="Rejalashtirilgan o'yin vaqti")
    end_time: datetime = Field(..., description="Rejalashtirilgan tugash vaqti")
    required_players: int = Field(..., ge=2, le=22)
    price_per_player: float = Field(..., gt=0)
    skill_level: str = Field(default="ANY", pattern="^(BEGINNER|AMATEUR|PRO|ANY)$")
    gender_preference: str = Field(default="ALL", pattern="^(MALE|FEMALE|ALL)$")
    preferred_pitch_size: str | None = Field(
        default=None,
        pattern="^(5x5|7x7|8x8|11x11|mini)$",
        description="Afzal ko'rilgan maydon o'lchami",
    )
    description: str | None = Field(default=None, max_length=500)
    auto_approve: bool = Field(default=False)


# ─── Match'ga Qo'shilish ────────────────────

class MatchJoinRequest(BaseModel):
    """O'yinga qo'shilish so'rovi."""
    player_position: str | None = Field(
        default=None,
        pattern="^(GOALKEEPER|DEFENDER|MIDFIELDER|FORWARD)$",
        description="O'yinchining pozitsiyasi",
    )
    message: str | None = Field(
        default=None,
        max_length=200,
        description="Host'ga xabar (ixtiyoriy)",
    )


# ─── Match Javob Modellari ───────────────────

class MatchParticipantResponse(BaseModel):
    """Match qatnashchisi javob modeli."""
    id: UUID
    user_id: UUID
    player_position: str | None = None
    status: str
    payment_status: str
    joined_at: datetime

    # User ma'lumotlari
    user_name: str | None = None
    user_avatar: str | None = None
    user_rating: float | None = None
    reliability_score: float | None = None

    model_config = {"from_attributes": True}


class MatchResponse(BaseModel):
    """Match to'liq javob modeli."""
    id: UUID
    host_user_id: UUID
    pitch_id: UUID | None = None
    booking_id: UUID | None = None
    start_time: datetime
    end_time: datetime
    match_type: str
    required_players: int
    joined_players: int
    price_per_player: float
    skill_level: str
    gender_preference: str
    description: str | None = None
    status: str
    auto_approve: bool = False
    created_at: datetime
    updated_at: datetime | None = None

    # Nested
    host_name: str | None = None
    venue_name: str | None = None
    pitch_name: str | None = None
    participants: List[MatchParticipantResponse] = []

    # Hisoblangan fieldlar
    available_spots: int = 0
    distance_km: float | None = None

    model_config = {"from_attributes": True}


class MatchListItem(BaseModel):
    """Qidiruv natijasidagi match (qisqartirilgan)."""
    id: UUID
    host_user_id: UUID
    host_name: str | None = None
    start_time: datetime
    end_time: datetime
    match_type: str
    required_players: int
    joined_players: int
    available_spots: int
    price_per_player: float
    skill_level: str
    status: str
    venue_name: str | None = None
    distance_km: float | None = None

    model_config = {"from_attributes": True}


# ─── Match Qidirish ─────────────────────────

class MatchSearchQuery(BaseModel):
    """Match qidiruv parametrlari."""
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=10.0, ge=0.5, le=50.0)
    date_from: str | None = Field(default=None, description="YYYY-MM-DD")
    date_to: str | None = Field(default=None, description="YYYY-MM-DD")
    skill_level: str | None = Field(default=None, pattern="^(BEGINNER|AMATEUR|PRO|ANY)$")
    match_type: str | None = Field(default=None, pattern="^(HOST_BASED|DRAFT|SOLO_FINDER)$")
    max_price: float | None = Field(default=None, ge=0)
    status: str | None = Field(default="OPEN", pattern="^(OPEN|DRAFT|FULL)$")
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)


# ─── Match Chat ─────────────────────────────

class MatchChatMessageResponse(BaseModel):
    """Chat xabari javob modeli."""
    id: UUID
    match_id: UUID
    sender_id: UUID
    sender_name: str | None = None
    sender_avatar: str | None = None
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MatchChatSendRequest(BaseModel):
    """Chat xabari yuborish."""
    message: str = Field(..., min_length=1, max_length=1000)
