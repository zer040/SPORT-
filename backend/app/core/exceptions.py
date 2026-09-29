"""
Custom exceptions for Sport+ application.
Har bir exception o'zining HTTP status kodi va xabar formatiga ega.
"""

from fastapi import HTTPException, status


class SportPlusException(HTTPException):
    """Base exception for all Sport+ errors."""

    def __init__(self, detail: str, status_code: int = 400):
        super().__init__(status_code=status_code, detail=detail)


# ─── Auth Exceptions ─────────────────────────────

class InvalidOTPError(SportPlusException):
    def __init__(self, detail: str = "Noto'g'ri tasdiqlash kodi."):
        super().__init__(detail=detail, status_code=status.HTTP_400_BAD_REQUEST)


class OTPExpiredError(SportPlusException):
    def __init__(self, detail: str = "Tasdiqlash kodi muddati tugagan."):
        super().__init__(detail=detail, status_code=status.HTTP_400_BAD_REQUEST)


class OTPRateLimitError(SportPlusException):
    def __init__(self, detail: str = "Juda ko'p urinish. 60 soniya kutib turing."):
        super().__init__(detail=detail, status_code=status.HTTP_429_TOO_MANY_REQUESTS)


class InvalidTokenError(SportPlusException):
    def __init__(self, detail: str = "Token yaroqsiz yoki muddati tugagan."):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)


class InsufficientPermissionError(SportPlusException):
    def __init__(self, detail: str = "Sizda bu amal uchun ruxsat yo'q."):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)


# ─── Booking Exceptions ──────────────────────────

class SlotNotAvailableError(SportPlusException):
    def __init__(self, detail: str = "Bu vaqt band yoki mavjud emas."):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)


class SlotAlreadyHeldError(SportPlusException):
    def __init__(
        self,
        detail: str = "Bu vaqt boshqa foydalanuvchi tomonidan band qilingan. Boshqa vaqtni tanlang.",
    ):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)


class BookingNotFoundError(SportPlusException):
    def __init__(self, detail: str = "Bron topilmadi."):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class BookingExpiredError(SportPlusException):
    def __init__(self, detail: str = "Bron muddati tugagan. Qaytadan urinib ko'ring."):
        super().__init__(detail=detail, status_code=status.HTTP_410_GONE)


class BookingAlreadyConfirmedError(SportPlusException):
    def __init__(self, detail: str = "Bu bron allaqachon tasdiqlangan."):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)


# ─── Venue Exceptions ────────────────────────────

class VenueNotFoundError(SportPlusException):
    def __init__(self, detail: str = "Maydon topilmadi."):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class PitchNotFoundError(SportPlusException):
    def __init__(self, detail: str = "Maydon (pitch) topilmadi."):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


# ─── Payment Exceptions ──────────────────────────

class PaymentError(SportPlusException):
    def __init__(self, detail: str = "To'lov xatoligi yuz berdi."):
        super().__init__(detail=detail, status_code=status.HTTP_400_BAD_REQUEST)


class InvalidPaymentSignatureError(SportPlusException):
    def __init__(self, detail: str = "To'lov imzosi noto'g'ri."):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)


# ─── General ──────────────────────────────────────

class NotFoundError(SportPlusException):
    def __init__(self, detail: str = "Ma'lumot topilmadi."):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class ValidationError(SportPlusException):
    def __init__(self, detail: str = "Ma'lumotlar xato."):
        super().__init__(detail=detail, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


# ─── Solo Play & Match Exceptions ────────────────

class MatchNotFoundError(SportPlusException):
    def __init__(self, detail: str = "O'yin (match) topilmadi."):
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class MatchFullError(SportPlusException):
    def __init__(self, detail: str = "O'yinda barcha o'rinlar band."):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)


class MatchClosedError(SportPlusException):
    def __init__(self, detail: str = "Bu o'yinga qabul yopilgan."):
        super().__init__(detail=detail, status_code=status.HTTP_400_BAD_REQUEST)


class AlreadyParticipantError(SportPlusException):
    def __init__(self, detail: str = "Siz allaqachon bu o'yinga qo'shilgansiz."):
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)


class NotParticipantError(SportPlusException):
    def __init__(self, detail: str = "Siz bu o'yin ishtirokchisi emassiz."):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)


class SoloPlayerBannedError(SportPlusException):
    def __init__(self, detail: str = "Sizning Solo Play profilingiz ishonchlilik pastligi sababli vaqtincha bloklangan."):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)


class EscrowError(SportPlusException):
    def __init__(self, detail: str = "Escrow hisob-kitobida xatolik."):
        super().__init__(detail=detail, status_code=status.HTTP_400_BAD_REQUEST)

