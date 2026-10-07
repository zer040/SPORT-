import 'package:flutter/material.dart';

/// Stitch Design System — Kinetic Obsidian Theme
/// High-velocity sports-tech design tokens for SPORT+ Mobile
class KineticObsidianTheme {
  // ─── Surface & Background Colors ─────────────────────────────────────────
  static const Color background = Color(0xFF0B1326);
  static const Color surfaceLowest = Color(0xFF060E20);
  static const Color surfaceLow = Color(0xFF131B2E);
  static const Color surface = Color(0xFF171F33);
  static const Color surfaceHigh = Color(0xFF222A3D);
  static const Color surfaceHighest = Color(0xFF2D3449);

  // Glass card elevated surfaces
  static const Color cardSurface = Color(0xB31E293B); // rgba(30, 41, 59, 0.70)
  static const Color modalSurface = Color(0x66334155); // rgba(51, 65, 85, 0.40)

  // ─── Kinetic Emissive Accents ────────────────────────────────────────────
  static const Color neonTurf = Color(0xFF10B981);       // Primary Action
  static const Color neonTurfBright = Color(0xFF4EDEA3); // Glow Highlight
  static const Color deepEmerald = Color(0xFF059669);    // Secondary Anchor
  static const Color surgeGold = Color(0xFFF59E0B);      // Peak demand / VIP
  static const Color alertError = Color(0xFFFFB4AB);

  // ─── Typography & Content Colors ─────────────────────────────────────────
  static const Color textHeading = Color(0xFFF8FAFC);
  static const Color textBody = Color(0xFFDAE2FD);
  static const Color textMuted = Color(0xFF94A3B8);

  // ─── Hairline Borders & Shadows ──────────────────────────────────────────
  static const Color borderSubtle = Color(0x1AFFFFFF); // rgba(255, 255, 255, 0.10)
  static const Color borderActive = Color(0x5910B981); // rgba(16, 185, 129, 0.35)
  static const Color borderGold = Color(0x59F59E0B);

  // ─── Curvature Radii ─────────────────────────────────────────────────────
  static const double radiusCard = 24.0;
  static const double radiusButton = 16.0;
  static const double radiusChip = 20.0;
  static const double radiusInput = 12.0;

  // ─── Box Decorations ─────────────────────────────────────────────────────
  static BoxDecoration glassCardDecoration({bool isActive = false, bool isSurge = false}) {
    return BoxDecoration(
      color: cardSurface,
      borderRadius: BorderRadius.circular(radiusCard),
      border: Border.all(
        color: isActive
            ? borderActive
            : (isSurge ? borderGold : borderSubtle),
        width: 1.0,
      ),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.5),
          offset: const Offset(0, 8),
          blurRadius: 20,
        ),
        if (isActive)
          BoxShadow(
            color: neonTurf.withOpacity(0.25),
            offset: Offset.zero,
            blurRadius: 24,
            spreadRadius: -2,
          ),
      ],
    );
  }

  static BoxDecoration primaryButtonDecoration({bool isPressed = false}) {
    return BoxDecoration(
      color: isPressed ? deepEmerald : neonTurf,
      borderRadius: BorderRadius.circular(radiusButton),
      boxShadow: [
        BoxShadow(
          color: neonTurf.withOpacity(0.35),
          offset: Offset.zero,
          blurRadius: 20,
          spreadRadius: 1,
        ),
      ],
    );
  }

  static BoxDecoration badgeDecoration({Color color = neonTurf}) {
    return BoxDecoration(
      color: color.withOpacity(0.12),
      borderRadius: BorderRadius.circular(radiusChip),
      border: Border.all(color: color.withOpacity(0.30), width: 1),
    );
  }

  // ─── Text Styles ─────────────────────────────────────────────────────────
  static const TextStyle headlineXl = TextStyle(
    fontFamily: 'SpaceGrotesk',
    fontSize: 32,
    fontWeight: FontWeight.w700,
    color: textHeading,
    letterSpacing: -0.8,
    height: 1.25,
  );

  static const TextStyle headlineLg = TextStyle(
    fontFamily: 'SpaceGrotesk',
    fontSize: 24,
    fontWeight: FontWeight.w600,
    color: textHeading,
    letterSpacing: -0.5,
  );

  static const TextStyle headlineMd = TextStyle(
    fontFamily: 'SpaceGrotesk',
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: textHeading,
    letterSpacing: -0.3,
  );

  static const TextStyle bodyLg = TextStyle(
    fontFamily: 'Geist',
    fontSize: 16,
    fontWeight: FontWeight.w400,
    color: textBody,
    height: 1.4,
  );

  static const TextStyle bodyMd = TextStyle(
    fontFamily: 'Geist',
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: textBody,
  );

  static const TextStyle telemetryLabel = TextStyle(
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    fontWeight: FontWeight.w600,
    color: neonTurf,
    letterSpacing: 0.8,
  );

  static const TextStyle telemetryGold = TextStyle(
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
    fontWeight: FontWeight.w600,
    color: surgeGold,
    letterSpacing: 0.8,
  );
}
