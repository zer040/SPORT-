"""
User ORM Model.
Foydalanuvchilar — player, owner, admin rollari bilan.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    telegram_id: Mapped[int | None] = mapped_column(
        BigInteger, unique=True, nullable=True, index=True
    )
    phone_number: Mapped[str | None] = mapped_column(
        String(20), unique=True, nullable=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default="player", index=True
    )
    rating: Mapped[float] = mapped_column(
        Numeric(3, 2), default=5.00
    )
    total_games: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_profile_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    has_seen_tutorial: Mapped[bool] = mapped_column(Boolean, default=False)
    telegram_chat_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
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
    venues = relationship("Venue", back_populates="owner", lazy="selectin")
    bookings = relationship("Booking", back_populates="user", lazy="selectin")
    reviews = relationship("Review", back_populates="user", lazy="selectin")

    __table_args__ = (
        CheckConstraint("role IN ('player', 'owner', 'admin', 'USER', 'OWNER', 'ADMIN')", name="valid_role"),
        CheckConstraint("rating >= 0 AND rating <= 5", name="valid_rating"),
    )

    def __repr__(self):
        return f"<User {self.full_name} ({self.phone_number})>"
