"""
Tests for Admin Panel endpoints and RBAC security.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token


@pytest.mark.anyio
async def test_admin_rbac_protection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Non-admin request -> 403 Forbidden
        user_token = create_access_token({"sub": "regular-user-id", "role": "USER"})
        res = await client.get(
            "/api/v1/admin/dashboard-stats",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert res.status_code == 403

        # 2. No token -> 401/403
        res_no_auth = await client.get("/api/v1/admin/dashboard-stats")
        assert res_no_auth.status_code in (401, 403)


@pytest.mark.anyio
async def test_admin_dashboard_and_user_management():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_token = create_access_token({"sub": "admin-user-id", "role": "ADMIN"})
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Dashboard stats
        res_stats = await client.get("/api/v1/admin/dashboard-stats", headers=headers)
        assert res_stats.status_code == 200
        stats = res_stats.json()
        assert "total_users" in stats
        assert "total_platform_revenue_uzs" in stats

        # 2. List users
        res_users = await client.get("/api/v1/admin/users", headers=headers)
        assert res_users.status_code == 200
        user_data = res_users.json()
        users = user_data["items"] if isinstance(user_data, dict) and "items" in user_data else user_data
        assert isinstance(users, list)
        assert len(users) > 0

        # 3. Patch user role
        target_uid = users[0]["id"]
        res_role = await client.patch(
            f"/api/v1/admin/users/{target_uid}/role",
            json={"role": "OWNER"},
            headers=headers,
        )
        assert res_role.status_code == 200
        assert res_role.json()["status"] == "SUCCESS"

        # 4. Patch user status (Ban / Unban)
        res_status = await client.patch(
            f"/api/v1/admin/users/{target_uid}/status",
            json={"is_active": False},
            headers=headers,
        )
        assert res_status.status_code == 200

        # 5. List venues
        res_venues = await client.get("/api/v1/admin/venues", headers=headers)
        assert res_venues.status_code == 200
        assert isinstance(res_venues.json(), list)

        # 6. List transactions
        res_tx = await client.get("/api/v1/admin/transactions", headers=headers)
        assert res_tx.status_code == 200
        assert isinstance(res_tx.json(), list)

        # 7. List owners
        res_owners = await client.get("/api/v1/admin/owners", headers=headers)
        assert res_owners.status_code == 200
        assert isinstance(res_owners.json(), list)
