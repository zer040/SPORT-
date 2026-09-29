import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Api } from '../services/api';

interface OwnerDashboardProps {
  token: string;
  user: any;
  onRefreshParent?: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ token, user }) => {
  const [venues, setVenues] = useState<any[]>([]);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadOwnerData();
  }, [token]);

  const loadOwnerData = async () => {
    setLoading(true);
    try {
      const [vData, bData] = await Promise.allSettled([
        Api.getOwnerVenues(token),
        Api.getOwnerPendingBookings(token),
      ]);

      if (vData.status === 'fulfilled') setVenues(vData.value);
      if (bData.status === 'fulfilled') setPendingBookings(bData.value);
    } catch (err: any) {
      console.warn('Owner load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId: string, action: 'CONFIRM' | 'REJECT') => {
    setActionLoadingId(bookingId);
    try {
      const res = await Api.actionOwnerBooking(bookingId, action, token);
      Alert.alert(
        action === 'CONFIRM' ? 'Tasdiqlandi!' : 'Rad etildi!',
        res.message || 'Muvaffaqiyatli bajarildi'
      );
      loadOwnerData();
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Amalni bajarishda xatolik yuz berdi');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={THEME.colors.primary} size="large" />
        <Text style={styles.loadingText}>Maydonlar va bronlar yuklanmoqda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.roleBanner}>
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark" size={16} color={THEME.colors.primary} />
          <Text style={styles.roleBadgeText}>
            {user?.role?.toUpperCase() || 'OWNER'} BOSHQARUVI
          </Text>
        </View>
        <Text style={styles.bannerTitle}>Maydoningiz Boshqaruv Markazi</Text>
        <Text style={styles.bannerSubtitle}>
          10,000 UZS kafolat bilan kelgan mijozlarni tasdiqlang va offline slotlarni boshqaring.
        </Text>
      </View>

      {/* Pending 10k Guarantee Bookings */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="notifications" size={18} color="#FBBF24" />
          <Text style={styles.sectionTitle}>Tasdiq kutilayotgan bronlar</Text>
        </View>
        <Text style={styles.badgeCount}>{pendingBookings.length}</Text>
      </View>

      {pendingBookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={32} color={THEME.colors.primary} />
          <Text style={styles.emptyTitle}>Kutilayotgan yangi bronlar yo'q</Text>
          <Text style={styles.emptySub}>Yangi bron bo'lganda Telegram botingizga ham darhol xabar keladi.</Text>
        </View>
      ) : (
        pendingBookings.map((b) => {
          const isActing = actionLoadingId === b.id;
          return (
            <View key={b.id} style={styles.bookingCard}>
              <View style={styles.bookingCardHeader}>
                <View>
                  <Text style={styles.venueName}>{b.venue_name}</Text>
                  <Text style={styles.pitchName}>{b.pitch_name}</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>10,000 UZS TO'LANDI</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="time" size={14} color={THEME.colors.primary} />
                <Text style={styles.detailText}>
                  {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="person" size={14} color={THEME.colors.secondary} />
                <Text style={styles.detailText}>
                  Mijoz: {b.customer_name} ({b.customer_phone})
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="cash" size={14} color="#FBBF24" />
                <Text style={styles.detailText}>
                  Joyida olinadigan summa: <Text style={styles.highlightCash}>{b.remaining_at_venue?.toLocaleString()} UZS</Text>
                </Text>
              </View>

              {/* Action Buttons: Confirm & Reject */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtnConfirm, isActing && styles.disabledBtn]}
                  onPress={() => handleBookingAction(b.id, 'CONFIRM')}
                  disabled={isActing}
                >
                  <Ionicons name="checkmark-sharp" size={16} color="#090D16" />
                  <Text style={styles.actionBtnConfirmText}>Tasdiqlayman</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtnReject, isActing && styles.disabledBtn]}
                  onPress={() => handleBookingAction(b.id, 'REJECT')}
                  disabled={isActing}
                >
                  <Ionicons name="close-sharp" size={16} color={THEME.colors.danger} />
                  <Text style={styles.actionBtnRejectText}>Rad etish</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Owner's Venues */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="football" size={18} color={THEME.colors.primary} />
          <Text style={styles.sectionTitle}>Mening stadionlarim</Text>
        </View>
        <Text style={styles.badgeCount}>{venues.length}</Text>
      </View>

      {venues.map((v) => (
        <View key={v.id} style={styles.venueItemCard}>
          <View style={styles.venueItemHeader}>
            <View>
              <Text style={styles.venueItemTitle}>{v.name}</Text>
              <Text style={styles.venueItemAddress}>{v.address}, {v.city}</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FBBF24" />
              <Text style={styles.ratingText}>{v.avg_rating || 5.0}</Text>
            </View>
          </View>

          <View style={styles.venueStatsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{v.pitches_count || 1}</Text>
              <Text style={styles.miniStatLabel}>Maydonlar</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{v.total_bookings || 0}</Text>
              <Text style={styles.miniStatLabel}>Jami bronlar</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatValue, { color: THEME.colors.primary }]}>Faol</Text>
              <Text style={styles.miniStatLabel}>Status</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    marginTop: 12,
  },
  roleBanner: {
    backgroundColor: 'rgba(0, 255, 135, 0.05)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.2)',
    marginBottom: 20,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  roleBadgeText: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  badgeCount: {
    backgroundColor: THEME.colors.surfaceLight,
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  emptyCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySub: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  bookingCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.25)',
    marginBottom: 12,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  venueName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  pitchName: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  statusPill: {
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    color: '#E2E8F0',
    fontSize: 13,
    marginLeft: 8,
  },
  highlightCash: {
    color: '#FBBF24',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  actionBtnConfirm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnConfirmText: {
    color: '#090D16',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
  actionBtnReject: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnRejectText: {
    color: THEME.colors.danger,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  venueItemCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 12,
  },
  venueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  venueItemTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  venueItemAddress: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ratingText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  venueStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: THEME.colors.surfaceLight,
    paddingVertical: 10,
    borderRadius: 12,
  },
  miniStat: {
    alignItems: 'center',
  },
  miniStatValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  miniStatLabel: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
});
