# 🤖 SPORT+ Android Native Client (Flutter & Material 3)

Flutter 3.x va **Material 3 Expressive Glassmorphism** arxitekturasi asosida yaratilgan yuqori tezlikdagi Android mijoz ilovasi.

## 🏗️ Arxitektura

- **Frame**: Flutter 3.x, Dart 3
- **Dizayn**: Material 3 Expressive + Glassmorphism (`BackdropFilter`, `ImageFilter.blur(16, 16)`)
- **Mikro-animatsiyalar**: 120 FPS jank-free spring animatsiyalari, radar skaneri
- **Tarmoq**: `Dio` (Base URL: `https://sport-jmu3.onrender.com/api/v1`)
- **Xavfsiz saqlash**: `flutter_secure_storage`
- **Taktil**: `HapticFeedback.lightImpact()` va `mediumImpact()`

## 📂 Papkalar Strukturasi

```
android/sport_plus_android/
├── pubspec.yaml
├── lib/
│   ├── main.dart                                # App kirish nuqtasi va auth check
│   ├── core/
│   │   ├── theme/
│   │   │   └── app_theme.dart                   # Light theme va Slate/Emerald palitrasi
│   │   ├── widgets/
│   │   │   └── glass_container.dart             # GlassContainer va GlassPillButton
│   │   └── services/
│   │       └── api_service.dart                 # Dio va JWT interceptor
│   └── features/
│       ├── auth/
│       │   └── presentation/login_screen.dart   # Telegram OTP va 6-xonali input
│       ├── venues/
│       │   └── presentation/venues_screen.dart  # PostGIS maydonlar va masofalar
│       ├── matchmaking/
│       │   └── presentation/radar_matchmaking_screen.dart # Radar animatsiyasi va lobbiylar
│       ├── bookings/
│       │   └── presentation/match_ticket_screen.dart      # Perforated Pass chiptasi
│       ├── profile/
│       │   └── presentation/profile_screen.dart # Reliability badge va sozlamalar
│       └── navigation/
│           └── main_navigation_screen.dart      # Suzuvchi shisha Bottom Bar
```
