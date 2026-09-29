"""
Tests for security tokens and password hashing.
"""

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)


def test_token_creation_and_verification():
    payload = {"sub": "user-uuid-1234", "role": "player"}
    token = create_access_token(payload)

    decoded = verify_token(token, token_type="access")
    assert decoded is not None
    assert decoded["sub"] == "user-uuid-1234"
    assert decoded["role"] == "player"
    assert decoded["type"] == "access"


def test_refresh_token_type_check():
    payload = {"sub": "user-uuid-1234", "role": "player"}
    refresh = create_refresh_token(payload)

    # Access sifatida tekshirilsa None qaytishi kerak
    assert verify_token(refresh, token_type="access") is None
    # Refresh sifatida tekshirilsa o'tishi kerak
    assert verify_token(refresh, token_type="refresh") is not None


def test_password_hashing():
    pwd = "MySuperSecretPassword123"
    hashed = hash_password(pwd)

    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False
