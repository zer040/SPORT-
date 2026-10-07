import json
import os
import random
import string
import logging
import time
from typing import Optional

import redis.asyncio as aioredis
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, FSInputFile

from app.config import settings

logger = logging.getLogger(__name__)

# .env dan olinadi
BOT_TOKEN = settings.TELEGRAM_BOT_TOKEN or os.getenv("TELEGRAM_BOT_TOKEN", "8512689865:AAFYLPF-_952YW4dz9gy23ys4S5Wtl914l4")
REDIS_URL = settings.REDIS_URL or os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Rasmiy Sport+ bot logo yo'li
BOT_LOGO_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "assets",
    "telegram_bot_avatar_512.png"
)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

from app.core.redis_client import redis_client

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
    
    # 3. Redis ga saqlash (Muddati: 300 soniya / 5 daqiqa)
    # Kalit: otp:<kod> -> Qiymat: telegram_id
    await redis_client.setex(f"otp:{otp_code}", 300, str(telegram_id))
    
    # Agar ilova session_id yuborgan bo'lsa, uni ham bog'lab qo'yamiz
    if session_id:
        await redis_client.setex(f"session:{session_id}", 300, otp_code)
        clean_token = session_id[5:] if session_id.startswith("auth_") else session_id
        otp_payload = json.dumps({
            "code": otp_code,
            "telegram_id": telegram_id,
            "first_name": first_name,
            "last_name": message.from_user.last_name or "",
            "username": message.from_user.username or "",
            "phone_number": None,
        })
        await redis_client.setex(f"tg_otp:{clean_token}", 300, otp_payload)
        await redis_client.setex(f"tg_otp:{session_id}", 300, otp_payload)
        await redis_client.setex(f"tg_auth:{clean_token}", 300, json.dumps({"status": "code_generated", "telegram_id": telegram_id}))

    # 4. Foydalanuvchiga xabar yuborish
    text = (
        f"Salom, <b>{first_name}</b>! 👋\n\n"
        f"<b>Sport+</b> ilovasiga kirish uchun tasdiqlash kodingiz:\n\n"
        f"🔑 <code>{otp_code}</code>\n\n"
        f"<i>(Kodni nusxalash uchun ustiga bir marta bosing)</i>\n\n"
        f"⏳ Ushbu kod <b>5 daqiqa</b> davomida amal qiladi.\n\n"
        f"Ilovaga qaytib, ushbu kodni kiriting."
    )

    try:
        if os.path.exists(BOT_LOGO_PATH):
            await message.answer_photo(
                photo=FSInputFile(BOT_LOGO_PATH),
                caption=text,
                parse_mode="HTML"
            )
        else:
            await message.answer(text, parse_mode="HTML")
    except Exception as err:
        logger.error(f"Telegramga xabar yuborishda xatolik: {err}")
        try:
            await message.answer(text, parse_mode="HTML")
        except Exception:
            pass

@dp.message()
async def handle_any_message(message: types.Message):
    """Foydalanuvchi har qanday xabar yozganda ham OTP kod berish"""
    telegram_id = message.from_user.id
    first_name = message.from_user.first_name or "Foydalanuvchi"
    otp_code = generate_otp(6)
    await redis_client.setex(f"otp:{otp_code}", 300, str(telegram_id))

    text = (
        f"Salom, <b>{first_name}</b>! 👋\n\n"
        f"<b>Sport+</b> ilovasiga kirish uchun tasdiqlash kodingiz:\n\n"
        f"🔑 <code>{otp_code}</code>\n\n"
        f"<i>(Kodni nusxalash uchun ustiga bir marta bosing)</i>\n\n"
        f"⏳ Ushbu kod <b>5 daqiqa</b> davomida amal qiladi.\n\n"
        f"Ilovaga qaytib, ushbu kodni kiriting."
    )

    try:
        await message.answer(text, parse_mode="HTML")
    except Exception as err:
        logger.error(f"Telegramga xabar yuborishda xatolik: {err}")

async def process_telegram_update(update_dict: dict):
    """FastAPI webhookdan kelgan yangilanishni qayta ishlash"""
    try:
        update = types.Update.model_validate(update_dict, context={"bot": bot})
        await dp.feed_update(bot=bot, update=update)
    except Exception as e:
        logger.error(f"⚠️ Telegram webhook update qayta ishlashda xatolik: {e}", exc_info=True)

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

