"""
Seed Data Script — Test va emulyator sinovlari uchun boshlang'ich ma'lumotlarni yaratish.
Yaratiladi:
- Test Foydalanuvchilar (Player, Owner, Admin)
- Real koordinatali Venuelar (Toshkent va Jizzax)
- Har bir venue uchun Pitches (5x5, 7x7)
- Bugungi va ertangi kun uchun Slotlar
- Solo Play uchun namunaviy o'yinlar (Host-based va Draft)
- O'yinchi nishonlari (Badges)
"""

import asyncio
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal

from geoalchemy2.elements import WKTElement
from sqlalchemy import select

from app.core.database import async_session_factory, init_db
from app.models.badge import Badge
from app.models.pitch import Pitch
from app.models.public_match import PublicMatch
from app.models.slot import Slot
from app.models.solo_player_profile import SoloPlayerProfile
from app.models.user import User
from app.models.venue import Venue, VenueImage


async def seed():
    print(">>> Boshlang'ich ma'lumotlarni yuklash boshlandi...")
    await init_db()

    async with async_session_factory() as session:
        # 1. Foydalanuvchilarni tekshirish
        user_res = await session.execute(
            select(User).where(User.phone_number == "+998901234567")
        )
        test_user = user_res.scalar_one_or_none()

        if not test_user:
            test_user = User(
                phone_number="+998901234567",
                full_name="Alisher Karimov",
                role="player",
                rating=4.9,
                total_games=15,
                is_active=True,
                is_verified=True,
            )
            session.add(test_user)
            await session.flush()

            # Solo profile
            user_profile = SoloPlayerProfile(
                user_id=test_user.id,
                is_looking_for_game=True,
                preferred_positions=["MIDFIELDER", "FORWARD"],
                preferred_radius_km=10,
                preferred_time_start=time(19, 0),
                preferred_time_end=time(22, 0),
                preferred_days=[1, 3, 5],
                location=WKTElement("POINT(69.2163 41.2858)", srid=4326),
                reliability_score=98.50,
                total_solo_games=12,
            )
            session.add(user_profile)

        # Owner
        owner_res = await session.execute(
            select(User).where(User.phone_number == "+998909876543")
        )
        owner_user = owner_res.scalar_one_or_none()
        if not owner_user:
            owner_user = User(
                phone_number="+998909876543",
                full_name="Jamshid Rustamov (Maydon Egasi)",
                role="owner",
                rating=5.0,
                is_active=True,
                is_verified=True,
            )
            session.add(owner_user)
            await session.flush()

        # 2. Venuelar (Maydon majmualari)
        venues_data = [
            {
                "name": "Bunyodkor Arena (Milliy Stadium)",
                "description": "Professional maysazor, yechinish xonalari, dush va avtoturargoh.",
                "address": "Chilonzor tumani, Bunyodkor shoh ko'chasi 47",
                "city": "Toshkent",
                "district": "Chilonzor",
                "phone": "+998712001122",
                "lat": 41.2801,
                "lon": 69.2155,
                "facilities": {"parking": True, "shower": True, "lighting": True, "cafe": True},
            },
            {
                "name": "Triumph Sport Majmuasi",
                "description": "Zamonaviy yopiq va ochiq mini-futbol maydonlari.",
                "address": "Yakkasaroy tumani, Shota Rustaveli 12",
                "city": "Toshkent",
                "district": "Yakkasaroy",
                "phone": "+998901112233",
                "lat": 41.2915,
                "lon": 69.2432,
                "facilities": {"parking": True, "shower": True, "lighting": True, "cafe": False},
            },
            {
                "name": "Jizzax Dinamo Arena",
                "description": "Sun'iy chimli yangi ta'mirlangan maydonlar majmuasi.",
                "address": "Jizzax shahri, Sharof Rashidov ko'chasi 15",
                "city": "Jizzax",
                "district": "Markaz",
                "phone": "+998722263344",
                "lat": 40.1258,
                "lon": 67.8422,
                "facilities": {"parking": True, "shower": True, "lighting": True},
            },
        ]

        created_pitches = []
        for v_data in venues_data:
            existing_v = await session.execute(
                select(Venue).where(Venue.name == v_data["name"])
            )
            if not existing_v.scalar_one_or_none():
                v = Venue(
                    owner_id=owner_user.id,
                    name=v_data["name"],
                    description=v_data["description"],
                    address=v_data["address"],
                    city=v_data["city"],
                    district=v_data["district"],
                    phone_number=v_data["phone"],
                    working_hours_start=time(7, 0),
                    working_hours_end=time(23, 0),
                    facilities=v_data["facilities"],
                    location=WKTElement(f"POINT({v_data['lon']} {v_data['lat']})", srid=4326),
                    avg_rating=4.85,
                    total_bookings=42,
                )
                session.add(v)
                await session.flush()

                # Venue rasm
                img = VenueImage(
                    venue_id=v.id,
                    image_url="https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800",
                    is_primary=True,
                )
                session.add(img)

                # Pitch 1 (7x7)
                p1 = Pitch(
                    venue_id=v.id,
                    name="Maydon A (Asosiy 7x7)",
                    size_type="7x7",
                    grass_type="artificial",
                    has_roof=False,
                    price_per_hour=Decimal("250000.00"),
                    min_players=10,
                    max_players=14,
                )
                session.add(p1)
                await session.flush()
                created_pitches.append(p1)

                # Pitch 2 (5x5 Mini)
                p2 = Pitch(
                    venue_id=v.id,
                    name="Maydon B (Yopiq 5x5)",
                    size_type="5x5",
                    grass_type="indoor",
                    has_roof=True,
                    price_per_hour=Decimal("180000.00"),
                    min_players=8,
                    max_players=10,
                )
                session.add(p2)
                await session.flush()
                created_pitches.append(p2)

        # 3. Bugungi va ertangi kun uchun Slotlar
        now = datetime.now(timezone.utc)
        today = now.date()

        for pitch in created_pitches:
            for day_offset in range(2):
                target_date = today + timedelta(days=day_offset)
                # 17:00 dan 23:00 gacha har 1 soatlik slotlar
                for hour in range(17, 23):
                    slot_start = datetime.combine(
                        target_date, time(hour, 0)
                    ).replace(tzinfo=timezone.utc)
                    slot_end = slot_start + timedelta(hours=1)

                    # Slot oldin qo'shilganini tekshirish
                    exist_s = await session.execute(
                        select(Slot).where(
                            Slot.pitch_id == pitch.id,
                            Slot.start_time == slot_start,
                        )
                    )
                    if not exist_s.scalar_one_or_none():
                        slot = Slot(
                            pitch_id=pitch.id,
                            start_time=slot_start,
                            end_time=slot_end,
                            price=float(pitch.price_per_hour),
                            is_available=True,
                            source="auto",
                        )
                        session.add(slot)

        # 4. Badges (Nishonlar)
        badges_data = [
            ("IRON_MAN", "Temir O'yinchi", "Oxirgi 30 kunda 10+ o'yin o'tkazgan"),
            ("STRIKER", "To'purar", "O'yinlarda faol qatnashuvchi hujumchi"),
            ("CLEAN_SHEET", "Ishonchli Darvozabon", "5 ta o'yinda darvozani himoya qilgan"),
            ("FAIR_PLAY", "Halol O'yin", "100% Reliability score egasi"),
        ]
        for slug, name, desc in badges_data:
            b_exist = await session.execute(select(Badge).where(Badge.slug == slug))
            if not b_exist.scalar_one_or_none():
                badge = Badge(slug=slug, name=name, description=desc)
                session.add(badge)

        await session.commit()
        print("SUCCESS: Barcha test ma'lumotlari muvaffaqiyatli saqlandi!")


if __name__ == "__main__":
    asyncio.run(seed())
