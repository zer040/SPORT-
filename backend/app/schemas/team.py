"""
Team Pydantic Schemas — jamoa CRUD, a'zolar boshqarish.
"""

from datetime import datetime
from typing import List
from uuid import UUID

from pydantic import BaseModel, Field


class TeamCreate(BaseModel):
    """Yangi jamoa yaratish."""
    name: str = Field(..., max_length=100, examples=["Toshkent FC"])
    avatar_url: str | None = None
    max_members: int = Field(default=15, ge=2, le=30)


class TeamUpdate(BaseModel):
    """Jamoa yangilash."""
    name: str | None = Field(default=None, max_length=100)
    avatar_url: str | None = None
    max_members: int | None = Field(default=None, ge=2, le=30)


class TeamMemberAdd(BaseModel):
    """Jamoaga a'zo qo'shish."""
    user_id: UUID | None = Field(default=None, description="Foydalanuvchi ID orqali qo'shish")
    invite_code: str | None = Field(default=None, description="Taklif kodi orqali qo'shish")
    role: str = Field(default="member", pattern="^(captain|vice_captain|member)$")


class TeamMemberResponse(BaseModel):
    """Jamoa a'zosi javob modeli."""
    id: UUID
    team_id: UUID
    user_id: UUID
    role: str
    joined_at: datetime

    # User ma'lumotlari (nested)
    user_name: str | None = None
    user_avatar: str | None = None

    model_config = {"from_attributes": True}


class TeamResponse(BaseModel):
    """Jamoa javob modeli."""
    id: UUID
    name: str
    captain_id: UUID
    avatar_url: str | None = None
    invite_code: str | None = None
    max_members: int
    is_active: bool
    created_at: datetime
    members_count: int = 0
    members: List[TeamMemberResponse] = []

    model_config = {"from_attributes": True}


class TeamJoinByCodeRequest(BaseModel):
    """Taklif kodi orqali jamoaga qo'shilish."""
    invite_code: str = Field(..., min_length=4, max_length=20)
