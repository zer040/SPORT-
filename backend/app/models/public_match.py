"""
PublicMatch ORM Model — Solo Play va jamoaviy ochiq o'yinlar.
Host-Based va Draft matchmaking rejimlarini qo'llab-quvvatlaydi.
"""

import uuid
from datetime import datetime, timezone

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    Integer,
    Numeric,
    String,
    Text,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

MATCH_TYPES = ("HOST_BASED", "DRAFT")
MATCH_STATUSES = (
    "DRAFT",
    "FORMING",
    "QUORUM_MET",
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
)

match_type_enum = SAEnum(
    *MATCH_TYPES,
    name="match_type_enum",
    create_constraint=True,
)

match_status_enum = SAEnum(
    *MATCH_STATUSES,
    name="match_status_enum",
    create_constraint=True,
)


class PublicMatch(Base):
    __tablename__ = "public_matches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    match_type: Mapped[str] = mapped_column(
        match_type_enum, nullable=False, default="HOST_BASED", index=True
    )
    status: Mapped[str] = mapped_column(
        match_status_enum, nullable=False, default="FORMING", index=True
    )
    host_id: Mapped[uuid.UUID] = mapped_column(
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
    venue_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("venues.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    pitch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pitches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    slot_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("slots.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    location = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=True,
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    required_players: Mapped[int] = mapped_column(
        Integer, nullable=False, default=10
    )
    confirmed_players: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )
    price_per_player: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    total_pitch_price: Mapped[float | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    skill_level: Mapped[str] = mapped_column(
        String(20), nullable=False, default="ANY"
    )
    gender_preference: Mapped[str] = mapped_column(
        String(10), nullable=False, default="ALL"
    )
    preferred_pitch_size: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    auto_approve: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    host = relationship("User", foreign_keys=[host_id])
    booking = relationship("Booking")
    venue = relationship("Venue")
    pitch = relationship("Pitch")
    slot = relationship("Slot")
    participants = relationship(
        "MatchParticipant",
        back_populates="match",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    chat_messages = relationship(
        "MatchChatMessage",
        back_populates="match",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    escrow_payments = relationship(
        "EscrowPayment",
        back_populates="match",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="valid_match_time"),
        CheckConstraint("required_players >= 2 AND required_players <= 22", name="valid_players_count"),
        CheckConstraint("price_per_player >= 0", name="valid_price_per_player"),
    )

    def __repr__(self):
        return f"<PublicMatch {self.id} type={self.match_type} status={self.status} players={self.confirmed_players}/{self.required_players}>"
