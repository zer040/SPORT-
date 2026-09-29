"""
MatchChatMessage ORM Model.
Solo Play o'yin ichidagi chat xabarlari (o'yinchilar suhbati va tizim bildirishnomalari).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    String,
    Text,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

MESSAGE_TYPES = ("TEXT", "SYSTEM", "ALERT")

message_type_enum = SAEnum(
    *MESSAGE_TYPES,
    name="chat_message_type_enum",
    create_constraint=True,
)


class MatchChatMessage(Base):
    __tablename__ = "match_chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    match_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public_matches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(
        message_type_enum, nullable=False, default="TEXT"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Relationships
    match = relationship("PublicMatch", back_populates="chat_messages")
    user = relationship("User", lazy="joined")

    def __repr__(self):
        return f"<MatchChatMessage match={self.match_id} type={self.message_type}>"
