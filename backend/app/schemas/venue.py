"""
Venue Pydantic Schemas — maydonlar CRUD, qidiruv, rasmlar.
"""

from datetime import datetime, time
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import GeoPoint


class VenueBase(BaseModel):
    """Venue bazaviy fieldlari."""
    name: str = Field(..., max_length=150, examples=["Triumph Stadium"])
    description: str | None = None
    address: str = Field(..., examples=["Chilonzor tumani, 9-kvartal"])
    city: str = Field(default="Toshkent", max_length=50)
    district: str | None = Field(default=None, max_length=50, examples=["Chilonzor"])
    phone_number: str | None = Field(default=None, max_length=20)
    working_hours_start: time = Field(default=time(6, 0))
    working_hours_end: time = Field(default=time(23, 0))
    facilities: Dict = Field(
        default_factory=dict,
        examples=[{
            "parking": True,
            "shower": True,
            "lighting": True,
            "cafe": False,
            "changing_room": True,
            "wifi": False,
        }],
    )


class VenueCreate(VenueBase):
    """Yangi venue yaratish."""
    location: GeoPoint = Field(..., description="Maydon joylashuvi (lat, lon)")


class VenueUpdate(BaseModel):
    """Venue yangilash (partial update)."""
    name: str | None = Field(default=None, max_length=150)
    description: str | None = None
    address: str | None = None
    city: str | None = None
    district: str | None = None
    phone_number: str | None = None
    working_hours_start: time | None = None
    working_hours_end: time | None = None
    facilities: Dict | None = None
    is_active: bool | None = None


class VenueImageResponse(BaseModel):
    """Venue rasmi javob modeli."""
    id: UUID
    image_url: str
    is_primary: bool
    sort_order: int

    model_config = {"from_attributes": True}


class PitchBriefResponse(BaseModel):
    """Pitch qisqacha javob (venue ichida)."""
    id: UUID
    name: str
    size_type: str
    grass_type: str
    has_roof: bool
    price_per_hour: float
    min_players: int
    max_players: int
    is_active: bool

    model_config = {"from_attributes": True}


class VenueResponse(BaseModel):
    """Venue to'liq javob modeli."""
    id: UUID
    owner_id: UUID
    name: str
    description: str | None = None
    address: str
    city: str
    district: str | None = None
    phone_number: str | None = None
    working_hours_start: time
    working_hours_end: time
    facilities: Dict
    is_active: bool
    avg_rating: float
    total_bookings: int
    created_at: datetime
    updated_at: datetime | None = None

    # Nested relationships
    pitches: List[PitchBriefResponse] = []
    images: List[VenueImageResponse] = []

    model_config = {"from_attributes": True}


class VenueListItem(BaseModel):
    """Qidiruv natijasidagi venue (qisqartirilgan)."""
    id: UUID
    name: str
    address: str
    city: str
    district: str | None = None
    avg_rating: float
    total_bookings: int
    facilities: Dict
    distance_km: Optional[float] = None
    primary_image_url: str | None = None
    min_price: Optional[float] = None
    available_slots_count: Optional[int] = None

    model_config = {"from_attributes": True}


class VenueSearchQuery(BaseModel):
    """Venue qidiruv parametrlari."""
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=5.0, ge=0.1, le=50.0)
    city: str | None = None
    size_type: str | None = Field(default=None, pattern="^(5x5|7x7|8x8|11x11|mini)$")
    max_price: float | None = Field(default=None, ge=0)
    date: str | None = Field(default=None, description="YYYY-MM-DD formatda")
    has_roof: bool | None = None
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
