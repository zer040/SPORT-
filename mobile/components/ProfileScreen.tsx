import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Api } from '../services/api';

interface ProfileScreenProps {
  user?: any;
  token?: string;
  onLogout?: () => void;
  onSwitchToOwner?: () => void;
  onUpdateUser?: (updated: any) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  token,
  onLogout,
  onSwitchToOwner,
  onUpdateUser,
}) => {
  const [role, setRole] = useState<'player' | 'owner' | 'admin'>(
    user?.role?.toLowerCase() === 'owner' ? 'owner'
    : user?.role?.toLowerCase() === 'admin' ? 'admin'
    : 'player'
  );
  const [notifications, setNotifications] = useState(true);

  // ── Credentials modal state ──────────────────────────────
  const [credModalVisible, setCredModalVisible] = useState(false);
  const [credUsername, setCredUsername] = useState(user?.username || '');
  const [credPassword, setCredPassword] = useState('');
  const [credCurrentPassword, setCredCurrentPassword] = useState('');
  const [credPasswordVisible, setCredPasswordVisible] = useState(false);
  const [credSaving, setCredSaving] = useState(false);

  const isStaff = role === 'owner' || role === 'admin';
  const isCredSet = user?.is_credentials_set ?? false;

  const handleSaveCredentials = async () => {
    if (!credUsername.trim() || !credPassword.trim()) {
      Alert.alert('Xatolik', 'Login va parolni toʻliq kiriting');
      return;
    }
    if (credPassword.length < 8) {
      Alert.alert('Xatolik', 'Parol kamida 8 ta belgidan iborat boʻlishi kerak');
      return;
    }
    if (!token) {
      Alert.alert('Xatolik', 'Avval tizimga kiring');
      return;
    }
    setCredSaving(true);
    try {
      const res = await Api.setCredentials(
        {
          username: credUsername.trim().toLowerCase(),
          password: credPassword,
          ...(isCredSet && credCurrentPassword ? { current_password: credCurrentPassword } : {}),
        },
        token
      );
      setCredModalVisible(false);
      onUpdateUser?.({
        ...user,
        username: res.username,
        is_credentials_set: true,
      });
      Alert.alert(
        'Saqlandi!',
        res.message || `Login "${res.username}" muvaffaqiyatli saqlandi.`
      );
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Saqlashda xatolik yuz berdi');
    } finally {
      setCredSaving(false);
    }
  };

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Web yoki haptics quvvatlamaydigan qurilmalar uchun fallback
    }
  };

  const displayName =
    user?.full_name?.trim() ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    'Shohrux Atabullayev';

  const displayPhone = user?.phone_number || '+998 93 768 06 28';
  const avatarLetter = (displayName[0] || 'S').toUpperCase();

  return (
    <>
      <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {/* ========================================================= */}
      {/* 1. HEADER (ROLGA QARAB MOSLASHADI) */}
      {/* ========================================================= */}
      <View style={styles.headerCard}>
        <View style={[styles.avatar, role === 'owner' && styles.ownerAvatar]}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>

        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userPhone}>{displayPhone}</Text>

        {role === 'player' ? (
          <View style={styles.badgePlayer}>
            <Feather name="shield" size={13} color="#059669" />
            <Text style={styles.badgePlayerText}>Yarim himoyachi • 98.5% Karma</Text>
          </View>
        ) : (
          <View style={styles.badgeOwner}>
            <MaterialCommunityIcons name="stadium-variant" size={14} color="#D97706" />
            <Text style={styles.badgeOwnerText}>Maydon Egasi (Hamkor)</Text>
          </View>
        )}
      </View>

      {/* ========================================================= */}
      {/* 2. STATISTIKA BLOKI (ROLGA QARAB FARQ QILADI) */}
      {/* ========================================================= */}
      {role === 'player' ? (
        // O'yinchi Ko'rsatkichlari
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="football-outline" size={18} color="#64748B" />
            <Text style={styles.statNumber}>{user?.total_games || 15}</Text>
            <Text style={styles.statLabel}>O'yinlar</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="close-circle-outline" size={18} color="#64748B" />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>No-Show</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={18} color="#EAB308" />
            <Text style={styles.statNumber}>
              {user?.rating ? Number(user.rating).toFixed(1) : '5.0'}
            </Text>
            <Text style={styles.statLabel}>Reyting</Text>
          </View>
        </View>
      ) : (
        // Maydon Egasi (Biznes) Ko'rsatkichlari
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={18} color="#059669" />
            <Text style={[styles.statNumber, { color: '#059669' }]}>1.2M</Text>
            <Text style={styles.statLabel}>Bugungi tushum</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="pie-chart-outline" size={18} color="#3B82F6" />
            <Text style={styles.statNumber}>85%</Text>
            <Text style={styles.statLabel}>Bandlik</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="soccer-field" size={18} color="#8B5CF6" />
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Maydonlar</Text>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* 3. ASOSIY MENYU GURUHI (ROLGA MOS) */}
      {/* ========================================================= */}
      <View style={styles.menuContainer}>
        {role === 'player' ? (
          // ODDIY O'YINCHI MENYUSI
          <>
            <Pressable
              style={styles.menuRow}
              onPress={() => {
                triggerHaptic();
                Alert.alert(
                  'Sport+ Hamyon',
                  "Hisobingizdagi mablag': 50,000 so'm.\nTez kunda Click/Payme orqali to'ldirish."
                );
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#3B82F6' }]}>
                <Ionicons name="wallet-outline" size={18} color="#FFF" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Mening Hamyonim & Kartalar</Text>
                <Text style={styles.menuSubtitle}>Balans: 50,000 so'm</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.menuRow}
              onPress={() => {
                triggerHaptic();
                Alert.alert('Mening Jamoam', "FC Bunyodkor Havaskor • 12 ta a'zo");
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="people-outline" size={18} color="#FFF" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Mening Jamoam (Squad)</Text>
                <Text style={styles.menuSubtitle}>Do'stlar bilan jamoaviy bron</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>
          </>
        ) : (
          // MAYDON EGASI (OWNER) MENYUSI
          <>
            <Pressable
              style={styles.menuRow}
              onPress={() => {
                triggerHaptic();
                if (onSwitchToOwner) {
                  onSwitchToOwner();
                } else {
                  Alert.alert('Slotlar Jadvali', "Slotlar va tariflar boshqaruvi bo'limi.");
                }
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#059669' }]}>
                <MaterialCommunityIcons name="calendar-clock" size={18} color="#FFF" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Slotlar va Narxlar Jadvali</Text>
                <Text style={styles.menuSubtitle}>Bo'sh vaqtlar va soatlik tariflar</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.menuRow}
              onPress={() => {
                triggerHaptic();
                if (onSwitchToOwner) {
                  onSwitchToOwner();
                } else {
                  Alert.alert('Bronlar Jurnali', "Kutilayotgan va tasdiqlangan o'yinlar ro'yxati.");
                }
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#3B82F6' }]}>
                <MaterialCommunityIcons name="book-open-outline" size={18} color="#FFF" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Bronlar Jurnali</Text>
                <Text style={styles.menuSubtitle}>Kutilayotgan va tasdiqlangan o'yinlar</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.menuRow}
              onPress={() => {
                triggerHaptic();
                Alert.alert(
                  'Kassa & Pul Yechish',
                  "Bugungi tushum: 1,200,000 so'm.\nHisob raqamga o'tkazish tez kunda."
                );
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#D97706' }]}>
                <Ionicons name="card-outline" size={18} color="#FFF" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>Kassa & Pul Yechish</Text>
                <Text style={styles.menuSubtitle}>Hisob raqamga o'tkazish</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </Pressable>
          </>
        )}

        <View style={styles.divider} />

        {/* UMUMIY SOZLAMALAR */}
        <View style={styles.menuRow}>
          <View style={[styles.iconWrap, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="notifications-outline" size={18} color="#FFF" />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuTitle}>Bildirishnomalar</Text>
            <Text style={styles.menuSubtitle}>Telegram va SMS eslatmalar</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={(val) => {
              triggerHaptic();
              setNotifications(val);
            }}
            trackColor={{ true: '#059669', false: '#CBD5E1' }}
          />
        </View>

        <View style={styles.divider} />

        <Pressable
          style={styles.menuRow}
          onPress={() => {
            triggerHaptic();
            Alert.alert('Til sozlamalari', "Ilova tili: O'zbekcha");
          }}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#475569' }]}>
            <Ionicons name="globe-outline" size={18} color="#FFF" />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={styles.menuTitle}>Til sozlamalari</Text>
            <Text style={styles.menuSubtitle}>O'zbekcha</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#94A3B8" />
        </Pressable>
      </View>

      {/* ========================================================= */}
      {/* 4. ROLNI O'ZGARTIRISH / HAMKORLIK HAVOLASI */}
      {/* ========================================================= */}
      {role === 'player' ? (
        <Pressable
          style={styles.becomeOwnerBox}
          onPress={() => {
            triggerHaptic();
            // Test qilish uchun rolni almashtirish (real hayotda ariza berish oynasi ochiladi)
            Alert.alert(
              'Maydon Egasi Rejimi',
              'Siz o‘z maydonlaringizni SPORT+ tizimiga kiritmoqchimisiz?',
              [
                { text: 'Bekor qilish', style: 'cancel' },
                {
                  text: 'Rejimga o‘tish',
                  onPress: () => {
                    setRole('owner');
                  },
                },
              ]
            );
          }}
        >
          <MaterialCommunityIcons name="stadium" size={20} color="#059669" />
          <Text style={styles.becomeOwnerText}>Maydoningiz bormi? Hamkor bo‘ling ↗</Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.switchBackBox}
          onPress={() => {
            triggerHaptic();
            setRole('player');
          }}
        >
          <Ionicons name="swap-horizontal" size={16} color="#64748B" />
          <Text style={styles.switchBackText}>O‘yinchi profiliga qaytish</Text>
        </Pressable>
      )}

      {/* ========================================================= */}
      {/* 4.5: KIRISH KALITLARI (Faqat Owner / Admin uchun) */}
      {/* ========================================================= */}
      {isStaff && (
        <View style={styles.credentialsCard}>
          <View style={styles.credCardHeader}>
            <View style={styles.credIconWrap}>
              <Ionicons name="key" size={16} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.credCardTitle}>Kirish Kalitlari (Login & Parol)</Text>
              <Text style={styles.credCardSub}>
                {isCredSet
                  ? `Faol: @${user?.username || '...'} • Veb-panel va ilovaga kirish mavjud`
                  : 'Veb-panel va ilovaga parol bilan kirish imkoniyatini yoqing'}
              </Text>
            </View>
            <View style={[styles.credStatusDot, { backgroundColor: isCredSet ? '#059669' : '#F59E0B' }]} />
          </View>

          <TouchableOpacity
            style={[styles.credBtn, isCredSet && styles.credBtnUpdate]}
            onPress={() => setCredModalVisible(true)}
          >
            <Ionicons
              name={isCredSet ? 'create-outline' : 'add-circle-outline'}
              size={15}
              color={isCredSet ? '#64748B' : '#FFF'}
            />
            <Text style={[styles.credBtnText, isCredSet && styles.credBtnTextUpdate]}>
              {isCredSet ? 'Login va parolni yangilash' : 'Login va parol yaratish'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================= */}
      {/* 5. CHIQISH TUGMASI (PASTDA ALOHIDA) */}
      {/* ========================================================= */}
      <Pressable
        style={styles.logoutButton}
        onPress={() => {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {}
          if (onLogout) {
            Alert.alert(
              'Akkauntdan chiqish',
              'Haqiqatan ham akkauntdan chiqmoqchimisiz?',
              [
                { text: 'Bekor qilish', style: 'cancel' },
                { text: 'Chiqish', style: 'destructive', onPress: onLogout },
              ]
            );
          }
        }}
      >
        <Feather name="log-out" size={18} color="#DC2626" />
        <Text style={styles.logoutText}>Akkauntdan chiqish</Text>
      </Pressable>
    </ScrollView>

    {/* ── SetCredentials Modal ────────────────────── */}
    <Modal
      visible={credModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setCredModalVisible(false)}
    >
      <View style={styles.credModalOverlay}>
        <View style={styles.credModalCard}>
          <View style={styles.credModalHeader}>
            <Text style={styles.credModalTitle}>
              {isCredSet ? 'Kirish Kalitlarini Yangilash' : 'Kirish Kaliti Yaratish'}
            </Text>
            <TouchableOpacity onPress={() => setCredModalVisible(false)}>
              <Ionicons name="close-circle" size={26} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.credModalDesc}>
            Login faqat kichik harf, raqam, _, . belgisidan iborat bo'lishi kerak.
            Masalan: <Text style={{ fontWeight: '700' }}>arena_toshkent</Text>
          </Text>

          {/* Username */}
          <View style={styles.credInputGroup}>
            <Text style={styles.credInputLabel}>Login (Username) *</Text>
            <View style={styles.credInputWrap}>
              <Ionicons name="at" size={16} color="#64748B" />
              <TextInput
                style={styles.credInput}
                value={credUsername}
                onChangeText={setCredUsername}
                placeholder="arena_toshkent"
                placeholderTextColor="#CBD5E1"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Yangi parol */}
          <View style={styles.credInputGroup}>
            <Text style={styles.credInputLabel}>Yangi Parol * (kamida 8 belgi)</Text>
            <View style={styles.credInputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color="#64748B" />
              <TextInput
                style={[styles.credInput, { flex: 1 }]}
                value={credPassword}
                onChangeText={setCredPassword}
                placeholder="Yangi parol..."
                placeholderTextColor="#CBD5E1"
                secureTextEntry={!credPasswordVisible}
              />
              <TouchableOpacity onPress={() => setCredPasswordVisible(!credPasswordVisible)}>
                <Ionicons
                  name={credPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Eski parol (faqat yangilashda) */}
          {isCredSet && (
            <View style={styles.credInputGroup}>
              <Text style={styles.credInputLabel}>Eski Parol (tasdiqlash uchun)</Text>
              <View style={styles.credInputWrap}>
                <Ionicons name="shield-outline" size={16} color="#64748B" />
                <TextInput
                  style={styles.credInput}
                  value={credCurrentPassword}
                  onChangeText={setCredCurrentPassword}
                  placeholder="Eski parol..."
                  placeholderTextColor="#CBD5E1"
                  secureTextEntry
                />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.credSaveBtn, credSaving && { opacity: 0.6 }]}
            onPress={handleSaveCredentials}
            disabled={credSaving}
          >
            {credSaving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                <Text style={styles.credSaveBtnText}>Saqlash</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 60,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 14,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  ownerAvatar: {
    backgroundColor: '#D97706',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  userPhone: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  badgePlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  badgePlayerText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeOwner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  badgeOwnerText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 62,
  },
  becomeOwnerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    gap: 8,
    marginBottom: 14,
  },
  becomeOwnerText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '600',
  },
  switchBackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    gap: 6,
    marginBottom: 14,
  },
  switchBackText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    gap: 8,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Credentials Management Styles */
  credentialsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  credCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  credIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  credCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  credCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  credStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  credBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  credBtnUpdate: {
    backgroundColor: '#F1F5F9',
  },
  credBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  credBtnTextUpdate: {
    color: '#475569',
  },
  credModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  credModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  credModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  credModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  credModalDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  credInputGroup: {
    marginBottom: 14,
  },
  credInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  credInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  credInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  credSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
  },
  credSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
