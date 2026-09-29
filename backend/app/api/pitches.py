"""
Pitches API Endpoints — Maydonlar (pitches) boshqaruvi.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import UserRole, get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import PitchNotFoundError, VenueNotFoundError
from app.models.pitch import Pitch
from app.models.user import User
from app.models.venue import Venue
from app.schemas.pitch import PitchCreate, PitchResponse, PitchUpdate

router = APIRouter()


@router.get(
    "/venue/{venue_id}",
    response_model=List[PitchResponse],
    summary="Venue ichidagi barcha pitchlarni olish",
)
async def list_pitches_by_venue(
    venue_id: str,
    db: AsyncSession = Depends(get_db),
):
    pitches = []
    if db is not None:
        try:
            from uuid import UUID
            v_uuid = UUID(venue_id)
            query = (
                select(Pitch)
                .where(Pitch.venue_id == v_uuid, Pitch.is_active == True)
                .order_by(Pitch.name.asc())
            )
            result = await db.execute(query)
            pitches = list(result.scalars().all())
        except Exception:
            pitches = []

    if not pitches:
        vid_str = str(venue_id)
        from app.services.mock_data import MOCK_PITCHES
        raw_list = MOCK_PITCHES.get(vid_str) or [
            {
                "id": f"p1-{vid_str[:8]}",
                "venue_id": vid_str,
                "name": "Maydon 1 (5x5 Mini)",
                "size_type": "5x5",
                "grass_type": "artificial",
                "has_roof": False,
                "price_per_hour": 180000.0,
                "is_active": True,
                "min_players": 10,
                "max_players": 14,
            },
            {
                "id": f"p2-{vid_str[:8]}",
                "venue_id": vid_str,
                "name": "Maydon 2 (7x7 Standart)",
                "size_type": "7x7",
                "grass_type": "artificial",
                "has_roof": False,
                "price_per_hour": 300000.0,
                "is_active": True,
                "min_players": 14,
                "max_players": 18,
            },
        ]
        formatted = []
        for p in raw_list:
            formatted.append(
                PitchResponse(
                    id=p["id"],
                    venue_id=venue_id,
                    name=p["name"],
                    size_type=p.get("size_type") or p.get("format") or "5x5",
                    grass_type="artificial" if "grass" in str(p.get("surface_type")) else "indoor",
                    has_roof=p.get("has_roof") or p.get("is_indoor", False),
                    price_per_hour=float(p["price_per_hour"]),
                    is_active=True,
                    min_players=p.get("min_players", 10),
                    max_players=p.get("max_players", 18),
                )
            )
        return formatted

    return pitches


@router.get(
    "/{pitch_id}",
    response_model=PitchResponse,
    summary="Alohida pitch ma'lumotlarini olish",
)
async def get_pitch(
    pitch_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Pitch).where(Pitch.id == pitch_id))
    pitch = result.scalar_one_or_none()
    if not pitch:
        raise PitchNotFoundError()
    return pitch


@router.post(
    "/venue/{venue_id}",
    response_model=PitchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Yangi pitch qo'shish (Faqat Owner/Admin)",
)
@require_role(UserRole.OWNER, UserRole.ADMIN)
async def create_pitch(
    venue_id: UUID,
    payload: PitchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    venue_res = await db.execute(select(Venue).where(Venue.id == venue_id))
    venue = venue_res.scalar_one_or_none()
    if not venue:
        raise VenueNotFoundError()

    pitch = Pitch(
        venue_id=venue_id,
        name=payload.name,
        size_type=payload.size_type,
        grass_type=payload.grass_type,
        has_roof=payload.has_roof,
        price_per_hour=payload.price_per_hour,
        min_players=payload.min_players,
        max_players=payload.max_players,
    )
    db.add(pitch)
    await db.commit()
    await db.refresh(pitch)

    return pitch
