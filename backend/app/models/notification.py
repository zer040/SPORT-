"""
Notification ORM Model.
Bildirishnomalar tarixi — SMS, Telegram, Push, In-App.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    String,
    Text,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

notification_channel_enum = SAEnum(
    "sms", "telegram", "push", "in_app",
    name="notification_channel",
    create_constraint=True,
)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    channel: Mapped[str] = mapped_column(
        notification_channel_enum, nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self):
        return f"<Notification {self.channel} to={self.user_id}>"
