"""
EscrowPayment ORM Model.
Solo Play o'yinlarida pullarni xavfsiz saqlash (Escrow) tizimi.
Kvorum to'langanda maydon egasiga chiqariladi, kvorum yetishmasa yoki bekor qilinsa avtomatik refund qilinadi.
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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

ESCROW_STATUSES = ("HELD", "RELEASED", "REFUNDED", "PARTIALLY_REFUNDED")
ESCROW_PROVIDERS = ("click", "payme", "wallet", "cash")

escrow_status_enum = SAEnum(
    *ESCROW_STATUSES,
    name="escrow_status_enum",
    create_constraint=True,
)

escrow_provider_enum = SAEnum(
    *ESCROW_PROVIDERS,
    name="escrow_provider_enum",
    create_constraint=True,
)


class EscrowPayment(Base):
    __tablename__ = "escrow_payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    match_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public_matches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    status: Mapped[str] = mapped_column(
        escrow_status_enum, nullable=False, default="HELD", index=True
    )
    provider: Mapped[str] = mapped_column(
        escrow_provider_enum, nullable=False, default="payme"
    )
    transaction_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    refund_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.00
    )
    released_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    refunded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    match = relationship("PublicMatch", back_populates="escrow_payments")
    user = relationship("User")
    booking = relationship("Booking")

    def __repr__(self):
        return f"<EscrowPayment user={self.user_id} match={self.match_id} amount={self.amount} status={self.status}>"
