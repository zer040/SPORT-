"""
SoloPlayerProfile ORM Model.
"O'yin qidiryapman" rejimi sozlamalari, geolokatsiya va ishonchlilik (Reliability) reytingi.
"""

import uuid
from datetime import datetime, time, timezone

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Integer,
    Numeric,
    Time,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SoloPlayerProfile(Base):
    __tablename__ = "solo_player_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    is_looking_for_game: Mapped[bool] = mapped_column(
        Boolean, default=False, index=True
    )
    preferred_positions: Mapped[list] = mapped_column(
        JSONB, default=list, server_default="[]"
    )
    preferred_radius_km: Mapped[int] = mapped_column(
        Integer, default=10
    )
    preferred_time_start: Mapped[time | None] = mapped_column(
        Time, nullable=True
    )
    preferred_time_end: Mapped[time | None] = mapped_column(
        Time, nullable=True
    )
    preferred_days: Mapped[list] = mapped_column(
        JSONB, default=list, server_default="[]"
    )
    location = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=True,
    )
    reliability_score: Mapped[float] = mapped_column(
        Numeric(5, 2), default=100.00
    )
    total_solo_games: Mapped[int] = mapped_column(
        Integer, default=0
    )
    solo_play_ban_until: Mapped[datetime | None] = mapped_column(
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
    user = relationship("User", lazy="joined")

    __table_args__ = (
        CheckConstraint("reliability_score >= 0 AND reliability_score <= 100", name="valid_reliability_score"),
        CheckConstraint("preferred_radius_km >= 1 AND preferred_radius_km <= 50", name="valid_preferred_radius"),
    )

    def __repr__(self):
        return f"<SoloPlayerProfile user={self.user_id} looking={self.is_looking_for_game} reliability={self.reliability_score}>"
