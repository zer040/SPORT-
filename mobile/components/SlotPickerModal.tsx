import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Api } from '../services/api';

interface SlotPickerModalProps {
  visible: boolean;
  venue: any | null;
  token: string | null;
  onClose: () => void;
  onBookingSuccess: (bookingData: any) => void;
  onRequireAuth: () => void;
}

export const SlotPickerModal: React.FC<SlotPickerModalProps> = ({
  visible,
  venue,
  token,
  onClose,
  onBookingSuccess,
  onRequireAuth,
}) => {
  const [modalStep, setModalStep] = useState<'slots' | 'checkout' | 'success'>('slots');
  const [pitches, setPitches] = useState<any[]>([]);
  const [selectedPitch, setSelectedPitch] = useState<any | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Booking & Checkout state
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState<any | null>(null);
  const [confirmedPass, setConfirmedPass] = useState<string | null>(null);

  const SERVICE_FEE = 10000; // 10,000 UZS fixed platform guarantee fee

  useEffect(() => {
    if (visible && venue) {
      setModalStep('slots');
      loadPitches();
    } else {
      setPitches([]);
      setSelectedPitch(null);
      setSlots([]);
      setSelectedSlots([]);
      setErrorMsg(null);
      setActiveBookingId(null);
      setCheckoutData(null);
      setConfirmedPass(null);
    }
  }, [visible, venue]);

  const loadPitches = async () => {
    if (!venue) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await Api.getPitches(venue.id);
      setPitches(data);
      if (data.length > 0) {
        setSelectedPitch(data[0]);
        loadSlots(data[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Maydonlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async (pitchId: string) => {
    setLoading(true);
    setSelectedSlots([]);
    try {
      const data = await Api.getSlots(pitchId);
      setSlots(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Vaqtlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // Toggle slot selection (supports multi-slot selection)
  const toggleSlotSelection = (slot: any) => {
    const exists = selectedSlots.some((s) => s.id === slot.id);
    if (exists) {
      setSelectedSlots(selectedSlots.filter((s) => s.id !== slot.id));
    } else {
      const next = [...selectedSlots, slot].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      setSelectedSlots(next);
    }
  };

  const totalPitchPrice = selectedSlots.reduce(
    (sum, s) => sum + Number(s.price || 0),
    0
  );
  const remainingAtVenue = Math.max(0, totalPitchPrice - SERVICE_FEE);

  // Step 1: Hold the slots
  const handleHoldBooking = async () => {
    if (selectedSlots.length === 0) return;
    if (!token) {
      onRequireAuth();
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const slotIds = selectedSlots.map((s) => s.id);
      const res = await Api.holdBooking(slotIds, token);
      setActiveBookingId(res.booking_id);

      // Fetch checkout details
      try {
        const details = await Api.getCheckoutDetails(res.booking_id, token);
        setCheckoutData(details);
      } catch {
        setCheckoutData({
          booking_id: res.booking_id,
          service_fee: SERVICE_FEE,
          total_price: totalPitchPrice,
          remaining_venue_amount: remainingAtVenue,
          click_url: `https://my.click.uz/services/pay?service_id=32194&merchant_id=23812&amount=${SERVICE_FEE}&transaction_param=${res.booking_id}`,
          payme_url: `https://checkout.paycom.uz/`,
        });
      }

      setModalStep('checkout');
    } catch (err: any) {
      setErrorMsg(err.message || 'Slotni band qilishda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Simulate or complete payment
  const handleCompletePayment = async (provider: 'CLICK' | 'PAYME') => {
    if (!activeBookingId || !token) return;
    setPaying(true);
    setErrorMsg(null);
    try {
      const simRes = await Api.simulatePayment(activeBookingId, provider, token);
      setConfirmedPass(simRes.qr_pass || `SP-PASS-2026-${activeBookingId.slice(0, 4).toUpperCase()}`);
      setModalStep('success');

      // Notify parent app
      const primarySlot = selectedSlots[0] || {};
      onBookingSuccess({
        id: activeBookingId,
        slot_id: primarySlot.id,
        slot: primarySlot,
        slots: selectedSlots,
        total_price: totalPitchPrice,
        service_fee: SERVICE_FEE,
        remaining_at_venue: remainingAtVenue,
        status: 'CONFIRMED',
        payment_status: 'PAID',
        qr_pass: simRes.qr_pass,
        pitch: selectedPitch,
        venue: venue,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'To\'lovni tasdiqlashda xatolik');
    } finally {
      setPaying(false);
    }
  };

  const handleOpenPaymentUrl = async (url: string) => {
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
      }
    } catch {
      // Fallback: simulate payment
      handleCompletePayment('CLICK');
    }
  };

  if (!venue) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{venue.name}</Text>
              <Text style={styles.subtitle}>
                {modalStep === 'slots'
                  ? '1 yoki bir nechta ketma-ket soatni tanlang'
                  : modalStep === 'checkout'
                  ? '10,000 UZS Kafolat to\'lovi (Click / Payme)'
                  : 'Bron muvaffaqiyatli tasdiqlandi! 🎉'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={THEME.colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* ─── STEP 1: SLOTS PICKER ────────────────────────────── */}
          {modalStep === 'slots' && (
            <>
              {/* Pitch Selector (5x5 / 7x7) */}
              <Text style={styles.sectionLabel}>Maydon formati</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pitchScroll}>
                {pitches.map((p) => {
                  const isSelected = selectedPitch?.id === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.pitchChip, isSelected && styles.activePitchChip]}
                      onPress={() => {
                        setSelectedPitch(p);
                        loadSlots(p.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pitchChipName, isSelected && styles.activeChipText]}>{p.name}</Text>
                      <Text style={[styles.pitchChipPrice, isSelected && styles.activeChipText]}>
                        {Number(p.price_per_hour).toLocaleString()} UZS/soat
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Slots Grid */}
              <View style={styles.slotsHeaderRow}>
                <Text style={styles.sectionLabel}>Bugungi bo'sh slotlar (1 soatlik bloklar)</Text>
                {selectedSlots.length > 0 && (
                  <Text style={styles.selectedCountText}>
                    {selectedSlots.length} ta slot tanlandi
                  </Text>
                )}
              </View>

              {loading ? (
                <ActivityIndicator color={THEME.colors.primary} style={{ marginVertical: 30 }} />
              ) : slots.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="calendar-outline" size={28} color={THEME.colors.textMuted} style={{ marginBottom: 6 }} />
                  <Text style={styles.emptyText}>Hozirda bo'sh slotlar mavjud emas</Text>
                </View>
              ) : (
                <ScrollView style={styles.slotsContainer}>
                  <View style={styles.slotsGrid}>
                    {slots.map((s) => {
                      const isSelected = selectedSlots.some((item) => item.id === s.id);
                      const startStr = new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const endStr = new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={[styles.slotItem, isSelected && styles.activeSlotItem]}
                          onPress={() => toggleSlotSelection(s)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.slotTimeRow}>
                            <Ionicons
                              name={isSelected ? "checkmark-circle" : "time-outline"}
                              size={14}
                              color={isSelected ? THEME.colors.primary : THEME.colors.textSecondary}
                            />
                            <Text style={[styles.slotTime, isSelected && styles.activeSlotText]}>
                              {startStr} - {endStr}
                            </Text>
                          </View>
                          <Text style={[styles.slotPrice, isSelected && styles.activeSlotText]}>
                            {Number(s.price).toLocaleString()} UZS
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              )}

              {/* 10,000 UZS Monetization & Guarantee Breakdown Card */}
              {selectedSlots.length > 0 && (
                <View style={styles.monetizationCard}>
                  <View style={styles.feeRow}>
                    <View style={styles.feeLabelGroup}>
                      <Ionicons name="shield-checkmark" size={16} color={THEME.colors.primary} />
                      <Text style={styles.feeLabel}>Platforma kafolat to'lovi (Hozir to'lanadi):</Text>
                    </View>
                    <Text style={styles.feeValuePrimary}>{SERVICE_FEE.toLocaleString()} UZS</Text>
                  </View>

                  <View style={styles.feeRow}>
                    <View style={styles.feeLabelGroup}>
                      <Ionicons name="cash-outline" size={16} color={THEME.colors.textMuted} />
                      <Text style={styles.feeLabelMuted}>Maydonda to'lanadigan qoldiq:</Text>
                    </View>
                    <Text style={styles.feeValueMuted}>{remainingAtVenue.toLocaleString()} UZS</Text>
                  </View>

                  <Text style={styles.guaranteeNote}>
                    ⚡ 10,000 so'm slotni 100% sizga kafolatlaydi va maydon egasi tasdig'iga yuboriladi.
                  </Text>
                </View>
              )}

              {/* Footer Action */}
              <View style={styles.footer}>
                <View>
                  <Text style={styles.footerLabel}>Hozir to'lanadigan kafolat</Text>
                  <Text style={styles.footerPrice}>
                    {selectedSlots.length > 0 ? `${SERVICE_FEE.toLocaleString()} UZS` : '0 UZS'}
                  </Text>
                  {selectedSlots.length > 0 && (
                    <Text style={styles.footerTotalNotice}>
                      Jami: {totalPitchPrice.toLocaleString()} UZS
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, (selectedSlots.length === 0 || submitting) && styles.disabledButton]}
                  onPress={handleHoldBooking}
                  disabled={selectedSlots.length === 0 || submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color={THEME.colors.textDark} />
                  ) : (
                    <View style={styles.submitBtnContent}>
                      <Ionicons name="lock-closed" size={16} color={THEME.colors.textDark} />
                      <Text style={styles.submitButtonText}>
                        {selectedSlots.length > 0
                          ? `To'lovga o'tish (${selectedSlots.length} ta slot)`
                          : 'Slot tanlang'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ─── STEP 2: CHECKOUT & PAYMENT ───────────────────────── */}
          {modalStep === 'checkout' && (
            <View style={styles.checkoutBox}>
              <View style={styles.timerBadge}>
                <Ionicons name="timer-outline" size={16} color={THEME.colors.accent} />
                <Text style={styles.timerText}>Vaqtinchalik band qilindi: 10:00 daqiqa qoldi</Text>
              </View>

              <View style={styles.checkoutSummaryCard}>
                <Text style={styles.summaryTitle}>To'lov Tafsilotlari</Text>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Stadion va maydon:</Text>
                  <Text style={styles.summaryVal}>{venue.name} • {selectedPitch?.name}</Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Slotlar soni:</Text>
                  <Text style={styles.summaryVal}>{selectedSlots.length} soat</Text>
                </View>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Jami maydon narxi:</Text>
                  <Text style={styles.summaryVal}>{totalPitchPrice.toLocaleString()} UZS</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryTotalLabel}>Kafolat to'lovi (Hozir):</Text>
                  <Text style={styles.summaryTotalVal}>{SERVICE_FEE.toLocaleString()} UZS</Text>
                </View>
              </View>

              <Text style={styles.payMethodsTitle}>To'lov usulini tanlang:</Text>

              {/* Click Button */}
              <TouchableOpacity
                style={styles.clickPayBtn}
                onPress={() => handleCompletePayment('CLICK')}
                activeOpacity={0.85}
                disabled={paying}
              >
                <View style={styles.payBrandRow}>
                  <View style={styles.clickLogoBox}>
                    <Text style={styles.clickLogoText}>CLICK</Text>
                  </View>
                  <Text style={styles.payBtnLabel}>Click orqali to'lash</Text>
                </View>
                <Text style={styles.payBtnAmount}>10,000 UZS</Text>
              </TouchableOpacity>

              {/* Payme Button */}
              <TouchableOpacity
                style={styles.paymePayBtn}
                onPress={() => handleCompletePayment('PAYME')}
                activeOpacity={0.85}
                disabled={paying}
              >
                <View style={styles.payBrandRow}>
                  <View style={styles.paymeLogoBox}>
                    <Text style={styles.paymeLogoText}>PAYME</Text>
                  </View>
                  <Text style={styles.payBtnLabel}>Payme orqali to'lash</Text>
                </View>
                <Text style={styles.payBtnAmount}>10,000 UZS</Text>
              </TouchableOpacity>

              {/* Test / Simulator One-Click Button */}
              <TouchableOpacity
                style={styles.simPayBtn}
                onPress={() => handleCompletePayment('CLICK')}
                activeOpacity={0.85}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color={THEME.colors.textDark} />
                ) : (
                  <>
                    <Ionicons name="flash" size={16} color={THEME.colors.textDark} />
                    <Text style={styles.simPayText}>⚡ Tezkor Test To'lovi (1-bosishda tasdiqlash)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ─── STEP 3: SUCCESS & QR PASS ─────────────────────────── */}
          {modalStep === 'success' && (
            <View style={styles.successBox}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-done" size={42} color={THEME.colors.primary} />
              </View>
              <Text style={styles.successTitle}>Maydon Band Qilindi!</Text>
              <Text style={styles.successDesc}>
                10,000 UZS kafolat to'lovi muvaffaqiyatli qabul qilindi. Maydon siz uchun 100% kafolatlandi.
              </Text>

              <View style={styles.qrPassBox}>
                <Ionicons name="qr-code-outline" size={54} color={THEME.colors.primary} />
                <Text style={styles.qrPassCode}>{confirmedPass || 'SP-PASS-2026-9481'}</Text>
                <Text style={styles.qrPassNote}>Maydonga kelganda ushbu chipta kodini ko'rsating</Text>
              </View>

              <TouchableOpacity
                style={styles.viewBookingsBtn}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Ionicons name="ticket-outline" size={18} color={THEME.colors.textDark} />
                <Text style={styles.viewBookingsText}>Mening Bronlarimni Ko'rish</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.88)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: THEME.radius.lg,
    borderTopRightRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 10,
    borderRadius: THEME.radius.sm,
    marginBottom: 10,
  },
  errorText: {
    color: THEME.colors.danger,
    fontSize: 12,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
  },
  slotsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedCountText: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  pitchScroll: {
    flexGrow: 0,
    marginBottom: 10,
  },
  pitchChip: {
    backgroundColor: THEME.colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    marginRight: 8,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  activePitchChip: {
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    borderColor: THEME.colors.primary,
  },
  pitchChipName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  pitchChipPrice: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  activeChipText: {
    color: THEME.colors.primary,
  },
  slotsContainer: {
    maxHeight: 180,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 4,
  },
  slotItem: {
    backgroundColor: THEME.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: THEME.radius.sm,
    width: '48%',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  activeSlotItem: {
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
    borderColor: THEME.colors.primary,
  },
  slotTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  slotTime: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  slotPrice: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  activeSlotText: {
    color: THEME.colors.primary,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
  },
  monetizationCard: {
    backgroundColor: 'rgba(0, 255, 135, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.2)',
    borderRadius: THEME.radius.md,
    padding: 12,
    marginTop: 10,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  feeLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feeLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  feeValuePrimary: {
    color: THEME.colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  feeLabelMuted: {
    color: THEME.colors.textMuted,
    fontSize: 12,
  },
  feeValueMuted: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  guaranteeNote: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorder,
  },
  footerLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
  },
  footerPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  footerTotalNotice: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  submitButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disabledButton: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: THEME.colors.textDark,
    fontSize: 13,
    fontWeight: '800',
  },

  // ─── CHECKOUT STYLES ─────────────────────────────────────────
  checkoutBox: {
    paddingVertical: 8,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    borderRadius: THEME.radius.full,
    paddingVertical: 6,
    marginBottom: 12,
  },
  timerText: {
    color: THEME.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  checkoutSummaryCard: {
    backgroundColor: THEME.colors.surfaceLight,
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    marginBottom: 14,
  },
  summaryTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  summaryLabel: {
    color: THEME.colors.textMuted,
    fontSize: 12,
  },
  summaryVal: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: THEME.colors.surfaceBorder,
    marginVertical: 8,
  },
  summaryTotalLabel: {
    color: THEME.colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  summaryTotalVal: {
    color: THEME.colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  payMethodsTitle: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  clickPayBtn: {
    backgroundColor: '#0070F3',
    borderRadius: THEME.radius.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymePayBtn: {
    backgroundColor: '#00A896',
    borderRadius: THEME.radius.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  payBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clickLogoBox: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clickLogoText: {
    color: '#0070F3',
    fontWeight: '900',
    fontSize: 11,
  },
  paymeLogoBox: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  paymeLogoText: {
    color: '#00A896',
    fontWeight: '900',
    fontSize: 11,
  },
  payBtnLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  payBtnAmount: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  simPayBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  simPayText: {
    color: THEME.colors.textDark,
    fontSize: 13,
    fontWeight: '900',
  },

  // ─── SUCCESS STYLES ──────────────────────────────────────────
  successBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  successDesc: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  qrPassBox: {
    backgroundColor: THEME.colors.surfaceLight,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.3)',
    borderRadius: THEME.radius.md,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  qrPassCode: {
    color: THEME.colors.primary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 8,
  },
  qrPassNote: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  viewBookingsBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  viewBookingsText: {
    color: THEME.colors.textDark,
    fontSize: 14,
    fontWeight: '900',
  },
});
