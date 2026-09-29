"""
Slot Pydantic Schemas — vaqt bo'laklari CRUD va avtomatik generatsiya.
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SlotCreate(BaseModel):
    """Yakka slot yaratish (manual)."""
    start_time: datetime = Field(..., description="Slot boshlanish vaqti (ISO 8601)")
    end_time: datetime = Field(..., description="Slot tugash vaqti (ISO 8601)")
    price: float = Field(..., gt=0, examples=[200000.00])
    source: str = Field(default="manual", pattern="^(manual|blocked)$")


class SlotBulkGenerate(BaseModel):
    """Slotlarni avtomatik generatsiya qilish."""
    date_from: str = Field(
        ...,
        description="Boshlanish sanasi (YYYY-MM-DD)",
        examples=["2026-10-01"],
    )
    date_to: str = Field(
        ...,
        description="Tugash sanasi (YYYY-MM-DD)",
        examples=["2026-10-07"],
    )
    duration_minutes: int = Field(
        default=60,
        ge=30,
        le=180,
        description="Har bir slot davomiyligi (daqiqa)",
    )
    price_override: float | None = Field(
        default=None,
        gt=0,
        description="Narx (berilmasa pitch'ning price_per_hour ishlatiladi)",
    )


class SlotUpdate(BaseModel):
    """Slot yangilash."""
    price: float | None = Field(default=None, gt=0)
    is_available: bool | None = None
    source: str | None = Field(default=None, pattern="^(auto|manual|blocked)$")


class SlotResponse(BaseModel):
    """Slot javob modeli."""
    id: Any
    pitch_id: Any
    start_time: datetime
    end_time: datetime
    price: float
    is_available: bool
    source: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SlotBulkGenerateResponse(BaseModel):
    """Avtomatik generatsiya natijasi."""
    created_count: int
    skipped_count: int = Field(
        default=0,
        description="Allaqachon mavjud bo'lgan vaqtlar sababli o'tkazib yuborilganlar",
    )
    message: str = "Slotlar muvaffaqiyatli yaratildi."
