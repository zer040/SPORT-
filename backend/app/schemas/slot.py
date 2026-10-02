"""
Slot Pydantic Schemas — vaqt bo'laklari CRUD, offline qo'lda bron va smart pricing generatsiya.
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
    status: str = Field(default="AVAILABLE", description="AVAILABLE, LOCKED, BOOKED, MANUAL_BOOKED, BLOCKED")
    booking_source: str = Field(default="APP", description="APP, MANUAL_PHONE, SUBSCRIPTION")
    booked_by_name: Optional[str] = None
    booked_by_phone: Optional[str] = None
    is_recurring: bool = False
    source: str = Field(default="manual")


class SlotUpdate(BaseModel):
    """Slot yangilash."""
    price: float | None = Field(default=None, gt=0)
    is_available: bool | None = None
    status: str | None = Field(default=None, description="AVAILABLE, LOCKED, BOOKED, MANUAL_BOOKED, BLOCKED")
    booking_source: str | None = None
    booked_by_name: str | None = None
    booked_by_phone: str | None = None
    is_recurring: bool | None = None
    source: str | None = None


class SlotManualBookRequest(BaseModel):
    """Owner tomonidan telefon orqali kelgan o'yinni qo'lda kiritish."""
    slot_id: UUID
    booked_by_name: str = Field(..., min_length=2, examples=["Aziz bank"])
    booked_by_phone: str = Field(..., min_length=7, examples=["+998901234567"])
    is_recurring: bool = Field(default=False, description="Haftalik doimiy mijozmi?")
    price: Optional[float] = None
    send_sms_notice: bool = Field(default=True, description="Telegram / SMS xabar yuborish")


class SmartPricingGenerateRequest(BaseModel):
    """Dinamik Smart Pricing shabloni bilan 30 kunlik slotlarni avtomatik generatsiya qilish."""
    pitch_id: UUID
    days_ahead: int = Field(default=30, ge=1, le=60)
    day_price: float = Field(default=100000.0, description="Kunduzgi soatlar (08:00 - 17:00)")
    prime_price: float = Field(default=200000.0, description="Prime-Time (17:00 - 23:00)")
    night_price: float = Field(default=150000.0, description="Tungi soatlar (23:00 - 03:00)")


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


class SlotResponse(BaseModel):
    """Slot javob modeli — yagona yadro modeli."""
    id: Any
    pitch_id: Any
    start_time: datetime
    end_time: datetime
    price: float
    is_available: bool = True
    status: str = "AVAILABLE"  # AVAILABLE, LOCKED, BOOKED, MANUAL_BOOKED, BLOCKED
    booking_source: str = "APP"  # APP, MANUAL_PHONE, SUBSCRIPTION
    booked_by_name: Optional[str] = None
    booked_by_phone: Optional[str] = None
    is_recurring: bool = False
    source: str = "auto"
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
