"""
Mock & Seed Data Service — PostgreSQL va Redis o'chiq bo'lgan holatlarda ham
Sport+ platformasining barcha qismlari (Maydonlar, Pitches, Slotlar, Bronlar va To'lovlar)
100% xatosiz va tezkor ishlashini ta'minlovchi xizmat.
"""

from datetime import datetime, date, time, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

# 4 ta asosiy stadion
MOCK_VENUES = [
    {
        "id": "e1f1c841-3b7c-4734-b258-c146c6460111",
        "name": "Bunyodkor Arena (Milliy Stadium)",
        "address": "Chilonzor tumani, Bunyodkor shoh ko'chasi 47",
        "city": "Toshkent",
        "district": "Chilonzor",
        "lat": 41.2801,
        "lon": 69.2155,
        "avg_rating": 4.9,
        "total_bookings": 142,
        "min_price": 200000.0,
        "facilities": {"parking": True, "shower": True, "lighting": True, "cafe": True},
        "primary_image_url": "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=900&auto=format&fit=crop",
        "images": [
            "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=900&auto=format&fit=crop",
        ],
    },
    {
        "id": "e2f2c842-3b7c-4734-b258-c146c6460222",
        "name": "Triumph Sport Majmuasi",
        "address": "Yakkasaroy tumani, Shota Rustaveli ko'chasi 112",
        "city": "Toshkent",
        "district": "Yakkasaroy",
        "lat": 41.2858,
        "lon": 69.2450,
        "avg_rating": 4.8,
        "total_bookings": 98,
        "min_price": 180000.0,
        "facilities": {"parking": True, "shower": True, "lighting": True, "indoor": True},
        "primary_image_url": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop",
        "images": [
            "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=900&auto=format&fit=crop",
        ],
    },
    {
        "id": "e3f3c843-3b7c-4734-b258-c146c6460333",
        "name": "Paxtakor Mini Arena",
        "address": "Shayxontohur tumani, Paxtakor ko'chasi 1",
        "city": "Toshkent",
        "district": "Shayxontohur",
        "lat": 41.3110,
        "lon": 69.2550,
        "avg_rating": 4.7,
        "total_bookings": 210,
        "min_price": 220000.0,
        "facilities": {"parking": True, "shower": True, "lighting": True},
        "primary_image_url": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=900&auto=format&fit=crop",
        "images": [
            "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=900&auto=format&fit=crop",
        ],
    },
    {
        "id": "e4f4c844-3b7c-4734-b258-c146c6460444",
        "name": "Jizzax Dinamo Sport Arena",
        "address": "Jizzax shahri, Sh. Rashidov shoh ko'chasi 24",
        "city": "Jizzax",
        "district": "Markaz",
        "lat": 40.1158,
        "lon": 67.8422,
        "avg_rating": 4.9,
        "total_bookings": 76,
        "min_price": 140000.0,
        "facilities": {"parking": True, "shower": True, "lighting": True, "tribune": True},
        "primary_image_url": "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=900&auto=format&fit=crop",
        "images": [
            "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=900&auto=format&fit=crop",
        ],
    },
]

MOCK_PITCHES = {
    "e1f1c841-3b7c-4734-b258-c146c6460111": [
        {
            "id": "p1-bunyodkor-5x5",
            "venue_id": "e1f1c841-3b7c-4734-b258-c146c6460111",
            "name": "Maydon 1 (5x5 Mini)",
            "format": "5x5",
            "surface_type": "artifical_grass",
            "is_indoor": False,
            "price_per_hour": 200000.0,
            "is_active": True,
        },
        {
            "id": "p2-bunyodkor-7x7",
            "venue_id": "e1f1c841-3b7c-4734-b258-c146c6460111",
            "name": "Maydon 2 (7x7 Standart)",
            "format": "7x7",
            "surface_type": "artifical_grass",
            "is_indoor": False,
            "price_per_hour": 320000.0,
            "is_active": True,
        },
    ],
    "e2f2c842-3b7c-4734-b258-c146c6460222": [
        {
            "id": "p3-triumph-indoor",
            "venue_id": "e2f2c842-3b7c-4734-b258-c146c6460222",
            "name": "Maydon A (Yopiq Indoor)",
            "format": "5x5",
            "surface_type": "indoor_parquet",
            "is_indoor": True,
            "price_per_hour": 180000.0,
            "is_active": True,
        },
        {
            "id": "p4-triumph-outdoor",
            "venue_id": "e2f2c842-3b7c-4734-b258-c146c6460222",
            "name": "Maydon B (Ochiq Maysazor)",
            "format": "6x6",
            "surface_type": "artifical_grass",
            "is_indoor": False,
            "price_per_hour": 220000.0,
            "is_active": True,
        },
    ],
    "e3f3c843-3b7c-4734-b258-c146c6460333": [
        {
            "id": "p5-paxtakor-pro",
            "venue_id": "e3f3c843-3b7c-4734-b258-c146c6460333",
            "name": "Paxtakor Pro Pitch",
            "format": "6x6",
            "surface_type": "artifical_grass",
            "is_indoor": False,
            "price_per_hour": 220000.0,
            "is_active": True,
        }
    ],
    "e4f4c844-3b7c-4734-b258-c146c6460444": [
        {
            "id": "p6-jizzax-main",
            "venue_id": "e4f4c844-3b7c-4734-b258-c146c6460444",
            "name": "Dinamo Central Pitch",
            "format": "7x7",
            "surface_type": "artifical_grass",
            "is_indoor": False,
            "price_per_hour": 140000.0,
            "is_active": True,
        }
    ],
}


def get_mock_slots_for_pitch(pitch_id: str, target_date: Optional[date] = None) -> List[Dict[str, Any]]:
    """Bugungi va ertangi kun uchun dinamik 1-soatlik slotlarni shakllantirish."""
    d = target_date or datetime.now(timezone.utc).date()
    
    # Narxni aniqlash
    price = 200000.0
    for v_pitches in MOCK_PITCHES.values():
        for p in v_pitches:
            if str(p["id"]) == str(pitch_id):
                price = p["price_per_hour"]
                break

    hours = [
        (10, 11),
        (11, 12),
        (14, 15),
        (15, 16),
        (16, 17),
        (17, 18),
        (18, 19),
        (19, 20),
        (20, 21),
        (21, 22),
        (22, 23),
    ]

    slots = []
    for start_h, end_h in hours:
        st = datetime.combine(d, time(start_h, 0)).replace(tzinfo=timezone.utc)
        et = datetime.combine(d, time(end_h, 0)).replace(tzinfo=timezone.utc)
        # 18:00 - 20:00 oralig'ida premium narx
        slot_price = price + 20000.0 if start_h >= 18 else price

        slot_id = f"slot_{pitch_id}_{d.strftime('%Y%m%d')}_{start_h:02d}"
        slots.append({
            "id": slot_id,
            "pitch_id": str(pitch_id),
            "start_time": st.isoformat(),
            "end_time": et.isoformat(),
            "price": float(slot_price),
            "is_available": True,
            "source": "auto"
        })

    return slots


# Xotirada saqlanuvchi bronlar (Mock Database)
MOCK_BOOKINGS: Dict[str, Dict[str, Any]] = {}
