"""
Click Payment Webhook API — Prepare va Complete so'rovlari.
"""

from fastapi import APIRouter, Depends, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.payment_service import PaymentService

router = APIRouter()


@router.post("/prepare")
async def click_prepare(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    form_data = await request.form()
    data = dict(form_data)
    data["action"] = 0
    service = PaymentService(db)
    return await service.process_click_webhook(data)


@router.post("/complete")
async def click_complete(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    form_data = await request.form()
    data = dict(form_data)
    data["action"] = 1
    service = PaymentService(db)
    return await service.process_click_webhook(data)
