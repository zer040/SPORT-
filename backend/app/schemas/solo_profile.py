"""
Solo Player Profile Pydantic Schemas — "O'yin qidiryapman" profil sozlamalari.
"""

from datetime import datetime, time
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SoloProfileUpdate(BaseModel):
    """Solo profil sozlamalarini yangilash."""
    is_looking_for_game: bool | None = None
    preferred_positions: List[str] | None = Field(
        default=None,
        description="Afzal pozitsiyalar ro'yxati",
        examples=[["GOALKEEPER", "FORWARD"]],
    )
    preferred_radius_km: int | None = Field(default=None, ge=1, le=50)
    preferred_time_start: time | None = Field(
        default=None,
        description="Afzal vaqt boshlanishi",
        examples=["18:00"],
    )
    preferred_time_end: time | None = Field(
        default=None,
        description="Afzal vaqt tugashi",
        examples=["23:00"],
    )
    preferred_days: List[int] | None = Field(
        default=None,
        description="Afzal kunlar (1=Mon ... 7=Sun)",
        examples=[[1, 3, 5]],
    )
    lat: float | None = Field(default=None, ge=-90, le=90, description="Joriy joylashuv kengligi")
    lon: float | None = Field(default=None, ge=-180, le=180, description="Joriy joylashuv uzunligi")


class SoloProfileResponse(BaseModel):
    """Solo profil javob modeli."""
    user_id: UUID
    is_looking_for_game: bool
    preferred_positions: List[str] = []
    preferred_radius_km: int
    preferred_time_start: time | None = None
    preferred_time_end: time | None = None
    preferred_days: List[int] = []
    reliability_score: float
    total_solo_games: int
    solo_play_ban_until: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class NearbyPlayerResponse(BaseModel):
    """Yaqin atrofdagi 'looking' o'yinchi."""
    user_id: UUID
    full_name: str
    avatar_url: str | None = None
    preferred_positions: List[str] = []
    reliability_score: float
    total_solo_games: int
    distance_km: float
    preferred_time_start: time | None = None
    preferred_time_end: time | None = None

    model_config = {"from_attributes": True}
