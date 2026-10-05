"""
Apple Push Notification Service (APNs) — Live Activities & Dynamic Island Integratsiyasi.
O'yin boshlanishiga 30 daqiqa qolganda iPhone Dynamic Island va Lock Screen ekranida
jonli taymer, stadion ma'lumotlari va match statusini yangilash.
"""

import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class APNsLiveActivityService:
    """
    Apple APNs HTTP/2 Live Activity boshqaruv servisi.
    Apple Token-based authentication (ES256 JWT) orqali ishlaydi.
    """

    def __init__(self):
        self.key_id = settings.APNS_KEY_ID
        self.team_id = settings.APNS_TEAM_ID
        self.bundle_id = settings.APNS_BUNDLE_ID
        self.auth_key_path = settings.APNS_AUTH_KEY_PATH
        self.use_sandbox = settings.APNS_USE_SANDBOX

        self._cached_jwt: Optional[str] = None
        self._jwt_expires_at: float = 0

    @property
    def is_configured(self) -> bool:
        """APNs kalitlari to'liq kiritilganligini tekshirish."""
        return bool(
            self.key_id
            and self.team_id
            and self.bundle_id
            and self.auth_key_path
            and os.path.exists(self.auth_key_path)
        )

    @property
    def base_url(self) -> str:
        """APNs HTTP/2 server URL (Sandbox yoki Production)."""
        if self.use_sandbox:
            return "https://api.sandbox.push.apple.com:443"
        return "https://api.push.apple.com:443"

    @property
    def topic(self) -> str:
        """Live Activity uchun talab qilinadigan APNs topic formati."""
        return f"{self.bundle_id}.push-type.liveactivity"

    def _generate_jwt_token(self) -> str:
        """
        Apple APNs uchun ES256 algoritmidagi JWT avtorizatsiya tokenini yaratish.
        Apple spetsifikatsiyasi bo'yicha token 60 daqiqagacha amal qiladi.
        Biz har 50 daqiqada qayta generatsiya qilamiz.
        """
        now = time.time()
        if self._cached_jwt and now < self._jwt_expires_at:
            return self._cached_jwt

        try:
            from cryptography.hazmat.backends import default_backend
            from cryptography.hazmat.primitives import serialization
            import jwt

            with open(self.auth_key_path, "rb") as key_file:
                private_key = serialization.load_pem_private_key(
                    key_file.read(),
                    password=None,
                    backend=default_backend()
                )

            headers = {
                "alg": "ES256",
                "kid": self.key_id
            }
            payload = {
                "iss": self.team_id,
                "iat": int(now)
            }

            token = jwt.encode(
                payload,
                private_key,
                algorithm="ES256",
                headers=headers
            )

            self._cached_jwt = token
            self._jwt_expires_at = now + (50 * 60)  # 50 min cache
            return token

        except Exception as e:
            logger.error(f"❌ APNs JWT token yaratishda xatolik: {e}")
            raise

    async def send_live_activity_push(
        self,
        push_token: str,
        content_state: Dict[str, Any],
        event: str = "update",  # 'update' yoki 'end'
        alert_title: Optional[str] = None,
        alert_body: Optional[str] = None,
        stale_in_seconds: int = 3600,
        dismiss_immediately: bool = False,
    ) -> Dict[str, Any]:
        """
        APNs orqali Dynamic Island / Lock Screen Live Activity'ga push jo'natish.

        - event: 'update' (kontentni yangilash) yoki 'end' (yakunlash)
        - content_state: Swift'dagi MatchActivityAttributes.ContentState bilan bir xil struktura
        """
        now_ts = int(datetime.now(timezone.utc).timestamp())
        stale_date_ts = now_ts + stale_in_seconds

        # Live Activity APNs Payload formati
        aps_dict: Dict[str, Any] = {
            "timestamp": now_ts,
            "event": event,
            "relevance-score": 100.0,
            "stale-date": stale_date_ts,
            "content-state": content_state,
        }

        if alert_title and alert_body:
            aps_dict["alert"] = {
                "title": alert_title,
                "body": alert_body,
                "sound": "default",
            }

        if event == "end" and dismiss_immediately:
            aps_dict["dismissal-date"] = now_ts

        payload = {"aps": aps_dict}

        # Agar APNs kalitlari kiritilmagan bo'lsa (Dev/Mock muhit):
        if not self.is_configured:
            logger.info(
                f"📱 [APNs MOCK] Push jo'natildi (Dev rejim). "
                f"Token: {push_token[:10]}... | Event: {event} | "
                f"Status: {content_state.get('status')} | Title: {alert_title}"
            )
            return {
                "success": True,
                "mode": "simulated",
                "event": event,
                "token_prefix": push_token[:8],
                "payload": payload,
            }

        jwt_token = self._generate_jwt_token()
        headers = {
            "authorization": f"bearer {jwt_token}",
            "apns-push-type": "liveactivity",
            "apns-topic": self.topic,
            "apns-priority": "10",
        }

        url = f"{self.base_url}/3/device/{push_token}"

        try:
            async with httpx.AsyncClient(http2=True, timeout=10.0) as client:
                response = await client.post(
                    url,
                    headers=headers,
                    content=json.dumps(payload),
                )

                if response.status_code == 200:
                    apns_id = response.headers.get("apns-id", "")
                    logger.info(f"✅ APNs Live Activity push yetkazildi! apns-id={apns_id}")
                    return {
                        "success": True,
                        "status_code": 200,
                        "apns_id": apns_id,
                    }
                else:
                    error_body = response.text
                    logger.warning(
                        f"⚠️ APNs push rad etildi: HTTP {response.status_code} - {error_body}"
                    )
                    return {
                        "success": False,
                        "status_code": response.status_code,
                        "error": error_body,
                    }

        except Exception as e:
            logger.error(f"❌ APNs HTTP/2 so'rovida xatolik yuz berdi: {e}")
            return {
                "success": False,
                "error": str(e),
            }

    async def notify_match_30min_countdown(
        self,
        push_token: str,
        venue_name: str,
        pitch_name: str,
        kickoff_time: datetime,
        booking_id: str,
    ) -> Dict[str, Any]:
        """
        O'yin boshlanishiga 30 daqiqa qolganda Dynamic Island va Lock Screen'ni uyg'otish.
        """
        kickoff_iso = kickoff_time.isoformat()
        content_state = {
            "status": "countdown_30min",
            "countdownMinutes": 30,
            "venueName": venue_name,
            "pitchName": pitch_name,
            "kickoffTime": kickoff_iso,
            "bookingId": booking_id,
            "customMessage": "30 daqiqadan so'ng match boshlanadi! Yo'lga chiqing.",
        }

        return await self.send_live_activity_push(
            push_token=push_token,
            content_state=content_state,
            event="update",
            alert_title="⚽ O'yin boshlanishiga 30 daqiqa qoldi!",
            alert_body=f"{venue_name} • {pitch_name} maydonida o'yin kutmoqda.",
        )

    async def end_match_activity(
        self,
        push_token: str,
        venue_name: str,
        booking_id: str,
    ) -> Dict[str, Any]:
        """
        O'yin yakunlanganda Dynamic Island Live Activity'ni to'xtatish va ekrandan olib tashlash.
        """
        content_state = {
            "status": "completed",
            "countdownMinutes": 0,
            "venueName": venue_name,
            "bookingId": booking_id,
            "customMessage": "O'yin yakunlandi. Rahmat!",
        }

        return await self.send_live_activity_push(
            push_token=push_token,
            content_state=content_state,
            event="end",
            alert_title="🏁 O'yin yakunlandi",
            alert_body=f"{venue_name} maydonidagi o'yin yakunlandi.",
            dismiss_immediately=True,
        )


# Singleton APNs service instance
apns_live_activity_service = APNsLiveActivityService()
