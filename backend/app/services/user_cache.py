"""
User Cache — Development va oflayn rejimlar uchun chidamli kesh.
PostgreSQL ulanmagan yoki xatolik berganda ham Telegram orqali ro'yxatdan o'tgan
foydalanuvchilar ma'lumotlarini (ism, familiya, telefon) yo'qotmasdan saqlaydi.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

USER_CACHE_FILE = Path(__file__).resolve().parent.parent / ".user_cache.json"


def _read_users() -> Dict[str, Any]:
    if not USER_CACHE_FILE.exists():
        return {}
    try:
        with open(USER_CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"User cache o'qishda xatolik: {e}")
        return {}


def _write_users(data: Dict[str, Any]) -> None:
    try:
        with open(USER_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"User cache yozishda xatolik: {e}")


def save_cached_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Foydalanuvchini keshga saqlash (telegram_id va user_id bo'yicha indekslanadi)."""
    users = _read_users()
    
    user_id = str(user_data.get("id"))
    tg_id = str(user_data.get("telegram_id")) if user_data.get("telegram_id") else None

    # Saqlanadigan toza obyekt
    clean_user = {
        "id": user_id,
        "telegram_id": int(tg_id) if tg_id and tg_id.isdigit() else user_data.get("telegram_id"),
        "full_name": user_data.get("full_name") or f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip(),
        "first_name": user_data.get("first_name", ""),
        "last_name": user_data.get("last_name", ""),
        "phone_number": user_data.get("phone_number", ""),
        "role": user_data.get("role", "player"),
        "rating": float(user_data.get("rating", 5.0)),
        "total_games": int(user_data.get("total_games", 0)),
        "is_active": True,
        "is_profile_completed": True,
        "is_verified": True,
    }

    users[f"id:{user_id}"] = clean_user
    if tg_id:
        users[f"tg:{tg_id}"] = clean_user

    _write_users(users)
    return clean_user


def get_cached_user_by_telegram_id(telegram_id: int) -> Optional[Dict[str, Any]]:
    """Telegram ID bo'yicha keshdan foydalanuvchini topish."""
    users = _read_users()
    return users.get(f"tg:{telegram_id}")


def get_cached_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Foydalanuvchi ID bo'yicha keshdan topish."""
    users = _read_users()
    return users.get(f"id:{user_id}")


def list_cached_users() -> list[Dict[str, Any]]:
    """Barcha keshdagi foydalanuvchilar ro'yxati (takrorlanishlarsiz)."""
    users = _read_users()
    seen_ids = set()
    result = []
    for key, val in users.items():
        if key.startswith("id:") and isinstance(val, dict):
            uid = val.get("id")
            if uid not in seen_ids:
                seen_ids.add(uid)
                result.append(val)
    return result


def update_cached_user_role(user_id: str, new_role: str) -> bool:
    """Keshdagi foydalanuvchi rolini yangilash."""
    users = _read_users()
    user = users.get(f"id:{user_id}")
    if not user:
        clean_tg = user_id.replace("tg_", "")
        user = users.get(f"tg:{clean_tg}")
    if user:
        user["role"] = new_role
        _write_users(users)
        return True
    return False
