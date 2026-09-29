"""
Payment Service — Click va Payme to'lov tizimlari integratsiyasi,
idempotent webhook qayta ishlash va Escrow xavfsiz hisob-kitob servisi.
"""

import hashlib
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.exceptions import (
    InvalidPaymentSignatureError,
    PaymentError,
    ValidationError,
)
from app.models.booking import Booking
from app.models.escrow_payment import EscrowPayment
from app.models.payment import Payment
from app.models.slot import Slot
from app.models.webhook_event import WebhookEvent
from app.services.booking_service import BookingService

logger = logging.getLogger(__name__)


class PaymentService:
    def __init__(self, db: AsyncSession, redis_client=None):
        self.db = db
        self.redis = redis_client

    async def get_or_create_webhook_event(
        self,
        provider: str,
        event_id: str,
        payload: Dict[str, Any],
    ) -> tuple[WebhookEvent, bool]:
        """
        Idempotency tekshiruvi — bir xil webhook qayta kelganda dublikat operatsiyalarni oldini olish.
        Returns: (WebhookEvent, is_new: bool)
        """
        query = select(WebhookEvent).where(
            WebhookEvent.provider == provider,
            WebhookEvent.event_id == str(event_id),
        )
        result = await self.db.execute(query)
        event = result.scalar_one_or_none()

        if event:
            return event, False

        new_event = WebhookEvent(
            provider=provider,
            event_id=str(event_id),
            event_type=payload.get("action") or payload.get("method") or "payment",
            payload=payload,
            status="PROCESSING",
        )
        self.db.add(new_event)
        await self.db.commit()
        await self.db.refresh(new_event)
        return new_event, True

    async def process_click_webhook(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Click to'lov tizimi webhook'ini idempotent qayta ishlash.
        Click action: 0 = Prepare, 1 = Complete
        """
        click_trans_id = str(data.get("click_trans_id"))
        service_id = str(data.get("service_id"))
        merchant_trans_id = str(data.get("merchant_trans_id"))  # booking_id
        amount = Decimal(str(data.get("amount", 0)))
        action = int(data.get("action", 0))
        sign_time = str(data.get("sign_time"))
        sign_string = str(data.get("sign_string"))

        # MD5 Imzoni tekshirish
        expected_sign = hashlib.md5(
            f"{click_trans_id}{service_id}{settings.CLICK_SECRET_KEY}{merchant_trans_id}{amount}{action}{sign_time}".encode("utf-8")
        ).hexdigest()

        if sign_string.lower() != expected_sign.lower():
            logger.warning(f"Click invalid signature for trans {click_trans_id}")
            return {
                "error": -1,
                "error_note": "SIGN CHECK FAILED!",
            }

        # Idempotency tekshiruvi
        event_key = f"click_{click_trans_id}_{action}"
        event, is_new = await self.get_or_create_webhook_event("click", event_key, data)

        if not is_new and event.status == "PROCESSED":
            return event.response_data or {"error": 0, "error_note": "Success (idempotent)"}

        try:
            booking_id = UUID(merchant_trans_id)
        except ValueError:
            return {"error": -5, "error_note": "User/Booking not found"}

        booking_query = (
            select(Booking)
            .options(selectinload(Booking.slot))
            .where(Booking.id == booking_id)
        )
        b_res = await self.db.execute(booking_query)
        booking = b_res.scalar_one_or_none()

        if not booking:
            return {"error": -5, "error_note": "Booking not found"}

        # Action 0: Prepare
        if action == 0:
            if booking.status not in ("HELD", "CONFIRMED"):
                return {"error": -9, "error_note": f"Invalid booking state: {booking.status}"}

            if Decimal(str(booking.total_price)) != amount:
                return {"error": -2, "error_note": "Incorrect amount"}

            response = {
                "click_trans_id": click_trans_id,
                "merchant_trans_id": merchant_trans_id,
                "merchant_prepare_id": str(booking.id),
                "error": 0,
                "error_note": "Success",
            }
            event.status = "PROCESSED"
            event.response_data = response
            await self.db.commit()
            return response

        # Action 1: Complete
        elif action == 1:
            # Payment yozuvi yaratish yoki yangilash
            payment = Payment(
                booking_id=booking.id,
                user_id=booking.user_id,
                provider="click",
                provider_transaction_id=click_trans_id,
                amount=float(amount),
                status="COMPLETED",
                provider_response=data,
                paid_at=datetime.now(timezone.utc),
            )
            self.db.add(payment)

            # Bookingni tasdiqlash
            if booking.status == "HELD":
                booking.status = "CONFIRMED"
                booking.confirmed_at = datetime.now(timezone.utc)
                booking.paid_amount = float(amount)

            response = {
                "click_trans_id": click_trans_id,
                "merchant_trans_id": merchant_trans_id,
                "merchant_confirm_id": str(booking.id),
                "error": 0,
                "error_note": "Success",
            }
            event.status = "PROCESSED"
            event.response_data = response
            await self.db.commit()
            return response

        return {"error": -3, "error_note": "Action not found"}

    async def release_escrow_funds(self, match_id: UUID) -> int:
        """
        O'yin yakunlanganda yoki kvorum tasdiqlanganda Escrow pullarini chiqarish (Release).
        """
        query = select(EscrowPayment).where(
            EscrowPayment.match_id == match_id,
            EscrowPayment.status == "HELD",
        )
        result = await self.db.execute(query)
        escrows = result.scalars().all()

        count = 0
        now = datetime.now(timezone.utc)
        for escrow in escrows:
            escrow.status = "RELEASED"
            escrow.released_at = now
            count += 1

        await self.db.commit()
        logger.info(f"Released {count} escrow payments for match {match_id}")
        return count
