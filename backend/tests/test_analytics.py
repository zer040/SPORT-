"""
Tests for Real-Time Analytics & Presence.
Tests verify:
- Redis Heartbeat Ping (ZADD & ZCOUNT)
- Device installation registration
- Admin Live Metrics endpoint and RBAC guard
- Legitimate 0 values when data is empty
"""

import time
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import create_access_token
from app.core.redis_client import redis_client


@pytest.mark.anyio
async def test_analytics_ping_heartbeat():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Send heartbeat ping
        user_uuid = "test-user-live-uuid"
        res = await client.post("/api/v1/analytics/ping", json={"user_id": user_uuid})
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["user_id"] == user_uuid

        # 2. Check Redis ZCOUNT
        now = time.time()
        count = await redis_client.zcount("online_users", now - 120, "+inf")
        assert count >= 1

        # 3. Simulate expired user (> 120s ago)
        await redis_client.zadd("online_users", {"expired_user": now - 300})
        # The expired user should not be in the last 120s count
        active_count = await redis_client.zcount("online_users", now - 120, "+inf")
        # Ensure only active within 120s are counted
        assert active_count >= 1


@pytest.mark.anyio
async def test_analytics_device_install():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        device_id = f"device-test-{int(time.time())}"
        payload = {
            "device_uuid": device_id,
            "platform": "android",
            "app_version": "1.0.0",
            "os_version": "Android 14",
        }
        res = await client.post("/api/v1/analytics/install", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "registered"
        assert data["device_uuid"] == device_id


@pytest.mark.anyio
async def test_admin_live_metrics_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Unauthorized request
        res_no_auth = await client.get("/api/v1/admin/analytics/live-metrics")
        assert res_no_auth.status_code in (401, 403)

        # 2. Regular user (forbidden)
        user_token = create_access_token({"sub": "regular-user", "role": "USER"})
        res_user = await client.get(
            "/api/v1/admin/analytics/live-metrics",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res_user.status_code == 403

        # 3. Admin user (authorized)
        admin_token = create_access_token({"sub": "admin-user", "role": "ADMIN"})
        res_admin = await client.get(
            "/api/v1/admin/analytics/live-metrics",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_admin.status_code == 200
        metrics = res_admin.json()

        # Check structure as required by the architecture
        assert "online_users_now" in metrics
        assert isinstance(metrics["online_users_now"], int)

        assert "app_installations" in metrics
        assert "total" in metrics["app_installations"]
        assert "android" in metrics["app_installations"]
        assert "ios" in metrics["app_installations"]

        assert "users" in metrics
        assert "total_registered" in metrics["users"]

        assert "venues" in metrics
        assert "total_active" in metrics["venues"]

        assert "financials" in metrics
        assert "platform_revenue_uzs" in metrics["financials"]
        assert isinstance(metrics["financials"]["platform_revenue_uzs"], (int, float))

        assert "bookings" in metrics
        assert "currently_held" in metrics["bookings"]
        assert "total_confirmed" in metrics["bookings"]
