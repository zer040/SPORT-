"""
MatchParticipant ORM Model.
Solo Play match ishtirokchilari — status, to'lov va kelishni tasdiqlash.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

PARTICIPANT_STATUSES = (
    "PENDING",
    "APPROVED",
    "PAID",
    "REJECTED",
    "CANCELLED",
    "NO_SHOW",
)

PARTICIPANT_ROLES = ("HOST", "PLAYER", "GOALKEEPER")

participant_status_enum = SAEnum(
    *PARTICIPANT_STATUSES,
    name="participant_status_enum",
    create_constraint=True,
)

participant_role_enum = SAEnum(
    *PARTICIPANT_ROLES,
    name="participant_role_enum",
    create_constraint=True,
)


class MatchParticipant(Base):
    __tablename__ = "match_participants"

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
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        participant_status_enum, nullable=False, default="PENDING", index=True
    )
    role: Mapped[str] = mapped_column(
        participant_role_enum, nullable=False, default="PLAYER"
    )
    player_position: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    paid_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.00
    )
    payment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="SET NULL"),
        nullable=True,
    )
    escrow_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("escrow_payments.id", ondelete="SET NULL"),
        nullable=True,
    )
    confirmed_arrival: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    confirmed_arrival_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    match = relationship("PublicMatch", back_populates="participants")
    user = relationship("User", lazy="joined")
    payment = relationship("Payment")
    escrow = relationship("EscrowPayment")

    __table_args__ = (
        UniqueConstraint("match_id", "user_id", name="unique_match_user"),
    )

    def __repr__(self):
        return f"<MatchParticipant user={self.user_id} match={self.match_id} status={self.status}>"
