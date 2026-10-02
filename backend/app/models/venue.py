"""
Venue and VenueImage ORM Models.
Maydonlar majmuasi — joylashuvi, imkoniyatlari, rasmlari bilan.
PostGIS GEOGRAPHY column geolokatsiya uchun.
"""

import uuid
from datetime import datetime, time, timezone

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Venue(Base):
    __tablename__ = "venues"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=False,
    )
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(50), nullable=False, default="Jizzax", index=True)
    district: Mapped[str | None] = mapped_column(String(50), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    working_hours_start: Mapped[time] = mapped_column(
        Time, nullable=False, default=time(6, 0)
    )
    working_hours_end: Mapped[time] = mapped_column(
        Time, nullable=False, default=time(23, 0)
    )
    facilities: Mapped[dict] = mapped_column(
        JSONB, default=dict, server_default="{}"
    )
    base_price_per_hour: Mapped[float] = mapped_column(
        Numeric(12, 2), default=200000.00, server_default="200000.00"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    avg_rating: Mapped[float] = mapped_column(
        Numeric(3, 1), default=5.0, server_default="5.0"
    )
    total_reviews: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    total_bookings: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    owner = relationship("User", back_populates="venues")
    pitches = relationship("Pitch", back_populates="venue", lazy="selectin", cascade="all, delete-orphan")
    images = relationship("VenueImage", back_populates="venue", lazy="selectin", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="venue", lazy="selectin")

    def __repr__(self):
        return f"<Venue {self.name} ({self.city})>"


class VenueImage(Base):
    __tablename__ = "venue_images"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    venue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("venues.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    venue = relationship("Venue", back_populates="images")

    def __repr__(self):
        return f"<VenueImage venue={self.venue_id} primary={self.is_primary}>"
