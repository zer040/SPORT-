"""
Team and TeamMember ORM Models.
Jamoalar va a'zolar — captain, invite_code bilan.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Integer,
    String,
    Text,
    UniqueConstraint,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    captain_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    invite_code: Mapped[str | None] = mapped_column(
        String(20), unique=True, nullable=True, index=True
    )
    max_members: Mapped[int] = mapped_column(Integer, default=15)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    members = relationship(
        "TeamMember", back_populates="team", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Team {self.name}>"


class TeamMember(Base):
    __tablename__ = "team_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(20), default="member")
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    team = relationship("Team", back_populates="members")

    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="unique_team_member"),
        CheckConstraint(
            "role IN ('captain', 'vice_captain', 'member')",
            name="valid_member_role",
        ),
    )

    def __repr__(self):
        return f"<TeamMember team={self.team_id} user={self.user_id}>"
