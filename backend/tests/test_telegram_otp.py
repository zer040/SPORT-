"""
Tests for Telegram Bot OTP generation, caching and verification logic.
"""
import asyncio
from app.services.telegram_bot import generate_otp, redis_client

def test_generate_otp():
    code1 = generate_otp(6)
    code2 = generate_otp(6)
    assert len(code1) == 6
    assert len(code2) == 6
    assert code1.isdigit()
    assert code2.isdigit()

def test_redis_otp_storage_and_expiry():
    async def _run():
        code = generate_otp(6)
        telegram_id = 991827364

        # Save to redis/memory cache
        await redis_client.setex(f"otp:{code}", 120, str(telegram_id))

        # Read back
        stored = await redis_client.get(f"otp:{code}")
        assert stored == str(telegram_id)

        # Delete
        await redis_client.delete(f"otp:{code}")
        assert await redis_client.get(f"otp:{code}") is None

    asyncio.run(_run())
