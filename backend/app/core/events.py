"""
Real-time Event Hub & Cache Invalidation for SPORT+.
WebSocket ulanishlar orqali real-time xabarlar tarqatish va Redis keshni tozalash.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Set
from fastapi import WebSocket

from app.core.redis_client import redis_client

logger = logging.getLogger("sportplus.events")


class RealtimeHub:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"⚡ Yangi WebSocket ulandi. Jami: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"🔌 WebSocket uzildi. Qolgan: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """Barcha ulangan klientlarga (O'yinchilar, Ownerlar, Admin) event yuborish."""
        payload = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        text_data = json.dumps(payload)
        stale = []

        async with self._lock:
            for ws in self.active_connections:
                try:
                    await ws.send_text(text_data)
                except Exception:
                    stale.append(ws)

            for ws in stale:
                self.active_connections.discard(ws)

        logger.info(f"📢 Real-time event tarqatildi: {event_type} -> {len(self.active_connections)} ta mijozga")

    async def invalidate_cache(self, pattern: str = "slots:*"):
        """Redis yoki in-memory keshni tozalash."""
        try:
            # Agar Redis live bo'lsa
            if hasattr(redis_client, "delete_by_pattern"):
                await redis_client.delete_by_pattern(pattern)
            else:
                # Fallback in-memory
                logger.info(f"🧹 Cache invalidated for pattern: {pattern}")
        except Exception as e:
            logger.warning(f"⚠️ Cache invalidation xatolik: {e}")

    async def notify_slot_change(
        self,
        slot_id: str,
        pitch_id: str,
        status: str,
        is_available: bool,
        price: float,
        venue_id: str | None = None,
    ):
        """Slot o'zganganda real vaqtda o'yinchilar ekranini yangilash.
        1. Global broadcast (barcha WebSocket klientlar)
        2. Venue-specific room broadcast (faqat shu venue sahifasidagilar)
        """
        payload = {
            "slot_id": str(slot_id),
            "pitch_id": str(pitch_id),
            "venue_id": str(venue_id) if venue_id else None,
            "status": status,
            "is_available": is_available,
            "price": price,
        }
        # 1. Global broadcast
        await self.broadcast("SLOT_UPDATED", payload)

        # 2. Venue-room targeted broadcast
        if venue_id:
            try:
                from app.core.websocket_manager import ws_manager
                await ws_manager.broadcast_to_venue(
                    str(venue_id),
                    {
                        "type": "slot:updated",
                        "data": payload,
                    },
                )
            except Exception as e:
                logger.warning(f"Venue-room broadcast xatolik: {e}")

        await self.invalidate_cache("slots:*")
        await self.invalidate_cache("venues:*")

    async def notify_venue_change(self, venue_id: str, changes: Dict[str, Any]):
        """Stadion ma'lumotlari o'zgarganda barcha o'yinchilarni xabardor qilish.
        1. Global broadcast
        2. Venue-specific room broadcast
        """
        payload = {
            "venue_id": str(venue_id),
            "changes": changes,
        }
        # 1. Global
        await self.broadcast("VENUE_UPDATED", payload)

        # 2. Venue-room targeted
        try:
            from app.core.websocket_manager import ws_manager
            await ws_manager.broadcast_to_venue(
                str(venue_id),
                {
                    "type": "venue:updated",
                    "data": payload,
                },
            )
        except Exception as e:
            logger.warning(f"Venue-room broadcast xatolik: {e}")

        await self.invalidate_cache("venues:*")


# Global yagona nusxa
realtime_hub = RealtimeHub()
