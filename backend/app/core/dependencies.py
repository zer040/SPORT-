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
