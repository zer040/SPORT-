"""
Tests for Telegram Bot OTP generation, caching, and verification flow per Master Prompt.
"""
import asyncio
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
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


@pytest.mark.anyio
async def test_telegram_otp_auth_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Invalid OTP code -> 400
        res = await client.post(
            "/api/v1/auth/verify-telegram-otp",
            json={"code": "000000"},
        )
        assert res.status_code == 400

        # 2. Seed a valid OTP for a brand new user
        import random
        otp_new = f"{random.randint(100000, 999999)}"
        test_tg_id = random.randint(1000000000, 9999999999)
        await redis_client.setex(f"otp:{otp_new}", 120, str(test_tg_id))

        res_new = await client.post(
            "/api/v1/auth/verify-telegram-otp",
            json={"code": otp_new},
        )
        assert res_new.status_code == 200
        data_new = res_new.json()
        assert data_new["status"] == "NEW_USER"
        assert data_new["telegram_id"] == test_tg_id

        # One-time use: verify code was immediately deleted
        assert await redis_client.get(f"otp:{otp_new}") is None

        # 3. Complete registration for this user
        res_reg = await client.post(
            "/api/v1/auth/complete-registration",
            json={
                "telegram_id": test_tg_id,
                "first_name": "Sanjar",
                "last_name": "Rahimov",
                "phone_number": "+998901112233",
            },
        )
        assert res_reg.status_code == 200
        reg_data = res_reg.json()
        assert reg_data["status"] == "REGISTERED"
        assert "access_token" in reg_data
        assert reg_data["user"]["first_name"] == "Sanjar"
        assert reg_data["user"]["last_name"] == "Rahimov"

        token = reg_data["access_token"]

        # 4. GET /api/v1/auth/me returns serialized profile with telegram_id & split names
        res_me = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_me.status_code == 200
        me_data = res_me.json()
        assert me_data["first_name"] == "Sanjar"
        assert me_data["last_name"] == "Rahimov"
        assert me_data["telegram_id"] == test_tg_id

        # 5. Existing user verifies OTP again -> returns EXISTING_USER + full profile
        otp_existing = f"{random.randint(100000, 999999)}"
        await redis_client.setex(f"otp:{otp_existing}", 120, str(test_tg_id))

        res_exist = await client.post(
            "/api/v1/auth/verify-telegram-otp",
            json={"code": otp_existing},
        )
        assert res_exist.status_code == 200
        exist_data = res_exist.json()
        assert exist_data["status"] == "EXISTING_USER"
        assert exist_data["show_welcome_back"] is True
        assert exist_data["user"]["first_name"] == "Sanjar"
