# 🍏 SPORT+ iOS Native Client (Swift 6 & SwiftUI)

Apple Human Interface Guidelines (HIG) va **Liquid Glass** dizayn tizimi asosida ishlab chiqilgan yuqori toifadagi native iOS ilovasi.

## 🏗️ Arxitektura

- **Til & UI**: Swift 6, SwiftUI (iOS 17.0+)
- **Dizayn standarti**: Apple Human Interface Guidelines (HIG)
- **Materiallar**: Liquid Glass (`.ultraThinMaterial`, continuous squircles, 1px specular highlight border)
- **Pattern**: MVVM (Model-View-ViewModel) + Clean Architecture
- **Tarmoq**: Native `URLSession` async/await, Bearer JWT
- **Taktil va Ovoz**: `UIImpactFeedbackGenerator` va `AudioToolbox`

## 📂 Papkalar Strukturasi

```
ios/SportPlus/
├── App/
│   └── SportPlusApp.swift             # App Lifecycle va Root Routing
├── Theme/
│   └── Theme.swift                    # Ranglar, tokonlar, continuous radiusi
├── Components/
│   ├── LiquidGlassCard.swift          # HIG Liquid Glass kartochkasi va tugmalari
│   └── HapticManager.swift            # Taktil va ovozli fikr-mulohaza boshqaruvi
├── Core/
│   ├── Network/
│   │   └── NetworkManager.swift       # Async/await REST mijoz (Render backend)
│   └── Storage/
│       └── KeychainStorage.swift      # Xavfsiz JWT token saqlash
├── LiveActivities/
│   ├── MatchActivityAttributes.swift  # ActivityKit ma'lumotlar modeli va ContentState
│   ├── MatchLiveActivityWidget.swift  # Dynamic Island (Compact/Expanded/Minimal) & Lock Screen
│   └── LiveActivityManager.swift      # Client-side lifecycle va APNs push tokenni backendga yuborish
├── Models/
│   ├── User.swift                     # Foydalanuvchi va Auth modellari
│   ├── Venue.swift                    # Maydon, Pitch va Slot modellari
│   ├── MatchLobby.swift               # Solo Matchmaking lobby modeli
│   └── Booking.swift                  # Apple Wallet Match Pass modeli
├── ViewModels/
│   ├── AuthViewModel.swift            # Telegram OTP va sessiya boshqaruvi
│   ├── VenuesViewModel.swift          # PostGIS qidiruv va masofalar
│   ├── MatchmakingViewModel.swift     # Radar va solo lobby qo'shilish
│   └── BookingsViewModel.swift        # Chiptalar va bronlar
└── Views/
    ├── MainTabView.swift              # Suzuvchi Liquid Glass Bottom Bar
    ├── Auth/
    │   └── LoginView.swift            # Telegram Bot 6-xonali OTP kiritish
    ├── Venues/
    │   └── VenuesListView.swift       # Maydonlar ro'yxati va filtri
    ├── Matchmaking/
    │   └── SoloRadarView.swift        # Radar animatsiyasi va lobbiylar
    ├── Bookings/
    │   └── MatchPassView.swift        # Apple Wallet formatidagi Match Pass + Dynamic Island integratsiyasi
    └── Profile/
        └── ProfileView.swift          # Reliability badge va statistika
```

## 🏝️ iOS Dynamic Island & Live Activities (30 daqiqalik Countdown)

1. Foydalanuvchi stadion bron qilganda yoki chiptani ochganda `LiveActivityManager` ActivityKit'ni ishga tushiradi.
2. Apple tizimidan olingan xavfsiz push token `POST /api/v1/live-activities/register` orqali backendga jo'natiladi.
3. Backend foniy ishchisi (`_async_trigger_30min_live_activities` / Celery) o'yinga 30 daqiqa qolganda Apple APNs serveriga HTTP/2 orqali `liveactivity` push yuboradi.
4. iPhone foydalanuvchisining Dynamic Island kengayib, stadion nomi, qolgan daqiqalar va jonli 1 soniyali taymer (`Text(style: .timer)`) bilan tebranadi.
5. O'yin yakunlanganda tizim avtomatik tarzda `event: end` yuborib vidjetni ekrandan olib tashlaydi.
