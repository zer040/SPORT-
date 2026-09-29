"""
Pitch Pydantic Schemas — maydon (pitch) CRUD.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PitchBase(BaseModel):
    """Pitch bazaviy fieldlari."""
    name: str = Field(..., max_length=50, examples=["Maydon A"])
    size_type: str = Field(
        ...,
        pattern="^(5x5|7x7|8x8|11x11|mini)$",
        examples=["7x7"],
    )
    grass_type: str = Field(
        ...,
        pattern="^(artificial|natural|hybrid|indoor)$",
        examples=["artificial"],
    )
    has_roof: bool = Field(default=False)
    price_per_hour: float = Field(..., gt=0, examples=[200000.00])
    min_players: int = Field(default=10, ge=2)
    max_players: int = Field(default=22, ge=2)


class PitchCreate(PitchBase):
    """Yangi pitch yaratish."""
    pass


class PitchUpdate(BaseModel):
    """Pitch yangilash (partial)."""
    name: str | None = Field(default=None, max_length=50)
    size_type: str | None = Field(default=None, pattern="^(5x5|7x7|8x8|11x11|mini)$")
    grass_type: str | None = Field(default=None, pattern="^(artificial|natural|hybrid|indoor)$")
    has_roof: bool | None = None
    price_per_hour: float | None = Field(default=None, gt=0)
    min_players: int | None = Field(default=None, ge=2)
    max_players: int | None = Field(default=None, ge=2)
    is_active: bool | None = None


class PitchResponse(PitchBase):
    """Pitch javob modeli."""
    id: Any
    venue_id: Any
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
