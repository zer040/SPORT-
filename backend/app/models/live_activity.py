"""
LiveActivitySession ORM Model.
Apple iOS Live Activities & Dynamic Island sessiyalari — match countdown va real vaqt statuslari.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LiveActivitySession(Base):
    __tablename__ = "live_activity_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    push_token: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="APNs Live Activity hex push token",
    )
    activity_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="iOS ActivityKit activity.id UUID",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="ACTIVE",
        server_default="ACTIVE",
        index=True,
        comment="ACTIVE, ENDED, DISMISSED, EXPIRED",
    )
    notified_30min: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        comment="30 daqiqa qolganda push jo'natildimi?",
    )
    device_os: Mapped[str] = mapped_column(
        String(20),
        default="iOS",
        server_default="iOS",
    )
    last_response: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="APNs oxirgi javob xabari yoki xatolik",
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", lazy="selectin")
    booking = relationship("Booking", lazy="selectin")

    def __repr__(self):
        return f"<LiveActivitySession id={self.id} booking={self.booking_id} status={self.status}>"
