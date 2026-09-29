import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from './constants/theme';
import { Api, BASE_URL } from './services/api';
import { Header } from './components/Header';
import { BottomNav, TabKey } from './components/BottomNav';
import { VenueCard } from './components/VenueCard';
import { SoloMatchCard } from './components/SoloMatchCard';
import { SlotPickerModal } from './components/SlotPickerModal';
import { LoginScreen } from './components/LoginScreen';
import { RadarScanner } from './components/RadarScanner';
import { OwnerDashboard } from './components/OwnerDashboard';
import { WelcomeBackModal } from './components/WelcomeBackModal';
import { SpotlightWalkthrough } from './components/SpotlightWalkthrough';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabKey>('venues');

  // Auth Guard State: Persisted in localStorage for web, state in React Native
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('sportplus_token');
    }
    return null;
  });
  const [user, setUser] = useState<any | null>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('sportplus_user');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const getUserDisplayName = (u: any) => {
    if (!u) return 'Foydalanuvchi';
    if (u.full_name && typeof u.full_name === 'string' && u.full_name.trim()) {
      return u.full_name.trim();
    }
    const combined = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    if (combined) return combined;
    return 'Foydalanuvchi';
  };

  const getUserAvatarLetter = (u: any) => {
    const name = getUserDisplayName(u);
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  // User Onboarding & Welcome State
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('has_completed_tutorial') === 'true';
    }
    return false;
  });



  // Venues & Pitches
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  const [slotModalVisible, setSlotModalVisible] = useState(false);

  // Solo Play Matches
  const [matches, setMatches] = useState<any[]>([]);
  const [isLooking, setIsLooking] = useState(true);
  const [radarLoading, setRadarLoading] = useState(false);

  // Bookings
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [activeHeldBooking, setActiveHeldBooking] = useState<any | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(600);

  // UI state
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    loadInitialData();
  }, []);

  // 10-minute countdown timer for HELD bookings
  useEffect(() => {
    let interval: any;
    if (activeHeldBooking && countdownSeconds > 0) {
      interval = setInterval(() => {
        setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeHeldBooking, countdownSeconds]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [vData, mData] = await Promise.allSettled([
        Api.getVenues(41.2858, 69.2163, 20),
        Api.getMatches(41.2858, 69.2163, 25),
      ]);

      if (vData.status === 'fulfilled') setVenues(vData.value);
      if (mData.status === 'fulfilled') setMatches(mData.value);

      if (token) {
        try {
          const freshUser = await Api.getMe(token);
          if (freshUser && freshUser.full_name) {
            setUser((prev: any) => {
              const updated = { ...prev, ...freshUser };
              if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem('sportplus_user', JSON.stringify(updated));
              }
              return updated;
            });
          }
        } catch {
          // Token eskirgan yoki offline
        }
      }
    } catch (err) {
      console.warn('Initial load warning:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInitialData();
  };

  const handleLoginSuccess = (authData: any) => {
    const rawUser = authData.user || {};
    const computedFullName = rawUser.full_name || `${rawUser.first_name || ''} ${rawUser.last_name || ''}`.trim() || 'Foydalanuvchi';
    const formattedUser = {
      ...rawUser,
      full_name: computedFullName,
      first_name: rawUser.first_name || computedFullName.split(' ')[0] || '',
      last_name: rawUser.last_name || computedFullName.split(' ').slice(1).join(' ') || '',
      phone_number: rawUser.phone_number || '',
    };

    setToken(authData.access_token);
    setUser(formattedUser);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('sportplus_token', authData.access_token);
        window.localStorage.setItem('sportplus_user', JSON.stringify(formattedUser));
      } catch {}
    }

    const isFirst = Boolean(authData.is_first_login);
    const hasSeenTutorial = typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem('has_completed_tutorial') === 'true'
      : tutorialCompleted;

    if (isFirst && !hasSeenTutorial) {
      setShowTutorial(true);
    } else if (authData.show_welcome_back ?? true) {
      setShowWelcomeBack(true);
    }
  };

  const handleFinishTutorial = () => {
    setShowTutorial(false);
    setTutorialCompleted(true);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('has_completed_tutorial', 'true');
    }
  };

  const handleSkipDev = () => {
    const devUser = {
      id: 'ac568e53-8dd6-421f-ae60-754e87371335',
      phone_number: '+998901234567',
      full_name: 'Alisher Karimov',
      first_name: 'Alisher',
      last_name: 'Karimov',
      role: 'player',
      rating: 4.9,
    };
    setToken('dev-demo-token');
    setUser(devUser);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('sportplus_token', 'dev-demo-token');
        window.localStorage.setItem('sportplus_user', JSON.stringify(devUser));
      } catch {}
    }
    setShowWelcomeBack(true);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setActiveHeldBooking(null);
    setCurrentTab('venues');
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('sportplus_token');
        window.localStorage.removeItem('sportplus_user');
      } catch {}
    }
  };


  const handleVenueSelect = (venue: any) => {
    setSelectedVenue(venue);
    setSlotModalVisible(true);
  };

  const handleBookingSuccess = (bookingData: any) => {
    setActiveHeldBooking(bookingData);
    setCountdownSeconds(600);
    setMyBookings((prev) => [bookingData, ...prev]);
    setCurrentTab('bookings');
  };

  const handleJoinMatch = async (match: any) => {
    if (!token) {
      Alert.alert('Kirish talab etiladi', 'O\'yinga qo\'shilish uchun avval tizimga kiring.');
      return;
    }
    try {
      await Api.joinMatch(match.id, 'FORWARD', token);
      Alert.alert('Muvaffaqiyatli!', "O'yinga qo'shildingiz. Escrow ulushi band qilindi.");
      loadInitialData();
    } catch (err: any) {
      Alert.alert('Qo\'shilishda xatolik', err.message || 'Xatolik yuz berdi');
    }
  };

  const handleToggleRadar = async () => {
    setRadarLoading(true);
    const nextState = !isLooking;
    setIsLooking(nextState);
    try {
      if (token) {
        await Api.toggleLookingForGame(nextState, 41.2858, 69.2163, token);
      }
    } catch (err) {
      console.warn('Radar toggle error:', err);
    } finally {
      setRadarLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ─── AUTH GUARD: If not logged in, show LoginScreen first! ───
  if (!token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />
        <LoginScreen onLoginSuccess={handleLoginSuccess} onSkipDev={handleSkipDev} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />

      {/* Header with User Karma & Avatar */}
      <Header
        user={user}
        reliabilityScore={98.5}
        onProfilePress={() => setCurrentTab('profile')}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />}
      >
        {/* ─── TAB 1: VENUES ─────────────────────────────── */}
        {currentTab === 'venues' && (
          <View>
            <View style={styles.tabHero}>
              <Text style={styles.heroTitle}>Futbol Maydonlari</Text>
              <Text style={styles.heroSubtitle}>Toshkent va Jizzax bo'yicha jonli band qilish</Text>
            </View>

            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              {[
                { id: 'ALL', label: 'Barchasi' },
                { id: '7x7', label: '7x7 Asosiy' },
                { id: '5x5', label: '5x5 Mini' },
                { id: 'INDOOR', label: 'Yopiq (Indoor)' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterPill, filterType === f.id && styles.activeFilterPill]}
                  onPress={() => setFilterType(f.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterPillText, filterType === f.id && styles.activeFilterText]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading ? (
              <ActivityIndicator color={THEME.colors.primary} style={{ marginTop: 40 }} />
            ) : venues.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={32} color={THEME.colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyTitle}>Maydonlar topilmadi</Text>
                <Text style={styles.emptySubtitle}>Backend va PostGIS bilan aloqa tekshirilmoqda...</Text>
              </View>
            ) : (
              venues.map((v) => <VenueCard key={v.id} venue={v} onSelect={handleVenueSelect} />)
            )}
          </View>
        )}

        {/* ─── TAB 2: SOLO PLAY ──────────────────────────── */}
        {currentTab === 'solo' && (
          <View>
            <View style={styles.tabHero}>
              <Text style={styles.heroTitle}>Solo Play & Matchmaking</Text>
              <Text style={styles.heroSubtitle}>Yakka o'yinchilar va ochiq tarkiblar ligasi</Text>
            </View>

            <RadarScanner
              isLooking={isLooking}
              nearbyCount={4}
              loading={radarLoading}
              onToggle={handleToggleRadar}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Faol O'yinlar (Lobby)</Text>
              <Text style={styles.sectionCount}>{matches.length} ta o'yin mavjud</Text>
            </View>

            {matches.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="football-outline" size={36} color={THEME.colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyTitle}>Hozircha ochiq o'yin yo'q</Text>
                <Text style={styles.emptySubtitle}>Siz o'zingiz birinchi bo'lib match yaratishingiz mumkin!</Text>
              </View>
            ) : (
              matches.map((m) => <SoloMatchCard key={m.id} match={m} onJoin={handleJoinMatch} />)
            )}
          </View>
        )}

        {/* ─── TAB 3: BOOKINGS & PASS ─────────────────────── */}
        {currentTab === 'bookings' && (
          <View>
            <View style={styles.tabHero}>
              <Text style={styles.heroTitle}>Mening Bronlarim</Text>
              <Text style={styles.heroSubtitle}>Match Pass va faol band qilingan slotlar</Text>
            </View>

            {/* Active HELD Booking with 10-min Countdown */}
            {activeHeldBooking && (
              <View style={styles.heldCard}>
                <View style={styles.heldHeader}>
                  <View style={styles.heldBadge}>
                    <Ionicons name="lock-closed" size={11} color="#fff" />
                    <Text style={styles.heldBadgeText}>HELD — TO'LOV KUTILMOQDA</Text>
                  </View>
                  <View style={styles.countdownRow}>
                    <Ionicons name="timer-outline" size={15} color={THEME.colors.danger} />
                    <Text style={styles.countdownText}>{formatTimer(countdownSeconds)}</Text>
                  </View>
                </View>

                <Text style={styles.heldVenue}>{activeHeldBooking.venue?.name || 'Bunyodkor Arena'}</Text>
                <Text style={styles.heldDetails}>
                  {activeHeldBooking.pitch?.name || 'Maydon A (7x7)'} • Bugun, 18:00 - 19:00
                </Text>

                <View style={styles.heldPriceRow}>
                  <Text style={styles.heldPriceLabel}>To'lov summasi:</Text>
                  <Text style={styles.heldPriceValue}>
                    {Number(activeHeldBooking.total_price || 250000).toLocaleString()} UZS
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.payNowBtn}
                  onPress={() => Alert.alert('Click / Payme', 'To\'lov tizimiga yo\'naltirilmoqda...')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="card-outline" size={17} color={THEME.colors.textDark} />
                  <Text style={styles.payNowBtnText}>To'lash (Click / Payme)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Digital Match Pass (Ticket) */}
            {myBookings.length > 0 ? (
              myBookings.map((b, idx) => (
                <View key={b.id || idx} style={styles.passCard}>
                  <View style={styles.passTop}>
                    <View style={styles.passBrandBadge}>
                      <Ionicons name="football" size={14} color={THEME.colors.primary} />
                      <Text style={styles.passSportLogo}>SPORT+ MATCH PASS</Text>
                    </View>
                    <View style={styles.confirmedBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={THEME.colors.primary} />
                      <Text style={styles.passStatusBadge}>
                        {b.status === 'HELD' ? "TO'LOV KUTILMOQDA" : "TASDIQLANGAN"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.passTitle}>{b.venue?.name || 'Bunyodkor Arena'} • {b.pitch?.name || 'Maydon'}</Text>
                  <Text style={styles.passMeta}>
                    Kafolat to'lovi: {Number(b.service_fee || 10000).toLocaleString()} UZS (To'langan)
                  </Text>
                  <Text style={styles.passMeta}>
                    Qoldiq (maydonda): {Number(b.remaining_at_venue || 190000).toLocaleString()} UZS
                  </Text>

                  <View style={styles.qrMock}>
                    <Ionicons name="qr-code-outline" size={44} color={THEME.colors.primary} style={{ marginBottom: 6 }} />
                    <Text style={styles.qrCodeText}>{b.qr_pass || 'SP-PASS-2026-9481'}</Text>
                    <Text style={styles.qrSub}>Maydonga kirishda administratorga ko'rsating</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.passCard}>
                <View style={styles.passTop}>
                  <View style={styles.passBrandBadge}>
                    <Ionicons name="football" size={14} color={THEME.colors.primary} />
                    <Text style={styles.passSportLogo}>SPORT+ MATCH PASS</Text>
                  </View>
                  <View style={styles.confirmedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={THEME.colors.primary} />
                    <Text style={styles.passStatusBadge}>NAMUNA CHIPTA</Text>
                  </View>
                </View>

                <Text style={styles.passTitle}>Bunyodkor Arena • 7x7 Asosiy</Text>
                <Text style={styles.passMeta}>Sana: Bugun | Vaqt: 20:00 - 21:00</Text>

                <View style={styles.qrMock}>
                  <Ionicons name="qr-code-outline" size={44} color={THEME.colors.primary} style={{ marginBottom: 6 }} />
                  <Text style={styles.qrCodeText}>SP-PASS-2026-DEMO</Text>
                  <Text style={styles.qrSub}>Maydonni bron qiling va haqiqiy QR chiptaga ega bo'ling</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ─── TAB 4: PROFILE & KARMA ────────────────────── */}
        {currentTab === 'profile' && (
          <View>
            <View style={styles.profileHeaderCard}>
              <View style={styles.profileAvatarLarge}>
                <Text style={styles.avatarLargeText}>
                  {getUserAvatarLetter(user)}
                </Text>
              </View>
              <Text style={styles.profileName}>{getUserDisplayName(user)}</Text>
              <Text style={styles.profilePhone}>{user?.phone_number || 'Telefon kiritilmagan'}</Text>

              {/* Ism & Familiya Tafsilotlari */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {user?.first_name ? (
                  <View style={{ backgroundColor: 'rgba(0, 255, 135, 0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 255, 135, 0.3)' }}>
                    <Text style={{ color: THEME.colors.primary, fontSize: 12, fontWeight: '700' }}>Ism: {user.first_name}</Text>
                  </View>
                ) : null}
                {user?.last_name ? (
                  <View style={{ backgroundColor: 'rgba(0, 240, 255, 0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 240, 255, 0.3)' }}>
                    <Text style={{ color: THEME.colors.accent, fontSize: 12, fontWeight: '700' }}>Familiya: {user.last_name}</Text>
                  </View>
                ) : null}
                <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }}>
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 12, fontWeight: '700' }}>
                    {user?.role === 'owner' ? '👑 Maydon Egasi' : '⚽ O\'yinchi'}
                  </Text>
                </View>
              </View>


              <View style={styles.karmaBox}>
                <Ionicons name="shield-checkmark" size={24} color={THEME.colors.accent} style={{ marginBottom: 4 }} />
                <Text style={styles.karmaLabel}>Ishonchlilik Reytingi (Reliability Karma)</Text>
                <Text style={styles.karmaBigScore}>98.5%</Text>
                <Text style={styles.karmaNote}>A'lo darajada — sizga barcha o'yinlarda kafil kerak emas</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>15</Text>
                <Text style={styles.statLabel}>O'yinlar</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>0</Text>
                <Text style={styles.statLabel}>No-Show</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>4.9</Text>
                <Text style={styles.statLabel}>Reyting</Text>
              </View>
            </View>

            {/* Badges Section */}
            <Text style={styles.sectionTitle}>Yutuqlar va Nishonlar (Badges)</Text>
            <View style={styles.badgesRow}>
              {[
                { iconName: 'shield-checkmark' as const, title: 'Temir O\'yinchi', desc: '10+ o\'yin' },
                { iconName: 'trophy' as const, title: 'To\'purar', desc: 'Faol hujumchi' },
                { iconName: 'ribbon' as const, title: 'Halol O\'yin', desc: '100% Karma' },
              ].map((b, i) => (
                <View key={i} style={styles.badgeCard}>
                  <Ionicons name={b.iconName} size={24} color={THEME.colors.primary} style={{ marginBottom: 6 }} />
                  <Text style={styles.badgeCardTitle}>{b.title}</Text>
                  <Text style={styles.badgeCardDesc}>{b.desc}</Text>
                </View>
              ))}
            </View>

            {/* Role Switcher for Test / Demo */}
            <TouchableOpacity
              style={styles.roleSwitchBtn}
              onPress={() => {
                const nextRole = user?.role === 'owner' ? 'player' : 'owner';
                setUser({ ...user, role: nextRole });
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="swap-horizontal" size={16} color={THEME.colors.primary} />
              <Text style={styles.roleSwitchText}>
                {user?.role === 'owner'
                  ? "O'yinchi (Player) rejimiga o'tish"
                  : "Maydon Egasi (Owner) rejimini yoqish"}
              </Text>
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={18} color={THEME.colors.danger} />
              <Text style={styles.logoutText}>Akkountdan chiqish (Logout)</Text>
            </TouchableOpacity>

            {/* Backend URL info */}
            <View style={styles.devCard}>
              <Text style={styles.devLabel}>API Host Connection:</Text>
              <Text style={styles.devValue}>{BASE_URL}</Text>
            </View>
          </View>
        )}

        {/* ─── TAB 5: OWNER / MANAGEMENT ─────────────────── */}
        {currentTab === 'owner' && (
          <OwnerDashboard token={token} user={user} />
        )}
      </ScrollView>

      {/* Floating Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        bookingCount={activeHeldBooking ? 1 : 0}
        isOwner={user?.role === 'owner' || user?.role === 'admin'}
      />

      {/* Modals */}
      <SlotPickerModal
        visible={slotModalVisible}
        venue={selectedVenue}
        token={token}
        onClose={() => setSlotModalVisible(false)}
        onBookingSuccess={handleBookingSuccess}
        onRequireAuth={() => {
          setSlotModalVisible(false);
          handleLogout();
        }}
      />

      {/* Welcome Back Frosted Glass Modal for Existing Users */}
      <WelcomeBackModal
        visible={showWelcomeBack}
        firstName={user?.first_name || user?.full_name?.split(' ')[0] || ''}
        onClose={() => {
          setShowWelcomeBack(false);
          setCurrentTab('venues');
        }}
      />

      {/* Spotlight Walkthrough Interactive Tutorial for First-Time Users */}
      <SpotlightWalkthrough
        visible={showTutorial}
        onFinish={handleFinishTutorial}
      />
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  contentContainer: {
    paddingBottom: 110,
  },
  tabHero: {
    paddingHorizontal: THEME.spacing.md,
    paddingTop: THEME.spacing.md,
    paddingBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  filterRow: {
    paddingHorizontal: THEME.spacing.md,
    marginBottom: 16,
  },
  filterPill: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: THEME.radius.full,
    marginRight: 8,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  activeFilterPill: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  filterPillText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  activeFilterText: {
    color: THEME.colors.textDark,
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    paddingHorizontal: THEME.spacing.md,
    marginTop: 4,
    marginBottom: 8,
  },
  sectionCount: {
    fontSize: 12,
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  emptyState: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  heldCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    marginHorizontal: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginBottom: 16,
  },
  heldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.xs,
  },
  heldBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownText: {
    color: THEME.colors.danger,
    fontSize: 14,
    fontWeight: '900',
  },
  heldVenue: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  heldDetails: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 10,
    marginTop: 2,
  },
  heldPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heldPriceLabel: {
    color: THEME.colors.textMuted,
    fontSize: 12,
  },
  heldPriceValue: {
    color: THEME.colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    paddingVertical: 12,
  },
  payNowBtnText: {
    color: THEME.colors.textDark,
    fontSize: 14,
    fontWeight: '900',
  },
  passCard: {
    backgroundColor: THEME.colors.surface,
    marginHorizontal: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    marginBottom: 16,
  },
  passTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  passBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  passSportLogo: {
    color: THEME.colors.accent,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 135, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.xs,
  },
  passStatusBadge: {
    color: THEME.colors.primary,
    fontWeight: '800',
    fontSize: 10,
  },
  passTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  passMeta: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 14,
  },
  qrMock: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.radius.md,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.2)',
  },
  qrCodeText: {
    color: THEME.colors.primary,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 4,
  },
  qrSub: {
    color: THEME.colors.textMuted,
    fontSize: 11,
  },
  profileHeaderCard: {
    backgroundColor: THEME.colors.surface,
    marginHorizontal: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    marginTop: 10,
    marginBottom: 14,
  },
  profileAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarLargeText: {
    color: THEME.colors.textDark,
    fontSize: 22,
    fontWeight: '900',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  profilePhone: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginBottom: 14,
  },
  karmaBox: {
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
    borderRadius: THEME.radius.md,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.2)',
  },
  karmaLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  karmaBigScore: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.accent,
    marginVertical: 2,
  },
  karmaNote: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: THEME.spacing.md,
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    marginHorizontal: THEME.spacing.md,
    gap: 8,
    marginBottom: 20,
  },
  badgeCard: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  badgeCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  badgeCardDesc: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  roleSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.25)',
    marginHorizontal: THEME.spacing.md,
    paddingVertical: 14,
    borderRadius: THEME.radius.md,
    marginBottom: 12,
  },
  roleSwitchText: {
    color: THEME.colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginHorizontal: THEME.spacing.md,
    paddingVertical: 14,
    borderRadius: THEME.radius.md,
    marginBottom: 16,
  },
  logoutText: {
    color: THEME.colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  devCard: {
    marginHorizontal: THEME.spacing.md,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: THEME.radius.sm,
  },
  devLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  devValue: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
});
