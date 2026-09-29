"""
Admin API Endpoints.
Administratorlar uchun:
- Tushumlar statistikasi (10,000 UZS servis to'lovlari hisoboti)
- Foydalanuvchilarni OWNER yoki ADMIN qilish
- Stadionga OWNER biriktirish
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.booking import Booking
from app.models.pitch import Pitch
from app.models.public_match import PublicMatch
from app.models.user import User
from app.models.venue import Venue

router = APIRouter()


class AssignOwnerRequest(BaseModel):
    venue_id: UUID
    owner_user_id: UUID


class UpdateRoleRequest(BaseModel):
    role: str  # "player", "owner", "admin"


@router.get(
    "/dashboard-stats",
    summary="Platforma boshqaruv paneli — asosiy ko'rsatkichlar va moliyaviy tushumlar",
)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("admin", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faqat ADMIN uchun ruxsat berilgan.")

    # 1. Jami foydalanuvchilar
    users_count = await db.scalar(select(func.count(User.id)))
    # 2. Maydon egalari
    owners_count = await db.scalar(select(func.count(User.id)).where(User.role.in_(["owner", "OWNER"])))
    # 3. Jami stadionlar
    venues_count = await db.scalar(select(func.count(Venue.id)))
    # 4. Jami pitclar
    pitches_count = await db.scalar(select(func.count(Pitch.id)))
    # 5. Jami bronlar
    bookings_count = await db.scalar(select(func.count(Booking.id)))
    # 6. Tasdiqlangan bronlar
    confirmed_bookings = await db.scalar(
        select(func.count(Booking.id)).where(Booking.status.in_(["CONFIRMED", "COMPLETED"]))
    )
    # 7. 10,000 UZS platforma servis to'lovlari (Monetizatsiya)
    total_service_fee = (confirmed_bookings or 0) * 10000.0

    # 8. Solo play o'yinlari
    matches_count = await db.scalar(select(func.count(PublicMatch.id)))

    return {
        "users_count": users_count or 0,
        "owners_count": owners_count or 0,
        "venues_count": venues_count or 0,
        "pitches_count": pitches_count or 0,
        "total_bookings": bookings_count or 0,
        "confirmed_bookings": confirmed_bookings or 0,
        "total_platform_revenue_uzs": total_service_fee,
        "platform_service_fee_per_booking": 10000.0,
        "total_matches": matches_count or 0,
    }


@router.post(
    "/assign-owner",
    summary="Stadionga maydon egasini biriktirish",
)
async def assign_owner(
    payload: AssignOwnerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("admin", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faqat ADMIN uchun ruxsat.")

    venue = await db.get(Venue, payload.venue_id)
    if not venue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stadion topilmadi.")

    target_user = await db.get(User, payload.owner_user_id)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi.")

    # Foydalanuvchini OWNER roliga o'tkazamiz
    target_user.role = "owner"
    venue.owner_id = target_user.id

    await db.commit()
    await db.refresh(venue)

    return {
        "success": True,
        "message": f"{target_user.full_name} muvaffaqiyatli '{venue.name}' stadioni egasi (OWNER) qilib tayinlandi.",
        "venue_id": str(venue.id),
        "owner_id": str(target_user.id),
    }


@router.patch(
    "/users/{user_id}/role",
    summary="Foydalanuvchi rolini o'zgartirish (player, owner, admin)",
)
async def update_user_role(
    user_id: UUID,
    payload: UpdateRoleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("admin", "ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Faqat ADMIN uchun ruxsat.")

    target_user = await db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foydalanuvchi topilmadi.")

    new_role = payload.role.lower()
    if new_role not in ("player", "owner", "admin"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rollar faqat: player, owner, admin.")

    target_user.role = new_role
    await db.commit()

    return {
        "success": True,
        "user_id": str(target_user.id),
        "full_name": target_user.full_name,
        "new_role": target_user.role,
    }
