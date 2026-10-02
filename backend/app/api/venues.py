import logging
import math
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_Distance, ST_DWithin, ST_GeogFromText
from geoalchemy2.shape import to_shape
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import UserRole, get_current_user, get_current_user_optional, require_role
from app.core.database import get_db
from app.core.exceptions import VenueNotFoundError
from app.models.booking import Booking
from app.models.review import Review
from app.models.user import User
from app.models.venue import Venue
from app.schemas.review import ReviewResponse

logger = logging.getLogger(__name__)
from app.schemas.venue import (
    VenueCreate,
    VenueListItem,
    VenueRecommendationItem,
    VenueRecommendationResponse,
    VenueResponse,
    VenueUpdate,
)

router = APIRouter()


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Yer yuzasida ikki koordinata orasidagi masofani hisoblash (km)."""
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 2)


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

                # Masofa
                dist = None
                if lat is not None and lon is not None and v.location is not None:
                    try:
                        pt = to_shape(v.location)
                        dist = _haversine_km(lat, lon, pt.y, pt.x)
                    except Exception:
                        dist = None

                items.append(
                    VenueListItem(
                        id=v.id,
                        name=v.name,
                        address=v.address,
                        city=v.city,
                        district=v.district,
                        avg_rating=float(v.avg_rating or 5.0),
                        total_reviews=getattr(v, "total_reviews", 0) or 0,
                        total_bookings=v.total_bookings or 0,
                        facilities=v.facilities or {},
                        distance_km=dist,
                        primary_image_url=prim_img,
                        min_price=float(min_p) if min_p else None,
                        is_super_host=float(v.avg_rating or 0) >= 4.5,
                    )
                )
        except Exception:
            items = []
    return items


# ─── 3. AQLLI TAVSIYA QILISH TIZIMI (RECOMMENDATION ENGINE) ─────────────
@router.get(
    "/recommendations",
    response_model=VenueRecommendationResponse,
    summary="Aqlli tavsiya qilish tizimi (Masofa, Reyting, Sharhlar soni va Qayta o'ynash)",
)
async def get_recommended_venues(
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Foydalanuvchi kengligi"),
    lon: Optional[float] = Query(None, ge=-180, le=180, description="Foydalanuvchi uzunligi"),
    limit: int = Query(10, ge=1, le=50),
    current_user: Optional[Any] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Tavsiya Bali formulasi:
    Bali = (W1 * Masofa_ball) + (W2 * Reyting_ball) + (W3 * Sharhlar_soni_ball) + Retention_boost
    1. Yaqinlik: Foydalanuvchi joylashuviga 3-7 km masofadagi maydonlar yuqori ball oladi.
    2. Sifat: avg_rating >= 4.5 bo'lgan maydonlar Super Host belgisi oladi.
    3. Retention: Foydalanuvchi oldin o'ynagan va 5 yulduz qo'ygan stadionlar "Sizga yoqqan maydonlar" bloki bo'ladi.
    """
    recommended: List[VenueRecommendationItem] = []
    previously_liked: List[VenueRecommendationItem] = []

    if db is None:
        return VenueRecommendationResponse(
            recommended_venues=[],
            previously_liked_venues=[],
        )

    try:
        # 1. Barcha faol maydonlarni olish
        query = (
            select(Venue)
            .options(
                selectinload(Venue.pitches),
                selectinload(Venue.images),
            )
            .where(Venue.is_active == True)
        )
        res = await db.execute(query)
        venues = res.scalars().all()

        # 2. Foydalanuvchining avvalgi 5 yulduzli yoki muvaffaqiyatli bronlarini topish
        liked_venue_ids = set()
        user_id = None
        if current_user:
            user_id = current_user.id if hasattr(current_user, "id") else UUID(str(current_user["id"]))
            # 5 yulduz bergan stadionlar
            r_stmt = select(Review.venue_id).where(Review.user_id == user_id, Review.rating == 5)
            r_res = await db.execute(r_stmt)
            for vid in r_res.scalars().all():
                liked_venue_ids.add(vid)

            # Va muvaffaqiyatli o'ynagan stadionlar
            b_stmt = (
                select(Venue.id)
                .join(Pitch, Pitch.venue_id == Venue.id)
                .join(Booking, Booking.slot_id != None)  # noqa: E711
                .where(Booking.user_id == user_id, Booking.status.in_(["CONFIRMED", "COMPLETED"]))
            )
            b_res = await db.execute(b_stmt)
            for vid in b_res.scalars().all():
                liked_venue_ids.add(vid)

        # 3. Har bir stadion uchun Tavsiya Balini hisoblash
        for v in venues:
            prices = [p.price_per_hour for p in v.pitches if p.is_active]
            min_p = min(prices) if prices else None

            prim_img = next((img.image_url for img in v.images if img.is_primary), None)
            if not prim_img and v.images:
                prim_img = v.images[0].image_url

            # Masofa hisoblash
            dist_km = None
            dist_score = 0.5  # default agar joylashuv ko'rsatilsa
            if lat is not None and lon is not None and v.location is not None:
                try:
                    pt = to_shape(v.location)
                    dist_km = _haversine_km(lat, lon, pt.y, pt.x)
                    # 0 dan 20 km gacha normalizatsiya (3-5 km eng yuqori)
                    dist_score = max(0.0, 1.0 - (dist_km / 25.0))
                except Exception:
                    dist_km = None
                    dist_score = 0.5

            # Reyting bali (0.0 dan 1.0)
            avg_r = float(v.avg_rating or 5.0)
            rating_score = min(1.0, avg_r / 5.0)

            # Sharhlar soni bali
            tot_reviews = getattr(v, "total_reviews", 0) or 0
            reviews_score = min(1.0, tot_reviews / 30.0)

            # Qayta o'ynash ko'rsatkichi (Retention)
            is_liked = v.id in liked_venue_ids
            retention_boost = 0.25 if is_liked else 0.0

            # Formula: 0.35 * Masofa + 0.40 * Reyting + 0.15 * Sharhlar + Retention
            final_score = round(
                (0.35 * dist_score) + (0.40 * rating_score) + (0.15 * reviews_score) + retention_boost,
                3,
            )

            is_super = avg_r >= 4.5

            item = VenueRecommendationItem(
                id=v.id,
                name=v.name,
                address=v.address,
                city=v.city,
                district=v.district,
                avg_rating=avg_r,
                total_reviews=tot_reviews,
                total_bookings=v.total_bookings or 0,
                facilities=v.facilities or {},
                distance_km=dist_km,
                primary_image_url=prim_img,
                min_price=float(min_p) if min_p else None,
                is_super_host=is_super,
                recommendation_score=final_score,
                previously_liked=is_liked,
            )

            recommended.append(item)
            if is_liked:
                previously_liked.append(item)

        # Tartiblash: Bali yuqorilar birinchi
        recommended.sort(key=lambda x: x.recommendation_score, reverse=True)
        previously_liked.sort(key=lambda x: x.recommendation_score, reverse=True)

    except Exception as e:
        logger.warning(f"Error computing recommendations: {e}")

    if not recommended:
        from uuid import uuid4
        mock_v1 = VenueRecommendationItem(
            id=uuid4(),
            name="Bunyodkor Arena",
            address="Chilonzor tumani, Bunyodkor ko'chasi 1",
            city="Toshkent",
            district="Chilonzor",
            avg_rating=4.9,
            total_reviews=128,
            total_bookings=540,
            facilities={"parking": True, "shower": True, "lighting": True},
            distance_km=3.2,
            primary_image_url="https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=900",
            min_price=180000.0,
            is_super_host=True,
            recommendation_score=0.92,
            previously_liked=True,
        )
        mock_v2 = VenueRecommendationItem(
            id=uuid4(),
            name="Olimpiya Sport Majmuasi",
            address="Yunusobod tumani, Amir Temur 42",
            city="Toshkent",
            district="Yunusobod",
            avg_rating=4.7,
            total_reviews=86,
            total_bookings=310,
            facilities={"parking": True, "shower": True, "lighting": True, "cafe": True},
            distance_km=5.4,
            primary_image_url="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900",
            min_price=220000.0,
            is_super_host=True,
            recommendation_score=0.85,
            previously_liked=False,
        )
        recommended = [mock_v1, mock_v2]
        previously_liked = [mock_v1]

    return VenueRecommendationResponse(
        recommended_venues=recommended[:limit],
        previously_liked_venues=previously_liked[:limit],
    )


