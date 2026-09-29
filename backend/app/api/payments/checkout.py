"""
Checkout & Payment Simulation API.
Click va Payme checkout havolalari hamda test/demo muhiti uchun
to'lov simulyatori (10,000 UZS kafolat to'lovi).
"""

import base64
from datetime import datetime, timezone
import logging
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.database import get_db
from app.models.booking import Booking
from app.services.mock_data import MOCK_BOOKINGS

logger = logging.getLogger(__name__)

router = APIRouter()


class SimulatePaymentRequest(BaseModel):
    booking_id: str
    payment_method: str = "CLICK"  # "CLICK" yoki "PAYME"


@router.get("/checkout", summary="Bron uchun to'lov havolalari (Click va Payme)")
async def get_checkout_details(
    booking_id: str = Query(..., description="Booking ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    10,000 UZS xizmat kafolat to'lovi uchun Click va Payme to'lov havolalarini qaytarish.
    """
    booking = None
    if db is not None:
        try:
            from uuid import UUID
            try:
                b_uuid = UUID(booking_id)
                res = await db.execute(select(Booking).where(Booking.id == b_uuid))
                booking = res.scalar_one_or_none()
            except (ValueError, TypeError):
                booking = None
        except Exception:
            booking = None

    total_price = float(booking.total_price) if booking else 200000.0
    service_fee = float(settings.BOOKING_SERVICE_FEE_UZS)
    remaining_venue = max(0.0, total_price - service_fee)

    # 1. Click to'lov havolasi
    service_id = settings.CLICK_SERVICE_ID or "32194"
    merchant_id = settings.CLICK_MERCHANT_ID or "23812"
    click_url = (
        f"https://my.click.uz/services/pay?service_id={service_id}&merchant_id={merchant_id}"
        f"&amount={int(service_fee)}&transaction_param={booking_id}"
    )

    # 2. Payme to'lov havolasi (Base64 encoding)
    payme_merchant = settings.PAYME_MERCHANT_ID or "64817a982df4b1b821"
    payme_params = f"m={payme_merchant};ac.booking_id={booking_id};a={int(service_fee * 100)}"
    payme_b64 = base64.b64encode(payme_params.encode("utf-8")).decode("utf-8")
    payme_url = f"https://checkout.paycom.uz/{payme_b64}"

    return {
        "booking_id": booking_id,
        "service_fee": service_fee,
        "total_price": total_price,
        "remaining_venue_amount": remaining_venue,
        "currency": "UZS",
        "click_url": click_url,
        "payme_url": payme_url,
        "mock_simulator_available": True,
        "message": "10,000 UZS kafolat to'lovi to'langandan so'ng, qolgan summa maydonga kelganda to'lanadi.",
    }


@router.post("/simulate-success", summary="Test to'lovini amalga oshirish (Simulate Payment)")
async def simulate_payment(
    payload: SimulatePaymentRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Dev va test muhitida Click / Payme to'lovini simulyatsiya qilib,
    bronni CONFIRMED statusiga o'tkazadi va QR Pass yaratadi.
    """
    booking = None
    if db is not None:
        try:
            from uuid import UUID
            try:
                b_uuid = UUID(payload.booking_id)
                res = await db.execute(select(Booking).where(Booking.id == b_uuid))
                booking = res.scalar_one_or_none()
            except (ValueError, TypeError):
                booking = None

            if booking:
                booking.status = "CONFIRMED"
                booking.payment_status = "PAID"
                booking.paid_amount = float(settings.BOOKING_SERVICE_FEE_UZS)
                booking.confirmed_at = datetime.now(timezone.utc)
                await db.commit()
                await db.refresh(booking)
        except Exception as e:
            logger.warning(f"Simulate payment DB update xatolik: {e}")

    # Mock xotirada ham yangilash
    b_id = payload.booking_id
    mock_b = MOCK_BOOKINGS.get(b_id)
    if not mock_b:
        mock_b = {
            "id": b_id,
            "status": "CONFIRMED",
            "total_price": 200000.0,
            "service_fee": 10000.0,
            "paid_amount": 10000.0,
            "payment_status": "PAID",
            "payment_provider": payload.payment_method,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    else:
        mock_b["status"] = "CONFIRMED"
        mock_b["paid_amount"] = 10000.0
        mock_b["payment_status"] = "PAID"
        mock_b["payment_provider"] = payload.payment_method

    qr_pass = f"SP-PASS-2026-{b_id[:4].upper()}"
    mock_b["qr_pass"] = qr_pass
    MOCK_BOOKINGS[b_id] = mock_b

    return {
        "success": True,
        "booking_id": b_id,
        "status": "CONFIRMED",
        "payment_status": "PAID",
        "paid_amount": 10000.0,
        "payment_method": payload.payment_method,
        "qr_pass": qr_pass,
        "message": "To'lov muvaffaqiyatli qabul qilindi. Maydon siz uchun kafolatlangan holda band qilindi!",
    }
