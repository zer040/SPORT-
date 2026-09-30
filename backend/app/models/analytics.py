"""
Analytics ORM Models.
Real vaqtdagi ilova o'rnatishlar va foydalanuvchi faollik jurnallari.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AppInstallation(Base):
    __tablename__ = "app_installations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_uuid: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)  # 'android' | 'ios' | 'web'
    app_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    os_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    installed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    last_opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id], lazy="selectin")

    def __repr__(self):
        return f"<AppInstallation {self.device_uuid} ({self.platform})>"


class UserActivityLog(Base):
    __tablename__ = "user_activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    device_uuid: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    event_name: Mapped[str] = mapped_column(String(50), nullable=False)  # 'app_open', 'slot_view', 'booking_started'
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self):
        return f"<UserActivityLog {self.event_name} by user={self.user_id}>"
