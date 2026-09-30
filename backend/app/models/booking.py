"""
Booking ORM Model.
Bron ma'lumotlari — HELD → CONFIRMED → COMPLETED state machine.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    Numeric,
    String,
    Text,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

# Booking status enum values
BOOKING_STATUSES = (
    "HELD",
    "CONFIRMED",
    "CANCELLED",
    "EXPIRED",
    "COMPLETED",
    "NO_SHOW",
)

booking_status_enum = SAEnum(
    *BOOKING_STATUSES,
    name="booking_status",
    create_constraint=True,
)


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id"),
        nullable=True,
    )
    slot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("slots.id"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        booking_status_enum,
        nullable=False,
        default="HELD",
        index=True,
    )
    total_price: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    paid_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.00
    )
    service_fee: Mapped[float] = mapped_column(
        Numeric(10, 2), default=10000.00
    )
    venue_remaining_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.00
    )
    owner_confirmation_status: Mapped[str] = mapped_column(
        String(20), default="PENDING"
    )
    payment_status: Mapped[str] = mapped_column(
        String(20), default="UNPAID"
    )
    payment_provider: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    held_until: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_type: Mapped[str] = mapped_column(
        String(20), default="service_fee"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    @property
    def total_service_fee(self) -> float:
        return float(self.service_fee) if self.service_fee is not None else 10000.0

    @total_service_fee.setter
    def total_service_fee(self, value: float) -> None:
        self.service_fee = value
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", back_populates="bookings")
    slot = relationship("Slot", back_populates="booking")
    payments = relationship("Payment", back_populates="booking", lazy="selectin")

    def __repr__(self):
        return f"<Booking {self.id} status={self.status}>"
