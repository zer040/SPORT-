"""
Common Pydantic schemas — barcha API'larda qayta ishlatiladigan umumiy sxemalar.
Pagination, geolokatsiya, API response wrapper.
"""

from datetime import datetime
from typing import Any, Generic, List, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, Field

T = TypeVar("T")


# ─── Standard API Response ───────────────────

class APIResponse(BaseModel, Generic[T]):
    """Standart API javob formati."""
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None


class ErrorResponse(BaseModel):
    """Xatolik javob formati."""
    success: bool = False
    error: dict = Field(
        ...,
        examples=[{"code": 400, "message": "Xatolik yuz berdi."}],
    )


# ─── Pagination ──────────────────────────────

class PaginationParams(BaseModel):
    """Pagination query parametrlari."""
    page: int = Field(default=1, ge=1, description="Sahifa raqami")
    per_page: int = Field(default=20, ge=1, le=100, description="Har sahifada nechta")


class PaginatedResponse(BaseModel, Generic[T]):
    """Pagination bilan javob."""
    success: bool = True
    data: List[T]
    pagination: dict = Field(
        ...,
        examples=[{
            "page": 1,
            "per_page": 20,
            "total_items": 100,
            "total_pages": 5,
        }],
    )


class PaginationMeta(BaseModel):
    """Pagination metadata."""
    page: int
    per_page: int
    total_items: int
    total_pages: int

    @classmethod
    def calculate(cls, page: int, per_page: int, total_items: int) -> "PaginationMeta":
        total_pages = (total_items + per_page - 1) // per_page if per_page > 0 else 0
        return cls(
            page=page,
            per_page=per_page,
            total_items=total_items,
            total_pages=total_pages,
        )


# ─── Geolokatsiya ───────────────────────────

class GeoPoint(BaseModel):
    """Geografik nuqta (latitude, longitude)."""
    lat: float = Field(..., ge=-90, le=90, description="Kenglik (latitude)")
    lon: float = Field(..., ge=-180, le=180, description="Uzunlik (longitude)")


class LocationQuery(BaseModel):
    """Geolokatsiya bo'yicha qidiruv parametrlari."""
    lat: float = Field(..., ge=-90, le=90, description="Foydalanuvchi kengligi")
    lon: float = Field(..., ge=-180, le=180, description="Foydalanuvchi uzunligi")
    radius_km: float = Field(default=5.0, ge=0.1, le=50.0, description="Qidiruv radiusi (km)")


# ─── ID response ────────────────────────────

class IDResponse(BaseModel):
    """Faqat ID qaytaradigan javob."""
    id: UUID


# ─── Timestamp mixin ────────────────────────

class TimestampMixin(BaseModel):
    """created_at va updated_at fieldlari."""
    created_at: datetime
    updated_at: Optional[datetime] = None


# ─── Sort va Filter ─────────────────────────

class SortOrder(BaseModel):
    """Saralash parametrlari."""
    sort_by: str = "created_at"
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")
