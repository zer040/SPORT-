from app.api.payments.click import router as click_router
from app.api.payments.payme import router as payme_router
from app.api.payments.checkout import router as checkout_router

__all__ = ["click_router", "payme_router", "checkout_router"]