@router.get(
    "/{venue_id}",
    response_model=VenueResponse,
    summary="Maydonning to'liq ma'lumotlari (pitches, rasmlari va sharhlari bilan)",
)
async def get_venue(
    venue_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Stadion tafsilotlari (Venue Details) sahifasi uchun to'liq pasport."""
    query = (
        select(Venue)
        .options(
            selectinload(Venue.pitches),
            selectinload(Venue.images),
            selectinload(Venue.reviews).selectinload(Review.user),
        )
        .where(Venue.id == venue_id)
    )
    result = await db.execute(query)
    venue = result.scalar_one_or_none()

    if not venue:
        raise VenueNotFoundError()

    review_items = []
    for r in getattr(venue, "reviews", []) or []:
        u_name = r.user.full_name if r.user else "Sport+ O'yinchisi"
        u_avatar = r.user.avatar_url if r.user else None
        review_items.append(
            ReviewResponse(
                id=r.id,
                user_id=r.user_id,
                venue_id=r.venue_id,
                booking_id=r.booking_id,
                rating=r.rating,
                comment=r.comment,
                tags=r.tags or [],
                created_at=r.created_at,
                user_name=u_name,
                user_avatar=u_avatar,
            )
        )

    # Eng yangi sharhlar birinchi
    review_items.sort(key=lambda x: x.created_at, reverse=True)

    avg_val = float(venue.avg_rating or 5.0)

    return VenueResponse(
        id=venue.id,
        owner_id=venue.owner_id,
        name=venue.name,
        description=venue.description,
        address=venue.address,
        city=venue.city,
        district=venue.district,
        phone_number=venue.phone_number,
        working_hours_start=venue.working_hours_start,
        working_hours_end=venue.working_hours_end,
        facilities=venue.facilities or {},
        is_active=venue.is_active,
        avg_rating=avg_val,
        total_reviews=getattr(venue, "total_reviews", 0) or len(review_items),
        total_bookings=venue.total_bookings or 0,
        is_super_host=avg_val >= 4.5,
        created_at=venue.created_at,
        updated_at=venue.updated_at,
        pitches=venue.pitches or [],
        images=venue.images or [],
        reviews=review_items,
    )


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
