"""
FastAPI dependencies — Redis client, DB session, va boshqa shared resurslar.
"""

import redis.asyncio as redis

from app.config import settings

# Redis client singleton
_redis_client: redis.Redis = None


async def get_redis() -> redis.Redis:
    """FastAPI dependency — Redis client qaytarish."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=50,
        )
    return _redis_client


async def close_redis():
    """Gracefully close Redis connection."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


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
