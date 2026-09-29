"""
Tests for cancellation service policy and penalty calculations.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.services.cancellation_service import calculate_cancellation


def test_cancellation_more_than_6_hours():
    now = datetime.now(timezone.utc)
    slot_time = now + timedelta(hours=7)
    total = Decimal("200000.00")

    result = calculate_cancellation(booking_total=total, slot_start_time=slot_time, cancelled_by="user", now=now)

    assert result.allowed is True
    assert result.refund_percent == 100
    assert result.refund_amount == total
    assert result.penalty_amount == Decimal("0.00")
    assert result.reliability_impact == 0.0


def test_cancellation_between_2_and_6_hours():
    now = datetime.now(timezone.utc)
    slot_time = now + timedelta(hours=3)
    total = Decimal("200000.00")

    result = calculate_cancellation(booking_total=total, slot_start_time=slot_time, cancelled_by="user", now=now)

    assert result.allowed is True
    assert result.refund_percent == 50
    assert result.refund_amount == Decimal("100000.00")
    assert result.penalty_amount == Decimal("100000.00")
    assert result.reliability_impact == -0.3


def test_cancellation_less_than_2_hours():
    now = datetime.now(timezone.utc)
    slot_time = now + timedelta(hours=1)
    total = Decimal("200000.00")

    result = calculate_cancellation(booking_total=total, slot_start_time=slot_time, cancelled_by="user", now=now)

    assert result.refund_percent == 0
    assert result.refund_amount == Decimal("0.00")
    assert result.penalty_amount == total
    assert result.reliability_impact == -0.5


def test_cancellation_by_owner():
    now = datetime.now(timezone.utc)
    slot_time = now + timedelta(minutes=30)
    total = Decimal("200000.00")

    result = calculate_cancellation(booking_total=total, slot_start_time=slot_time, cancelled_by="owner", now=now)

    assert result.refund_percent == 100
    assert result.refund_amount == total
    assert result.penalty_amount == Decimal("0.00")
