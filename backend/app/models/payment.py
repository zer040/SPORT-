"""
Payment ORM Model.
To'lovlar tarixi — Click, Payme, naqd pul.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    Numeric,
    String,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

payment_status_enum = SAEnum(
    "PENDING", "COMPLETED", "FAILED", "REFUNDED",
    name="payment_status",
    create_constraint=True,
)

payment_provider_enum = SAEnum(
    "click", "payme", "cash", "uzum", "system",
    name="payment_provider",
    create_constraint=True,
)


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(
        payment_provider_enum, nullable=False
    )
    provider_transaction_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        payment_status_enum, nullable=False, default="PENDING"
    )
    provider_response: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True
    )
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    booking = relationship("Booking", back_populates="payments")

    def __repr__(self):
        return f"<Payment {self.provider} {self.amount} status={self.status}>"
