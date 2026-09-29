"""
Auth Pydantic Schemas — OTP, JWT token, login/register.
"""

from pydantic import BaseModel, Field


class OTPSendRequest(BaseModel):
    """OTP yuborish so'rovi."""
    phone_number: str = Field(
        ...,
        min_length=9,
        max_length=20,
        examples=["+998901234567"],
        description="Telefon raqam (+998XXXXXXXXX formatda)",
    )


class OTPVerifyRequest(BaseModel):
    """OTP tasdiqlash so'rovi."""
    phone_number: str = Field(
        ...,
        min_length=9,
        max_length=20,
        examples=["+998901234567"],
    )
    code: str = Field(
        ...,
        min_length=4,
        max_length=6,
        examples=["123456"],
        description="SMS orqali kelgan tasdiqlash kodi",
    )
    full_name: str | None = Field(
        default=None,
        max_length=100,
        examples=["Alisher Karimov"],
        description="Yangi foydalanuvchi uchun ism-familiya (birinchi login'da)",
    )


class TokenResponse(BaseModel):
    """JWT token pair javobi."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token amal qilish muddati (soniyalarda)")


class RefreshTokenRequest(BaseModel):
    """Yangi access token olish uchun refresh token."""
    refresh_token: str


class LogoutRequest(BaseModel):
    """Logout so'rovi — token blacklist'ga qo'shiladi."""
    refresh_token: str | None = None
