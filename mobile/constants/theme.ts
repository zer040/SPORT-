/**
 * Sport+ Apple-iOS Clean Light Mode Design Tokens.
 * Minimalist, clean, premium aesthetic — no dark surfaces.
 */

export const THEME = {
  colors: {
    // ─── Brand / Accent ───────────────────────────────
    primary: '#059669',        // Emerald green (iOS-safe on white)
    primaryDark: '#047857',    // Darker emerald for pressed states
    primaryLight: '#34D399',   // Soft mint
    primaryMuted: 'rgba(5, 150, 105, 0.10)',
    primaryBg: 'rgba(5, 150, 105, 0.08)',

    // ─── Secondary (blue tones for solo/escrow) ───────
    electricBlue: '#0EA5E9',
    electricBlueMuted: 'rgba(14, 165, 233, 0.10)',
    secondary: '#0EA5E9',

    // ─── Accent (gold / amber highlights) ─────────────
    accent: '#F59E0B',
    accentMuted: 'rgba(245, 158, 11, 0.10)',

    // ─── Light Mode Surfaces ──────────────────────────
    background: '#F1F5F9',      // Cool off-white (not pure white)
    surface: '#FFFFFF',         // Card surface
    surfaceLight: '#F8FAFC',    // Secondary surface
    surfaceGlass: 'rgba(255, 255, 255, 0.80)',
    surfaceElevated: '#FFFFFF',
    border: 'rgba(15, 23, 42, 0.08)',
    surfaceBorder: 'rgba(15, 23, 42, 0.08)',
    surfaceBorderActive: 'rgba(5, 150, 105, 0.35)',

    // ─── Glass ─────────────────────────────────────────
    glassBg: 'rgba(255, 255, 255, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.90)',
    glassOverlay: 'rgba(255, 255, 255, 0.50)',

    // ─── CTA Button ────────────────────────────────────
    ctaBackground: '#0F172A',
    ctaText: '#FFFFFF',

    // ─── Status ────────────────────────────────────────
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#059669',
    info: '#0EA5E9',

    // ─── Typography ────────────────────────────────────
    textPrimary: '#0F172A',     // Deep slate — headings
    textSecondary: '#475569',   // Mid slate — subtitles
    textMuted: '#94A3B8',       // Light slate — captions
    textDark: '#0F172A',
    textOnGreen: '#FFFFFF',     // Text on primary green bg

    // ─── Light Mode Typography (alias) ─────────────────
    textLightPrimary: '#0F172A',
    textLightSecondary: '#475569',
    textLightMuted: '#94A3B8',

    // ─── Overlays ──────────────────────────────────────
    overlay: 'rgba(15, 23, 42, 0.55)',
    overlayLight: 'rgba(0, 0, 0, 0.04)',
    gold: '#F59E0B',
  },

  // ─── Card Shadow Spec ──────────────────────────────────
  glass: {
    background: 'rgba(255, 255, 255, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1,
    borderRadius: 20,
    blurIntensity: 20,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },

  // ─── OTP Cell Specs ────────────────────────────────────
  otp: {
    emptyBorder: 'rgba(15, 23, 42, 0.15)',
    focusBorder: '#059669',
    errorBorder: '#EF4444',
    cellSize: 52,
    cellGap: 12,
    borderRadius: 16,
    fontSize: 24,
  },

  // ─── CTA Button Specs ─────────────────────────────────
  cta: {
    background: '#0F172A',
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 32,
    textColor: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  radius: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 28,
    full: 9999,
  },

  // ─── Ambient Gradient Background ──────────────────────
  gradients: {
    loginBg: ['#E8F4F8', '#F0E6F6', '#E8F4F0'],
    darkBg: ['#F1F5F9', '#E2E8F0', '#F1F5F9'],
  },
};
