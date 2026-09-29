"""
Venues API Endpoints — Maydonlar qidiruvi, ko'rish, yaratish va yangilash.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_Distance, ST_DWithin, ST_GeogFromText
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import UserRole, get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import VenueNotFoundError
from app.models.user import User
from app.models.venue import Venue
from app.schemas.venue import VenueCreate, VenueListItem, VenueResponse, VenueUpdate

router = APIRouter()


@router.get(
    "",
    response_model=List[VenueListItem],
    summary="Maydonlar ro'yxati va PostGIS geolokatsiya qidiruvi",
)
async def list_venues(
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Kenglik"),
    lon: Optional[float] = Query(None, ge=-180, le=180, description="Uzunlik"),
    radius_km: float = Query(10.0, ge=1, le=50, description="Qidiruv radiusi (km)"),
    city: Optional[str] = Query(None, description="Shahar bo'yicha filter"),
    is_active: bool = Query(True),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    items = []
    if db is not None:
        try:
            query = (
                select(Venue)
                .options(
                    selectinload(Venue.pitches),
                    selectinload(Venue.images),
                )
                .where(Venue.is_active == is_active)
            )

            if city:
                query = query.where(Venue.city.ilike(f"%{city}%"))

            # PostGIS masofani hisoblash va tartiblash
            if lat is not None and lon is not None:
                user_point = ST_GeogFromText(f"SRID=4326;POINT({lon} {lat})")
                query = query.where(ST_DWithin(Venue.location, user_point, radius_km * 1000))
                query = query.order_by(ST_Distance(Venue.location, user_point))
            else:
                query = query.order_by(Venue.avg_rating.desc())

            query = query.limit(limit).offset(offset)
            result = await db.execute(query)
            venues = result.scalars().all()

            for v in venues:
                prices = [p.price_per_hour for p in v.pitches if p.is_active]
                min_p = min(prices) if prices else None

                prim_img = next((img.image_url for img in v.images if img.is_primary), None)
                if not prim_img and v.images:
                    prim_img = v.images[0].image_url

                items.append(
                    VenueListItem(
                        id=v.id,
                        name=v.name,
                        address=v.address,
                        city=v.city,
                        district=v.district,
                        avg_rating=float(v.avg_rating),
                        total_bookings=v.total_bookings,
                        facilities=v.facilities or {},
                        primary_image_url=prim_img,
                        min_price=float(min_p) if min_p else None,
                    )
                )
        except Exception:
            items = []

    # DB o'chiq bo'lsa yoki ma'lumot bo'lmasa -> MOCK_VENUES qaytariladi
    if not items:
        from app.services.mock_data import MOCK_VENUES
        for mv in MOCK_VENUES:
            items.append(
                VenueListItem(
                    id=UUID(mv["id"]),
                    name=mv["name"],
                    address=mv["address"],
                    city=mv["city"],
                    district=mv.get("district"),
                    avg_rating=float(mv["avg_rating"]),
                    total_bookings=int(mv["total_bookings"]),
                    facilities=mv.get("facilities", {}),
                    primary_image_url=mv.get("primary_image_url"),
                    min_price=float(mv.get("min_price", 180000.0)),
                )
            )

    return items


@router.get(
    "/{venue_id}",
    response_model=VenueResponse,
    summary="Maydonning to'liq ma'lumotlari (pitches va rasmlari bilan)",
)
async def get_venue(
    venue_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Venue)
        .options(
            selectinload(Venue.pitches),
            selectinload(Venue.images),
        )
        .where(Venue.id == venue_id)
    )
    result = await db.execute(query)
    venue = result.scalar_one_or_none()

    if not venue:
        raise VenueNotFoundError()

    return venue


@router.post(
    "",
    response_model=VenueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Yangi maydon majmuasi yaratish (Faqat Owner/Admin)",
)
@require_role(UserRole.OWNER, UserRole.ADMIN)
async def create_venue(
    payload: VenueCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    location_geom = WKTElement(
        f"POINT({payload.location.lon} {payload.location.lat})", srid=4326
    )

    venue = Venue(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        address=payload.address,
        city=payload.city,
        district=payload.district,
        phone_number=payload.phone_number,
        working_hours_start=payload.working_hours_start,
        working_hours_end=payload.working_hours_end,
        facilities=payload.facilities,
        location=location_geom,
    )
    db.add(venue)
    await db.commit()
    await db.refresh(venue)

    return venue
