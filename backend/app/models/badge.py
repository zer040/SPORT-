"""
Badge and UserBadge ORM Models.
O'yinchilarning gamifikatsiyasi — ishonchlilik, o'yinlar soni va mahorat nishonlari.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    String,
    Text,
    UniqueConstraint,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user_badges = relationship(
        "UserBadge", back_populates="badge", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Badge {self.slug}>"


class UserBadge(Base):
    __tablename__ = "user_badges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    badge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("badges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    awarded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user = relationship("User")
    badge = relationship("Badge", back_populates="user_badges")

    __table_args__ = (
        UniqueConstraint("user_id", "badge_id", name="unique_user_badge"),
    )

    def __repr__(self):
        return f"<UserBadge user={self.user_id} badge={self.badge_id}>"
