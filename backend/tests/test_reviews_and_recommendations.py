"""
Tests for Reviews and Venue Recommendation Engine.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token


@pytest.mark.anyio
async def test_recommendations_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Unauthenticated recommendations
        res = await client.get("/api/v1/venues/recommendations?lat=41.2858&lon=69.2163")
        assert res.status_code == 200
        data = res.json()
        assert "recommended_venues" in data
        assert "previously_liked_venues" in data
        assert isinstance(data["recommended_venues"], list)

        if len(data["recommended_venues"]) > 0:
            v = data["recommended_venues"][0]
            assert "avg_rating" in v
            assert "total_reviews" in v
            assert "recommendation_score" in v
            assert "is_super_host" in v


@pytest.mark.anyio
async def test_pending_reviews_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        user_token = create_access_token({"sub": "00000000-0000-0000-0000-000000000002", "role": "player"})
        headers = {"Authorization": f"Bearer {user_token}"}

        res = await client.get("/api/v1/reviews/pending", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "has_pending" in data
        assert isinstance(data["has_pending"], bool)


@pytest.mark.anyio
async def test_venue_details_with_reviews():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Get list of venues first
        res_list = await client.get("/api/v1/venues")
        assert res_list.status_code == 200
        venues = res_list.json()
        if venues:
            venue_id = venues[0]["id"]
            res_venue = await client.get(f"/api/v1/venues/{venue_id}")
            assert res_venue.status_code == 200
            v_data = res_venue.json()
            assert "reviews" in v_data
            assert "total_reviews" in v_data
            assert "is_super_host" in v_data

            # Get public reviews list for this venue
            res_rev = await client.get(f"/api/v1/reviews/venue/{venue_id}")
            assert res_rev.status_code == 200
            assert isinstance(res_rev.json(), list)
