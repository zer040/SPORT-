"""
AppInstallation ORM Model.
Mobil ilova o'rnatishlari (Android / iOS / Web) statistikasi.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AppInstallation(Base):
    __tablename__ = "app_installations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    device_id: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    platform: Mapped[str] = mapped_column(
        String(20), nullable=False, default="android", index=True
    )  # android, ios, web
    app_version: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    os_version: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    installed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    def __repr__(self):
        return f"<AppInstallation {self.device_id} ({self.platform})>"
