"""
Celery Application instance va sozlamalari.
Vazifalar:
- Muddati o'tgan HELD bronlarni tozalash (har 1 daqiqada)
- Solo Play kvorumi to'lmagan o'yinlarni bekor qilish (har 5 daqiqada)
- Kundalik reliability score va decay hisoblash
"""

from celery import Celery
from app.config import settings

celery_app = Celery(
    "sportplus_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.booking_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "cleanup-expired-held-bookings": {
            "task": "app.workers.booking_tasks.cleanup_expired_bookings",
            "schedule": 60.0,  # Har 60 soniyada
        },
        "check-match-quorum-deadlines": {
            "task": "app.workers.booking_tasks.check_match_deadlines",
            "schedule": 300.0,  # Har 5 daqiqada
        },
    },
)
