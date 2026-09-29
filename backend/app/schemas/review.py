"""
Review Pydantic Schemas — sharhlar va reytinglar.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    """Yangi sharh yaratish."""
    venue_id: UUID
    booking_id: UUID | None = None
    rating: int = Field(..., ge=1, le=5, description="Reyting (1-5)")
    comment: str | None = Field(default=None, max_length=1000)


class ReviewUpdate(BaseModel):
    """Sharh yangilash."""
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class ReviewResponse(BaseModel):
    """Sharh javob modeli."""
    id: UUID
    user_id: UUID
    venue_id: UUID
    booking_id: UUID | None = None
    rating: int
    comment: str | None = None
    created_at: datetime

    # User ma'lumotlari
    user_name: str | None = None
    user_avatar: str | None = None

    model_config = {"from_attributes": True}
