"""
Review ORM Model.
Foydalanuvchilarning maydonlar haqidagi sharhlari va reytinglari.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Integer,
    Text,
    UniqueConstraint,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    venue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("venues.id"),
        nullable=False,
        index=True,
    )
    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id"),
        nullable=True,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user = relationship("User", back_populates="reviews")
    venue = relationship("Venue", back_populates="reviews")

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="valid_review_rating"),
        UniqueConstraint("user_id", "booking_id", name="unique_review"),
    )

    def __repr__(self):
        return f"<Review venue={self.venue_id} rating={self.rating}>"
