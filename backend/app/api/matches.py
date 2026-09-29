"""
Matches API Endpoints — Solo Play & Matchmaking tizimi.
Host-Based va Draft matchlar yaratish, qidirish, qo'shilish va o'yin ichidagi chat.
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.dependencies import get_redis
from app.core.exceptions import MatchNotFoundError, NotParticipantError
from app.models.match_chat_message import MatchChatMessage
from app.models.match_participant import MatchParticipant
from app.models.public_match import PublicMatch
from app.models.user import User
from app.schemas.match import (
    MatchChatMessageResponse,
    MatchChatSendRequest,
    MatchCreateDraft,
    MatchCreateHostBased,
    MatchJoinRequest,
    MatchListItem,
    MatchParticipantResponse,
    MatchResponse,
)
from app.services.matchmaking_service import MatchmakingService

router = APIRouter()


@router.post(
    "/host-based",
    status_code=status.HTTP_201_CREATED,
    summary="Host-Based match yaratish (Mavjud bron asosida)",
)
async def create_host_based_match(
    payload: MatchCreateHostBased,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = MatchmakingService(db, redis_client)
    match = await service.create_host_based_match(
        host_id=current_user.id,
        payload=payload,
    )
    return {
        "success": True,
        "match_id": match.id,
        "message": "Host-based o'yin muvaffaqiyatli yaratildi. Solo o'yinchilar qo'shilishi mumkin.",
    }


@router.post(
    "/draft",
    status_code=status.HTTP_201_CREATED,
    summary="Draft match yaratish (Maydon tanlanmagan, o'yinchilar to'planadi)",
)
async def create_draft_match(
    payload: MatchCreateDraft,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = MatchmakingService(db, redis_client)
    match = await service.create_draft_match(
        host_id=current_user.id,
        payload=payload,
    )
    return {
        "success": True,
        "match_id": match.id,
        "message": "Draft o'yin yaratildi. Belgilangan radiusdagi o'yinchilar xabardor qilinadi.",
    }


@router.get(
    "",
    response_model=List[MatchListItem],
    summary="O'yinlar ro'yxati va PostGIS geolokatsiya qidiruvi",
)
async def list_matches(
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lon: Optional[float] = Query(None, ge=-180, le=180),
    radius_km: float = Query(15.0, ge=1, le=50),
    skill_level: Optional[str] = Query(None),
    status: str = Query("FORMING"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = MatchmakingService(db, redis_client)
    matches = await service.list_matches(
        lat=lat,
        lon=lon,
        radius_km=radius_km,
        skill_level=skill_level,
        status=status,
        limit=limit,
        offset=offset,
    )

    items = []
    for m in matches:
        items.append(
            MatchListItem(
                id=m.id,
                host_user_id=m.host_id,
                host_name=m.host.full_name if m.host else None,
                start_time=m.start_time,
                end_time=m.end_time,
                match_type=m.match_type,
                required_players=m.required_players,
                joined_players=m.confirmed_players,
                available_spots=max(0, m.required_players - m.confirmed_players),
                price_per_player=float(m.price_per_player),
                skill_level=m.skill_level,
                status=m.status,
                venue_name=m.venue.name if m.venue else None,
            )
        )
    return items


@router.get(
    "/{match_id}",
    summary="Matchning to'liq ma'lumotlari va qatnashchilar ro'yxati",
)
async def get_match(
    match_id: UUID,
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = MatchmakingService(db, redis_client)
    match = await service.get_match_details(match_id)
    if not match:
        raise MatchNotFoundError()

    participants_data = []
    for p in match.participants:
        participants_data.append({
            "id": p.id,
            "user_id": p.user_id,
            "player_position": p.player_position,
            "status": p.status,
            "role": p.role,
            "paid_amount": float(p.paid_amount),
            "confirmed_arrival": p.confirmed_arrival,
            "joined_at": p.joined_at,
            "user_name": p.user.full_name if p.user else None,
            "user_avatar": p.user.avatar_url if p.user else None,
            "user_rating": float(p.user.rating) if p.user else None,
        })

    return {
        "id": match.id,
        "match_type": match.match_type,
        "status": match.status,
        "host_id": match.host_id,
        "host_name": match.host.full_name if match.host else None,
        "venue_name": match.venue.name if match.venue else None,
        "pitch_name": match.pitch.name if match.pitch else None,
        "start_time": match.start_time,
        "end_time": match.end_time,
        "required_players": match.required_players,
        "confirmed_players": match.confirmed_players,
        "available_spots": max(0, match.required_players - match.confirmed_players),
        "price_per_player": float(match.price_per_player),
        "skill_level": match.skill_level,
        "gender_preference": match.gender_preference,
        "description": match.description,
        "auto_approve": match.auto_approve,
        "participants": participants_data,
    }


@router.post(
    "/{match_id}/join",
    summary="Matchga qo'shilish (Redis MatchLock bilan race-conditiondan himoyalangan)",
)
async def join_match(
    match_id: UUID,
    payload: MatchJoinRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = MatchmakingService(db, redis_client)
    participant = await service.join_match(
        match_id=match_id,
        user_id=current_user.id,
        payload=payload,
    )
    return {
        "success": True,
        "participant_id": participant.id,
        "status": participant.status,
        "message": "O'yinga muvaffaqiyatli qo'shildingiz.",
    }


@router.post(
    "/{match_id}/leave",
    summary="O'yindan chiqish (Siyosat bo'yicha to'lov qaytariladi)",
)
async def leave_match(
    match_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
):
    service = MatchmakingService(db, redis_client)
    await service.leave_match(
        match_id=match_id,
        user_id=current_user.id,
    )
    return {
        "success": True,
        "message": "Siz o'yindan chiqdingiz. Mablag' siyosat bo'yicha hisobingizga qaytariladi.",
    }


@router.get(
    "/{match_id}/chat",
    response_model=List[MatchChatMessageResponse],
    summary="O'yin ichidagi chat xabarlarini ko'rish",
)
async def get_match_chat(
    match_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(MatchChatMessage)
        .options(selectinload(MatchChatMessage.user))
        .where(MatchChatMessage.match_id == match_id)
        .order_by(MatchChatMessage.created_at.asc())
        .limit(limit)
    )
    result = await db.execute(query)
    messages = result.scalars().all()

    items = []
    for msg in messages:
        items.append(
            MatchChatMessageResponse(
                id=msg.id,
                match_id=msg.match_id,
                sender_id=msg.user_id or current_user.id,
                sender_name=msg.user.full_name if msg.user else "Tizim",
                sender_avatar=msg.user.avatar_url if msg.user else None,
                message=msg.message,
                created_at=msg.created_at,
            )
        )
    return items


@router.post(
    "/{match_id}/chat",
    response_model=MatchChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="O'yin chatiga xabar yuborish",
)
async def send_match_chat(
    match_id: UUID,
    payload: MatchChatSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Foydalanuvchi ishtirokchiligini tekshirish
    part_query = select(MatchParticipant).where(
        MatchParticipant.match_id == match_id,
        MatchParticipant.user_id == current_user.id,
        MatchParticipant.status.in_(("APPROVED", "PAID")),
    )
    part_res = await db.execute(part_query)
    participant = part_res.scalar_one_or_none()

    if not participant:
        raise NotParticipantError("Faqat tasdiqlangan o'yinchilar chatda yoza oladi.")

    msg = MatchChatMessage(
        match_id=match_id,
        user_id=current_user.id,
        message=payload.message,
        message_type="TEXT",
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    return MatchChatMessageResponse(
        id=msg.id,
        match_id=msg.match_id,
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        sender_avatar=current_user.avatar_url,
        message=msg.message,
        created_at=msg.created_at,
    )
