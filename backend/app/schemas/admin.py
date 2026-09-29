"""
Pydantic Schemas for Admin Dashboard & Management.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class AdminStatsResponse(BaseModel):
    total_users: int
    total_venues: int
    total_bookings: int
    total_platform_revenue_uzs: float
    confirmed_bookings: int = 0
    active_venues: int = 0
    occupancy_rate: float = 0.0
    total_matches: int = 0


class UserRoleUpdateRequest(BaseModel):
    role: str = Field(..., description="Yangi rol: USER, OWNER yoki ADMIN")


class UserStatusUpdateRequest(BaseModel):
    is_active: bool = Field(..., description="Foydalanuvchi faollik holati")
    reason: Optional[str] = Field(None, description="Bloklash yoki faollashtirish sababi")
    blacklist_tokens: bool = Field(True, description="Faol tokenlarni Redis qora ro'yxatiga kiritish")


class VenueUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    format: Optional[str] = None
    price_per_hour: Optional[float] = None
    facilities: Optional[Dict[str, Any]] = None
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


class VenueCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    address: str = Field(..., min_length=3)
    city: str = "Toshkent"
    district: Optional[str] = None
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    owner_id: Optional[UUID] = None
    format: str = "7x7"
    price_per_hour: float = 120000.0
    facilities: Dict[str, Any] = Field(default_factory=dict)
    images: List[str] = Field(default_factory=list)


class AdminUserItem(BaseModel):
    id: Any
    telegram_id: Optional[int] = None
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: str
    is_active: bool
    rating: float = 5.0
    total_games: int = 0
    created_at: Optional[datetime] = None


class AdminTransactionItem(BaseModel):
    id: Any
    booking_id: Any
    user_name: str
    user_phone: Optional[str] = None
    venue_name: str
    amount: float
    service_fee: float = 10000.0
    payment_status: str
    payment_provider: Optional[str] = None
    created_at: Optional[datetime] = None


class AdminVenueItem(BaseModel):
    id: Any
    name: str
    address: str
    city: str
    district: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    owner_id: Optional[Any] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    is_active: bool = True
    pitches_count: int = 0
    primary_image_url: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
