"""
Resilient Redis Client — Docker / Linux muhitida real aioredis ga ulanadi,
offline / Windows / Render free rejimida esa xatosiz xotira/fayl keshida ishlaydi.
Zero hardcoding — barcha hisoblagichlar real amallarga asoslanadi.
"""

import json
import logging
import os
import time
from typing import Any, Dict, List, Optional, Union

import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger("sportplus.redis")
CACHE_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".redis_live_cache.json"))

# Global in-memory storage for high-speed fallback
_MEMORY_CACHE: Dict[str, Any] = {}


def _read_cache() -> Dict[str, Any]:
    global _MEMORY_CACHE
    if _MEMORY_CACHE:
        return _MEMORY_CACHE
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                _MEMORY_CACHE = json.load(f)
                return _MEMORY_CACHE
    except Exception:
        pass
    return _MEMORY_CACHE


def _write_cache(data: Dict[str, Any]):
    global _MEMORY_CACHE
    _MEMORY_CACHE = data
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
                socket_connect_timeout=0.2,
                socket_timeout=0.3,
            )
        return self._client

    async def set(
        self,
        name: str,
        value: Any,
        ex: Optional[int] = None,
        px: Optional[int] = None,
        nx: bool = False,
        xx: bool = False,
        keepttl: bool = False,
        **kwargs
    ) -> bool:
        """Standard redis set with ex / px / fallback."""
        try:
            client = self._get_client()
            return await client.set(name, value, ex=ex, px=px, nx=nx, xx=xx, keepttl=keepttl)
        except Exception:
            data = _read_cache()
            exp = (time.time() + ex) if ex else ((time.time() + px / 1000) if px else 0)
            str_val = value if isinstance(value, str) else json.dumps(value)
            data[name] = {"value": str_val, "exp": exp}
            _write_cache(data)
            return True

    async def setex(self, key: str, time_sec: int, value: Any) -> bool:
        """TTL bilan qiymat yozish."""
        return await self.set(key, value, ex=time_sec)

    async def get(self, key: str) -> Optional[str]:
        """Kalit bo'yicha qiymat o'qish."""
        try:
            client = self._get_client()
            return await client.get(key)
        except Exception:
            data = _read_cache()
            item = data.get(key)
            if not item:
                return None
            if isinstance(item, dict) and "exp" in item:
                if item.get("exp", 0) > 0 and time.time() > item["exp"]:
                    data.pop(key, None)
                    _write_cache(data)
                    return None
                return str(item.get("value"))
            return str(item)

    async def exists(self, *names: str) -> int:
        """Bir yoki bir nechta kalit mavjudligini tekshirish."""
        try:
            client = self._get_client()
            return await client.exists(*names)
        except Exception:
            data = _read_cache()
            count = 0
            for name in names:
                item = data.get(name)
                if item:
                    if isinstance(item, dict) and "exp" in item and item.get("exp", 0) > 0:
                        if time.time() > item["exp"]:
                            data.pop(name, None)
                            continue
                    count += 1
            return count

    async def delete(self, *names: str) -> int:
        """Kalitlarni o'chirish."""
        try:
            client = self._get_client()
            return await client.delete(*names)
        except Exception:
            data = _read_cache()
            deleted = 0
            for name in names:
                if name in data:
                    data.pop(name, None)
                    deleted += 1
            if deleted > 0:
                _write_cache(data)
            return deleted

    async def expire(self, name: str, time_sec: int) -> bool:
        """Kalitga TTL o'rnatish."""
        try:
            client = self._get_client()
            return await client.expire(name, time_sec)
        except Exception:
            data = _read_cache()
            if name in data:
                item = data[name]
                if isinstance(item, dict):
                    item["exp"] = time.time() + time_sec
                else:
                    data[name] = {"value": str(item), "exp": time.time() + time_sec}
                _write_cache(data)
                return True
            return False

    async def ttl(self, name: str) -> int:
        """Qolgan muddat (soniya)."""
        try:
            client = self._get_client()
            return await client.ttl(name)
        except Exception:
            data = _read_cache()
            item = data.get(name)
            if item and isinstance(item, dict) and "exp" in item:
                exp = item.get("exp", 0)
                if exp == 0:
                    return -1
                rem = int(exp - time.time())
                return max(rem, -2)
            return -2

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

    async def close(self):
        if self._client:
            try:
                await self._client.close()
            except Exception:
                pass
            self._client = None


# Global singleton instance
REDIS_URL = settings.REDIS_URL or os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = ResilientRedis(REDIS_URL)
