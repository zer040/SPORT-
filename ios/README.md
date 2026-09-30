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
    │   └── MatchPassView.swift        # Apple Wallet formatidagi Match Pass
    └── Profile/
        └── ProfileView.swift          # Reliability badge va statistika
```
