"""
Booking Pydantic Schemas — bron qilish, tasdiqlash, bekor qilish.
"""

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class BookingHoldRequest(BaseModel):
    """Slotni vaqtinchalik band qilish so'rovi (Phase 1)."""
    slot_id: Any = Field(..., description="Band qilinadigan slot ID")
    slot_ids: Optional[List[Any]] = None
    team_id: Any | None = Field(default=None, description="Agar jamoa bilan bron qilsa")
    payment_type: str = Field(
        default="full",
        pattern="^(full|split|cash)$",
        description="To'lov turi",
    )
    notes: str | None = Field(default=None, max_length=500, description="Qo'shimcha izoh")


class BookingConfirmRequest(BaseModel):
    """To'lov muvaffaqiyatli bo'lgandan keyin tasdiqlash (Phase 2)."""
    payment_provider: str = Field(
        default="click",
        pattern="^(click|payme|cash|uzum|mock)$",
        description="To'lov provayderi",
    )
    provider_transaction_id: str | None = Field(
        default=None,
        description="To'lov tizimidan kelgan tranzaksiya ID",
    )


class BookingCancelRequest(BaseModel):
    """Bronni bekor qilish so'rovi."""
    cancellation_reason: str | None = Field(
        default=None,
        max_length=500,
        description="Bekor qilish sababi",
    )


class BookingResponse(BaseModel):
    """Booking to'liq javob modeli."""
    id: Any
    user_id: Any
    slot_id: Any
    team_id: Any | None = None
    status: str
    total_price: float
    paid_amount: float = 0.0
    held_until: datetime
    confirmed_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancellation_reason: str | None = None
    payment_type: str = "full"
    notes: str | None = None
    qr_pass: Optional[str] = None
    service_fee: float = 10000.0
    remaining_at_venue: float = 0.0
    venue_name: Optional[str] = None
    pitch_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class BookingHoldResponse(BaseModel):
    """Hold muvaffaqiyatli bo'lgandagi javob."""
    booking_id: Any
    held_until: datetime
    total_price: float
    service_fee: float = 10000.0
    venue_remaining_amount: float = 0.0
    payment_deadline_seconds: int
    payment_url: str | None = None
    message: str = "Slot muvaffaqiyatli band qilindi. To'lovni amalga oshiring."


class BookingCancelResponse(BaseModel):
    """Bekor qilish javobi."""
    booking_id: UUID
    refund_amount: float = Field(description="Qaytariladigan summa")
    penalty_amount: float = Field(description="Jarima summasi")
    message: str


class BookingListQuery(BaseModel):
    """Booking ro'yxati filtrlari."""
    status: str | None = Field(
        default=None,
        pattern="^(HELD|CONFIRMED|CANCELLED|EXPIRED|COMPLETED|NO_SHOW)$",
    )
    date_from: str | None = None
    date_to: str | None = None
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
