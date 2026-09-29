"""
Models package — barcha ORM modellarni import qilish.
Alembic autogenerate va metadata uchun barcha modellar shu yerda register bo'lishi kerak.
"""

from app.models.user import User
from app.models.venue import Venue, VenueImage
from app.models.pitch import Pitch
from app.models.slot import Slot
from app.models.booking import Booking
from app.models.payment import Payment
from app.models.team import Team, TeamMember
from app.models.notification import Notification
from app.models.review import Review
from app.models.webhook_event import WebhookEvent

# Solo Play modellari
from app.models.public_match import PublicMatch
from app.models.match_participant import MatchParticipant
from app.models.solo_player_profile import SoloPlayerProfile
from app.models.match_chat_message import MatchChatMessage
from app.models.escrow_payment import EscrowPayment

# Gamification modellari
from app.models.badge import Badge, UserBadge
from app.models.app_installation import AppInstallation

__all__ = [
    "User",
    "Venue",
    "VenueImage",
    "Pitch",
    "Slot",
    "Booking",
    "Payment",
    "Team",
    "TeamMember",
    "Notification",
    "Review",
    "WebhookEvent",
    "PublicMatch",
    "MatchParticipant",
    "SoloPlayerProfile",
    "MatchChatMessage",
    "EscrowPayment",
    "Badge",
    "UserBadge",
    "AppInstallation",
]
