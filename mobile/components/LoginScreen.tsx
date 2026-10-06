import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Linking,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Api } from '../services/api';

const { width } = Dimensions.get('window');

// Safe LinearGradient fallback
let NativeLinearGradient: any = null;
try {
  NativeLinearGradient = require('expo-linear-gradient').LinearGradient;
} catch {
  NativeLinearGradient = null;
}

const SafeGradient: React.FC<any> = ({ colors, style, children, start, end, ...props }) => {
  if (NativeLinearGradient) {
    return (
      <NativeLinearGradient colors={colors} style={style} start={start} end={end} {...props}>
        {children}
      </NativeLinearGradient>
    );
  }
  const primaryColor = colors?.[0] || '#0F172A';
  return (
    <View style={[{ backgroundColor: primaryColor }, style]} {...props}>
      {children}
    </View>
  );
};

interface LoginScreenProps {
  onLoginSuccess: (authData: any) => void;
}

type AuthStep = 'welcome' | 'login' | 'otp' | 'register';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [step, setStep] = useState<AuthStep>('welcome');
  const [authMode, setAuthMode] = useState<'player' | 'staff'>('player');

  // Player / Telegram Auth state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null);
  const [telegramWebLink, setTelegramWebLink] = useState<string | null>(null);

  // Staff (Owner/Admin) login state
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffPasswordVisible, setStaffPasswordVisible] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);

  // Registration state for new users
  const [pendingTelegramId, setPendingTelegramId] = useState<number | null>(null);
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPhone, setRegPhone] = useState('+998');

  // Kinetic OTP state
  const [otpCode, setOtpCode] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const otpInputRef = useRef<TextInput>(null);
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Welcome screen animations
  const welcomeScale = useRef(new Animated.Value(0.85)).current;
  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const logoGlow = useRef(new Animated.Value(0)).current;

  // Pulse animation for status indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Welcome screen entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(welcomeScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(welcomeOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    // Logo glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlow, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(logoGlow, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Neon blinking cursor for OTP
  useEffect(() => {
    const cursorLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])
    );
    cursorLoop.start();
    return () => cursorLoop.stop();
  }, [cursorOpacity]);

  // Auto-focus OTP input on step switch
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpInputRef.current?.focus(), 300);
    }
  }, [step]);

  // Deep-link listener: sportplus://auth?code=123456
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      try {
        const url = event.url;
        if (url && url.includes('code=')) {
          const matched = url.match(/code=([0-9]{4,6})/);
          if (matched && matched[1]) {
            const code = matched[1].slice(0, 6);
            setOtpCode(code);
            setStep('otp');
            if (code.length === 6) {
              executeVerifyOtp(code);
            }
          }
        }
      } catch (e) {
        console.warn('Deep link parse error:', e);
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => sub.remove();
  }, []);

  const triggerError = (msg: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
    setErrorMessage(msg);
    setLoading(false);

    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
    ]).start();
  };

  // ─── Telegram botni ochish utility ─────────────────────────
  const openTelegramBot = async (deepLink: string, webLink: string) => {
    try {
      // 1. Avval native tg:// sxemasini sinab ko'ramiz
      const canOpenNative = await Linking.canOpenURL(deepLink);
      if (canOpenNative) {
        await Linking.openURL(deepLink);
        return;
      }
    } catch {}

    // 2. Fallback: brauzerda https://t.me/... ochiladi
    try {
      await Linking.openURL(webLink);
    } catch (e) {
      console.warn('Telegram ochishda xatolik:', e);
    }
  };

  // ─── 1. Telegram Auth Start (API Call + Deep Link) ─────────
  const handleTelegramAuth = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    setLoading(true);
    setErrorMessage(null);

    try {
      // Backend /auth/telegram-start chaqiriladi
      const res = await Api.startTelegramAuth();

      const deepLink =
        res.deep_link ||
        `tg://resolve?domain=${res.bot_username || 'sport_plus_uz_bot'}&start=auth_${res.session_id}`;
      const webLink =
        res.web_link ||
        `https://t.me/${res.bot_username || 'sport_plus_uz_bot'}?start=auth_${res.session_id}`;

      // Linklarni saqlab qo'yamiz (qayta ochish uchun)
      setTelegramDeepLink(deepLink);
      setTelegramWebLink(webLink);

      // OTP sahifaga o'tib, keyin Telegram'ni ochamiz
      setStep('otp');

      // Kichik kechikish — OTP sahifasi renderlangandan keyin ochilsin
      setTimeout(() => {
        openTelegramBot(deepLink, webLink);
      }, 400);
    } catch (err: any) {
      triggerError(err.message || "Tarmoqqa ulanib bo'lmadi. Server aloqasini tekshiring.");
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP sahifasidan Telegramni qayta ochish ───────────────
  const handleReopenTelegram = async () => {
    if (!telegramDeepLink || !telegramWebLink) {
      // Agar link yo'q bo'lsa, yangidan boshlash
      await handleTelegramAuth();
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await openTelegramBot(telegramDeepLink, telegramWebLink);
  };

  // ─── 2. OTP Verification ────────────────────────────────────
  const executeVerifyOtp = async (code: string) => {
    if (code.length < 6) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    try {
      const res = await Api.verifyDirectTelegramOtp(code);
      if (res.status === 'NEW_USER' || res.status === 'REQUIRES_REGISTRATION') {
        setPendingTelegramId(res.telegram_id || 991827364);
        setStep('register');
      } else if (
        (res.status === 'EXISTING_USER' || res.status === 'SUCCESS') &&
        res.access_token
      ) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}

        onLoginSuccess({
          access_token: res.access_token,
          refresh_token: res.refresh_token,
          user: res.user,
          show_welcome_back: res.show_welcome_back ?? true,
          is_first_login: false,
        });
      } else {
        triggerError(res.message || "Kod eskirgan yoki noto'g'ri kiritilgan");
      }
    } catch (err: any) {
      triggerError(err.message || "Kod eskirgan yoki noto'g'ri kiritilgan");
    } finally {
      setLoading(false);
    }
  };

  // ─── 3. Staff Credentials Login ─────────────────────────────
  const handleStaffLogin = async () => {
    if (!staffUsername.trim() || !staffPassword.trim()) {
      triggerError("Login va parolni to'liq kiriting");
      return;
    }
    setStaffLoading(true);
    setErrorMessage(null);

    try {
      const res = await Api.loginWithCredentials(
        staffUsername.trim().toLowerCase(),
        staffPassword
      );
      onLoginSuccess({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        user: res.user,
        show_welcome_back: true,
        is_first_login: false,
      });
    } catch (err: any) {
      triggerError(err.message || "Login yoki parol noto'g'ri");
    } finally {
      setStaffLoading(false);
    }
  };

  // ─── 4. Registration Completion (NEW USER) ─────────────────
  const handleCompleteRegistration = async () => {
    if (!regFirstName.trim() || !regLastName.trim() || regPhone.length < 9) {
      triggerError("Ma'lumotlarni to'liq kiriting");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await Api.completeRegistration({
        telegram_id: pendingTelegramId || 991827364,
        first_name: regFirstName.trim(),
        last_name: regLastName.trim(),
        phone_number: regPhone.trim(),
      });

      const full_name = `${regFirstName.trim()} ${regLastName.trim()}`.trim();
      onLoginSuccess({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        user: {
          id: res.user?.id || `tg_${pendingTelegramId || 991827364}`,
          full_name: res.user?.full_name || full_name,
          first_name: res.user?.first_name || regFirstName.trim(),
          last_name: res.user?.last_name || regLastName.trim(),
          phone_number: res.user?.phone_number || regPhone.trim(),
          role: res.user?.role || 'player',
        },
        is_first_login: true,
        show_welcome_back: false,
      });
    } catch (err: any) {
      triggerError(err.message || "Ro'yxatdan o'tishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'register') {
      setStep('otp');
    } else if (step === 'otp') {
      setStep('login');
      setOtpCode('');
      setErrorMessage(null);
    } else if (step === 'login') {
      setStep('welcome');
      setErrorMessage(null);
    }
  };

  // ══════════════════════════════════════════════════════════════
  //  WELCOME / HERO SCREEN (1-Sahifa) — Enriched Design
  // ══════════════════════════════════════════════════════════════
  if (step === 'welcome') {
    const glowOpacity = logoGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.75] });
    const glowScale = logoGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

    return (
      <View style={styles.fullScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#061C14" />

        {/* ── 1. Deep Dark Gradient Background ── */}
        <SafeGradient
          colors={['#0F172A', '#061C14', '#022C22']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* ── 2. Stadium Pitch Geometry (Ambient) ── */}
        {/* Top-right radial glow */}
        <View style={styles.pitchGlowTopRight} />
        {/* Bottom-left radial glow */}
        <View style={styles.pitchGlowBottomLeft} />
        {/* Center pitch circle (yarim doira) */}
        <View style={styles.pitchCenterCircle} />
        {/* Stadium halfway line */}
        <View style={styles.pitchHalfLine} />
        {/* Corner arc top-left */}
        <View style={styles.pitchCornerArcTL} />
        {/* Corner arc bottom-right */}
        <View style={styles.pitchCornerArcBR} />

        {/* ── 3. Animated Content (space-between layout) ── */}
        <Animated.View
          style={[
            styles.welcomeContent,
            { opacity: welcomeOpacity, transform: [{ scale: welcomeScale }] },
          ]}
        >
          {/* ── TOP SPACER ── */}
          <View style={styles.welcomeTopSpacer} />

          {/* ── HERO CENTER BLOCK ── */}
          <View style={styles.welcomeHeroBlock}>
            {/* Outer animated aura ring */}
            <Animated.View
              style={[
                styles.welcomeLogoAura,
                { opacity: glowOpacity, transform: [{ scale: glowScale }] },
              ]}
            />

            {/* Logo container — glassmorphism */}
            <View style={styles.welcomeLogoContainer}>
              <SafeGradient
                colors={['#10B981', '#059669', '#047857']}
                style={styles.welcomeLogoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.welcomeLogoChar}>S</Text>
              </SafeGradient>
            </View>

            {/* Brand title */}
            <Text style={styles.welcomeBrandTitle}>
              SPORT<Text style={styles.welcomeBrandAccent}>+</Text>
            </Text>
            <Text style={styles.welcomeTagline}>Intelligent Arena Ecosystem</Text>

            {/* ── Live Pulse Chips (matnlarni chip bilan almashtirish) ── */}
            <View style={styles.welcomeChipRow}>
              <View style={styles.welcomeChip}>
                <Animated.View
                  style={[
                    styles.welcomeChipDot,
                    { opacity: pulseAnim },
                  ]}
                />
                <Text style={styles.welcomeChipText}>120+ Faol maydonlar</Text>
              </View>
              <View style={styles.welcomeChip}>
                <Ionicons name="flash" size={11} color="#10B981" />
                <Text style={styles.welcomeChipText}>Tezkor bron</Text>
              </View>
            </View>
          </View>

          {/* ── BOTTOM ACTION BLOCK ── */}
          <View style={styles.welcomeBottomBlock}>
            {/* CTA Button */}
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
                setStep('login');
              }}
              activeOpacity={0.85}
            >
              <SafeGradient
                colors={['#059669', '#10B981']}
                style={styles.startButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.startButtonText}>Boshlash</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </SafeGradient>
            </TouchableOpacity>

            {/* Biznes & Admin qisqa yo'l */}
            <TouchableOpacity
              style={styles.staffShortcut}
              onPress={() => {
                setAuthMode('staff');
                setStep('login');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.staffShortcutText}>Biznes & Admin kirish</Text>
              <Ionicons name="chevron-forward" size={13} color="#475569" />
            </TouchableOpacity>

            {/* Trust Badge */}
            <View style={styles.welcomeTrustBadge}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#475569" />
              <Text style={styles.welcomeTrustText}>Rasmiy hamkorlik</Text>
              <View style={styles.welcomeTrustDivider} />
              <Ionicons name="flash-outline" size={12} color="#475569" />
              <Text style={styles.welcomeTrustText}>Real-time slotlar</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  LOGIN / OTP / REGISTER SCREENS (2+, 3, 4-sahifalar)
  // ══════════════════════════════════════════════════════════════
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Background */}
      <SafeGradient
        colors={['#0F172A', '#06131E', '#022C22']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Bar with Back Button */}
        <View style={styles.topBar}>
          {step !== 'login' ? (
            <TouchableOpacity
              style={styles.circularBackBtn}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color="#F8FAFC" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.circularBackBtn}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color="#F8FAFC" />
            </TouchableOpacity>
          )}
        </View>

        {/* Logo & Brand — klaviatura ochilganda kichrayadi */}
        <View style={styles.topSection}>
          <View style={styles.logoOuter}>
            <SafeGradient
              colors={['#10B981', '#059669', '#047857']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoChar}>S</Text>
            </SafeGradient>
          </View>
          <Text style={styles.brandTitle}>
            SPORT<Text style={styles.brandAccent}>+</Text>
          </Text>
          <Text style={styles.brandSubtitle}>
            {step === 'otp'
              ? 'OTP Tasdiqlash'
              : step === 'register'
              ? "Ro'yxatdan o'tish"
              : 'Tizimga kirish'}
          </Text>
        </View>

        {/* Main Card */}
        <View style={styles.cardWrapper}>
          <SafeGradient
            colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
            style={styles.linearCard}
          >
            {/* ── LOGIN STEP ── */}
            {step === 'login' && (
              <>
                {/* O'yinchi / Biznes & Admin tablari */}
                <View style={styles.modeTabsRow}>
                  <TouchableOpacity
                    style={[styles.modeTab, authMode === 'player' && styles.modeTabActive]}
                    onPress={() => { setAuthMode('player'); setErrorMessage(null); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modeTabText, authMode === 'player' && styles.modeTabTextActive]}>
                      O'yinchi
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeTab, authMode === 'staff' && styles.modeTabActive]}
                    onPress={() => { setAuthMode('staff'); setErrorMessage(null); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modeTabText, authMode === 'staff' && styles.modeTabTextActive]}>
                      Biznes & Admin
                    </Text>
                  </TouchableOpacity>
                </View>

                {authMode === 'player' ? (
                  <>
                    {/* Maydon holati mini-indikatori */}
                    <View style={styles.statusRow}>
                      <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
                      <Text style={styles.statusText}>Real vaqt slotlari faol</Text>
                    </View>

                    {/* Telegram orqali kirish tugmasi */}
                    <TouchableOpacity
                      style={styles.ctaButton}
                      onPress={handleTelegramAuth}
                      disabled={loading}
                      activeOpacity={0.88}
                    >
                      <SafeGradient
                        colors={['#059669', '#10B981']}
                        style={styles.ctaGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <FontAwesome5 name="telegram-plane" size={19} color="#FFFFFF" />
                            <Text style={styles.ctaText}>Telegram orqali kirish</Text>
                          </>
                        )}
                      </SafeGradient>
                    </TouchableOpacity>
                  </>
                ) : (
                  /* STAFF LOGIN */
                  <View style={{ gap: 12 }}>
                    <View style={styles.inputWrap}>
                      <Ionicons name="person-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Username"
                        placeholderTextColor="#64748B"
                        value={staffUsername}
                        onChangeText={setStaffUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View style={styles.inputWrap}>
                      <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        placeholder="Parol"
                        placeholderTextColor="#64748B"
                        value={staffPassword}
                        onChangeText={setStaffPassword}
                        secureTextEntry={!staffPasswordVisible}
                      />
                      <TouchableOpacity onPress={() => setStaffPasswordVisible(!staffPasswordVisible)}>
                        <Ionicons
                          name={staffPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.ctaButton}
                      onPress={handleStaffLogin}
                      disabled={staffLoading}
                      activeOpacity={0.88}
                    >
                      <SafeGradient
                        colors={['#059669', '#10B981']}
                        style={styles.ctaGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {staffLoading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.ctaText}>Tizimga kirish</Text>
                          </>
                        )}
                      </SafeGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* ── OTP STEP ── */}
            {step === 'otp' && (
              <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                <Text style={styles.otpHeader}>Tasdiqlash kodi</Text>
                <Text style={styles.otpSubheader}>
                  Telegram botdan kelgan 6 xonali kodni kiriting
                </Text>

                {/* Telegram qayta ochish tugmasi — neon outlined */}
                <TouchableOpacity
                  style={styles.reopenTelegramBtn}
                  onPress={handleReopenTelegram}
                  activeOpacity={0.8}
                >
                  <FontAwesome5 name="telegram-plane" size={16} color="#10B981" />
                  <Text style={styles.reopenTelegramText}>Telegramni qayta ochish</Text>
                  <Ionicons name="open-outline" size={14} color="#10B981" />
                </TouchableOpacity>

                {/* Hidden native input */}
                <TextInput
                  ref={otpInputRef}
                  style={styles.hiddenInput}
                  value={otpCode}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 6);
                    setOtpCode(cleaned);
                    setErrorMessage(null);
                    if (cleaned.length === 6) {
                      executeVerifyOtp(cleaned);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus={true}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                />

                {/* 6 Visual OTP Cells */}
                <TouchableOpacity
                  style={styles.otpCellsRow}
                  activeOpacity={1}
                  onPress={() => otpInputRef.current?.focus()}
                >
                  {Array.from({ length: 6 }).map((_, index) => {
                    const char = otpCode[index] || '';
                    const isActive = isInputFocused && index === otpCode.length;
                    const isFilled = index < otpCode.length;

                    return (
                      <View
                        key={index}
                        style={[
                          styles.otpCell,
                          isFilled && styles.otpCellFilled,
                          isActive && styles.otpCellActive,
                          errorMessage && styles.otpCellError,
                        ]}
                      >
                        {char ? (
                          <Text style={styles.otpCellText}>{char}</Text>
                        ) : isActive ? (
                          <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]} />
                        ) : null}
                      </View>
                    );
                  })}
                </TouchableOpacity>

                {/* Tasdiqlash tugmasi */}
                <TouchableOpacity
                  style={[styles.ctaButton, { marginTop: 20 }]}
                  onPress={() => executeVerifyOtp(otpCode)}
                  disabled={loading || otpCode.length < 6}
                  activeOpacity={0.88}
                >
                  <SafeGradient
                    colors={otpCode.length === 6 ? ['#059669', '#10B981'] : ['#334155', '#1E293B']}
                    style={styles.ctaGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.ctaText}>Tasdiqlash</Text>
                    )}
                  </SafeGradient>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ── REGISTER STEP ── */}
            {step === 'register' && (
              <View style={{ gap: 12 }}>
                <Text style={styles.otpHeader}>Profil ma'lumotlari</Text>
                <Text style={styles.otpSubheader}>Ism, familiya va telefon raqamingiz</Text>

                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ismingiz"
                    placeholderTextColor="#64748B"
                    value={regFirstName}
                    onChangeText={setRegFirstName}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Familiyangiz"
                    placeholderTextColor="#64748B"
                    value={regLastName}
                    onChangeText={setRegLastName}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="+998"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                    value={regPhone}
                    onChangeText={setRegPhone}
                  />
                </View>

                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={handleCompleteRegistration}
                  disabled={loading}
                  activeOpacity={0.88}
                >
                  <SafeGradient
                    colors={['#059669', '#10B981']}
                    style={styles.ctaGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.ctaText}>Yakunlash</Text>
                    )}
                  </SafeGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Error box */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <Feather name="alert-octagon" size={15} color="#F87171" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
          </SafeGradient>
        </View>

        {/* Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>Xavfsiz Telegram OTP avtorizatsiyasi</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // ── Welcome Screen (Enriched) ────────────────────────────────
  fullScreen: {
    flex: 1,
    backgroundColor: '#061C14',
  },

  // Stadium pitch geometry layers
  pitchGlowTopRight: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(16, 185, 129, 0.09)',
  },
  pitchGlowBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(5, 150, 105, 0.07)',
  },
  pitchCenterCircle: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: (width * 0.85) / 2,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.07)',
    backgroundColor: 'transparent',
  },
  pitchHalfLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  pitchCornerArcTL: {
    position: 'absolute',
    top: -36,
    left: -36,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
    backgroundColor: 'transparent',
  },
  pitchCornerArcBR: {
    position: 'absolute',
    bottom: -36,
    right: -36,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
    backgroundColor: 'transparent',
  },

  // Main layout — space-between
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 0,
  },
  welcomeTopSpacer: {
    height: 60,
  },
  welcomeHeroBlock: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  // Logo aura — animated outer glow ring
  welcomeLogoAura: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    alignSelf: 'center',
  },
  welcomeLogoContainer: {
    width: 114,
    height: 114,
    borderRadius: 36,
    padding: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    marginBottom: 26,
    shadowColor: '#10B981',
    shadowOpacity: 0.6,
    shadowRadius: 36,
    elevation: 14,
  },
  welcomeLogoGradient: {
    flex: 1,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeLogoChar: {
    fontSize: 60,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
  },

  // Brand text
  welcomeBrandTitle: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#F8FAFC',
    marginBottom: 6,
  },
  welcomeBrandAccent: {
    color: '#10B981',
  },
  welcomeTagline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    color: '#475569',
    marginBottom: 28,
  },

  // Live pulse chips
  welcomeChipRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  welcomeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    gap: 6,
  },
  welcomeChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  welcomeChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },

  // Bottom action block
  welcomeBottomBlock: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 40,
  },
  startButton: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 10,
    marginBottom: 16,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 19,
    gap: 10,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  staffShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    marginBottom: 8,
  },
  staffShortcutText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },

  // Trust badge (footer o'rnida)
  welcomeTrustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  welcomeTrustText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '500',
  },
  welcomeTrustDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#334155',
    marginHorizontal: 2,
  },

  // ── Login / OTP / Register Screens ──────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 52,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
  },
  circularBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  logoOuter: {
    width: 72,
    height: 72,
    borderRadius: 22,
    padding: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    marginBottom: 14,
    shadowColor: '#10B981',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  logoGradient: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoChar: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#F8FAFC',
  },
  brandAccent: {
    color: '#10B981',
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#475569',
    marginTop: 4,
  },
  cardWrapper: {
    width: Math.min(400, width - 40),
  },
  linearCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 6,
  },
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 11,
  },
  modeTabActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  modeTabText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
  },

  // ── OTP specific ─────────────────────────────────────────────
  otpHeader: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  otpSubheader: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  // Telegram qayta ochish — neon outlined button
  reopenTelegramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    marginBottom: 20,
  },
  reopenTelegramText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0.01,
    width: 1,
    height: 1,
  },
  otpCellsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpCell: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellFilled: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  otpCellActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    shadowColor: '#10B981',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  otpCellError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
  },
  otpCellText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
  },
  cursor: {
    width: 2,
    height: 22,
    backgroundColor: '#10B981',
    borderRadius: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#334155',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
