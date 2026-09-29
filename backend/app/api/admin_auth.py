"""
SuperAdmin Authentication Endpoints.
Login, Session verification va Logout boshqaruvi.
"""

from datetime import timedelta
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.config import settings
from app.core.auth import get_current_user
from app.core.security import create_access_token, verify_password
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


class AdminLoginRequest(BaseModel):
    username: str = Field(..., description="SuperAdmin login (username)")
    password: str = Field(..., description="SuperAdmin paroli")


class AdminLoginResponse(BaseModel):
    status: str
    access_token: str
    token_type: str = "bearer"
    expires_in_hours: int = 12
    admin: dict


@router.post(
    "/login",
    response_model=AdminLoginResponse,
    summary="SuperAdmin login — Username va Parol bilan 12 soatlik JWT token olish",
)
async def admin_login(payload: AdminLoginRequest):
    """
    Admin panelga kirish.
    .env yoki sozlamalardagi ADMIN_LOGIN va ADMIN_PASSWORD bilan solishtiriladi.
    """
    username_valid = payload.username.strip() == settings.ADMIN_LOGIN.strip()
    
    password_valid = False
    # To'g'ridan-to'g'ri yoki hash orqali solishtirish
    if payload.password == settings.ADMIN_PASSWORD:
        password_valid = True
    elif verify_password(payload.password, settings.ADMIN_PASSWORD):
        password_valid = True

    if not username_valid or not password_valid:
        logger.warning(f"Admin login xatosi: login '{payload.username}' uchun noto'g'ri ma'lumot kiritildi.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login yoki parol noto'g'ri.",
        )

    # 12 soatlik maxsus SuperAdmin JWT token yaratish
    token = create_access_token(
        data={
            "sub": "super_admin",
            "role": "admin",
            "is_admin": True,
            "username": payload.username,
        },
        expires_delta=timedelta(hours=12),
    )

    logger.info(f"SuperAdmin '{payload.username}' tizimga muvaffaqiyatli kirdi.")

    return AdminLoginResponse(
        status="SUCCESS",
        access_token=token,
        token_type="bearer",
        expires_in_hours=12,
        admin={
            "username": payload.username,
            "role": "SUPER_ADMIN",
            "full_name": "Super Administrator",
        },
    )


@router.get(
    "/me",
    summary="Joriy admin sessiyasini tekshirish",
)
async def admin_me(
    admin: User = Depends(get_current_user),
):
    """Joriy tokenni tasdiqlash va admin ma'lumotlarini qaytarish."""
    return {
        "status": "AUTHENTICATED",
        "username": settings.ADMIN_LOGIN,
        "role": "SUPER_ADMIN",
        "full_name": getattr(admin, "full_name", "Super Administrator"),
    }


@router.post(
    "/logout",
    summary="Admin tizimidan chiqish",
)
async def admin_logout(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    """Admin sessiyasini tugatish (tokenni Redis blacklistga qo'shish imkoni bilan)."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        try:
            from app.core.dependencies import get_redis
            redis_client = await get_redis()
            # 12 soatga blacklistga qo'shish
            await redis_client.set(f"blacklist:token:{token}", "1", ex=12 * 3600)
        except Exception:
            pass

    return {"status": "SUCCESS", "message": "Admin sessiyasi muvaffaqiyatli yakunlandi."}
