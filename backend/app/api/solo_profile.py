"""
Solo Profile API Endpoints — "O'yin qidiryapman" rejimi va yaqin atrofdagi solo o'yinchilarni topish.
"""

from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_Distance, ST_DWithin, ST_GeogFromText
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.solo_player_profile import SoloPlayerProfile
from app.models.user import User
from app.schemas.solo_profile import (
    NearbyPlayerResponse,
    SoloProfileResponse,
    SoloProfileUpdate,
)

router = APIRouter()


@router.get(
    "/me",
    response_model=SoloProfileResponse,
    summary="Joriy foydalanuvchining solo profili va sozlamalari",
)
async def get_my_solo_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(SoloPlayerProfile).where(SoloPlayerProfile.user_id == current_user.id)
    result = await db.execute(query)
    profile = result.scalar_one_or_none()

    if not profile:
        profile = SoloPlayerProfile(
            user_id=current_user.id,
            is_looking_for_game=False,
            reliability_score=100.00,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return profile


@router.patch(
    "/me",
    response_model=SoloProfileResponse,
    summary="Solo profil parametrlarini yangilash (Looking for game, pozitsiyalar, koordinatalar)",
)
async def update_my_solo_profile(
    payload: SoloProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(SoloPlayerProfile).where(SoloPlayerProfile.user_id == current_user.id)
    result = await db.execute(query)
    profile = result.scalar_one_or_none()

    if not profile:
        profile = SoloPlayerProfile(user_id=current_user.id)
        db.add(profile)

    if payload.is_looking_for_game is not None:
        profile.is_looking_for_game = payload.is_looking_for_game
    if payload.preferred_positions is not None:
        profile.preferred_positions = payload.preferred_positions
    if payload.preferred_radius_km is not None:
        profile.preferred_radius_km = payload.preferred_radius_km
    if payload.preferred_time_start is not None:
        profile.preferred_time_start = payload.preferred_time_start
    if payload.preferred_time_end is not None:
        profile.preferred_time_end = payload.preferred_time_end
    if payload.preferred_days is not None:
        profile.preferred_days = payload.preferred_days

    # Koordinata yangilanishi
    if payload.lat is not None and payload.lon is not None:
        profile.location = WKTElement(f"POINT({payload.lon} {payload.lat})", srid=4326)

    profile.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(profile)

    return profile


@router.get(
    "/nearby",
    response_model=List[NearbyPlayerResponse],
    summary="Yaqin atrofdagi o'yin qidirayotgan o'yinchilar radari",
)
async def get_nearby_solo_players(
    lat: float = Query(..., ge=-90, le=90, description="Kenglik"),
    lon: float = Query(..., ge=-180, le=180, description="Uzunlik"),
    radius_km: float = Query(15.0, ge=1, le=50, description="Qidiruv radiusi (km)"),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_point = ST_GeogFromText(f"SRID=4326;POINT({lon} {lat})")

    query = (
        select(SoloPlayerProfile, ST_Distance(SoloPlayerProfile.location, user_point).label("dist_m"))
        .options(selectinload(SoloPlayerProfile.user))
        .where(
            SoloPlayerProfile.is_looking_for_game.is_(True),
            SoloPlayerProfile.user_id != current_user.id,
            SoloPlayerProfile.location.is_not(None),
            ST_DWithin(SoloPlayerProfile.location, user_point, radius_km * 1000),
        )
        .order_by("dist_m")
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    items = []
    for profile, dist_m in rows:
        user = profile.user
        items.append(
            NearbyPlayerResponse(
                user_id=profile.user_id,
                full_name=user.full_name,
                avatar_url=user.avatar_url,
                preferred_positions=profile.preferred_positions or [],
                reliability_score=float(profile.reliability_score),
                total_solo_games=profile.total_solo_games,
                distance_km=round(float(dist_m) / 1000.0, 2),
                preferred_time_start=profile.preferred_time_start,
                preferred_time_end=profile.preferred_time_end,
            )
        )
    return items
