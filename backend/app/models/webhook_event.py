"""
Webhook Event ORM Model — Idempotent webhook processing.

MUAMMO: Click/Payme webhook'ni tarmoq xatosi sababli 2-3 marta
yuborishi mumkin. Natijada tranzaksiya qayta ishlanib, slot holati
buzilishi yoki pul ikki marta yechilishi mumkin.

YECHIM: Har bir webhook provider + event_id + event_type
kombinatsiyasi UNIQUE constraint bilan saqlanadi.
Takroriy webhook kelganda — eski natija qaytariladi.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    String,
    Text,
    UniqueConstraint,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WebhookEvent(Base):
    """
    Idempotency jadvali — har bir webhook faqat 1 marta
    ishlanishini ta'minlaydi.

    UNIQUE(provider, provider_event_id, event_type) cheklovi
    parallel webhook'larni ham to'g'ri boshqaradi.
    """

    __tablename__ = "webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    provider: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True,
        comment="To'lov provayderi: click, payme, uzum",
    )
    provider_event_id: Mapped[str] = mapped_column(
        String(255), nullable=False,
        comment="Provider tomonidagi tranzaksiya yoki event ID",
    )
    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="Event turi: prepare, complete, cancel, refund",
    )
    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PROCESSING",
        comment="PROCESSING, COMPLETED, FAILED, DUPLICATE",
    )
    request_payload: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True,
        comment="Webhook so'rovining to'liq body'si",
    )
    response_payload: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True,
        comment="Biznes logikaning natijasi",
    )
    error_message: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="Xatolik bo'lsa — batafsil xabar",
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
        comment="Muvaffaqiyatli ishlanish vaqti",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        # ✅ Asosiy himoya — bitta event faqat 1 marta ishlanishi
        UniqueConstraint(
            "provider", "provider_event_id", "event_type",
            name="uq_webhook_provider_event",
        ),
    )

    def __repr__(self):
        return (
            f"<WebhookEvent {self.provider}:{self.provider_event_id} "
            f"type={self.event_type} status={self.status}>"
        )
