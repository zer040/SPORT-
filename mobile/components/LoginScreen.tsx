import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Api } from '../services/api';
import { CyberPitch3D } from './CyberPitch3D';

const { width } = Dimensions.get('window');

interface LoginScreenProps {
  onLoginSuccess: (authData: any) => void;
  onSkipDev: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onSkipDev }) => {
  const [step, setStep] = useState<'welcome' | 'otp' | 'register'>('welcome');
  
  // Telegram Auth state
  const BOT_USERNAME = 'sport_plus_uz_bot';
  const [tgAuthToken, setTgAuthToken] = useState<string | null>(null);
  const [tgBotUsername, setTgBotUsername] = useState<string>(BOT_USERNAME);
  
  // Registration state for new users
  const [pendingTelegramId, setPendingTelegramId] = useState<number | null>(null);
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPhone, setRegPhone] = useState('+998');
  
  // OTP input state (Single master controller with full paste support)
  const [otpCode, setOtpCode] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const otpInputRef = useRef<TextInput>(null);
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Blinking neon cursor animation (pinput-style)
  useEffect(() => {
    const cursorAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    cursorAnim.start();
    return () => cursorAnim.stop();
  }, [cursorOpacity]);

  // Focus input automatically when stepping into 'otp'
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    }
  }, [step]);

  // Sinussimon qaltirash (Shake) va xatolik animatsiyasi
  const triggerError = (message: string) => {
    setHasError(true);
    setErrorMsg(message);
    setLoading(false);

    // Haptic feedback (telefon yoki veb vibratsiyasi)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch {}
    }

    // Sinussimon so'nuvchi gorizontal silkinish
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  // Background Ambient Glow Pulse Animation
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

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

  // Telegram orqali kirish (Yagona asosiy CTA)
  const handleTelegramLogin = async () => {
    setLoading(true);
    setHasError(false);
    setErrorMsg(null);
    try {
      const sessionId = Math.random().toString(36).substring(2, 10);
      const deepLink = `tg://resolve?domain=${BOT_USERNAME}&start=auth_${sessionId}`;
      const webLink = `https://t.me/${BOT_USERNAME}?start=auth_${sessionId}`;
      
      setStep('otp');

      try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
          await Linking.openURL(deepLink);
        } else {
          await Linking.openURL(webLink);
        }
      } catch {
        await Linking.openURL(webLink);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Telegramga ulanishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // Sinov / Dev: Telegram botdan kodni avto-olish
  const handleAutoFillTestCode = async () => {
    setSimulating(true);
    setHasError(false);
    setErrorMsg(null);
    try {
      const res = await Api.simulateTelegramStart('direct_session', 991827364, 'Alisher');
      if (res.code) {
        const code = res.code.slice(0, 6);
        setOtpCode(code);
        if (code.length === 6) {
          executeVerifyOtp(code);
        }
      }
    } catch (err: any) {
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpCode(randomCode);
      executeVerifyOtp(randomCode);
    } finally {
      setSimulating(false);
    }
  };

  // OTP tekshirish mantiqi (avtomatik yoki tugma orqali)
  const executeVerifyOtp = async (code: string) => {
    if (code.length < 6) return;

    setLoading(true);
    setHasError(false);
    setErrorMsg(null);

    // Haptic zarba
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([30, 40, 30]);
      } catch {}
    }

    try {
      const res = await Api.verifyDirectTelegramOtp(code);
      if (res.status === 'NEW_USER' || res.status === 'REQUIRES_REGISTRATION') {
        setPendingTelegramId(res.telegram_id || 991827364);
        setStep('register');
      } else if (
        (res.status === 'EXISTING_USER' || res.status === 'SUCCESS') &&
        res.access_token
      ) {
        onLoginSuccess({
          access_token: res.access_token,
          refresh_token: res.refresh_token,
          user: res.user,
          show_welcome_back: res.show_welcome_back ?? true,
          is_first_login: false,
        });
      } else {
        triggerError(res.message || 'Kod eskirgan yoki noto‘g‘ri kiritilgan');
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('fetch') || err.message.includes('Network'))) {
        triggerError('Backend serveri (localhost:8000) bilan aloqa yo‘q.');
      } else {
        triggerError(err.message || 'Kod eskirgan yoki noto‘g‘ri kiritilgan');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    if (otpCode.length < 6) {
      triggerError('6 xonali kodni to‘liq kiriting');
      return;
    }
    executeVerifyOtp(otpCode);
  };

  // Yangi foydalanuvchini ro'yxatdan o'tkazish
  const handleCompleteRegistration = async () => {
    if (!regFirstName.trim()) {
      setErrorMsg('Iltimos, ismingizni kiriting');
      return;
    }
    if (!regPhone.trim() || regPhone.length < 9) {
      setErrorMsg('To\'g\'ri telefon raqam kiriting');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
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
      setErrorMsg(err.message || 'Ro\'yxatdan o\'tishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };


  // Interpolated animation values
  const glowScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.14],
  });

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.85],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* ─── 1. AMBIENT GLOW MOTION (Orqa fondagi neon shar) ─── */}
      <Animated.View
        style={[
          styles.ambientGlowContainer,
          {
            transform: [{ scale: glowScale }],
            opacity: glowOpacity,
          },
        ]}
      >
        <View style={styles.glowTurf} />
        <View style={styles.glowBlue} />
      </Animated.View>

      {/* ─── 2. ASOSIY MINIMALISTIK KONTENT ───────────────────── */}
      <View style={styles.contentWrapper}>
        <View style={styles.topSpacer} />

        {step === 'welcome' ? (
          /* ─── WELCOME STATE ─── */
          <View style={styles.centerSection}>
            {/* Minimal Logo Badge */}
            <View style={styles.brandBadge}>
              <Ionicons name="football" size={16} color={THEME.colors.primary} />
              <Text style={styles.brandBadgeText}>SPORT+</Text>
            </View>

            {/* 3D Isometric Cyber Football Pitch */}
            <CyberPitch3D />

            {/* Qisqa va Kuchli Shior */}
            <Text style={styles.heroTitle}>
              Maydonlar{'\n'}bir bosishda.
            </Text>
          </View>
        ) : step === 'otp' ? (
          /* ─── OTP STATE (Sleek 6-digit verification with pinput feel) ─── */
          <View style={styles.centerSection}>
            <View style={styles.brandBadge}>
              <Ionicons name="paper-plane" size={14} color="#2AABEE" />
              <Text style={[styles.brandBadgeText, { color: '#2AABEE' }]}>TELEGRAM KODI</Text>
            </View>

            <Text style={styles.otpTitle}>Tasdiqlash kodi</Text>
            <Text style={styles.otpSubtitle}>
              Telegram botdan kelgan 6 xonali kod
            </Text>

            {/* Qaltirash (Shake) bilan o'ralgan 6 xonali PIN kataklari */}
            <Animated.View
              style={[
                styles.otpInputWrapper,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              {/* Invisible master input capturing keyboard, paste & backspace */}
              <TextInput
                ref={otpInputRef}
                style={styles.hiddenMasterInput}
                value={otpCode}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, '').slice(0, 6);
                  setOtpCode(cleaned);

                  // Yangi raqam kiritilganda xatolikni avtomatik tozalash
                  if (hasError) {
                    setHasError(false);
                    setErrorMsg(null);
                  }

                  if (cleaned.length > 0 && typeof navigator !== 'undefined' && navigator.vibrate) {
                    try { navigator.vibrate([15]); } catch {}
                  }

                  // 6-raqam kiritilishi bilan avtomatik tasdiqlash
                  if (cleaned.length === 6) {
                    executeVerifyOtp(cleaned);
                  }
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus={true}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                caretHidden={true}
              />

              {/* 6 Visual Boxes (Hech qanday keraksiz nuqtalarsiz, sof minimalizm) */}
              <TouchableOpacity
                style={styles.otpBoxesRow}
                activeOpacity={1}
                onPress={() => otpInputRef.current?.focus()}
              >
                {Array.from({ length: 6 }).map((_, index) => {
                  const char = otpCode[index] || '';
                  const isCurrentActive = isInputFocused && index === otpCode.length && !hasError;
                  const isFilled = index < otpCode.length;

                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        isFilled ? styles.otpBoxFilled : null,
                        isCurrentActive ? styles.otpBoxFocused : null,
                        hasError ? styles.otpBoxError : null,
                      ]}
                    >
                      {char ? (
                        <Text style={[styles.otpDigitText, hasError && styles.otpDigitTextError]}>
                          {char}
                        </Text>
                      ) : isCurrentActive ? (
                        <Animated.View style={[styles.cursorBar, { opacity: cursorOpacity }]} />
                      ) : null}
                    </View>
                  );
                })}
              </TouchableOpacity>
            </Animated.View>

            {/* Xatolik xabari (Pill ko'rinishida) */}
            {hasError && errorMsg ? (
              <View style={styles.errorPill}>
                <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.errorPillText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Telegram botga o'tish tugmasi */}
            <TouchableOpacity
              style={styles.tgBotPillBtn}
              onPress={() => Linking.openURL(`https://t.me/${BOT_USERNAME}?start=login`)}
              activeOpacity={0.7}
            >
              <Ionicons name="send" size={14} color="#38BDF8" />
              <Text style={styles.tgBotPillText}>Telegram botga o‘tish</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ─── REGISTRATION STATE (New user profile) ─── */
          <View style={styles.centerSection}>
            <View style={styles.brandBadge}>
              <Ionicons name="person-add" size={14} color={THEME.colors.primary} />
              <Text style={[styles.brandBadgeText, { color: THEME.colors.primary }]}>RO'YXATDAN O'TISH</Text>
            </View>

            <Text style={styles.otpTitle}>Profilingiz</Text>
            <Text style={styles.otpSubtitle}>
              Ilovada ko'rinadigan ma'lumotlaringizni kiriting
            </Text>

            <View style={styles.regInputContainer}>
              <TextInput
                style={styles.regInput}
                placeholder="Ismingiz (masalan, Alisher)"
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                value={regFirstName}
                onChangeText={setRegFirstName}
              />
              <TextInput
                style={styles.regInput}
                placeholder="Familiyangiz (masalan, Karimov)"
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                value={regLastName}
                onChangeText={setRegLastName}
              />
              <TextInput
                style={styles.regInput}
                placeholder="Telefon (+998901234567)"
                placeholderTextColor="rgba(255, 255, 255, 0.35)"
                keyboardType="phone-pad"
                value={regPhone}
                onChangeText={setRegPhone}
              />
            </View>
          </View>
        )}

        {errorMsg && step !== 'otp' && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={15} color={THEME.colors.danger} />
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />

        {/* ─── 3. ACTIONS ───────────────────────────────────────── */}
        <View style={styles.actionsContainer}>
          {step === 'welcome' ? (
            /* Yagona Asosiy Tugma (Log In CTA) */
            <TouchableOpacity
              style={styles.primaryLoginBtn}
              onPress={handleTelegramLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryLoginBtnText}>Log In</Text>
                </>
              )}
            </TouchableOpacity>
          ) : step === 'otp' ? (
            /* Confirm Button */
            <TouchableOpacity
              style={styles.primaryConfirmBtn}
              onPress={handleVerifyOtp}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#090D16" />
              ) : (
                <>
                  <Text style={styles.primaryConfirmBtnText}>Kirishni Tasdiqlash</Text>
                  <Ionicons name="arrow-forward" size={18} color="#090D16" />
                </>
              )}
            </TouchableOpacity>
          ) : (
            /* Complete Registration Button */
            <TouchableOpacity
              style={styles.primaryConfirmBtn}
              onPress={handleCompleteRegistration}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#090D16" />
              ) : (
                <>
                  <Text style={styles.primaryConfirmBtnText}>Ro'yxatdan o'tishni yakunlash</Text>
                  <Ionicons name="checkmark-circle" size={18} color="#090D16" />
                </>
              )}
            </TouchableOpacity>
          )}

          {/* ─── 4. KICHIK NOZIK TEST TUGMASI (Faqat dev uchun) ─── */}
          {step === 'welcome' ? (
            <TouchableOpacity
              style={styles.devGhostBtn}
              onPress={onSkipDev}
              activeOpacity={0.65}
            >
              <Text style={styles.devGhostBtnText}>⚡ Sinov rejimida kirish</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.devGhostBtn}
              onPress={() => {
                setStep('welcome');
                setOtpCode('');
                setHasError(false);
                setErrorMsg(null);
              }}
              activeOpacity={0.65}
            >
              <Text style={styles.devGhostBtnText}>← Boshqa usul / Orqaga</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    position: 'relative',
    overflow: 'hidden',
  },

  /* Ambient Glow Motion Circle */
  ambientGlowContainer: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  glowTurf: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 80,
    elevation: 20,
  },
  glowBlue: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(2, 132, 199, 0.16)',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 100,
    elevation: 25,
  },

  contentWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topSpacer: {
    flex: 0.6,
  },
  bottomSpacer: {
    flex: 0.6,
  },

  centerSection: {
    alignItems: 'center',
  },

  /* Minimal Logo Badge */
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 6,
    gap: 8,
  },
  brandBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },

  /* Clean Bold Typography */
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginTop: 8,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 270,
  },

  /* OTP Elements */
  otpTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  otpSubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 26,
    maxWidth: 290,
    lineHeight: 20,
  },

  /* Single Controller Wrapper */
  otpInputWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  hiddenMasterInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    zIndex: 10,
    color: 'transparent',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  otpBox: {
    width: 48,
    height: 58,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(0, 255, 135, 0.4)',
    borderWidth: 1,
  },
  otpBoxFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: '#00FF87',
    borderWidth: 1.5,
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  otpBoxError: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  otpDigitText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  otpDigitTextError: {
    color: '#EF4444',
  },
  cursorBar: {
    width: 2,
    height: 24,
    backgroundColor: '#00FF87',
    borderRadius: 1,
  },

  /* Error Pill */
  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 14,
    marginBottom: 4,
    maxWidth: '92%',
  },
  errorPillText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Telegram Bot Pill Button */
  tgBotPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.18)',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 20,
  },
  tgBotPillText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '600',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 10,
    alignSelf: 'center',
  },
  errorBannerText: {
    color: THEME.colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },

  /* Actions Container */
  actionsContainer: {
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    alignItems: 'center',
    width: '100%',
  },

  /* Yagona Asosiy Tugma (Log In CTA) */
  primaryLoginBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#0284C7',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 14,
  },
  primaryLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* Confirm Button for OTP */
  primaryConfirmBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#00FF87',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  primaryConfirmBtnText: {
    color: '#090D16',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  /* Kichik Nozik Test Tugmasi */
  devGhostBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devGhostBtnText: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 13,
    fontWeight: '500',
  },

  /* Registration input fields */
  regInputContainer: {
    width: '100%',
    marginTop: 14,
    gap: 10,
  },
  regInput: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
  },
});
