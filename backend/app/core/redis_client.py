"""
Resilient Redis Client — Docker / Linux muhitida real aioredis ga ulanadi,
offline / Windows rejimida esa xatosiz xotira/fayl keshida ishlaydi.
Zero hardcoding — barcha hisoblagichlar real amallarga asoslanadi.
"""

import json
import logging
import os
import time
from typing import Any, Dict, Optional

import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger("sportplus.redis")
CACHE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".redis_live_cache.json"))


def _read_cache() -> Dict[str, Any]:
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _write_cache(data: Dict[str, Any]):
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        pass


class ResilientRedis:
    def __init__(self, url: str):
        self._url = url
        self._client: Optional[aioredis.Redis] = None
        self._is_redis_online: Optional[bool] = None

    def _get_client(self) -> aioredis.Redis:
        if self._client is None:
            self._client = aioredis.from_url(
                self._url,
                decode_responses=True,
                socket_connect_timeout=0.3,
                socket_timeout=0.3,
            )
        return self._client

    async def zadd(self, key: str, mapping: Dict[str, float]) -> int:
        """Sorted Set ga score va qiymat qo'shish."""
        try:
            client = self._get_client()
            return await client.zadd(key, mapping)
        except Exception:
            data = _read_cache()
            zset = data.get(key, {})
            if not isinstance(zset, dict):
                zset = {}
            for member, score in mapping.items():
                zset[str(member)] = float(score)
            data[key] = zset
            _write_cache(data)
            return len(mapping)

    async def zcount(self, key: str, min_score: Any, max_score: Any) -> int:
        """Sorted Set dagi belgilangan vaqt oralig'idagi elementlarni sanash."""
        try:
            client = self._get_client()
            return await client.zcount(key, min_score, max_score)
        except Exception:
            data = _read_cache()
            zset = data.get(key, {})
            if not isinstance(zset, dict):
                return 0

            min_val = float("-inf") if str(min_score) == "-inf" else float(min_score)
            max_val = float("+inf") if str(max_score) == "+inf" else float(max_score)

            count = 0
            for member, score in zset.items():
                try:
                    s = float(score)
                    if min_val <= s <= max_val:
                        count += 1
                except (ValueError, TypeError):
                    continue
            return count

    async def setex(self, key: str, time_sec: int, value: str) -> bool:
        """TTL bilan qiymat yozish."""
        try:
            client = self._get_client()
            return await client.set(key, value, ex=time_sec)
        except Exception:
            data = _read_cache()
            data[key] = {"value": value, "exp": time.time() + time_sec}
            _write_cache(data)
            return True

    async def get(self, key: str) -> Optional[str]:
        """Kalit bo'yicha qiymat o'qish."""
        try:
            client = self._get_client()
            return await client.get(key)
        except Exception:
            data = _read_cache()
            item = data.get(key)
            if not item or not isinstance(item, dict):
                return None
            if time.time() > item.get("exp", 0):
                data.pop(key, None)
                _write_cache(data)
                return None
            return str(item.get("value"))

    async def delete(self, key: str) -> int:
        """Kalitni o'chirish."""
        try:
            client = self._get_client()
            return await client.delete(key)
        except Exception:
            data = _read_cache()
            if key in data:
                data.pop(key, None)
                _write_cache(data)
                return 1
            return 0


# Global singleton instance
REDIS_URL = settings.REDIS_URL or os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = ResilientRedis(REDIS_URL)
