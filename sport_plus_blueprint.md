# ⚽ Sport+ — To'liq Texnik Blueprint (Harakatlar Rejasi)

> **Lokal futbol marketplace va booking platformasi** — Arxitektura, DB sxemalari, booking logikasi, xavfsizlik va scalability printsiplari.

---

## 📋 Mundarija

1. [Tizim Arxitekturasi](#1-tizim-arxitekturasi)
2. [Texnologik Stack](#2-texnologik-stack)
3. [Ma'lumotlar Bazasi Strukturasi](#3-malumotlar-bazasi-strukturasi)
4. [Booking Engine — Double-Booking Prevention](#4-booking-engine)
5. [Geolokatsiya va Smart Search](#5-geolokatsiya-va-smart-search)
6. [API Endpointlar Arxitekturasi](#6-api-endpointlar)
7. [Autentifikatsiya va Xavfsizlik](#7-autentifikatsiya-va-xavfsizlik)
8. [To'lov Integratsiyasi](#8-tolov-integratsiyasi)
9. [Real-time va Bildirishnomalar](#9-real-time-va-bildirishnomalar)
10. [Kesh Strategiyasi](#10-kesh-strategiyasi)
11. [DevOps va Infratuzilma](#11-devops-va-infratuzilma)
12. [Loyiha Fayl Strukturasi](#12-loyiha-fayl-strukturasi)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Risklar va Yechimlar](#14-risklar-va-yechimlar)

---

## 1. Tizim Arxitekturasi

### Umumiy Ko'rinish

Loyiha **Modular Monolith** tarzida boshlanadi — barcha modullar bitta code base'da, lekin mantiqiy ajratilgan. Foydalanuvchilar soni ortishi bilan alohida microservice'larga ajratish oson.

```mermaid
graph TB
    subgraph Client["🖥️ Client Layer"]
        MA["📱 Mobile App<br/>Flutter / React Native"]
        WA["🌐 Web Dashboard<br/>Next.js + TailwindCSS"]
        TB["🤖 Telegram Bot<br/>Bildirishnomalar"]
    end

    subgraph Gateway["🔐 API Gateway"]
        NG["Nginx<br/>Load Balancer + SSL + Rate Limit"]
    end

    subgraph Backend["⚙️ Backend Service"]
        API["FastAPI (Python)<br/>REST + WebSocket"]
        AUTH["Auth Module<br/>OTP + JWT"]
        BK["Booking Engine<br/>Lock + State Machine"]
        PAY["Payment Module<br/>Click / Payme"]
        GEO["Geo Module<br/>PostGIS Queries"]
        NOTIF["Notification Module<br/>SMS + Telegram"]
    end

    subgraph Data["💾 Data Layer"]
        PG["PostgreSQL + PostGIS<br/>Primary Data Store"]
        RD["Redis<br/>Cache + Distributed Locks"]
        MQ["RabbitMQ / Celery<br/>Background Tasks"]
        S3["MinIO / S3<br/>Rasmlar va Fayllar"]
    end

    MA --> NG
    WA --> NG
    TB --> API
    NG --> API
    API --> AUTH
    API --> BK
    API --> PAY
    API --> GEO
    API --> NOTIF
    BK --> PG
    BK --> RD
    GEO --> PG
    NOTIF --> MQ
    PAY --> MQ
    AUTH --> RD
    API --> S3
```

### Modullar orasidagi aloqa

| Modul | Vazifasi | Bog'liq modullar |
|-------|----------|-----------------|
| **Auth** | OTP, JWT token, session | Redis, Users DB |
| **Venue** | Maydonlar CRUD, rasmlar | PostgreSQL, S3 |
| **Booking Engine** | Slot lock, state machine | Redis, PostgreSQL, Payment |
| **Payment** | Click/Payme webhook | Booking Engine, Celery |
| **Geo** | Yaqin maydonlarni topish | PostGIS |
| **Notification** | SMS, Telegram push | Celery, Eskiz API, Telegram Bot API |

---

## 2. Texnologik Stack

### Core Stack

| Qatlam | Texnologiya | Sababi |
|--------|------------|--------|
| **Mobile App** | Flutter (Dart) | Bitta codebase → iOS + Android |
| **Web Dashboard** | Next.js 14 + TailwindCSS + shadcn/ui | SSR, tez, zamonaviy UI |
| **Backend** | FastAPI (Python 3.12+) | Async, Pydantic validatsiya, avtomatik Swagger docs |
| **Database** | PostgreSQL 16 + PostGIS 3.4 | ACID transactions, geo queries, JSONB support |
| **Cache / Lock** | Redis 7 | Distributed locks (Redlock), session, rate limiting |
| **Message Queue** | Celery + RabbitMQ | Background tasks: timeout checker, notifications |
| **File Storage** | MinIO (self-hosted S3) | Maydon rasmlari, receipt uploads |
| **SMS** | Eskiz.uz API | O'zbekiston uchun OTP SMS |
| **Notifications** | Telegram Bot API | Bepul push notification kanal |
| **Maps** | Yandex Maps API / Google Maps | Xaritada maydonlarni ko'rsatish |
| **CI/CD** | GitHub Actions | Auto test + deploy |
| **Hosting** | Docker + VPS (Hetzner/DO) | Arzon, ishonchli |

### Python Kutubxonalar (Backend)

```
fastapi[all]>=0.115.0
uvicorn[standard]>=0.30.0
sqlalchemy[asyncio]>=2.0.30
asyncpg>=0.30.0
alembic>=1.14.0
pydantic>=2.9.0
pydantic-settings>=2.5.0
python-jose[cryptography]>=3.3.0  # JWT
passlib[bcrypt]>=1.7.4
redis[hiredis]>=5.1.0
celery>=5.4.0
httpx>=0.27.0  # External API calls (Click, Payme, Eskiz)
geoalchemy2>=0.15.0  # PostGIS integration
python-multipart>=0.0.9  # File uploads
pillow>=10.4.0  # Image processing
aiogram>=3.12.0  # Telegram Bot
```

---

## 3. Ma'lumotlar Bazasi Strukturasi

### ER Diagramma

```mermaid
erDiagram
    USERS ||--o{ VENUES : "owns"
    USERS ||--o{ BOOKINGS : "makes"
    USERS ||--o{ TEAM_MEMBERS : "belongs_to"
    USERS ||--o{ REVIEWS : "writes"
    VENUES ||--o{ PITCHES : "contains"
    VENUES ||--o{ VENUE_IMAGES : "has"
    PITCHES ||--o{ SLOTS : "has"
    SLOTS ||--o| BOOKINGS : "booked_by"
    TEAMS ||--o{ TEAM_MEMBERS : "has"
    TEAMS ||--o{ BOOKINGS : "books"
    BOOKINGS ||--o{ PAYMENTS : "paid_via"
    BOOKINGS ||--o{ SPLIT_PAYMENTS : "split_into"
    USERS ||--o{ SPLIT_PAYMENTS : "pays"
    VENUES ||--o{ REVIEWS : "receives"
    USERS ||--o{ FAVORITE_VENUES : "favorites"
    VENUES ||--o{ FAVORITE_VENUES : "favorited_by"
```

### SQL Sxemalari

```sql
-- =============================================
-- 1. USERS — Foydalanuvchilar
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'player'
        CHECK (role IN ('player', 'owner', 'admin')),
    rating DECIMAL(3, 2) DEFAULT 5.00
        CHECK (rating >= 0 AND rating <= 5),
    total_games INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_role ON users(role);

-- =============================================
-- 2. VENUES — Maydonlar majmuasi
-- =============================================
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,  -- PostGIS
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL DEFAULT 'Jizzax',
    district VARCHAR(50),
    phone_number VARCHAR(20),
    working_hours_start TIME NOT NULL DEFAULT '06:00',
    working_hours_end TIME NOT NULL DEFAULT '23:00',
    facilities JSONB DEFAULT '{}'::jsonb,
    -- {"parking": true, "shower": true, "lighting": true,
    --  "cafe": false, "changing_room": true, "wifi": false}
    is_active BOOLEAN DEFAULT TRUE,
    avg_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_bookings INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_venues_owner ON venues(owner_id);
CREATE INDEX idx_venues_location ON venues USING GIST(location);
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_active ON venues(is_active) WHERE is_active = TRUE;

-- =============================================
-- 3. VENUE_IMAGES — Maydon rasmlari
-- =============================================
CREATE TABLE venue_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_venue_images_venue ON venue_images(venue_id);

-- =============================================
-- 4. PITCHES — Muayyan futbol maydonlari
-- =============================================
CREATE TABLE pitches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,          -- "Maydon A", "Yopiq maydon"
    size_type VARCHAR(20) NOT NULL
        CHECK (size_type IN ('5x5', '7x7', '8x8', '11x11', 'mini')),
    grass_type VARCHAR(30) NOT NULL
        CHECK (grass_type IN ('artificial', 'natural', 'hybrid', 'indoor')),
    has_roof BOOLEAN DEFAULT FALSE,
    price_per_hour NUMERIC(12, 2) NOT NULL,
    min_players INTEGER DEFAULT 10,
    max_players INTEGER DEFAULT 22,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pitches_venue ON pitches(venue_id);
CREATE INDEX idx_pitches_size ON pitches(size_type);

-- =============================================
-- 5. SLOTS — Bo'sh va band vaqtlar
-- =============================================
CREATE TABLE slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pitch_id UUID NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    -- 'auto' = tizim tomonidan generatsiya qilingan
    -- 'manual' = maydon egasi tomonidan qo'shilgan
    -- 'blocked' = maydon egasi tomonidan yopilgan (offline bron)
    source VARCHAR(20) DEFAULT 'auto'
        CHECK (source IN ('auto', 'manual', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT unique_pitch_slot UNIQUE (pitch_id, start_time)
);

CREATE INDEX idx_slots_pitch ON slots(pitch_id);
CREATE INDEX idx_slots_time ON slots(start_time, end_time);
CREATE INDEX idx_slots_available ON slots(is_available, start_time)
    WHERE is_available = TRUE;

-- =============================================
-- 6. BOOKINGS — Bronlar
-- =============================================
CREATE TYPE booking_status AS ENUM (
    'HELD',       -- Foydalanuvchi tanladi, to'lov kutilmoqda
    'CONFIRMED',  -- To'lov muvaffaqiyatli
    'CANCELLED',  -- Bekor qilingan
    'EXPIRED',    -- Vaqt tugagan (to'lov qilinmagan)
    'COMPLETED',  -- O'yin o'tkazildi
    'NO_SHOW'     -- Kelishmagan
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    team_id UUID REFERENCES teams(id),  -- Agar jamoa bilan bron qilsa
    slot_id UUID NOT NULL REFERENCES slots(id),
    status booking_status NOT NULL DEFAULT 'HELD',
    total_price NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    held_until TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    -- 'full' = to'liq to'lov, 'split' = bo'lib to'lash
    payment_type VARCHAR(20) DEFAULT 'full'
        CHECK (payment_type IN ('full', 'split', 'cash')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_slot ON bookings(slot_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_held ON bookings(status, held_until)
    WHERE status = 'HELD';

-- =============================================
-- 7. PAYMENTS — To'lovlar tarixi
-- =============================================
CREATE TYPE payment_status AS ENUM (
    'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'
);
CREATE TYPE payment_provider AS ENUM (
    'click', 'payme', 'cash', 'uzum', 'system'
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    user_id UUID NOT NULL REFERENCES users(id),
    provider payment_provider NOT NULL,
    provider_transaction_id VARCHAR(255),
    amount NUMERIC(12, 2) NOT NULL,
    status payment_status NOT NULL DEFAULT 'PENDING',
    provider_response JSONB,  -- To'lov tizimidan kelgan response
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_provider_tx ON payments(provider, provider_transaction_id);

-- =============================================
-- 8. SPLIT_PAYMENTS — Bo'lib to'lash
-- =============================================
CREATE TABLE split_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(12, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_id UUID REFERENCES payments(id),
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_split_per_user UNIQUE (booking_id, user_id)
);

CREATE INDEX idx_split_booking ON split_payments(booking_id);
CREATE INDEX idx_split_user ON split_payments(user_id);

-- =============================================
-- 9. TEAMS — Jamoalar
-- =============================================
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    captain_id UUID NOT NULL REFERENCES users(id),
    avatar_url TEXT,
    invite_code VARCHAR(20) UNIQUE,
    max_members INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_teams_captain ON teams(captain_id);
CREATE INDEX idx_teams_invite ON teams(invite_code);

-- =============================================
-- 10. TEAM_MEMBERS
-- =============================================
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member'
        CHECK (role IN ('captain', 'vice_captain', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_team_member UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- =============================================
-- 11. REVIEWS — Sharhlar va reyting
-- =============================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    venue_id UUID NOT NULL REFERENCES venues(id),
    booking_id UUID REFERENCES bookings(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_review UNIQUE (user_id, booking_id)
);

CREATE INDEX idx_reviews_venue ON reviews(venue_id);

-- =============================================
-- 12. FAVORITE_VENUES — Sevimli maydonlar
-- =============================================
CREATE TABLE favorite_venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_favorite UNIQUE (user_id, venue_id)
);

CREATE INDEX idx_favorites_user ON favorite_venues(user_id);

-- =============================================
-- 13. OTP_CODES — SMS tasdiqlash kodlari
-- =============================================
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    attempts INTEGER DEFAULT 0,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_codes(phone_number, is_used);

-- =============================================
-- 14. NOTIFICATIONS — Bildirishnomalar tarixi
-- =============================================
CREATE TYPE notification_channel AS ENUM ('sms', 'telegram', 'push', 'in_app');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    channel notification_channel NOT NULL,
    title VARCHAR(200),
    body TEXT NOT NULL,
    data JSONB,  -- {"booking_id": "...", "action": "open_booking"}
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- =============================================
-- 15. PUBLIC MATCHES — Ochiq o'yinlar (Phase 3)
-- =============================================
CREATE TYPE match_status AS ENUM (
    'OPEN', 'FULL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
);

CREATE TABLE public_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    organizer_id UUID NOT NULL REFERENCES users(id),
    venue_id UUID NOT NULL REFERENCES venues(id),
    pitch_size VARCHAR(20) NOT NULL,
    match_time TIMESTAMP WITH TIME ZONE NOT NULL,
    current_players INTEGER DEFAULT 1,
    needed_players INTEGER NOT NULL,
    price_per_player NUMERIC(10, 2) NOT NULL,
    status match_status DEFAULT 'OPEN',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    is_confirmed BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_participant UNIQUE (match_id, user_id)
);
```

---

## 4. Booking Engine

### State Machine Diagramma

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE: Slot yaratildi

    AVAILABLE --> HELD: Foydalanuvchi tanladi<br/>(Redis Lock + DB Lock)
    
    HELD --> CONFIRMED: To'lov muvaffaqiyatli<br/>(Webhook callback)
    HELD --> EXPIRED: 10 daqiqa o'tdi<br/>(Celery timeout worker)
    HELD --> CANCELLED: Foydalanuvchi bekor qildi

    EXPIRED --> AVAILABLE: Slot qayta ochildi
    CANCELLED --> AVAILABLE: Slot qayta ochildi

    CONFIRMED --> COMPLETED: O'yin vaqti o'tdi
    CONFIRMED --> CANCELLED: Qaytarish (refund)
    CONFIRMED --> NO_SHOW: Kelmadi

    COMPLETED --> [*]
    NO_SHOW --> [*]
```

### Two-Phase Reservation Algorithm

> [!IMPORTANT]
> Bu algoritm double-booking muammosini 100% hal qiladi. Redis va PostgreSQL birgalikda ishlatiladi.

#### Phase 1: Hold (Vaqtinchalik band qilish)

```python
# app/services/booking_service.py

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta, timezone

HOLD_DURATION_SECONDS = 600  # 10 daqiqa
REDIS_LOCK_PREFIX = "lock:slot:"


async def hold_slot(
    db: AsyncSession,
    redis_client: redis.Redis,
    user_id: str,
    slot_id: str,
) -> dict:
    """
    1-bosqich: Slotni vaqtinchalik band qilish.
    Redis Distributed Lock + PostgreSQL Pessimistic Lock birgalikda.
    """
    lock_key = f"{REDIS_LOCK_PREFIX}{slot_id}"

    # 1. Redis orqali tezkor tekshiruv va lock
    lock_acquired = await redis_client.set(
        lock_key,
        user_id,
        nx=True,   # Faqat mavjud bo'lmasa
        ex=HOLD_DURATION_SECONDS  # 10 daqiqa TTL
    )

    if not lock_acquired:
        # Boshqa foydalanuvchi allaqachon tanlagan
        raise SlotAlreadyHeldError(
            "Bu vaqt boshqa foydalanuvchi tomonidan band qilingan. "
            "Iltimos, boshqa vaqtni tanlang."
        )

    try:
        # 2. PostgreSQL tranzaksiyasi (Pessimistic Lock)
        async with db.begin():
            # FOR UPDATE — boshqa tranzaksiyalar kutadi
            slot = await db.execute(
                select(Slot)
                .where(Slot.id == slot_id, Slot.is_available == True)
                .with_for_update(nowait=False)
            )
            slot = slot.scalar_one_or_none()

            if not slot:
                # Redis lock'ni tozalash
                await redis_client.delete(lock_key)
                raise SlotNotAvailableError("Slot topilmadi yoki band.")

            # 3. Slotni band qilish
            slot.is_available = False

            held_until = datetime.now(timezone.utc) + timedelta(
                seconds=HOLD_DURATION_SECONDS
            )

            booking = Booking(
                user_id=user_id,
                slot_id=slot_id,
                status=BookingStatus.HELD,
                total_price=slot.price,
                held_until=held_until,
            )
            db.add(booking)

        # 4. Real-time: WebSocket orqali boshqa foydalanuvchilarga xabar
        await notify_slot_status_change(
            slot_id=slot_id,
            status="held",
            held_by=user_id
        )

        return {
            "booking_id": str(booking.id),
            "held_until": held_until.isoformat(),
            "total_price": float(slot.price),
            "payment_deadline_seconds": HOLD_DURATION_SECONDS,
        }

    except Exception as e:
        # Xatolik bo'lsa Redis lock'ni tozalash
        await redis_client.delete(lock_key)
        raise e
```

#### Phase 2: Confirm (To'lovdan keyin tasdiqlash)

```python
async def confirm_booking(
    db: AsyncSession,
    redis_client: redis.Redis,
    booking_id: str,
    payment_transaction_id: str,
    provider: str,
) -> dict:
    """
    2-bosqich: To'lov muvaffaqiyatli bo'lgandan keyin booking'ni tasdiqlash.
    Click/Payme webhook'dan chaqiriladi.
    """
    async with db.begin():
        booking = await db.execute(
            select(Booking)
            .where(
                Booking.id == booking_id,
                Booking.status == BookingStatus.HELD,
            )
            .with_for_update()
        )
        booking = booking.scalar_one_or_none()

        if not booking:
            raise BookingNotFoundError("Booking topilmadi yoki muddati o'tgan.")

        # Vaqt tekshiruvi
        if booking.held_until < datetime.now(timezone.utc):
            booking.status = BookingStatus.EXPIRED
            raise BookingExpiredError("To'lov muddati tugagan.")

        # Booking'ni tasdiqlash
        booking.status = BookingStatus.CONFIRMED
        booking.paid_amount = booking.total_price
        booking.confirmed_at = datetime.now(timezone.utc)

        # To'lov yozuvi
        payment = Payment(
            booking_id=booking_id,
            user_id=booking.user_id,
            provider=provider,
            provider_transaction_id=payment_transaction_id,
            amount=booking.total_price,
            status=PaymentStatus.COMPLETED,
            paid_at=datetime.now(timezone.utc),
        )
        db.add(payment)

    # Redis lock'ni o'chirish (endi slot doimiy band)
    lock_key = f"{REDIS_LOCK_PREFIX}{booking.slot_id}"
    await redis_client.delete(lock_key)

    # Bildirishnoma yuborish
    await send_booking_confirmation(booking)

    return {"status": "confirmed", "booking_id": booking_id}
```

#### Background Worker: Expired Bookings Cleanup

```python
# app/workers/booking_cleanup.py

from celery import Celery
from celery.schedules import crontab

celery_app = Celery("sport_plus")

# Har 1 daqiqada ishga tushadi
celery_app.conf.beat_schedule = {
    "expire-held-bookings": {
        "task": "app.workers.booking_cleanup.expire_held_bookings",
        "schedule": 60.0,  # Har 60 soniya
    },
}


@celery_app.task
async def expire_held_bookings():
    """
    HELD statusidagi, vaqti o'tgan bookinglarni EXPIRED ga o'tkazish
    va slotlarni qayta ochish.
    """
    async with get_db_session() as db:
        async with db.begin():
            # 1. Muddati o'tgan bookinglarni topish
            expired = await db.execute(
                select(Booking)
                .where(
                    Booking.status == BookingStatus.HELD,
                    Booking.held_until < datetime.now(timezone.utc),
                )
                .with_for_update()
            )
            expired_bookings = expired.scalars().all()

            slot_ids = []
            for booking in expired_bookings:
                booking.status = BookingStatus.EXPIRED
                slot_ids.append(booking.slot_id)

            # 2. Slotlarni qayta ochish
            if slot_ids:
                await db.execute(
                    update(Slot)
                    .where(Slot.id.in_(slot_ids))
                    .values(is_available=True)
                )

            # 3. Redis lock'larni tozalash
            for slot_id in slot_ids:
                lock_key = f"{REDIS_LOCK_PREFIX}{slot_id}"
                await redis_client.delete(lock_key)

            # 4. Real-time: Slotlar qayta ochilganini xabar berish
            for slot_id in slot_ids:
                await notify_slot_status_change(
                    slot_id=str(slot_id),
                    status="available"
                )

    logger.info(f"Expired {len(slot_ids)} held bookings")
```

---

## 5. Geolokatsiya va Smart Search

### PostGIS Spatial Queries

```sql
-- GIST indeksini yaratish (allaqachon venues jadvalida mavjud)
CREATE INDEX idx_venues_location ON venues USING GIST(location);

-- ============================================
-- 1. Radius bo'yicha yaqin maydonlarni topish
-- ============================================
SELECT
    v.id,
    v.name,
    v.address,
    v.avg_rating,
    v.facilities,
    ST_Distance(
        v.location,
        ST_SetSRID(ST_MakePoint(:user_lon, :user_lat), 4326)::geography
    ) / 1000.0 AS distance_km,
    p.size_type,
    p.grass_type,
    p.price_per_hour,
    COUNT(s.id) FILTER (WHERE s.is_available = TRUE) AS available_slots
FROM venues v
JOIN pitches p ON p.venue_id = v.id
LEFT JOIN slots s ON s.pitch_id = p.id
    AND s.start_time >= :date_from
    AND s.start_time <= :date_to
WHERE
    v.is_active = TRUE
    AND ST_DWithin(
        v.location,
        ST_SetSRID(ST_MakePoint(:user_lon, :user_lat), 4326)::geography,
        :max_distance_meters  -- Masalan: 5000 = 5 km radius
    )
    -- Ixtiyoriy filterlar:
    AND (:size_filter IS NULL OR p.size_type = :size_filter)
    AND (:max_price IS NULL OR p.price_per_hour <= :max_price)
GROUP BY v.id, v.name, v.address, v.avg_rating, v.facilities,
         p.size_type, p.grass_type, p.price_per_hour, v.location
HAVING COUNT(s.id) FILTER (WHERE s.is_available = TRUE) > 0
ORDER BY distance_km ASC
LIMIT 20;

-- ============================================
-- 2. Smart Search — Matn + joylashuv birgalikda
-- ============================================
SELECT
    v.id,
    v.name,
    v.address,
    ST_Distance(
        v.location,
        ST_SetSRID(ST_MakePoint(:user_lon, :user_lat), 4326)::geography
    ) / 1000.0 AS distance_km,
    ts_rank(
        to_tsvector('simple', v.name || ' ' || v.address),
        plainto_tsquery('simple', :search_text)
    ) AS text_rank
FROM venues v
WHERE
    v.is_active = TRUE
    AND (
        to_tsvector('simple', v.name || ' ' || v.address)
        @@ plainto_tsquery('simple', :search_text)
        OR v.name ILIKE '%' || :search_text || '%'
    )
ORDER BY
    text_rank DESC,
    distance_km ASC
LIMIT 10;
```

### FastAPI Endpoint

```python
# app/api/venues.py

from fastapi import APIRouter, Query, Depends
from typing import Optional

router = APIRouter(prefix="/api/v1/venues", tags=["venues"])


@router.get("/nearby")
async def get_nearby_venues(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    radius_km: float = Query(default=5.0, ge=0.5, le=50.0),
    size_type: Optional[str] = Query(default=None),
    max_price: Optional[float] = Query(default=None, ge=0),
    date: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Geolokatsiya asosida yaqin va bo'sh maydonlarni qaytaradi.
    PostGIS ST_DWithin va GIST index orqali tezkor so'rov.
    """
    venues = await venue_service.find_nearby(
        db=db,
        lat=lat,
        lon=lon,
        radius_meters=int(radius_km * 1000),
        size_type=size_type,
        max_price=max_price,
        target_date=date,
        offset=(page - 1) * limit,
        limit=limit,
    )
    return {"data": venues, "page": page, "limit": limit}
```

---

## 6. API Endpointlar

### RESTful API Strukturasi

```
📁 API v1
│
├── 🔐 /api/v1/auth/
│   ├── POST   /send-otp           → SMS OTP yuborish
│   ├── POST   /verify-otp         → OTP tasdiqlash + JWT token
│   ├── POST   /refresh-token      → Token yangilash
│   └── POST   /logout             → Session tugatish
│
├── 👤 /api/v1/users/
│   ├── GET    /me                  → Profil ma'lumotlari
│   ├── PATCH  /me                  → Profilni yangilash
│   ├── GET    /me/bookings         → Mening bronlarim
│   ├── GET    /me/teams            → Mening jamoalarim
│   └── GET    /me/favorites        → Sevimli maydonlarim
│
├── 🏟️ /api/v1/venues/
│   ├── GET    /                    → Maydonlar ro'yxati (filter + pagination)
│   ├── GET    /nearby              → Geolokatsiya bo'yicha qidirish
│   ├── GET    /search              → Matnli qidirish
│   ├── GET    /{id}                → Maydon tafsilotlari
│   ├── GET    /{id}/pitches        → Maydon ichidagi pitchlar
│   ├── GET    /{id}/slots          → Bo'sh slotlar (sana bo'yicha)
│   ├── GET    /{id}/reviews        → Sharhlar
│   ├── POST   /{id}/reviews        → Sharh qoldirish
│   ├── POST   /{id}/favorite       → Sevimlilarga qo'shish
│   └── DELETE /{id}/favorite       → Sevimlilardan olib tashlash
│
├── 📅 /api/v1/bookings/
│   ├── POST   /hold                → Slotni vaqtinchalik band qilish
│   ├── POST   /{id}/confirm        → To'lovdan keyin tasdiqlash
│   ├── POST   /{id}/cancel         → Bekor qilish
│   ├── GET    /{id}                → Bron tafsilotlari
│   └── POST   /{id}/split          → Bo'lib to'lash sozlash
│
├── 💳 /api/v1/payments/
│   ├── POST   /click/prepare       → Click to'lov tayyorlash
│   ├── POST   /click/complete      → Click webhook (callback)
│   ├── POST   /payme/create        → Payme transaction create
│   └── POST   /payme/perform       → Payme transaction perform
│
├── 👥 /api/v1/teams/
│   ├── POST   /                    → Jamoa yaratish
│   ├── GET    /{id}                → Jamoa tafsilotlari
│   ├── POST   /{id}/invite         → Havola/Telegram orqali taklif
│   ├── POST   /join/{invite_code}  → Jamoaga qo'shilish
│   └── DELETE /{id}/members/{uid}  → A'zoni olib tashlash
│
├── ⚽ /api/v1/matches/  (Phase 3)
│   ├── POST   /                    → Ochiq o'yin yaratish
│   ├── GET    /                    → Ochiq o'yinlar ro'yxati
│   ├── POST   /{id}/join           → O'yinga qo'shilish
│   └── DELETE /{id}/leave          → O'yindan chiqish
│
└── 🏪 /api/v1/owner/  (Owner Dashboard)
    ├── GET    /venues               → Mening maydonlarim
    ├── POST   /venues               → Yangi maydon qo'shish
    ├── PATCH  /venues/{id}          → Maydon ma'lumotlarini yangilash
    ├── POST   /venues/{id}/pitches  → Pitch qo'shish
    ├── GET    /bookings             → Kunlik/haftalik bronlar
    ├── POST   /slots/block          → Slotni qo'lda yopish (offline)
    ├── POST   /slots/unblock        → Slotni qayta ochish
    ├── GET    /analytics            → Daromad statistikasi
    └── GET    /analytics/peak-hours → Peak-hour ma'lumotlari
```

### WebSocket Events

```
📡 WebSocket: /ws/v1/slots/{venue_id}
│
├── Server → Client Events:
│   ├── slot:updated    → { slot_id, status: "available"|"held"|"booked" }
│   ├── slot:held       → { slot_id, held_by, held_until }
│   └── slot:released   → { slot_id }
│
└── 📡 WebSocket: /ws/v1/matches/{match_id}
    ├── player:joined   → { user_id, full_name, current_count }
    ├── player:left     → { user_id, current_count }
    └── match:full      → { match_id }
```

---

## 7. Autentifikatsiya va Xavfsizlik

### OTP + JWT Authentication Flow

```mermaid
sequenceDiagram
    participant U as 📱 Foydalanuvchi
    participant B as ⚙️ Backend
    participant R as 💾 Redis
    participant S as 📨 Eskiz SMS

    U->>B: POST /auth/send-otp {phone: "+998901234567"}
    B->>B: Rate limit tekshiruv (1 req/60s per phone)
    B->>B: OTP generatsiya (6 raqam)
    B->>R: SET otp:{phone} {code} EX 120
    B->>S: SMS yuborish (Eskiz API)
    S-->>U: SMS: "Sport+ tasdiqlash kodi: 123456"
    B-->>U: 200 OK {message: "Kod yuborildi", expires_in: 120}

    U->>B: POST /auth/verify-otp {phone, code: "123456"}
    B->>R: GET otp:{phone}
    R-->>B: "123456"
    B->>B: Kodlarni solishtirish
    B->>B: JWT Access Token (15 min) + Refresh Token (30 kun) yaratish
    B->>R: SET session:{user_id} {refresh_token} EX 2592000
    B-->>U: 200 OK {access_token, refresh_token, user}
```

### Xavfsizlik Qoidalari

| Tashvish | Yechim |
|----------|--------|
| **Brute-force OTP** | Har bir raqamga 60 soniyada 1 ta OTP; 5 ta xato urinishdan keyin 30 daqiqa bloklash |
| **JWT Token Leak** | Access token — 15 daqiqa; Refresh token — 30 kun; Token blacklist Redis'da |
| **SQL Injection** | SQLAlchemy ORM + Pydantic parametrized queries |
| **CORS** | Faqat ruxsat berilgan domain'lar: `sportplus.uz`, `admin.sportplus.uz` |
| **Rate Limiting** | Nginx rate limit + Redis sliding window: 100 req/min per IP |
| **Payment Webhook** | Click: `sign_string` MD5 tekshiruvi; Payme: `Authorization` Basic Auth + IP whitelist |
| **Data Encryption** | HTTPS (Let's Encrypt), bcrypt for secrets, AES-256 for PII |
| **Input Validation** | Pydantic v2 modellari orqali barcha inputlar validatsiya qilinadi |
| **RBAC** | Role-based access: `player` → faqat bron; `owner` → o'z maydonlarini boshqarish; `admin` → to'liq |

### RBAC Middleware

```python
# app/core/auth.py

from enum import Enum
from functools import wraps

class UserRole(str, Enum):
    PLAYER = "player"
    OWNER = "owner"
    ADMIN = "admin"

ROLE_HIERARCHY = {
    UserRole.ADMIN: [UserRole.ADMIN, UserRole.OWNER, UserRole.PLAYER],
    UserRole.OWNER: [UserRole.OWNER, UserRole.PLAYER],
    UserRole.PLAYER: [UserRole.PLAYER],
}

def require_role(*allowed_roles: UserRole):
    """
    Dekorator: Faqat ruxsat berilgan role'lar kirishi mumkin.
    Misol: @require_role(UserRole.OWNER, UserRole.ADMIN)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user=Depends(get_current_user), **kwargs):
            if current_user.role not in allowed_roles:
                raise HTTPException(
                    status_code=403,
                    detail="Sizda bu amal uchun ruxsat yo'q."
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator
```

---

## 8. To'lov Integratsiyasi

### Click Merchant API

```mermaid
sequenceDiagram
    participant U as 📱 Foydalanuvchi
    participant B as ⚙️ Backend
    participant C as 💳 Click API

    U->>B: POST /payments/click/prepare {booking_id}
    B->>B: Booking mavjudligini tekshirish (status=HELD)
    B->>C: Prepare request
    C-->>B: {click_trans_id, merchant_trans_id}
    B-->>U: Click to'lov URL/formasi

    Note over U,C: Foydalanuvchi Click orqali to'lov qiladi

    C->>B: POST /payments/click/complete (webhook)
    B->>B: sign_string MD5 tekshiruvi
    B->>B: confirm_booking() — status: HELD → CONFIRMED
    B-->>C: {error: 0, error_note: "Success"}
    B->>U: WebSocket: booking:confirmed
```

### Click Webhook Handler

```python
# app/api/payments/click.py

import hashlib
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v1/payments/click")

CLICK_SECRET_KEY = settings.CLICK_SECRET_KEY


@router.post("/complete")
async def click_complete(request: Request, db: AsyncSession = Depends(get_db)):
    """Click webhook — to'lov natijasini qabul qilish."""
    data = await request.form()

    # 1. Sign tekshiruvi (xavfsizlik)
    sign_check = hashlib.md5(
        f"{data['click_trans_id']}"
        f"{data['service_id']}"
        f"{CLICK_SECRET_KEY}"
        f"{data['merchant_trans_id']}"
        f"{data['amount']}"
        f"{data['action']}"
        f"{data['sign_time']}".encode()
    ).hexdigest()

    if sign_check != data["sign_string"]:
        return {"error": -1, "error_note": "Invalid signature"}

    # 2. Booking mavjudligini tekshirish
    booking = await booking_service.get_booking(
        db, booking_id=data["merchant_trans_id"]
    )
    if not booking:
        return {"error": -5, "error_note": "Booking not found"}

    if booking.status == BookingStatus.EXPIRED:
        return {"error": -4, "error_note": "Booking expired"}

    if booking.status == BookingStatus.CONFIRMED:
        return {"error": -4, "error_note": "Already paid"}

    # 3. Action = 1 (Complete)
    if int(data["action"]) == 1:
        await booking_service.confirm_booking(
            db=db,
            redis_client=redis_client,
            booking_id=booking.id,
            payment_transaction_id=data["click_trans_id"],
            provider="click",
        )

    return {
        "error": 0,
        "error_note": "Success",
        "click_trans_id": data["click_trans_id"],
        "merchant_trans_id": data["merchant_trans_id"],
    }
```

### Payme Merchant API Handler

```python
# app/api/payments/payme.py

import base64
from fastapi import APIRouter, Request, HTTPException

router = APIRouter(prefix="/api/v1/payments/payme")

PAYME_MERCHANT_KEY = settings.PAYME_MERCHANT_KEY


@router.post("/")
async def payme_handler(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Payme JSON-RPC handler.
    Methods: CheckPerformTransaction, CreateTransaction,
             PerformTransaction, CancelTransaction, CheckTransaction
    """
    # 1. Basic Auth tekshiruvi
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Basic "):
        raise HTTPException(status_code=401)

    decoded = base64.b64decode(auth_header[6:]).decode()
    login, password = decoded.split(":")
    if password != PAYME_MERCHANT_KEY:
        return {
            "error": {"code": -32504, "message": "Auth failed"},
            "id": (await request.json()).get("id"),
        }

    body = await request.json()
    method = body["method"]
    params = body["params"]

    if method == "CheckPerformTransaction":
        return await check_perform(db, params, body["id"])
    elif method == "CreateTransaction":
        return await create_transaction(db, params, body["id"])
    elif method == "PerformTransaction":
        return await perform_transaction(db, params, body["id"])
    elif method == "CancelTransaction":
        return await cancel_transaction(db, params, body["id"])
    elif method == "CheckTransaction":
        return await check_transaction(db, params, body["id"])

    return {
        "error": {"code": -32601, "message": "Method not found"},
        "id": body["id"],
    }
```

---

## 9. Real-time va Bildirishnomalar

### WebSocket Manager

```python
# app/core/websocket_manager.py

from fastapi import WebSocket
from typing import Dict, Set
import json


class ConnectionManager:
    """
    Venue/pitch slotlarining real-time holatini track qilish.
    Har bir venue uchun alohida "room" — faqat shu venue'ni
    ko'rayotgan foydalanuvchilarga event yuboriladi.
    """
    def __init__(self):
        # venue_id → set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, venue_id: str):
        await websocket.accept()
        if venue_id not in self.active_connections:
            self.active_connections[venue_id] = set()
        self.active_connections[venue_id].add(websocket)

    def disconnect(self, websocket: WebSocket, venue_id: str):
        if venue_id in self.active_connections:
            self.active_connections[venue_id].discard(websocket)
            if not self.active_connections[venue_id]:
                del self.active_connections[venue_id]

    async def broadcast_to_venue(self, venue_id: str, event: dict):
        """Venue'ning barcha aktiv ko'ruvchilariga event yuborish."""
        if venue_id in self.active_connections:
            message = json.dumps(event)
            dead_connections = set()
            for connection in self.active_connections[venue_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    dead_connections.add(connection)
            # O'chgan ulanishlarni tozalash
            self.active_connections[venue_id] -= dead_connections


ws_manager = ConnectionManager()


# Slot holati o'zgarganda chaqiriladigan funksiya
async def notify_slot_status_change(
    slot_id: str,
    status: str,
    venue_id: str = None,
    held_by: str = None,
):
    """
    Slot holati o'zgarganda barcha aktiv foydalanuvchilarga
    WebSocket orqali xabar yuborish.
    """
    event = {
        "type": "slot:updated",
        "data": {
            "slot_id": slot_id,
            "status": status,  # "available" | "held" | "booked"
            "held_by": held_by,
        }
    }
    if venue_id:
        await ws_manager.broadcast_to_venue(venue_id, event)
```

### Telegram Bot Notification Service

```python
# app/services/notification_service.py

from aiogram import Bot
from celery import shared_task

bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)


@shared_task
def send_booking_confirmation_sms(phone: str, venue_name: str, time: str):
    """SMS orqali bron tasdiqlash (Eskiz API)."""
    message = (
        f"✅ Sport+ Bron tasdiqlandi!\n"
        f"📍 {venue_name}\n"
        f"🕐 {time}\n"
        f"O'yinga tayyorlaning! ⚽"
    )
    eskiz_client.send_sms(phone=phone, message=message)


@shared_task
def send_game_reminder_telegram(telegram_chat_id: int, booking: dict):
    """O'yinga 2 soat qolganda Telegram orqali eslatma."""
    text = (
        f"⏰ <b>Eslatma!</b>\n\n"
        f"Sizning o'yiningiz <b>2 soat</b>dan keyin boshlanadi:\n"
        f"📍 <b>{booking['venue_name']}</b>\n"
        f"🕐 {booking['time']}\n"
        f"👥 {booking['players_confirmed']}/{booking['players_needed']} o'yinchi\n\n"
        f"O'yinga tayyormisiz? ⚽"
    )
    await bot.send_message(
        chat_id=telegram_chat_id,
        text=text,
        parse_mode="HTML",
    )


@shared_task
def send_new_slot_alert(user_ids: list, venue_name: str, slot_time: str):
    """Sevimli maydonda yangi slot ochilganda xabar."""
    text = (
        f"🔔 <b>Yangi bo'sh vaqt!</b>\n\n"
        f"📍 <b>{venue_name}</b> da {slot_time} vaqtga joy ochildi.\n"
        f"Tez bron qiling! 🏃‍♂️"
    )
    for user_id in user_ids:
        # ... telegram yoki in-app notification
        pass
```

### Celery Beat Schedule (Barcha Background Tasks)

```python
# app/workers/celery_config.py

celery_app.conf.beat_schedule = {
    # Har daqiqada: muddati o'tgan HELD bookinglarni tozalash
    "expire-held-bookings": {
        "task": "app.workers.booking_cleanup.expire_held_bookings",
        "schedule": 60.0,
    },

    # Har 30 daqiqada: yaqinlashayotgan o'yinlar uchun eslatma
    "send-game-reminders": {
        "task": "app.workers.reminders.check_upcoming_games",
        "schedule": 1800.0,
    },

    # Har kuni tunda 02:00: ertangi kunning slotlarini generatsiya
    "generate-daily-slots": {
        "task": "app.workers.slot_generator.generate_slots_for_tomorrow",
        "schedule": crontab(hour=2, minute=0),
    },

    # Har kuni tunda 03:00: eskirgan slotlarni arxivlash
    "cleanup-old-slots": {
        "task": "app.workers.cleanup.archive_past_slots",
        "schedule": crontab(hour=3, minute=0),
    },

    # Har kuni 09:00: maydon egalariga kunlik hisobot
    "daily-owner-report": {
        "task": "app.workers.reports.send_daily_report",
        "schedule": crontab(hour=9, minute=0),
    },
}
```

---

## 10. Kesh Strategiyasi

### Redis Cache Layers

```python
# app/core/cache.py

import json
from functools import wraps
from typing import Optional

CACHE_TTL = {
    "venue_detail": 3600,      # 1 soat — kam o'zgaradi
    "venue_list": 1800,        # 30 daqiqa
    "pitch_list": 3600,        # 1 soat
    "slot_status": 30,         # 30 soniya — tez o'zgaradi!
    "user_profile": 600,       # 10 daqiqa
    "search_results": 300,     # 5 daqiqa
}


class CacheService:
    def __init__(self, redis_client):
        self.redis = redis_client

    # ─── Venue Cache ──────────────────────────────
    async def get_venue(self, venue_id: str) -> Optional[dict]:
        key = f"venue:{venue_id}"
        data = await self.redis.get(key)
        return json.loads(data) if data else None

    async def set_venue(self, venue_id: str, venue_data: dict):
        key = f"venue:{venue_id}"
        await self.redis.setex(
            key, CACHE_TTL["venue_detail"], json.dumps(venue_data)
        )

    async def invalidate_venue(self, venue_id: str):
        """Venue ma'lumoti o'zgarganda keshni tozalash."""
        keys_to_delete = [
            f"venue:{venue_id}",
            f"venue:{venue_id}:pitches",
        ]
        # Venue list keshlarini ham tozalash
        pattern = "venue_list:*"
        async for key in self.redis.scan_iter(match=pattern):
            keys_to_delete.append(key)
        
        if keys_to_delete:
            await self.redis.delete(*keys_to_delete)

    # ─── Slot Status Cache ────────────────────────
    async def get_slot_statuses(self, pitch_id: str, date: str) -> Optional[list]:
        key = f"slots:{pitch_id}:{date}"
        data = await self.redis.get(key)
        return json.loads(data) if data else None

    async def set_slot_statuses(
        self, pitch_id: str, date: str, slots: list
    ):
        key = f"slots:{pitch_id}:{date}"
        await self.redis.setex(
            key, CACHE_TTL["slot_status"], json.dumps(slots)
        )

    async def invalidate_slots(self, pitch_id: str, date: str):
        """Slot holati o'zgarganda (book/cancel/expire) keshni tozalash."""
        key = f"slots:{pitch_id}:{date}"
        await self.redis.delete(key)


# ─── Cache Decorator ─────────────────────────────
def cached(prefix: str, ttl: int, key_func=None):
    """
    Endpoint natijasini Redis'da keshlash uchun dekorator.
    
    Misol:
        @cached(prefix="venues_nearby", ttl=300,
                key_func=lambda lat, lon, r: f"{lat}:{lon}:{r}")
        async def get_nearby_venues(lat, lon, radius):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if key_func:
                cache_key = f"{prefix}:{key_func(*args, **kwargs)}"
            else:
                cache_key = prefix

            # Keshda bormi?
            cached_data = await redis_client.get(cache_key)
            if cached_data:
                return json.loads(cached_data)

            # Yo'q — haqiqiy funksiyani chaqiramiz
            result = await func(*args, **kwargs)
            await redis_client.setex(
                cache_key, ttl, json.dumps(result, default=str)
            )
            return result
        return wrapper
    return decorator
```

### Cache Invalidation Strategy

```mermaid
graph LR
    A["Slot Booked/Cancelled"] --> B["invalidate_slots(pitch_id, date)"]
    B --> C["WebSocket: slot:updated"]

    D["Venue Updated"] --> E["invalidate_venue(venue_id)"]
    E --> F["invalidate venue_list caches"]

    G["New Review"] --> H["Update venue avg_rating"]
    H --> E
```

> [!TIP]
> **Cascaded Invalidation**: Slot holati o'zgarganda faqat tegishli pitch va sana keshi tozalanadi. Venue list keshlari faqat venue ma'lumoti (nom, rasm, narx) o'zgarganda tozalanadi.

---

## 11. DevOps va Infratuzilma

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: "3.9"

services:
  # ─── Backend API ────────────────────────────
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
    command: >
      uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  # ─── Celery Worker ──────────────────────────
  celery-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    env_file: .env
    depends_on:
      - api
      - redis
      - rabbitmq
    command: >
      celery -A app.workers.celery_config worker --loglevel=info

  # ─── Celery Beat (Scheduler) ────────────────
  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    env_file: .env
    depends_on:
      - celery-worker
    command: >
      celery -A app.workers.celery_config beat --loglevel=info

  # ─── PostgreSQL + PostGIS ────────────────────
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: sportplus
      POSTGRES_USER: sportplus_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sportplus_user -d sportplus"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ─── Redis ──────────────────────────────────
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ─── RabbitMQ ───────────────────────────────
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: sportplus
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}

  # ─── MinIO (S3-compatible storage) ──────────
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

  # ─── Nginx (API Gateway) ────────────────────
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - api

volumes:
  postgres_data:
  minio_data:
```

### Nginx Configuration

```nginx
# nginx/nginx.conf

upstream backend {
    server api:8000;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

server {
    listen 80;
    server_name api.sportplus.uz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.sportplus.uz;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # API endpoints
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Auth endpoints (qattiq rate limit)
    location /api/v1/auth/ {
        limit_req zone=auth_limit burst=3 nodelay;
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket endpoints
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    # Static files (MinIO proxy)
    location /media/ {
        proxy_pass http://minio:9000/sportplus-media/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml

name: Deploy Sport+

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_DB: test_sportplus
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        ports: ["5432:5432"]
        options: >-
          --health-cmd="pg_isready"
          --health-interval=5s
          --health-timeout=5s
          --health-retries=5
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=5s
          --health-timeout=5s
          --health-retries=5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx

      - name: Run migrations
        run: |
          cd backend
          alembic upgrade head
        env:
          DATABASE_URL: postgresql+asyncpg://test_user:test_pass@localhost/test_sportplus

      - name: Run tests
        run: |
          cd backend
          pytest tests/ -v --tb=short
        env:
          DATABASE_URL: postgresql+asyncpg://test_user:test_pass@localhost/test_sportplus
          REDIS_URL: redis://localhost:6379/0

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/sportplus
            git pull origin main
            docker compose -f docker-compose.prod.yml build
            docker compose -f docker-compose.prod.yml up -d
            docker compose exec api alembic upgrade head
            echo "✅ Deployed successfully!"
```

---

## 12. Loyiha Fayl Strukturasi

```
sport+/
│
├── 📁 backend/
│   ├── 📁 app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app entry point
│   │   ├── config.py                  # Settings (pydantic-settings)
│   │   │
│   │   ├── 📁 api/                    # API endpoints (routers)
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # /auth/*
│   │   │   ├── users.py               # /users/*
│   │   │   ├── venues.py              # /venues/*
│   │   │   ├── bookings.py            # /bookings/*
│   │   │   ├── teams.py               # /teams/*
│   │   │   ├── matches.py             # /matches/*  (Phase 3)
│   │   │   ├── owner.py               # /owner/*
│   │   │   └── 📁 payments/
│   │   │       ├── click.py           # Click webhook handler
│   │   │       └── payme.py           # Payme webhook handler
│   │   │
│   │   ├── 📁 core/                   # Core utilities
│   │   │   ├── auth.py                # JWT + RBAC
│   │   │   ├── cache.py               # Redis cache service
│   │   │   ├── database.py            # DB engine + session
│   │   │   ├── dependencies.py        # FastAPI dependencies
│   │   │   ├── exceptions.py          # Custom exceptions
│   │   │   ├── security.py            # Password, token utils
│   │   │   └── websocket_manager.py   # WS connection manager
│   │   │
│   │   ├── 📁 models/                 # SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── venue.py
│   │   │   ├── pitch.py
│   │   │   ├── slot.py
│   │   │   ├── booking.py
│   │   │   ├── payment.py
│   │   │   ├── team.py
│   │   │   ├── review.py
│   │   │   ├── notification.py
│   │   │   └── public_match.py
│   │   │
│   │   ├── 📁 schemas/                # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   ├── venue.py
│   │   │   ├── booking.py
│   │   │   ├── payment.py
│   │   │   ├── team.py
│   │   │   └── common.py             # Pagination, error responses
│   │   │
│   │   ├── 📁 services/              # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── user_service.py
│   │   │   ├── venue_service.py
│   │   │   ├── booking_service.py     # ⭐ Core booking engine
│   │   │   ├── payment_service.py
│   │   │   ├── slot_service.py
│   │   │   ├── team_service.py
│   │   │   ├── notification_service.py
│   │   │   ├── geo_service.py
│   │   │   └── cache_service.py
│   │   │
│   │   └── 📁 workers/               # Celery background tasks
│   │       ├── __init__.py
│   │       ├── celery_config.py
│   │       ├── booking_cleanup.py     # Expired bookings
│   │       ├── slot_generator.py      # Daily slot generation
│   │       ├── reminders.py           # Game reminders
│   │       ├── reports.py             # Owner daily reports
│   │       └── cleanup.py            # Archive old data
│   │
│   ├── 📁 migrations/                # Alembic migrations
│   │   ├── alembic.ini
│   │   ├── env.py
│   │   └── 📁 versions/
│   │
│   ├── 📁 tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_booking.py            # ⭐ Double-booking tests
│   │   ├── test_venues.py
│   │   ├── test_payments.py
│   │   └── test_slots.py
│   │
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── 📁 frontend-web/                   # Next.js Admin/Owner Dashboard
│   ├── 📁 src/
│   │   ├── 📁 app/                    # Next.js App Router
│   │   ├── 📁 components/
│   │   ├── 📁 lib/
│   │   └── 📁 styles/
│   ├── package.json
│   └── next.config.js
│
├── 📁 mobile-app/                     # Flutter Mobile App
│   ├── 📁 lib/
│   │   ├── 📁 screens/
│   │   ├── 📁 widgets/
│   │   ├── 📁 services/
│   │   ├── 📁 models/
│   │   └── main.dart
│   └── pubspec.yaml
│
├── 📁 telegram-bot/                   # Telegram Bot
│   ├── bot.py
│   ├── handlers/
│   └── requirements.txt
│
├── 📁 nginx/
│   ├── nginx.conf
│   └── 📁 ssl/
│
├── docker-compose.yml                 # Development
├── docker-compose.prod.yml            # Production
├── .github/workflows/deploy.yml       # CI/CD
├── .env.example
├── .gitignore
└── README.md
```

---

## 13. Implementation Roadmap

### Phase 1: MVP — 4-6 hafta

```mermaid
gantt
    title Phase 1: MVP (4-6 hafta)
    dateFormat  YYYY-MM-DD
    axisFormat  %d %b
    
    section Backend Asosi
    Project setup, Docker, DB          :a1, 2026-09-28, 3d
    DB Schema + Alembic migrations     :a2, after a1, 3d
    Auth (OTP + JWT)                   :a3, after a2, 4d
    Venue & Pitch CRUD                 :a4, after a3, 3d
    
    section Booking Engine
    Slot Generation Script             :b1, after a4, 2d
    Booking Engine (Hold/Confirm)      :b2, after b1, 5d
    Redis Lock + Cleanup Worker        :b3, after b2, 3d
    
    section To'lov
    Click API Integration              :c1, after b2, 4d
    Payme API Integration              :c2, after c1, 3d
    Payment Webhook Testing            :c3, after c2, 2d
    
    section Frontend
    Owner Dashboard (Next.js)          :d1, after a4, 10d
    Venue List + Map (Mobile)          :d2, after a4, 7d
    Slot Grid + Booking Flow           :d3, after d2, 7d
    
    section Deploy
    VPS Setup + Docker Deploy          :e1, after c3, 3d
    Beta Testing (Jizzax)              :e2, after e1, 7d
```

> [!IMPORTANT]
> **Phase 1 tugash mezonlari:**
> - ✅ OTP orqali login
> - ✅ Xaritada yaqin maydonlarni ko'rish
> - ✅ Real-time slot jadvali
> - ✅ Click/Payme orqali to'lov + bron tasdiqlash
> - ✅ Owner: slotlarni ko'rish va qo'lda yopish
> - ✅ SMS bron tasdiqlash

### Phase 2: Team & Split Payment — 4 hafta

| Hafta | Vazifa |
|-------|--------|
| **1** | Teams CRUD, invite_code, Telegram orqali taklif |
| **2** | Split Payment UI + Backend logic |
| **3** | Auto-refund worker (yig'ilmagan pullarni qaytarish) |
| **4** | Testing + Bug fixes |

### Phase 3: Community & Automation — 6 hafta

| Hafta | Vazifa |
|-------|--------|
| **1-2** | Public Matches (ochiq o'yinlar) + matchmaking |
| **3** | Telegram Bot (eslatmalar, bron tasdiqlash, slot alert) |
| **4** | Owner Analytics Dashboard (daromad, grafiklar) |
| **5** | Peak-hour dynamic pricing (ixtiyoriy) |
| **6** | Performance optimization + Load testing |

---

## 14. Risklar va Yechimlar

| # | Risk | Darajasi | Yechim |
|---|------|----------|--------|
| 1 | **Offline bron muammosi** — Maydon egasi telefon orqali joy sotadi, platformada slot band qilinmaydi | 🔴 Yuqori | 1-click slot bloklash Telegram bot + Mobile UI; Owner uchun "Offline bron" tugmasi |
| 2 | **Double-booking** — Ikki foydalanuvchi bir slotni tanlaydi | 🔴 Yuqori | Redis Distributed Lock + PostgreSQL FOR UPDATE + State Machine |
| 3 | **To'lov xatoligi** — Click/Payme webhook kelmaydi | 🟡 O'rta | Retry logic (3x) + manual reconciliation endpoint + admin notification |
| 4 | **SMS xarajatlar** — OTP SMS narxi oshib ketadi | 🟡 O'rta | OTP faqat birinchi login'da; keyingi kirishlarda Refresh Token; Telegram bot fallback |
| 5 | **Server yuklanishi** — Ko'p foydalanuvchi bir vaqtda bron qiladi | 🟡 O'rta | Redis cache, DB connection pooling, Nginx rate limit, horizontal scaling |
| 6 | **Maydon egasi ilovani ishlatmaydi** — Texnik savodxonlik past | 🟡 O'rta | Juda oddiy 3-tugmali Telegram bot interfeysi; shaxsan o'rgatish |
| 7 | **Internet uzilishi** — Foydalanuvchining interneti yo'qoladi | 🟢 Past | Optimistic UI + offline queue; qayta ulanganda sync |

---

## ✅ Xulosa va Keyingi Qadam

Bu Blueprint Sport+ loyihasining **to'liq texnik poydevori** hisoblanadi. Undagi barcha arxitektura qarorlari, DB sxemalari va algoritmlar real production tizimlarida sinovdan o'tgan pattern'larga asoslangan.

> [!TIP]
> **Keyingi qadam:** Backend loyiha strukturasini yaratish va Phase 1 kodini yozishni boshlash. Buning uchun `/plan` buyrug'ini ishlatib, Phase 1 uchun batafsil implementation plan tuzishingiz mumkin.

### Muhim Qarorlar (Sizning Tanlovingiz)

Kod yozishni boshlashdan oldin quyidagilarga javob kerak:

1. **Backend tili**: FastAPI (Python) yoki NestJS (TypeScript)?
2. **Mobile framework**: Flutter yoki React Native?
3. **Birinchi shahar**: Qaysi shahardan boshlanadi?
4. **Hosting**: Hetzner, DigitalOcean yoki boshqa?
5. **To'lov tizimi**: Avval Click, Payme yoki ikkalasi ham?
