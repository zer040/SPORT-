/**
 * Sport+ Frosted Glassmorphism Design Tokens.
 * Clean Light/Dark theme with zero-clutter aesthetic.
 */

export const THEME = {
  colors: {
    // ─── Primary Pitch Accent ──────────────────
    primary: '#00FF87',       // Neon Turf Green
    primaryDark: '#059669',
    primaryLight: '#5EEAD4',
    primaryMuted: 'rgba(0, 255, 135, 0.12)',

    // ─── Electric Blue (Solo Play & Escrow) ────
    electricBlue: '#38BDF8',
    electricBlueMuted: 'rgba(56, 189, 248, 0.12)',
    secondary: '#38BDF8',

    // ─── Dynamic Electric Volt ──────────────────
    accent: '#CCFF00',
    accentMuted: 'rgba(204, 255, 0, 0.12)',

    // ─── Deep Midnight (Dark Mode) ─────────────
    background: '#090D16',
    surface: '#111726',
    surfaceLight: '#1A2338',
    surfaceGlass: 'rgba(255, 255, 255, 0.04)',
    surfaceElevated: '#1A2338',
    border: 'rgba(255, 255, 255, 0.08)',
    surfaceBorder: 'rgba(255, 255, 255, 0.08)',
    surfaceBorderActive: 'rgba(0, 255, 135, 0.3)',

    // ─── Frosted Glass (Light Mode per Spec) ───
    glassBg: 'rgba(255, 255, 255, 0.45)',
    glassBorder: 'rgba(255, 255, 255, 0.65)',
    glassOverlay: 'rgba(255, 255, 255, 0.08)',

    // ─── Dark CTA Button (Spec: #1E232B) ───────
    ctaBackground: '#1E232B',
    ctaText: '#FFFFFF',

    // ─── Status Colors ─────────────────────────
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#00FF87',
    info: '#38BDF8',

    // ─── Typography ────────────────────────────
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textDark: '#090D16',

    // ─── Light Mode Typography ─────────────────
    textLightPrimary: '#1E232B',
    textLightSecondary: '#64748B',
    textLightMuted: '#94A3B8',

    // ─── Overlays ──────────────────────────────
    overlay: 'rgba(9, 13, 22, 0.85)',
    overlayLight: 'rgba(0, 0, 0, 0.05)',
    gold: '#FBBF24',
  },

  // ─── Frosted Glass Surface Specs ───────────────
  glass: {
    background: 'rgba(255, 255, 255, 0.45)',
    borderColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1.5,
    borderRadius: 32,
    blurIntensity: 30,    // sigmaX/sigmaY for BackdropFilter
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 12,
  },

  // ─── OTP Cell Specs ────────────────────────────
  otp: {
    emptyBorder: 'rgba(255, 255, 255, 0.25)',
    focusBorder: '#00FF87',       // Emerald
    errorBorder: '#EF4444',       // Crimson
    cellSize: 52,
    cellGap: 12,
    borderRadius: 16,
    fontSize: 24,
  },

  // ─── CTA Button Specs ─────────────────────────
  cta: {
    background: '#1E232B',        // Dark slate
    borderRadius: 28,             // Pill radius
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
    lg: 24,
    xl: 32,
    full: 9999,
  },

  // ─── Ambient Gradient Background ──────────────
  gradients: {
    loginBg: ['#E8F4F8', '#F0E6F6', '#E8F4F0'],  // Soft pastel ambient
    darkBg: ['#090D16', '#0F1628', '#090D16'],
  },
};
