"""
Distributed Lock — Redis Lua Script asosida xavfsiz taqsimlangan qulf.

MUAMMO: Oddiy Redis SET NX bilan qulf olinganda, agar PostgreSQL
tranzaksiyasi muvaffaqiyatsiz bo'lsa, Redis qulfi "yetim" qoladi.
Yoki boshqa jarayon qulfni o'g'irlab olishi mumkin.

YECHIM: Fencing Token mexanizmi — har bir qulf olishda unikal
ortib boruvchi token beriladi. Qulfni faqat token egasi bo'shata oladi.
Lua scriptlar atomiklikni ta'minlaydi.
"""

import json
import logging
from typing import Optional

import redis.asyncio as redis

from app.core.exceptions import SlotAlreadyHeldError

logger = logging.getLogger(__name__)

# ─── Lua Scripts (Atomik operatsiyalar) ──────

# Qulf olish: SET NX + Fencing token
_ACQUIRE_LUA = """
local lock_key = KEYS[1]
local fence_key = KEYS[2]
local owner = ARGV[1]
local ttl = tonumber(ARGV[2])

-- Fencing token generatsiya
local fence = redis.call('INCR', fence_key)
local lock_value = owner .. ':' .. tostring(fence)

-- Atomik: faqat bo'sh bo'lsa qulf olish
local ok = redis.call('SET', lock_key, lock_value, 'NX', 'EX', ttl)
if ok then
    return cjson.encode({acquired = true, fence = fence, value = lock_value})
else
    -- Qulf olinmadi — fencing counter qaytarish
    redis.call('DECR', fence_key)
    local current = redis.call('GET', lock_key)
    local remaining = redis.call('TTL', lock_key)
    return cjson.encode({
        acquired = false,
        held_by = current,
        ttl_remaining = remaining
    })
end
"""

# Qulf bo'shatish: faqat owner bo'lsa
_RELEASE_LUA = """
local lock_key = KEYS[1]
local expected_value = ARGV[1]

local current = redis.call('GET', lock_key)
if current == expected_value then
    redis.call('DEL', lock_key)
    return 1
else
    return 0
end
"""

# Qulf muddatini uzaytirish (heartbeat)
_EXTEND_LUA = """
local lock_key = KEYS[1]
local expected_value = ARGV[1]
local new_ttl = tonumber(ARGV[2])

local current = redis.call('GET', lock_key)
if current == expected_value then
    redis.call('EXPIRE', lock_key, new_ttl)
    return 1
else
    return 0
end
"""


