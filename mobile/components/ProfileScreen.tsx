import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface ProfileScreenProps {
  user: any;
  onLogout: () => void;
  onSwitchToOwner?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onLogout,
  onSwitchToOwner,
}) => {
  const [notifications, setNotifications] = useState(true);
  const [ownerMode, setOwnerMode] = useState(user?.role === 'owner');
  const [walletBalance, setWalletBalance] = useState('50,000');

  const displayName = user?.full_name?.trim() ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    'Shohrux Atabullayev';

  const displayPhone = user?.phone_number || '+998 93 768 06 28';
  const avatarLetter = (displayName[0] || 'S').toUpperCase();

  const handlePress = () => {
    // Light click feedback
  };

  const handleToggleOwner = (val: boolean) => {
    setOwnerMode(val);
    if (val && onSwitchToOwner) {
      onSwitchToOwner();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 1. O'yinchi Pasporti (Identity Card) */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.phone}>{displayPhone}</Text>

        <View style={styles.statusPill}>
          <Ionicons name="shield-checkmark" size={14} color="#059669" />
          <Text style={styles.statusText}>⚽ Yarim himoyachi • 98.5% Karma</Text>
        </View>
      </View>

      {/* 2. Asosiy Mini-Statistika (Hub) */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="football-outline" size={16} color="#64748B" style={{ marginBottom: 4 }} />
          <Text style={styles.statNum}>{user?.total_games || 15}</Text>
          <Text style={styles.statLabel}>O'yinlar</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="close-circle-outline" size={16} color="#059669" style={{ marginBottom: 4 }} />
          <Text style={styles.statNum}>0</Text>
          <Text style={styles.statLabel}>No-Show</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="star" size={16} color="#F59E0B" style={{ marginBottom: 4 }} />
          <Text style={styles.statNum}>{user?.rating ? Number(user.rating).toFixed(1) : '4.9'}</Text>
          <Text style={styles.statLabel}>Reyting</Text>
        </View>
      </View>

      {/* 3. Funksional Sozlamalar va Bo'limlar */}
      <View style={styles.menuGroup}>
        {/* Wallet & Cards */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Alert.alert('Sport+ Hamyon', `Hisobingizdagi mablag': ${walletBalance} so'm.\nTez kunda Click/Payme orqali to'ldirish.`)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#0284C7' }]}>
            <Ionicons name="wallet-outline" size={18} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Mening Hamyonim & Kartalar</Text>
            <Text style={styles.menuSubText}>Balans: {walletBalance} so'm</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Squad / Team */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Alert.alert('Mening Jamoam', 'FC Bunyodkor Havaskor • 12 ta a\'zo')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#8B5CF6' }]}>
            <Ionicons name="people-outline" size={18} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Mening Jamoam (Squad)</Text>
            <Text style={styles.menuSubText}>Do'stlar bilan jamoaviy bron</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Notifications Switch */}
        <View style={styles.menuItem}>
          <View style={[styles.iconWrap, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="notifications-outline" size={18} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Bildirishnomalar</Text>
            <Text style={styles.menuSubText}>Telegram va SMS eslatmalar</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ true: '#059669', false: '#E2E8F0' }}
          />
        </View>

        <View style={styles.divider} />

        {/* Host / Owner Mode Switch */}
        <View style={styles.menuItem}>
          <View style={[styles.iconWrap, { backgroundColor: '#059669' }]}>
            <Ionicons name="business-outline" size={18} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuText}>Maydon egasi rejimi</Text>
            <Text style={styles.menuSubText}>Stadionlar va slotlar boshqaruvi</Text>
          </View>
          <Switch
            value={ownerMode}
            onValueChange={handleToggleOwner}
            trackColor={{ true: '#059669', false: '#E2E8F0' }}
          />
        </View>

        <View style={styles.divider} />

        {/* Language */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Alert.alert('Tilni tanlash', 'Ilova tili: O\'zbekcha')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#64748B' }]}>
            <Ionicons name="globe-outline" size={18} color="#FFF" />
          </View>
          <Text style={styles.menuText}>Til: O'zbekcha</Text>
          <Feather name="chevron-right" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* 4. Chiqish tugmasi (BottomNav ostida qolib ketmasligi uchun alohida toza blok) */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={onLogout}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={18} color="#EF4444" />
        <Text style={styles.logoutText}>Akkountdan chiqish</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 130, // BottomNav ustiga tushib qolmasligi uchun keng masofa
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 16,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  phone: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.15)',
  },
  statusText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  statNum: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 64,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
