"""
FastAPI dependencies — Redis client, DB session, va boshqa shared resurslar.
"""

from app.config import settings
from app.core.redis_client import redis_client, ResilientRedis


async def get_redis() -> ResilientRedis:
    """FastAPI dependency — Resilient Redis client qaytarish (online Redis yoki xatosiz fallback)."""
    return redis_client


async def close_redis():
    """Gracefully close Redis connection."""
    await redis_client.close()


from typing import Any
from fastapi import Depends, HTTPException, status
from app.core.auth import get_current_user


async def require_admin(current_user: Any = Depends(get_current_user)):
    """Admin huquqlarini tekshiruvchi dependency."""
    role = getattr(current_user, "role", None)
    if role is None and isinstance(current_user, dict):
        role = current_user.get("role")

    if not role or str(role).upper() != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ushbu amalni bajarish uchun Admin huquqi talab qilinadi",
        )
    return current_user
