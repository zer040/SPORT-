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


# ─── User Management Schemas ───
class AdminUserItem(BaseModel):
    id: UUID
    full_name: str
    phone_number: Optional[str] = None
    role: str
    rating: float
    total_games: int
    is_active: bool
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


class UpdateUserRoleRequest(BaseModel):
    role: str = Field(..., description="'player', 'owner', yoki 'admin'")


# ─── Venue Management Schemas ───
class AdminPitchInput(BaseModel):
    name: str = Field(..., example="Maydon 1 (5x5 Mini)")
    format: str = Field("5x5", example="5x5") # 5x5, 7x7, 11x11
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
    id: UUID
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
    facilities: Dict[str, Any] = {}
    primary_image_url: Optional[str] = None
    images: List[str] = []
    pitches: List[AdminPitchItem] = []


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
    facilities: Dict[str, Any] = {}
    primary_image_url: Optional[str] = None
    images: List[str] = []
    pitches: List[AdminPitchInput] = []


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


# ─── Finance Schemas ───
class AdminTransactionItem(BaseModel):
    id: UUID
    transaction_id: str
    booking_id: UUID
    user_name: str
    user_phone: Optional[str] = None
    venue_name: str
    pitch_name: str
    slot_time: str
    amount: float
    service_fee: float = 10000.0
    provider: str
    status: str
    created_at: datetime
    paid_at: Optional[datetime] = None


class AdminTransactionListResponse(BaseModel):
    total: int
    total_revenue_uzs: float
    items: List[AdminTransactionItem]


class RefundBookingRequest(BaseModel):
    reason: Optional[str] = Field("Admin tomonidan qaytarildi", description="Bekor qilish va refund sababi")