class DistributedLock:
    """
    Production-grade Redis taqsimlangan qulf.

    Xususiyatlari:
    - Fencing Token: har bir qulf o'ziga xos ortib boruvchi raqam oladi
    - Atomik Lua scriptlar: SET + INCR bitta operatsiyada
    - Context Manager: async with bilan ishlatish mumkin
    - Xatolikka chidamlilik: exception bo'lganda avtomatik bo'shatish

    Ishlatilishi:
        lock = DistributedLock(redis, "slot:uuid-123", "user-456", ttl=30)
        async with lock:
            # Qulf ichida xavfsiz operatsiyalar
            await db_operation()
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        resource: str,
        owner_id: str,
        ttl: int = 30,
        key_prefix: str = "lock:",
    ):
        self.redis = redis_client
        self.resource = resource
        self.owner_id = owner_id
        self.ttl = ttl
        self.lock_key = f"{key_prefix}{resource}"
        self.fence_key = f"fence:{resource}"

        # Qulf olingandan keyingi holat
        self._lock_value: Optional[str] = None
        self._fence_token: Optional[int] = None
        self._acquired: bool = False

    async def acquire(self) -> bool:
        """
        Qulfni olishga urinish.

        Returns:
            True agar muvaffaqiyatli olinsa, False aks holda.
        """
        result_raw = await self.redis.eval(
            _ACQUIRE_LUA,
            2,  # Keys soni
            self.lock_key, self.fence_key,  # KEYS
            self.owner_id, str(self.ttl),   # ARGV
        )

        result = json.loads(result_raw)

        if result.get("acquired"):
            self._acquired = True
            self._fence_token = result["fence"]
            self._lock_value = result["value"]
            logger.debug(
                f"Lock acquired: {self.lock_key} "
                f"(fence={self._fence_token}, ttl={self.ttl}s)"
            )
            return True
        else:
            logger.debug(
                f"Lock denied: {self.lock_key} "
                f"(held_by={result.get('held_by')}, "
                f"ttl_remaining={result.get('ttl_remaining')}s)"
            )
            return False

    async def release(self) -> bool:
        """
        Qulfni bo'shatish — faqat owner bo'lsa.

        Returns:
            True agar muvaffaqiyatli bo'shatilsa.
        """
        if not self._acquired or not self._lock_value:
            return False

        result = await self.redis.eval(
            _RELEASE_LUA,
            1,
            self.lock_key,
            self._lock_value,
        )

        released = bool(result)
        if released:
            logger.debug(f"Lock released: {self.lock_key}")
        else:
            logger.warning(
                f"Lock release failed (stolen?): {self.lock_key} "
                f"expected={self._lock_value}"
            )

        self._acquired = False
        self._lock_value = None
        self._fence_token = None
        return released

    async def extend(self, additional_ttl: Optional[int] = None) -> bool:
        """
        Qulf muddatini uzaytirish (long-running operatsiyalar uchun).

        Args:
            additional_ttl: Yangi TTL (soniyalarda). Default: dastlabki TTL.
        """
        if not self._acquired or not self._lock_value:
            return False

        new_ttl = additional_ttl or self.ttl
        result = await self.redis.eval(
            _EXTEND_LUA,
            1,
            self.lock_key,
            self._lock_value,
            str(new_ttl),
        )
        extended = bool(result)
        if extended:
            logger.debug(f"Lock extended: {self.lock_key} (+{new_ttl}s)")
        return extended

    @property
    def fence_token(self) -> Optional[int]:
        """Joriy fencing token — tranzaksiya validatsiyasi uchun."""
        return self._fence_token

    @property
    def is_acquired(self) -> bool:
        """Qulf hozirda olinganmi?"""
        return self._acquired

    # ─── Context Manager ─────────────────────

    async def __aenter__(self) -> "DistributedLock":
        if not await self.acquire():
            raise SlotAlreadyHeldError(
                "Bu resurs boshqa foydalanuvchi tomonidan band. "
                "Iltimos, qaytadan urinib ko'ring."
            )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # Xatolik bo'ldi — qulfni darhol bo'shatish
            await self.release()
            logger.warning(
                f"Lock auto-released due to error: {self.lock_key} "
                f"error={exc_type.__name__}: {exc_val}"
            )
        # Muvaffaqiyatli bo'lsa — qulf TTL bilan o'zi tugaydi
        # (booking hold uchun qulf qolishi kerak)
        return False  # Exception'ni qayta ko'tarish


class SlotLock(DistributedLock):
    """Slot bron qilish uchun ixtisoslashtirilgan qulf."""

    def __init__(
        self,
        redis_client: redis.Redis,
        slot_id: str,
        user_id: str,
        hold_duration: int = 600,
    ):
        super().__init__(
            redis_client=redis_client,
            resource=f"slot:{slot_id}",
            owner_id=str(user_id),
            ttl=hold_duration,
            key_prefix="lock:",
        )
        self.slot_id = slot_id
        self.user_id = user_id


class MatchLock(DistributedLock):
    """Solo Play matchga qo'shilish uchun qulf (race condition prevention)."""

    def __init__(
        self,
        redis_client: redis.Redis,
        match_id: str,
        user_id: str,
    ):
        super().__init__(
            redis_client=redis_client,
            resource=f"match:{match_id}",
            owner_id=str(user_id),
            ttl=5,  # 5 soniya — faqat join operatsiyasi uchun
            key_prefix="redlock:",
        )
        self.match_id = match_id
        self.user_id = user_id
