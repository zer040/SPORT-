"""
WebSocket Connection Manager.
Venue/pitch slotlarining real-time holatini track qilish.
Har bir venue uchun alohida "room" — faqat shu venue'ni
ko'rayotgan foydalanuvchilarga event yuboriladi.
"""

import json
import logging
from typing import Dict, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    WebSocket ulanishlarini boshqarish.
    Venue bo'yicha room'larga bo'lingan.
    """

    def __init__(self):
        # venue_id → set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, venue_id: str):
        """Yangi WebSocket ulanishni qabul qilish va room'ga qo'shish."""
        await websocket.accept()
        if venue_id not in self.active_connections:
            self.active_connections[venue_id] = set()
        self.active_connections[venue_id].add(websocket)
        logger.info(
            f"WS connected: venue={venue_id}, "
            f"total={len(self.active_connections[venue_id])}"
        )

    def disconnect(self, websocket: WebSocket, venue_id: str):
        """WebSocket ulanishni room'dan olib tashlash."""
        if venue_id in self.active_connections:
            self.active_connections[venue_id].discard(websocket)
            if not self.active_connections[venue_id]:
                del self.active_connections[venue_id]
            logger.info(f"WS disconnected: venue={venue_id}")

    async def broadcast_to_venue(self, venue_id: str, event: dict):
        """Venue'ning barcha aktiv ko'ruvchilariga event yuborish."""
        if venue_id not in self.active_connections:
            return

        message = json.dumps(event, default=str)
        dead_connections = set()

        for connection in self.active_connections[venue_id]:
            try:
                await connection.send_text(message)
            except Exception:
                dead_connections.add(connection)

        # O'chgan ulanishlarni tozalash
        self.active_connections[venue_id] -= dead_connections

    def get_connection_count(self, venue_id: str) -> int:
        """Venue'dagi aktiv ulanishlar soni."""
        return len(self.active_connections.get(venue_id, set()))

    def get_total_connections(self) -> int:
        """Jami aktiv ulanishlar soni."""
        return sum(len(conns) for conns in self.active_connections.values())


    async def broadcast_slot_held(self, venue_id: str, slot_id: str, user_id: str, held_until: str):
        await self.broadcast_to_venue(
            venue_id,
            {
                "type": "slot:held",
                "data": {
                    "slot_id": slot_id,
                    "held_by": user_id,
                    "held_until": held_until,
                },
            },
        )

    async def broadcast_slot_booked(self, venue_id: str, slot_id: str, booking_id: str):
        await self.broadcast_to_venue(
            venue_id,
            {
                "type": "slot:booked",
                "data": {
                    "slot_id": slot_id,
                    "booking_id": booking_id,
                },
            },
        )

    async def broadcast_slot_released(self, venue_id: str, slot_id: str):
        await self.broadcast_to_venue(
            venue_id,
            {
                "type": "slot:released",
                "data": {
                    "slot_id": slot_id,
                },
            },
        )


# Singleton instance
ws_manager = ConnectionManager()
manager = ws_manager


async def notify_slot_status_change(
    slot_id: str,
    status: str,
    venue_id: str,
    held_by: str = None,
    held_until: str = None,
):
    """
    Slot holati o'zgarganda barcha aktiv foydalanuvchilarga
    WebSocket orqali xabar yuborish.

    Status: "available" | "held" | "booked"
    """
    event = {
        "type": "slot:updated",
        "data": {
            "slot_id": slot_id,
            "status": status,
            "held_by": held_by,
            "held_until": held_until,
        },
    }
    await ws_manager.broadcast_to_venue(venue_id, event)
