"""
Payme Payment Webhook API — JSON-RPC 2.0 protokoli.
CheckPerformTransaction, PerformTransaction, CheckTransaction, CancelTransaction.
"""

import base64
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.database import get_db
from app.models.booking import Booking
from app.models.payment import Payment
from app.services.payment_service import PaymentService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("")
async def payme_webhook(
    request: Request,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    """
    Payme JSON-RPC 2.0 webhook receiver.
    HTTP Basic Auth tekshiriladi (Payme:MERCHANT_KEY).
    """
    # 1. Basic Auth tekshiruvi
    if not authorization or not authorization.startswith("Basic "):
        return {
            "error": {"code": -32504, "message": "Insufficient privilege"},
            "id": None,
        }

    try:
        decoded_auth = base64.b64decode(authorization.split(" ")[1]).decode("utf-8")
        login, key = decoded_auth.split(":")
        if key != settings.PAYME_MERCHANT_KEY and settings.APP_ENV != "development":
            return {
                "error": {"code": -32504, "message": "Incorrect merchant key"},
                "id": None,
            }
    except Exception:
        return {
            "error": {"code": -32504, "message": "Auth header parsing failed"},
            "id": None,
        }

    body = await request.json()
    method = body.get("method")
    params = body.get("params", {})
    req_id = body.get("id")

    payment_service = PaymentService(db)

    # 2. CheckPerformTransaction — Bron va summani tekshirish
    if method == "CheckPerformTransaction":
        account = params.get("account", {})
        booking_id_str = account.get("booking_id")
        amount_tiyin = params.get("amount", 0)  # Tiyinlarda (1 UZS = 100 tiyin)
        amount_uzs = Decimal(amount_tiyin) / 100

        try:
            b_id = UUID(booking_id_str)
        except (ValueError, TypeError):
            return {
                "error": {"code": -31050, "message": {"uz": "Bron topilmadi"}},
                "id": req_id,
            }

        booking_res = await db.execute(select(Booking).where(Booking.id == b_id))
        booking = booking_res.scalar_one_or_none()

        if not booking:
            return {
                "error": {"code": -31050, "message": {"uz": "Bron topilmadi"}},
                "id": req_id,
            }

        if booking.status not in ("HELD", "CONFIRMED"):
            return {
                "error": {"code": -31051, "message": {"uz": "Bron muddati o'tgan yoki bekor qilingan"}},
                "id": req_id,
            }

        if Decimal(str(booking.total_price)) != amount_uzs:
            return {
                "error": {"code": -31001, "message": {"uz": "Noto'g'ri to'lov summasi"}},
                "id": req_id,
            }

        return {
            "result": {"allow": True},
            "id": req_id,
        }

    # 3. CreateTransaction / PerformTransaction
    elif method in ("CreateTransaction", "PerformTransaction"):
        payme_trans_id = params.get("id")
        account = params.get("account", {})
        booking_id_str = account.get("booking_id")

        event, is_new = await payment_service.get_or_create_webhook_event(
            "payme", f"payme_{payme_trans_id}", body
        )

        if not is_new and event.status == "PROCESSED":
            return event.response_data

        try:
            b_id = UUID(booking_id_str)
        except Exception:
            return {
                "error": {"code": -31050, "message": {"uz": "Bron topilmadi"}},
                "id": req_id,
            }

        b_res = await db.execute(select(Booking).where(Booking.id == b_id))
        booking = b_res.scalar_one_or_none()

        if booking and booking.status == "HELD":
            booking.status = "CONFIRMED"
            booking.confirmed_at = datetime.now(timezone.utc)
            booking.paid_amount = booking.total_price

            payment = Payment(
                booking_id=booking.id,
                user_id=booking.user_id,
                provider="payme",
                provider_transaction_id=str(payme_trans_id),
                amount=booking.total_price,
                status="COMPLETED",
                paid_at=datetime.now(timezone.utc),
            )
            db.add(payment)
            await db.commit()

        response = {
            "result": {
                "transaction": str(payme_trans_id),
                "perform_time": int(datetime.now(timezone.utc).timestamp() * 1000),
                "state": 2,
            },
            "id": req_id,
        }

        event.status = "PROCESSED"
        event.response_data = response
        await db.commit()

        return response

    # 4. CheckTransaction
    elif method == "CheckTransaction":
        payme_trans_id = params.get("id")
        return {
            "result": {
                "create_time": int(datetime.now(timezone.utc).timestamp() * 1000),
                "perform_time": int(datetime.now(timezone.utc).timestamp() * 1000),
                "cancel_time": 0,
                "transaction": str(payme_trans_id),
                "state": 2,
                "reason": None,
            },
            "id": req_id,
        }

    return {
        "error": {"code": -32601, "message": "Method not found"},
        "id": req_id,
    }
