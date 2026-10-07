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

from aiogram import F


def generate_otp(length: int = 6) -> str:
    """6 xonali faqat raqamli xavfsiz kod yaratish"""
    return "".join(random.choices(string.digits, k=length))


def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    """Botning interaktiv asosiy menyusi"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🔑 Kirish kodi olish", callback_data="btn_get_otp")
        ],
        [
            InlineKeyboardButton(text="📱 Sport+ Ilovasi", callback_data="btn_about_app"),
            InlineKeyboardButton(text="📞 Qo'llab-quvvatlash", callback_data="btn_support"),
        ],
        [
            InlineKeyboardButton(text="🌐 Sport+ CRM", url="https://sport-production-c0d6.up.railway.app/admin")
        ]
    ])


async def issue_otp_for_user(
    telegram_id: int,
    first_name: str,
    last_name: str = "",
    username: str = "",
    session_id: Optional[str] = None
) -> tuple[str, bool, int]:
    """
    Foydalanuvchi uchun 6 xonali OTP berish.
    Rate limiting (60 soniya cooldown) va mavjud faol kodni qayta ishlatish.
    Qaytaradi: (otp_code, is_reused, remaining_seconds)
    """
    rate_key = f"tg_rate:{telegram_id}"
    active_otp_key = f"user_active_otp:{telegram_id}"

    # Rate-limit va mavjud faol kodni tekshirish
    is_rate_limited = await redis_client.get(rate_key)
    existing_otp = await redis_client.get(active_otp_key)

    if is_rate_limited and existing_otp:
        otp_code = str(existing_otp)
        is_reused = True
        remaining = 60
    else:
        otp_code = generate_otp(6)
        is_reused = False
        remaining = 0

        # Yangi kodni Redis ga 5 daqiqa (300s) ga saqlash
        await redis_client.setex(f"otp:{otp_code}", 300, str(telegram_id))
        await redis_client.setex(active_otp_key, 300, otp_code)
        # 60 soniyalik yangi so'rov cheklovi (spamdan himoya)
        await redis_client.setex(rate_key, 60, "1")

    # Agar ilovadan session_id kelgan bo'lsa, sessiyani bog'lash
    if session_id:
        clean_token = session_id[5:] if session_id.startswith("auth_") else session_id
        otp_payload = json.dumps({
            "code": otp_code,
            "telegram_id": telegram_id,
            "first_name": first_name,
            "last_name": last_name or "",
            "username": username or "",
            "phone_number": None,
        })
        await redis_client.setex(f"session:{session_id}", 300, otp_code)
        await redis_client.setex(f"tg_otp:{clean_token}", 300, otp_payload)
        await redis_client.setex(f"tg_otp:{session_id}", 300, otp_payload)
        await redis_client.setex(f"tg_auth:{clean_token}", 300, json.dumps({
            "status": "code_generated",
            "telegram_id": telegram_id
        }))

    return otp_code, is_reused, remaining


@dp.message(CommandStart())
async def handle_start(message: types.Message, command: CommandObject):
    telegram_id = message.from_user.id
    first_name = message.from_user.first_name or "Foydalanuvchi"
    session_id = command.args

    # ─── 1. DEEP LINKING (Ilovadan yoki saytdan kelgan so'rov) ───
    if session_id:
        otp_code, is_reused, _ = await issue_otp_for_user(
            telegram_id=telegram_id,
            first_name=first_name,
            last_name=message.from_user.last_name or "",
            username=message.from_user.username or "",
            session_id=session_id
        )

        if is_reused:
            text = (
                f"Salom, <b>{first_name}</b>! 👋\n\n"
                f"Sizga allaqachon faol tasdiqlash kodi yuborilgan:\n\n"
                f"🔑 <code>{otp_code}</code>\n\n"
                f"<i>(Kodni nusxalash uchun ustiga bir marta bosing)</i>\n\n"
                f"⏳ Ushbu kod <b>5 daqiqa</b> davomida amal qiladi.\n"
                f"Ilovaga qaytib, ushbu kodni kiriting."
            )
        else:
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
            await message.answer(text, parse_mode="HTML")
        return

    # ─── 2. ODDIY /start (Ilovasiz, to'g'ridan-to'g'ri kirganda) ───
    welcome_text = (
        f"Salom, <b>{first_name}</b>! 👋\n\n"
        f"<b>Sport+</b> rasmiy botiga xush kelibsiz! ⚽\n\n"
        f"Ushbu bot orqali siz:\n"
        f"• Sport+ ilovasiga xavfsiz va tezkor kirishingiz\n"
        f"• Toshkent va Jizzax bo'ylab futbol maydonlarini bron qilishingiz\n"
        f"• Solo Play matchlariga qo'shilishingiz mumkin.\n\n"
        f"<i>Ilovaga kirish kodini olish uchun quyidagi tugmani bosing:</i>"
    )

    try:
        if os.path.exists(BOT_LOGO_PATH):
            await message.answer_photo(
                photo=FSInputFile(BOT_LOGO_PATH),
                caption=welcome_text,
                reply_markup=get_main_menu_keyboard(),
                parse_mode="HTML"
            )
        else:
            await message.answer(
                welcome_text,
                reply_markup=get_main_menu_keyboard(),
                parse_mode="HTML"
            )
    except Exception as err:
        logger.error(f"Telegramga menyu yuborishda xatolik: {err}")
        await message.answer(
            welcome_text,
            reply_markup=get_main_menu_keyboard(),
            parse_mode="HTML"
        )


# ─── 3. INLINE TUGMALARNI QAYTA ISHLASH ───
@dp.callback_query(F.data == "btn_get_otp")
async def handle_callback_get_otp(callback: types.CallbackQuery):
    telegram_id = callback.from_user.id
    first_name = callback.from_user.first_name or "Foydalanuvchi"

    otp_code, is_reused, _ = await issue_otp_for_user(
        telegram_id=telegram_id,
        first_name=first_name,
        last_name=callback.from_user.last_name or "",
        username=callback.from_user.username or "",
        session_id=None
    )

    if is_reused:
        text = (
            f"🔑 Sizning faol tasdiqlash kodingiz:\n\n"
            f"<code>{otp_code}</code>\n\n"
            f"<i>(Kodni nusxalash uchun ustiga bir marta bosing)</i>\n\n"
            f"⏳ Ushbu kod hali amal qilmoqda (5 daqiqa).\n"
            f"Sport+ ilovasiga qaytib, kodni kiriting."
        )
    else:
        text = (
            f"🔑 <b>Sport+</b> ilovasiga kirish kodingiz:\n\n"
            f"<code>{otp_code}</code>\n\n"
            f"<i>(Kodni nusxalash uchun ustiga bir marta bosing)</i>\n\n"
            f"⏳ Kod <b>5 daqiqa</b> davomida amal qiladi.\n"
            f"Ilovaga qaytib, ushbu kodni kiriting."
        )

    await callback.message.answer(text, parse_mode="HTML")
    await callback.answer()


@dp.callback_query(F.data == "btn_about_app")
async def handle_callback_about(callback: types.CallbackQuery):
    text = (
        f"📱 <b>Sport+ Platformasi Haqida</b>\n\n"
        f"Sport+ — futbol maydonlarini bir necha soniyada bron qilish va o'yinchilar "
        f"hamjamiyatini birlashtiruvchi zamonaviy ilova.\n\n"
        f"✨ <b>Asosiy imkoniyatlar:</b>\n"
        f"• Stadionlarni qidirish va onlayn bron qilish\n"
        f"• Solo Play — jamoa topish va boshqa o'yinchilarga qo'shilish\n"
        f"• Bo'lib to'lash (Split Payment)\n"
        f"• Real vaqtda slot bandligini kuzatish\n\n"
        f"🌐 Web Admin: https://sport-production-c0d6.up.railway.app/admin"
    )
    await callback.message.answer(text, parse_mode="HTML")
    await callback.answer()


@dp.callback_query(F.data == "btn_support")
async def handle_callback_support(callback: types.CallbackQuery):
    text = (
        f"📞 <b>Qo'llab-quvvatlash Xizmati</b>\n\n"
        f"Savollar, takliflar yoki maydoningizni platformaga qo'shish bo'yicha:\n\n"
        f"👤 Administrator: @sportplus_support\n"
        f"☎️ Telefon: +998 (90) 123-45-67\n"
        f"⏰ Ish vaqti: 24/7"
    )
    await callback.message.answer(text, parse_mode="HTML")
    await callback.answer()


@dp.message()
async def handle_any_message(message: types.Message):
    """Foydalanuvchi ixtiyoriy matn yozganda behuda yangi OTP bermasdan, menyuni ko'rsatish"""
    first_name = message.from_user.first_name or "Foydalanuvchi"
    text = (
        f"Salom, <b>{first_name}</b>! 👋\n\n"
        f"Sport+ ilovasiga kirish kodini olish yoki ma'lumot ko'rish uchun "
        f"quyidagi tugmalardan birini tanlang:"
    )
    await message.answer(
        text,
        reply_markup=get_main_menu_keyboard(),
        parse_mode="HTML"
    )

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

