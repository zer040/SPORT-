"""
Payment Pydantic Schemas — to'lov yaratish, webhook, refund.
"""

from datetime import datetime
from typing import Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    """To'lov yaratish."""
    booking_id: UUID
    provider: str = Field(..., pattern="^(click|payme|cash|uzum|system)$")
    amount: float = Field(..., gt=0)


class PaymentResponse(BaseModel):
    """To'lov javob modeli."""
    id: UUID
    booking_id: UUID
    user_id: UUID
    provider: str
    provider_transaction_id: str | None = None
    amount: float
    status: str
    paid_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaymentURLResponse(BaseModel):
    """To'lov havolasi javobi."""
    payment_url: str
    payment_id: UUID
    amount: float
    provider: str
    expires_at: datetime | None = None


# ─── Click Webhook ───────────────────────────

class ClickPrepareRequest(BaseModel):
    """Click prepare endpoint parametrlari."""
    click_trans_id: int
    service_id: int
    click_paydoc_id: int
    merchant_trans_id: str
    amount: float
    action: int
    error: int
    error_note: str
    sign_time: str
    sign_string: str


class ClickCompleteRequest(BaseModel):
    """Click complete endpoint parametrlari."""
    click_trans_id: int
    service_id: int
    click_paydoc_id: int
    merchant_trans_id: str
    merchant_prepare_id: int | None = None
    amount: float
    action: int
    error: int
    error_note: str
    sign_time: str
    sign_string: str


# ─── Payme Webhook ───────────────────────────

class PaymeRequest(BaseModel):
    """Payme JSON-RPC request."""
    method: str
    params: Dict
    id: int | None = None


class RefundRequest(BaseModel):
    """Admin tomonidan manual refund."""
    payment_id: UUID
    reason: str = Field(..., max_length=500)
    amount: float | None = Field(default=None, description="Partial refund summasi (bo'sh = full)")
