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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Api } from '../services/api';

const { width } = Dimensions.get('window');

interface LoginScreenProps {
  onLoginSuccess: (authData: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
}) => {
  const [step, setStep] = useState<'login' | 'otp' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Telegram Auth state
  const BOT_USERNAME = 'sport_plus_uz_bot';

  // Registration state for new users
  const [pendingTelegramId, setPendingTelegramId] = useState<number | null>(null);
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPhone, setRegPhone] = useState('+998');

  // OTP input state
  const [otpCode, setOtpCode] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const otpInputRef = useRef<TextInput>(null);
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Soft ambient pulse animation
  const ambientPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ambientPulse, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(ambientPulse, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [ambientPulse]);

  // Blinking neon cursor animation for active OTP cell
  useEffect(() => {
    const cursorAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 450,
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

  // Sinusoidal shake animation: sin(value * pi * 8) * 10 per spec
  const triggerError = (message: string) => {
    setHasError(true);
    setErrorMsg(message);
    setLoading(false);

    // Haptic feedback (heavyImpact equivalent)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([60, 40, 60]);
      } catch {}
    }

    // Sinusoidal damped oscillation
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7.5, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7.5, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 35, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
    ]).start();
  };

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

  // Telegram bilan kirish (Primary CTA with deep-link trigger)
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

  // OTP Verification execution
  const executeVerifyOtp = async (code: string) => {
    if (code.length < 6) return;

    setLoading(true);
    setHasError(false);
    setErrorMsg(null);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([25]);
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
      triggerError(err.message || 'Kod eskirgan yoki noto‘g‘ri kiritilgan');
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

  // Complete Registration for NEW_USER
  const handleCompleteRegistration = async () => {
    if (!regFirstName.trim()) {
      setErrorMsg('Ismingizni kiriting');
      return;
    }
    if (!regLastName.trim()) {
      setErrorMsg('Familiyangizni kiriting');
      return;
    }
    if (!regPhone.trim() || regPhone.length < 9) {
      setErrorMsg('Telefon raqamingizni kiriting');
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
      setErrorMsg(err.message || 'Ro‘yxatdan o‘tishda xatolik yuz berdi');
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
      setHasError(false);
      setErrorMsg(null);
    }
  };

  const glowScale = ambientPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.08],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Ambient background soft pastel blurs behind glass */}
      <Animated.View
        style={[
          styles.ambientGlowContainer,
          { transform: [{ scale: glowScale }] },
        ]}
      >
        <View style={styles.glowCyan} />
        <View style={styles.glowEmerald} />
      </Animated.View>

      {/* Top Bar with Minimal Circular Back Button */}
      <View style={styles.topBar}>
        {step !== 'login' ? (
          <TouchableOpacity
            style={styles.circularBackBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#1E232B" />
          </TouchableOpacity>
        ) : (
          <View style={styles.topBarSpacer} />
        )}

        <View style={styles.brandTitleWrap}>
          <Text style={styles.brandTitle}>SPORT+</Text>
        </View>

        <View style={styles.topBarSpacer} />
      </View>

      {/* Center Frosted Glass Card per Spec */}
      <View style={styles.cardContainer}>
        <View style={styles.glassCard}>
          {step === 'login' ? (
            /* 1. GLASSMORPHIC LOGIN VIEW */
            <>
              {/* Clean Header Tab: Log in active, Sign up toggle */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[
                    styles.tabItem,
                    activeTab === 'login' && styles.tabItemActive,
                  ]}
                  onPress={() => setActiveTab('login')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'login' && styles.tabTextActive,
                    ]}
                  >
                    Log in
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabItem,
                    activeTab === 'signup' && styles.tabItemActive,
                  ]}
                  onPress={() => setActiveTab('signup')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'signup' && styles.tabTextActive,
                    ]}
                  >
                    Sign up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Title & Concise Context */}
              <Text style={styles.cardHeading}>
                {activeTab === 'login' ? 'Hisobga kirish' : 'Hisob yaratish'}
              </Text>
              <Text style={styles.cardSubheading}>
                {activeTab === 'login'
                  ? 'Maydonlarni bron qilish va matchmaking'
                  : 'Yangi profil bilan tizimga qo‘shiling'}
              </Text>

              {/* Single prominent dark CTA: Telegram bilan kirish */}
              <TouchableOpacity
                style={styles.primaryDarkCta}
                onPress={handleTelegramLogin}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="paper-plane"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.primaryDarkCtaText}>
                      Telegram bilan {activeTab === 'login' ? 'kirish' : 'boshlash'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : step === 'otp' ? (
            /* 2. KINETIC OTP VERIFICATION VIEW */
            <>
              {/* Header: Crisp title and muted subtitle */}
              <Text style={styles.cardHeading}>Tasdiqlash kodi</Text>
              <Text style={styles.cardSubheading}>
                Telegram botdan kelgan 6 xonali kod
              </Text>

              {/* 6-Cell Pinput Box with Sinusoidal Shake Container */}
              <Animated.View
                style={[
                  styles.otpInputWrapper,
                  { transform: [{ translateX: shakeAnim }] },
                ]}
              >
                <TextInput
                  ref={otpInputRef}
                  style={styles.hiddenMasterInput}
                  value={otpCode}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 6);
                    setOtpCode(cleaned);

                    if (hasError) {
                      setHasError(false);
                      setErrorMsg(null);
                    }

                    if (cleaned.length > 0 && typeof navigator !== 'undefined' && navigator.vibrate) {
                      try {
                        navigator.vibrate([15]);
                      } catch {}
                    }

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

                {/* 6 Visual Cells */}
                <TouchableOpacity
                  style={styles.otpBoxesRow}
                  activeOpacity={1}
                  onPress={() => otpInputRef.current?.focus()}
                >
                  {Array.from({ length: 6 }).map((_, index) => {
                    const char = otpCode[index] || '';
                    const isCurrentActive =
                      isInputFocused && index === otpCode.length && !hasError;
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
                          <Text
                            style={[
                              styles.otpDigitText,
                              hasError && styles.otpDigitTextError,
                            ]}
                          >
                            {char}
                          </Text>
                        ) : isCurrentActive ? (
                          <Animated.View
                            style={[
                              styles.cursorBar,
                              { opacity: cursorOpacity },
                            ]}
                          />
                        ) : null}
                      </View>
                    );
                  })}
                </TouchableOpacity>
              </Animated.View>

              {/* Error Message Pill */}
              {hasError && errorMsg ? (
                <View style={styles.errorPill}>
                  <Ionicons name="alert-circle" size={15} color="#EF4444" />
                  <Text style={styles.errorPillText}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* Single compact helper: Telegram botga o'tish */}
              <TouchableOpacity
                style={styles.helperBtn}
                onPress={() =>
                  Linking.openURL(`https://t.me/${BOT_USERNAME}?start=auth`)
                }
                activeOpacity={0.7}
              >
                <Text style={styles.helperBtnText}>Telegram botga o‘tish</Text>
                <Ionicons name="arrow-forward" size={14} color="#0284C7" />
              </TouchableOpacity>

              {/* Single bottom CTA: Kirishni Tasdiqlash */}
              <TouchableOpacity
                style={styles.primaryDarkCta}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryDarkCtaText}>
                      Kirishni Tasdiqlash
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            /* 3. REGISTRATION VIEW (NEW_USER) */
            <>
              <Text style={styles.cardHeading}>Profilingiz</Text>
              <Text style={styles.cardSubheading}>
                Ism, familiya va telefon raqamingizni kiriting
              </Text>

              <View style={styles.regFieldsWrapper}>
                <TextInput
                  style={styles.regInputField}
                  placeholder="Ismingiz"
                  placeholderTextColor="#94A3B8"
                  value={regFirstName}
                  onChangeText={setRegFirstName}
                />
                <TextInput
                  style={styles.regInputField}
                  placeholder="Familiyangiz"
                  placeholderTextColor="#94A3B8"
                  value={regLastName}
                  onChangeText={setRegLastName}
                />
                <TextInput
                  style={styles.regInputField}
                  placeholder="Telefon raqamingiz (+998)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={regPhone}
                  onChangeText={setRegPhone}
                />
              </View>

              {errorMsg && (
                <View style={styles.errorPill}>
                  <Ionicons name="alert-circle" size={15} color="#EF4444" />
                  <Text style={styles.errorPillText}>{errorMsg}</Text>
                </View>
              )}

              {/* Bottom CTA: Davom etish */}
              <TouchableOpacity
                style={styles.primaryDarkCta}
                onPress={handleCompleteRegistration}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryDarkCtaText}>Davom etish</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    position: 'relative',
    overflow: 'hidden',
  },

  /* Soft Ambient Pastel Glows behind glass */
  ambientGlowContainer: {
    position: 'absolute',
    top: '12%',
    left: '8%',
    right: '8%',
    height: 380,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  glowCyan: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 100,
    elevation: 0,
  },
  glowEmerald: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: 60,
    left: 40,
    backgroundColor: 'rgba(0, 255, 135, 0.10)',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 100,
    elevation: 0,
  },

  /* Top Bar */
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  circularBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  topBarSpacer: {
    width: 40,
    height: 40,
  },
  brandTitleWrap: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E232B',
    letterSpacing: 2,
  },

  /* Card Layout */
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    zIndex: 10,
  },
  /* Frosted Glass Card per Spec */
  glassCard: {
    width: Math.min(380, width - 36),
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 36,
    elevation: 12,
  },

  /* Header Tab: Log in / Sign up */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    borderRadius: 24,
    padding: 4,
    marginBottom: 24,
    width: '100%',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#1E232B',
    fontWeight: '700',
  },

  /* Typography */
  cardHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E232B',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSubheading: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    maxWidth: 260,
  },

  /* Primary Dark Slate CTA per Spec: #1E232B, pill 28px */
  primaryDarkCta: {
    width: '100%',
    height: 56,
    backgroundColor: '#1E232B',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E232B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
    marginTop: 4,
  },
  primaryDarkCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* Ghost Dev Button */
  ghostDevBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  ghostDevBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },

  /* OTP Controller */
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
    width: 46,
    height: 58,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 1,
  },
  otpBoxFilled: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(0, 255, 135, 0.4)',
    borderWidth: 1.5,
  },
  otpBoxFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#00FF87',
    borderWidth: 2,
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
  },
  otpBoxError: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: '#EF4444',
    borderWidth: 2,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  otpDigitText: {
    color: '#1E232B',
    fontSize: 22,
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

  /* Compact Helper Button */
  helperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    marginTop: 12,
    marginBottom: 16,
  },
  helperBtnText: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Error Pill */
  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 10,
  },
  errorPillText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },

  /* Registration Fields */
  regFieldsWrapper: {
    width: '100%',
    gap: 12,
    marginBottom: 18,
  },
  regInputField: {
    width: '100%',
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 16,
    color: '#1E232B',
    fontSize: 14,
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
});
