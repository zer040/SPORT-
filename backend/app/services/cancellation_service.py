"""
Cancellation Service — Vaqtga bog'liq jarima hisoblash mexanizmi.

POLICY:
┌─────────────────────┬───────────────┬──────────┬──────────────────┐
│ O'yinga qancha qoldi │ Qaytarish %   │ Jarima   │ Reliability ta'sir│
├─────────────────────┼───────────────┼──────────┼──────────────────┤
│ > 6 soat             │ 100%          │ 0%       │ 0.0              │
│ 2-6 soat             │ 50%           │ 50%      │ -0.3             │
│ < 2 soat             │ 0%            │ 100%     │ -0.5             │
│ No-show (kelmadi)    │ 0%            │ 100%     │ -1.0 + ban       │
│ Owner/System bekor   │ 100%          │ 0%       │ 0.0              │
└─────────────────────┴───────────────┴──────────┴──────────────────┘
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CancellationResult:
    """Bekor qilish natijasi — barcha hisob-kitoblar."""

    allowed: bool
    refund_percent: int
    refund_amount: Decimal
    penalty_amount: Decimal
    penalty_reason: str
    reliability_impact: float
    ban_days: int  # 0 = ban yo'q

    @property
    def has_penalty(self) -> bool:
        return self.penalty_amount > 0

    @property
    def has_ban(self) -> bool:
        return self.ban_days > 0


def calculate_cancellation(
    booking_total: Decimal,
    slot_start_time: datetime,
    cancelled_by: str = "user",
    now: datetime | None = None,
) -> CancellationResult:
    """
    Bekor qilish jarimasi va qaytarish summasini hisoblash.

    Args:
        booking_total: Bron uchun to'langan summa.
        slot_start_time: Slot boshlanish vaqti (UTC).
        cancelled_by: Kim bekor qildi — "user", "owner", "system", "admin".
        now: Joriy vaqt (test uchun override qilish mumkin).

    Returns:
        CancellationResult — jarima, qaytarish, reliability ta'siri.
    """
    if now is None:
        now = datetime.now(timezone.utc)

    booking_total = Decimal(str(booking_total))
    hours_until_match = (slot_start_time - now).total_seconds() / 3600

    # ─── Owner / System / Admin bekor qildi ──────
    # Foydalanuvchi aybdor emas — to'liq qaytarish
    if cancelled_by in ("owner", "system", "admin"):
        return CancellationResult(
            allowed=True,
            refund_percent=100,
            refund_amount=booking_total,
            penalty_amount=Decimal("0.00"),
            penalty_reason=_get_system_cancel_reason(cancelled_by),
            reliability_impact=0.0,
            ban_days=0,
        )

    # ─── O'yin allaqachon o'tib ketgan ───────────
    if hours_until_match < 0:
        return CancellationResult(
            allowed=False,
            refund_percent=0,
            refund_amount=Decimal("0.00"),
            penalty_amount=booking_total,
            penalty_reason="O'yin allaqachon boshlangan yoki o'tib ketgan.",
            reliability_impact=-0.5,
            ban_days=0,
        )

    # ─── Foydalanuvchi bekor qilmoqda ────────────

    # 1. O'yinga 6+ soat qolgan — bepul bekor qilish
    if hours_until_match > settings.CANCELLATION_FREE_HOURS:
        return CancellationResult(
            allowed=True,
            refund_percent=100,
            refund_amount=booking_total,
            penalty_amount=Decimal("0.00"),
            penalty_reason=(
                f"O'yinga {hours_until_match:.0f} soat qolgan. "
                f"To'liq qaytarildi."
            ),
            reliability_impact=0.0,
            ban_days=0,
        )

    # 2. O'yinga 2-6 soat qolgan — 50% jarima
    if hours_until_match > settings.CANCELLATION_HALF_REFUND_HOURS:
        penalty = _half_round(booking_total)
        refund = booking_total - penalty
        return CancellationResult(
            allowed=True,
            refund_percent=50,
            refund_amount=refund,
            penalty_amount=penalty,
            penalty_reason=(
                f"O'yinga {hours_until_match:.1f} soat qolgan. "
                f"50% jarima ({penalty:,.0f} UZS) qo'llanildi."
            ),
            reliability_impact=-0.3,
            ban_days=0,
        )

    # 3. O'yinga 2 soatdan kam qolgan — to'liq jarima
    return CancellationResult(
        allowed=True,
        refund_percent=0,
        refund_amount=Decimal("0.00"),
        penalty_amount=booking_total,
        penalty_reason=(
            f"O'yinga {hours_until_match:.1f} soat qolgan. "
            f"Bekor qilish jarimasiga ko'ra pul qaytarilmaydi."
        ),
        reliability_impact=-0.5,
        ban_days=0,
    )


def calculate_no_show_penalty(
    booking_total: Decimal,
    previous_no_shows: int = 0,
) -> CancellationResult:
    """
    No-show (kelmadi) jarimasi — takroriy buzilish kuchaytiriladi.

    Args:
        booking_total: Bron summasi.
        previous_no_shows: Foydalanuvchining oldingi no-show'lari soni.
    """
    # Ban muddati — har safar kuchayadi
    ban_escalation = [3, 7, 14, 30]  # kunlar
    ban_index = min(previous_no_shows, len(ban_escalation) - 1)
    ban_days = ban_escalation[ban_index]

    return CancellationResult(
        allowed=True,  # No-show'da bekor qilish avtomatik
        refund_percent=0,
        refund_amount=Decimal("0.00"),
        penalty_amount=Decimal(str(booking_total)),
        penalty_reason=(
            f"O'yinga kelmagansiz (No-show). Pul qaytarilmaydi. "
            f"Solo Play {ban_days} kunga cheklanadi."
        ),
        reliability_impact=-settings.RELIABILITY_SCORE_PENALTY,
        ban_days=ban_days,
    )


def calculate_match_split_price(
    total_slot_price: Decimal,
    required_players: int,
    actual_players: int,
    commission_percent: float | None = None,
) -> dict:
    """
    Solo Play narx taqsimlash — kvorum yetishmovchiligida.

    Args:
        total_slot_price: Slot'ning to'liq narxi.
        required_players: Rejalashtirilgan o'yinchilar soni.
        actual_players: Haqiqatda yig'ilgan o'yinchilar soni.
        commission_percent: Platforma komissiyasi (default: config'dan).

    Returns:
        dict: original_per_player, new_per_player, price_increase, commission
    """
    if commission_percent is None:
        commission_percent = settings.PLATFORM_COMMISSION_PERCENT

    original_per_player = (total_slot_price / required_players).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )
    new_per_player = (total_slot_price / actual_players).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )
    price_increase = new_per_player - original_per_player
    commission = (new_per_player * Decimal(str(commission_percent)) / 100).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )

    return {
        "total_slot_price": float(total_slot_price),
        "required_players": required_players,
        "actual_players": actual_players,
        "original_per_player": float(original_per_player),
        "new_per_player": float(new_per_player),
        "price_increase": float(price_increase),
        "commission_per_player": float(commission),
        "total_with_commission": float(new_per_player + commission),
    }


# ─── Yordamchi funksiyalar ───────────────────

def _half_round(amount: Decimal) -> Decimal:
    """Yarmini yaxlitlash (100 UZS gacha)."""
    return (amount / 2).quantize(Decimal("100"), rounding=ROUND_HALF_UP)


def _get_system_cancel_reason(cancelled_by: str) -> str:
    """Tizim tomonidan bekor qilish sabablari."""
    reasons = {
        "owner": "Maydon egasi tomonidan bekor qilindi. To'liq qaytarildi.",
        "system": "Tizim tomonidan bekor qilindi (texnik sabab). To'liq qaytarildi.",
        "admin": "Administrator tomonidan bekor qilindi. To'liq qaytarildi.",
    }
    return reasons.get(cancelled_by, "Tizim tomonidan bekor qilindi.")
