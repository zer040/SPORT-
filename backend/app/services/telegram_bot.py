import os
import random
import string
import logging
import time
from typing import Optional

import redis.asyncio as aioredis
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

from app.config import settings

logger = logging.getLogger(__name__)

# .env dan olinadi
BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN or os.getenv("TELEGRAM_BOT_TOKEN", "8512689865:AAHxthvkE8fNFB-vJgWjDyxiiKGUGaE9PFw")
REDIS_URL = settings.REDIS_URL or os.getenv("REDIS_URL", "redis://localhost:6379/0")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

from pathlib import Path
import json

CACHE_FILE = Path(__file__).resolve().parent.parent / ".otp_cache.json"

def _read_cache() -> dict:
    if not CACHE_FILE.exists():
        return {}
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _write_cache(data: dict):
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        pass

class ResilientRedis:
    def __init__(self, url: str):
        self._url = url
        self._client: Optional[aioredis.Redis] = None

    def _get_client(self) -> aioredis.Redis:
        if self._client is None:
            self._client = aioredis.from_url(
                self._url,
                decode_responses=True,
                socket_connect_timeout=0.3,
                socket_timeout=0.3
            )
        return self._client

    async def setex(self, key: str, time_sec: int, value: str):
        try:
            client = self._get_client()
            return await client.set(key, value, ex=time_sec)
        except Exception as e:
            logger.warning(f"Redis unavailable, using shared cache for {key}: {e}")
            data = _read_cache()
            data[key] = {"value": value, "exp": time.time() + time_sec}
            _write_cache(data)
            return True

    async def get(self, key: str) -> Optional[str]:
        try:
            client = self._get_client()
            return await client.get(key)
        except Exception as e:
            logger.warning(f"Redis unavailable, reading from shared cache for {key}: {e}")
            data = _read_cache()
            item = data.get(key)
            if not item:
                return None
            if time.time() > item.get("exp", 0):
                data.pop(key, None)
                _write_cache(data)
                return None
            return str(item.get("value"))

    async def delete(self, key: str):
        try:
            client = self._get_client()
            return await client.delete(key)
        except Exception:
            data = _read_cache()
            if key in data:
                data.pop(key, None)
                _write_cache(data)
            return 1


redis_client = ResilientRedis(REDIS_URL)

def generate_otp(length: int = 6) -> str:
    """6 xonali faqat raqamli xavfsiz kod yaratish"""
    return "".join(random.choices(string.digits, k=length))

@dp.message(CommandStart())
async def handle_start(message: types.Message, command: CommandObject):
    telegram_id = message.from_user.id
    first_name = message.from_user.first_name or "Foydalanuvchi"
    
    # 1. Deep-link orqali kelgan session token (agar bo'lsa)
    session_id = command.args

    # 2. 6 xonali OTP kod yaratish
    otp_code = generate_otp(6)
    
    # 3. Redis ga saqlash (Muddati: 120 soniya / 2 daqiqa)
    # Kalit: otp:<kod> -> Qiymat: telegram_id
    await redis_client.setex(f"otp:{otp_code}", 120, str(telegram_id))
    
    # Agar ilova session_id yuborgan bo'lsa, uni ham bog'lab qo'yamiz
    if session_id:
        await redis_client.setex(f"session:{session_id}", 120, otp_code)

    # 4. Foydalanuvchiga xabar yuborish
    text = (
        f"Salom, <b>{first_name}</b>! 👋\n\n"
        f"<b>Sport+</b> ilovasiga kirish uchun tasdiqlash kodingiz:\n\n"
        f"🔑 <code>{otp_code}</code>\n\n"
        f"<i>(Kodni nusxalash uchun ustiga bir marta bosing)</i>\n\n"
        f"⏳ Ushbu kod <b>2 daqiqa</b> davomida amal qiladi.\n"
        f"Ilovaga qaytib ushbu kodni kiriting!"
    )

    try:
        await message.answer(text, parse_mode="HTML")
    except Exception as err:
        logger.error(f"Telegramga xabar yuborishda xatolik: {err}")

@dp.message()
async def handle_any_message(message: types.Message):
    """Foydalanuvchi har qanday xabar yozganda ham OTP kod berish"""
    telegram_id = message.from_user.id
    first_name = message.from_user.first_name or "Foydalanuvchi"
    otp_code = generate_otp(6)
    await redis_client.setex(f"otp:{otp_code}", 120, str(telegram_id))

    text = (
        f"Salom, <b>{first_name}</b>! 👋\n\n"
        f"<b>Sport+</b> ilovasiga kirish uchun tasdiqlash kodingiz:\n\n"
        f"🔑 <code>{otp_code}</code>\n\n"
        f"<i>(Kodni nusxalash uchun ustiga bir marta bosing)</i>\n\n"
        f"⏳ Ushbu kod <b>2 daqiqa</b> davomida amal qiladi.\n"
        f"Ilovaga qaytib ushbu kodni kiriting!"
    )

    try:
        await message.answer(text, parse_mode="HTML")
    except Exception as err:
        logger.error(f"Telegramga xabar yuborishda xatolik: {err}")

async def process_telegram_update(update_dict: dict):
    """FastAPI webhookdan kelgan yangilanishni qayta ishlash"""
    update = types.Update.model_validate(update_dict, context={"bot": bot})
    await dp.feed_update(bot=bot, update=update)

async def setup_bot_webhook(webhook_url: str):
    """Telegram webhookni ro'yxatdan o'tkazish"""
    logger.info(f"🔗 Telegram webhook o'rnatilmoqda: {webhook_url}")
    await bot.set_webhook(url=webhook_url, drop_pending_updates=True)

async def remove_bot_webhook():
    """Telegram webhookni tozalash"""
    logger.info("🛑 Telegram webhook tozalanmoqda...")
    await bot.delete_webhook(drop_pending_updates=True)

async def start_telegram_bot():
    """Botni alohida fon jarayonida ishga tushirish (Polling)"""
    logging.basicConfig(level=logging.INFO)
    logger.info("🤖 Sport+ Telegram Bot ishga tushirilmoqda (polling)...")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    import asyncio
    asyncio.run(start_telegram_bot())

