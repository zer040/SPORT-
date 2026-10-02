"""
Slot ORM Model.
Bo'sh va band vaqtlar — har bir pitch uchun start_time va end_time.
GiST EXCLUDE constraint bilan overlapping time range'lar database darajasida bloklangan.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Numeric,
    String,
    UniqueConstraint,
    ForeignKey,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Slot(Base):
    __tablename__ = "slots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    pitch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pitches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    # Yangi status modeli: AVAILABLE, LOCKED, BOOKED, MANUAL_BOOKED, BLOCKED
    status: Mapped[str] = mapped_column(
        String(20), default="AVAILABLE", server_default="AVAILABLE", index=True
    )
    # booking_source: APP, MANUAL_PHONE, SUBSCRIPTION
    booking_source: Mapped[str] = mapped_column(
        String(20), default="APP", server_default="APP"
    )
    booked_by_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    booked_by_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    # 'auto' = tizim tomonidan generatsiya qilingan
    # 'manual' = maydon egasi tomonidan qo'shilgan
    # 'blocked' = maydon egasi tomonidan yopilgan (offline bron)
    source: Mapped[str] = mapped_column(
        String(20), default="auto"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    pitch = relationship("Pitch", back_populates="slots")
    booking = relationship("Booking", back_populates="slot", uselist=False)

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="valid_time_range"),
        CheckConstraint(
            "source IN ('auto', 'manual', 'blocked')",
            name="valid_source",
        ),
        UniqueConstraint("pitch_id", "start_time", name="unique_pitch_slot"),
        # GiST EXCLUDE: prevent overlapping time ranges on the same pitch
        # Requires: CREATE EXTENSION IF NOT EXISTS btree_gist;
        ExcludeConstraint(
            ("pitch_id", "="),
            (text("tstzrange(start_time, end_time)"), "&&"),
            name="no_overlapping_slots",
            using="gist",
        ),
    )

    def __repr__(self):
        return f"<Slot {self.start_time} - {self.end_time} (available={self.is_available})>"
