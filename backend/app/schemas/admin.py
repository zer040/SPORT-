"""
Admin Pydantic Schemas.
Boshqaruv paneli uchun so'rov va javob modellari.
"""

from datetime import datetime, time
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ─── Analytics Schemas ───
class RealtimeAnalyticsResponse(BaseModel):
    online_users: int = Field(..., description="Redis Heartbeat orqali ayni damda onlayn foydalanuvchilar")
    is_live: bool = True
    app_installations: Dict[str, int] = Field(
        ...,
        description="Ilova o'rnatishlari: {'android': 1420, 'ios': 890, 'web': 320, 'total': 2630}"
    )
    revenue_chart_7d: List[Dict[str, Any]] = Field(
        ...,
        description="Oxirgi 7 kunlik 10,000 UZS servis tushumlari dinamikasi [{'date': 'YYYY-MM-DD', 'amount': 150000, 'bookings': 15}]"
    )
    revenue_chart_30d: List[Dict[str, Any]] = Field(
        ...,
        description="Oxirgi 30 kunlik 10,000 UZS servis tushumlari dinamikasi"
    )
    totals: Dict[str, Any] = Field(
        ...,
        description="Umumiy metrikalar: foydalanuvchilar, maydonlar, tushumlar"
    )


class AdminStatsResponse(BaseModel):
    total_users: int
    total_venues: int
    total_bookings: int
    total_platform_revenue_uzs: float
    confirmed_bookings: int = 0
    active_venues: int = 0
    occupancy_rate: float = 0.0
    total_matches: int = 0


# ─── User Management Schemas ───
class AdminUserItem(BaseModel):
    id: Any
    telegram_id: Optional[int] = None
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: str
    rating: float = 5.0
    total_games: int = 0
    is_active: bool = True
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    venues_count: int = 0
    bookings_count: int = 0


class AdminUserListResponse(BaseModel):
    total: int
    items: List[AdminUserItem]


class UpdateUserStatusRequest(BaseModel):
    is_active: bool
    reason: Optional[str] = Field(None, description="Bloklash sababi (agar bloklanayotgan bo'lsa)")


class UserStatusUpdateRequest(UpdateUserStatusRequest):
    blacklist_tokens: bool = Field(True, description="Faol tokenlarni Redis qora ro'yxatiga kiritish")


class UpdateUserRoleRequest(BaseModel):
    role: str = Field(..., description="'player', 'owner', yoki 'admin'")


class UserRoleUpdateRequest(BaseModel):
    role: str = Field(..., description="Yangi rol: USER, OWNER yoki ADMIN")


# ─── Venue Management Schemas ───
class AdminPitchInput(BaseModel):
    name: str = Field(..., example="Maydon 1 (5x5 Mini)")
    format: str = Field("5x5", example="5x5")
    surface_type: str = Field("artifical_grass", example="artifical_grass")
    is_indoor: bool = False
    price_per_hour: float = Field(200000.0, example=200000.0)


class AdminPitchItem(BaseModel):
    id: str
    name: str
    format: str
    price_per_hour: float
    surface_type: str
    is_indoor: bool
    is_active: bool = True


class AdminVenueItem(BaseModel):
    id: Any
    name: str
    address: str
    city: str
    district: Optional[str] = None
    lat: float
    lon: float
    avg_rating: float
    total_bookings: int
    is_active: bool = True
    owner_id: Optional[UUID] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    working_hours_start: Optional[str] = "06:00"
    working_hours_end: Optional[str] = "23:00"
    facilities: Dict[str, Any] = Field(default_factory=dict)
    primary_image_url: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    pitches: List[AdminPitchItem] = Field(default_factory=list)


class CreateVenueRequest(BaseModel):
    name: str
    address: str
    city: str = "Toshkent"
    district: Optional[str] = None
    lat: float
    lon: float
    owner_id: Optional[UUID] = None
    phone_number: Optional[str] = None
    working_hours_start: str = "06:00"
    working_hours_end: str = "23:00"
    facilities: Dict[str, Any] = Field(default_factory=dict)
    primary_image_url: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    pitches: List[AdminPitchInput] = Field(default_factory=list)


class VenueCreateRequest(CreateVenueRequest):
    description: Optional[str] = None
    format: str = "7x7"
    price_per_hour: float = 120000.0


class UpdateVenueRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    owner_id: Optional[UUID] = None
    phone_number: Optional[str] = None
    working_hours_start: Optional[str] = None
    working_hours_end: Optional[str] = None
    facilities: Optional[Dict[str, Any]] = None
    primary_image_url: Optional[str] = None
    images: Optional[List[str]] = None
    is_active: Optional[bool] = None


class VenueUpdateRequest(UpdateVenueRequest):
    description: Optional[str] = None
    format: Optional[str] = None
    price_per_hour: Optional[float] = None

    images: Optional[List[str]] = None
    is_active: Optional[bool] = None


class RevenueHistoryItem(BaseModel):
    date: str
    amount_uzs: float
    bookings_count: int


class AdminRealtimeResponse(BaseModel):
    online_users_now: int
    app_installations: Dict[str, int]
    today_revenue_uzs: float
    total_revenue_uzs: float
    revenue_history: List[RevenueHistoryItem]
    active_held_bookings: int
    confirmed_bookings: int


class SlotCalendarItem(BaseModel):
    id: str
    pitch_name: str
    start_time: str
    end_time: str
    price: float
    is_available: bool
    booking_id: Optional[str] = None
    booked_by: Optional[str] = None


class VenuePitchInput(BaseModel):
    name: str = "Asosiy Maydon"
    size_type: str = "7x7"
    grass_type: str = "artificial"
    has_roof: bool = False
    price_per_hour: float = 120000.0


# ─── Finance Schemas ───
class AdminTransactionItem(BaseModel):
    id: Any
    transaction_id: Optional[str] = None
    booking_id: Any
    user_name: str
    user_phone: Optional[str] = None
    venue_name: str
    pitch_name: Optional[str] = None
    slot_time: Optional[str] = None
    amount: float
    service_fee: float = 10000.0
    provider: Optional[str] = None
    status: str
    created_at: datetime
    paid_at: Optional[datetime] = None


class AdminTransactionListResponse(BaseModel):
    total: int
    total_revenue_uzs: float
    items: List[AdminTransactionItem]


class RefundBookingRequest(BaseModel):
    reason: Optional[str] = Field("Admin tomonidan qaytarildi", description="Bekor qilish va refund sababi")

