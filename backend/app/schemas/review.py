"""
Review Pydantic Schemas — sharhlar va reytinglar.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    """Yangi sharh yaratish."""
    venue_id: UUID
    booking_id: Optional[UUID] = None
    rating: int = Field(..., ge=1, le=5, description="Reyting (1-5)")
    comment: Optional[str] = Field(default=None, max_length=1000)
    tags: List[str] = Field(default_factory=list, description="Tezkor teglar (masalan: ['yaxshi_chim', 'toza_dush'])")


class ReviewUpdate(BaseModel):
    """Sharh yangilash."""
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=1000)
    tags: Optional[List[str]] = None


class ReviewResponse(BaseModel):
    """Sharh javob modeli."""
    id: UUID
    user_id: UUID
    venue_id: UUID
    booking_id: Optional[UUID] = None
    rating: int
    comment: Optional[str] = None
    tags: List[str] = []
    created_at: datetime

    # User ma'lumotlari
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None

    model_config = {"from_attributes": True}


class PendingReviewItem(BaseModel):
    booking_id: UUID
    venue_id: UUID
    venue_name: str
    pitch_name: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class PendingReviewStatusResponse(BaseModel):
    has_pending: bool
    pending_review: Optional[PendingReviewItem] = None
