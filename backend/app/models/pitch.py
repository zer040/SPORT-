"""
Pitch ORM Model.
Muayyan futbol maydoni — Venue ichidagi alohida pitch (masalan, "Maydon A", "Yopiq maydon").
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Integer,
    Numeric,
    String,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Pitch(Base):
    __tablename__ = "pitches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    venue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("venues.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    size_type: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )
    grass_type: Mapped[str] = mapped_column(String(30), nullable=False)
    has_roof: Mapped[bool] = mapped_column(Boolean, default=False)
    price_per_hour: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    min_players: Mapped[int] = mapped_column(Integer, default=10)
    max_players: Mapped[int] = mapped_column(Integer, default=22)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    venue = relationship("Venue", back_populates="pitches")
    slots = relationship("Slot", back_populates="pitch", lazy="selectin", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(
            "size_type IN ('5x5', '7x7', '8x8', '11x11', 'mini')",
            name="valid_size_type",
        ),
        CheckConstraint(
            "grass_type IN ('artificial', 'natural', 'hybrid', 'indoor')",
            name="valid_grass_type",
        ),
    )

    def __repr__(self):
        return f"<Pitch {self.name} ({self.size_type})>"
