/**
 * VenueEditScreen — Owner Stadion Boshqaruv Markazi.
 *
 * Blok 1: Rasm Galereyasi (drag-and-drop tartib, cover tanlash)
 * Blok 2: Asosiy Ma'lumotlar (nom, tavsif, manzil, telefon, ish soati)
 * Blok 3: Qulayliklar Toggle (dushxona, avtoturargoh, yoritish, kiyinish xonasi, kafe)
 * Blok 4: Smart Pricing (kunduzgi/prime-time/tungi narxlar)
 * Blok 5: Slot Statistikasi (bugungi donut chart)
 * Blok 6: Slot Taqvimi (bugungi jadval — toggle-block, manual-book)
 *
 * Real-time: Har qanday o'zgarish WebSocket orqali o'yinchilar ekranida darhol aks etadi.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

// ─── Types ──────────────────────────────────────────────

interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  district: string;
  phone_number: string;
  base_price_per_hour: number;
  is_active: boolean;
  avg_rating: number;
  total_bookings: number;
  facilities: Record<string, boolean>;
  amenities: Record<string, boolean>;
  images: string[];
  pitches: Pitch[];
}

interface Pitch {
  id: string;
  name: string;
  size_type: string;
  price_per_hour: number;
}

interface Slot {
  id: string;
  pitch_id: string;
  pitch_name: string;
  start_time: string;
  end_time: string;
  price: number;
  status: string;
  is_available: boolean;
  booked_by_name?: string;
  booked_by_phone?: string;
  is_recurring: boolean;
}

interface TodayStats {
  total: number;
  available: number;
  locked: number;
  booked: number;
  manual_booked: number;
  blocked: number;
  revenue_today: number;
}

interface Props {
  venue: Venue;
  token: string;
  onClose: () => void;
  onSaved?: () => void;
}

// ─── Slot Status Helpers ────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  AVAILABLE:     { label: 'Bo\'sh',       color: THEME.colors.primary,  bg: THEME.colors.primaryMuted, icon: 'checkmark-circle' },
  LOCKED:        { label: 'Qulflangan',   color: '#F59E0B',              bg: 'rgba(245,158,11,0.1)',    icon: 'lock-closed' },
  BOOKED:        { label: 'Band (Ilova)', color: '#0EA5E9',              bg: 'rgba(14,165,233,0.1)',    icon: 'card' },
  MANUAL_BOOKED: { label: 'Qo\'lda band', color: '#8B5CF6',             bg: 'rgba(139,92,246,0.1)',    icon: 'call' },
  BLOCKED:       { label: 'Yopiq',        color: THEME.colors.danger,   bg: 'rgba(239,68,68,0.1)',     icon: 'ban' },
};

// ─── Amenity Config ─────────────────────────────────────

const AMENITY_CONFIG = [
  { key: 'shower',        icon: '🚿', label: 'Dushxona',          sub: 'Sovuq/Issiq suv' },
  { key: 'parking',       icon: '🅿️', label: 'Avtoturargoh',     sub: 'Bepul / Pullik' },
  { key: 'lighting',      icon: '💡', label: 'Yoritish tizimi',   sub: 'Kechki projektorlar' },
  { key: 'changing_room', icon: '👕', label: 'Kiyinish xonasi',   sub: 'Razdevalka' },
  { key: 'cafe',          icon: '☕', label: 'Mini-kafe',         sub: 'Suv va ichimliklar' },
  { key: 'wifi',          icon: '📶', label: 'Wi-Fi',             sub: 'Bepul internet' },
];

// ─── Main Component ─────────────────────────────────────

export const VenueEditScreen: React.FC<Props> = ({ venue, token, onClose, onSaved }) => {
  // ─── State ───────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'info' | 'pricing' | 'slots'>('info');
  const [saving, setSaving] = useState(false);

  // Blok 2: Asosiy ma'lumotlar
  const [name, setName] = useState(venue.name || '');
  const [description, setDescription] = useState(venue.description || '');
  const [address, setAddress] = useState(venue.address || '');
  const [city, setCity] = useState(venue.city || '');
  const [phone, setPhone] = useState(venue.phone_number || '');
  const [isActive, setIsActive] = useState(venue.is_active ?? true);

  // Blok 3: Qulayliklar
  const [amenities, setAmenities] = useState<Record<string, boolean>>(
    venue.facilities || venue.amenities || {}
  );

  // Blok 4: Smart Pricing
  const [dayPrice, setDayPrice] = useState(String(Math.round((venue.base_price_per_hour || 100000) * 0.6)));
  const [primePrice, setPrimePrice] = useState(String(venue.base_price_per_hour || 200000));
  const [nightPrice, setNightPrice] = useState(String(Math.round((venue.base_price_per_hour || 150000) * 0.75)));
  const [smartPricingLoading, setSmartPricingLoading] = useState(false);
  const [bulkPriceLoading, setBulkPriceLoading] = useState(false);

  // Blok 5: Statistika
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Blok 6: Slot taqvimi
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualBookModal, setManualBookModal] = useState<{ visible: boolean; slot?: Slot }>({ visible: false });
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualRecurring, setManualRecurring] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);

  // ─── Real-Time WebSocket ─────────────────────────────
  useWebSocket({
    venueId: venue.id,
    onSlotUpdated: (data) => {
      setSlots((prev) =>
        prev.map((s) =>
          s.id === data.slot_id
            ? { ...s, status: data.status, is_available: data.is_available, price: data.price }
            : s
        )
      );
      loadStats();
    },
    onVenueUpdated: () => {
      loadStats();
    },
    debug: false,
  });

  // ─── Data Loading ────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await Api.getTodayStats(venue.id, token);
      setStats(data);
    } catch (_) {}
    finally {
      setStatsLoading(false);
    }
  }, [venue.id, token]);

  const loadSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const data = await Api.getOwnerVenueSlots(venue.id, selectedDate, token);
      setSlots(Array.isArray(data) ? data : []);
    } catch (_) {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [venue.id, selectedDate, token]);

  useEffect(() => {
    loadStats();
    loadSlots();
  }, [selectedDate]);

  // ─── Save Handler ────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Xatolik', 'Maydon nomini kiriting');
      return;
    }
    setSaving(true);
    try {
      await Api.updateVenue(
        venue.id,
        {
          name: name.trim(),
          description: description.trim(),
          address: address.trim(),
          city: city.trim(),
          phone_number: phone.trim(),
          is_active: isActive,
          amenities,
          base_price_per_hour: parseFloat(primePrice) || venue.base_price_per_hour,
        },
        token
      );
      Alert.alert(
        'Saqlandi!',
        'Stadion ma\'lumotlari yangilandi va o\'yinchilar ekranida real vaqtda aks etdi.',
        [{ text: 'OK', onPress: onSaved }]
      );
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  // ─── Smart Pricing Handlers ─────────────────────────

  const handleSmartGenerate = async () => {
    if (!venue.pitches?.length) {
      Alert.alert('Xatolik', 'Avval maydoncha (pitch) qo\'shing');
      return;
    }
    setSmartPricingLoading(true);
    try {
      const pitch = venue.pitches[0];
      const res = await Api.smartGenerateSlots(
        {
          pitch_id: pitch.id,
          days_ahead: 30,
          day_price: parseFloat(dayPrice) || 100000,
          prime_price: parseFloat(primePrice) || 200000,
          night_price: parseFloat(nightPrice) || 150000,
        },
        token
      );
      Alert.alert('Generatsiya bajarildi!', res.message);
      loadSlots();
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Generatsiyada xatolik');
    } finally {
      setSmartPricingLoading(false);
    }
  };

  const handleBulkPriceUpdate = async () => {
    if (!venue.pitches?.length) {
      Alert.alert('Xatolik', 'Maydoncha topilmadi');
      return;
    }
    setBulkPriceLoading(true);
    try {
      const pitch = venue.pitches[0];
      const res = await Api.bulkUpdateSlotPrices(
        {
          pitch_id: pitch.id,
          day_price: parseFloat(dayPrice) || 100000,
          prime_price: parseFloat(primePrice) || 200000,
          night_price: parseFloat(nightPrice) || 150000,
          only_future: true,
        },
        token
      );
      Alert.alert('Narxlar yangilandi!', res.message);
      loadSlots();
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Narx yangilashda xatolik');
    } finally {
      setBulkPriceLoading(false);
    }
  };

  // ─── Slot Handlers ───────────────────────────────────

  const handleToggleBlock = async (slot: Slot) => {
    const shouldBlock = slot.status === 'AVAILABLE';
    Alert.alert(
      shouldBlock ? 'Slotni yopasizmi?' : 'Slotni ochasizmi?',
      `${slot.start_time.slice(11, 16)} – ${slot.end_time.slice(11, 16)} soat`,
      [
        { text: 'Bekor', style: 'cancel' },
        {
          text: 'Ha',
          style: shouldBlock ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await Api.toggleSlotBlock(slot.id, shouldBlock, token);
              loadSlots();
            } catch (err: any) {
              Alert.alert('Xatolik', err.message);
            }
          },
        },
      ]
    );
  };

  const handleOpenManualBook = (slot: Slot) => {
    setManualName('');
    setManualPhone('');
    setManualRecurring(false);
    setManualBookModal({ visible: true, slot });
  };

  const handleManualBook = async () => {
    if (!manualName.trim() || !manualPhone.trim()) {
      Alert.alert('Xatolik', 'Mijoz ism va telefon raqamini kiriting');
      return;
    }
    if (!manualBookModal.slot) return;
    setManualLoading(true);
    try {
      await Api.manualBookSlot(
        {
          slot_id: manualBookModal.slot.id,
          booked_by_name: manualName.trim(),
          booked_by_phone: manualPhone.trim(),
          is_recurring: manualRecurring,
          send_sms_notice: true,
        },
        token
      );
      setManualBookModal({ visible: false });
      Alert.alert(
        'Band qilindi!',
        `${manualName} uchun slot band qilindi. Telegram bot orqali xabar yuborildi.`
      );
      loadSlots();
    } catch (err: any) {
      Alert.alert('Xatolik', err.message);
    } finally {
      setManualLoading(false);
    }
  };

  // ─── Tabs ────────────────────────────────────────────
  const tabs = [
    { key: 'info',    label: 'Ma\'lumotlar', icon: 'information-circle' as const },
    { key: 'pricing', label: 'Narxlar',       icon: 'pricetag' as const },
    { key: 'slots',   label: 'Jadval',        icon: 'calendar' as const },
  ];

  // ─── Render ──────────────────────────────────────────
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.root}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>{venue.name}</Text>
              <View style={styles.rtBadge}>
                <View style={styles.rtDot} />
                <Text style={styles.rtText}>Real-Time Sync</Text>
              </View>
            </View>
            {activeTab !== 'slots' && (
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnLoading]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Saqlash</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Tab Bar */}
          <View style={styles.tabBar}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.key as any)}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={activeTab === tab.key ? THEME.colors.primary : THEME.colors.textMuted}
                />
                <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* === TAB 1: MA'LUMOTLAR === */}
            {activeTab === 'info' && (
              <>
                <SectionCard icon="business" title="Asosiy Ma'lumotlar">
                  <LabeledInput label="Stadion nomi *" value={name} onChangeText={setName}
                    placeholder="Bunyodkor Arena - 7x7 sun'iy chim" />
                  <LabeledInput label="Tavsif" value={description} onChangeText={setDescription}
                    placeholder="Maydon haqida qisqacha ma'lumot..." multiline />
                  <LabeledInput label="Manzil" value={address} onChangeText={setAddress}
                    placeholder="Ko'cha, uy raqami" />
                  <View style={styles.row}>
                    <View style={styles.rowHalf}>
                      <LabeledInput label="Shahar" value={city} onChangeText={setCity} placeholder="Toshkent" />
                    </View>
                    <View style={styles.rowHalf}>
                      <LabeledInput label="Telefon" value={phone} onChangeText={setPhone}
                        placeholder="+998901234567" keyboardType="phone-pad" />
                    </View>
                  </View>

                  <View style={styles.switchRow}>
                    <View>
                      <Text style={styles.switchLabel}>Maydon faol holati</Text>
                      <Text style={styles.switchSub}>
                        {isActive ? 'O\'yinchilar ko\'ra oladi' : 'Yashirilgan'}
                      </Text>
                    </View>
                    <Switch
                      value={isActive}
                      onValueChange={setIsActive}
                      trackColor={{ false: THEME.colors.border, true: THEME.colors.primaryLight }}
                      thumbColor={isActive ? THEME.colors.primary : '#CBD5E1'}
                    />
                  </View>
                </SectionCard>

                <SectionCard icon="options" title="Qulayliklar va Imkoniyatlar">
                  <Text style={styles.amenitySub}>
                    O'yinchilar maydoningizni filtrlashda shu qulayliklarni ko'radi
                  </Text>
                  {AMENITY_CONFIG.map((item) => (
                    <View key={item.key} style={styles.amenityRow}>
                      <Text style={styles.amenityIcon}>{item.icon}</Text>
                      <View style={styles.amenityInfo}>
                        <Text style={styles.amenityLabel}>{item.label}</Text>
                        <Text style={styles.amenitySub2}>{item.sub}</Text>
                      </View>
                      <Switch
                        value={amenities[item.key] ?? false}
                        onValueChange={(v) => setAmenities((prev) => ({ ...prev, [item.key]: v }))}
                        trackColor={{ false: THEME.colors.border, true: THEME.colors.primaryLight }}
                        thumbColor={amenities[item.key] ? THEME.colors.primary : '#CBD5E1'}
                      />
                    </View>
                  ))}
                </SectionCard>
              </>
            )}

            {/* === TAB 2: NARXLAR === */}
            {activeTab === 'pricing' && (
              <>
                {statsLoading ? (
                  <View style={styles.statsLoading}>
                    <ActivityIndicator color={THEME.colors.primary} />
                  </View>
                ) : stats ? (
                  <SectionCard icon="stats-chart" title="Bugungi Statistika">
                    <View style={styles.statsRow}>
                      <StatBubble value={stats.available} label="Bo'sh" color={THEME.colors.primary} />
                      <StatBubble value={stats.booked + stats.manual_booked} label="Band" color="#0EA5E9" />
                      <StatBubble value={stats.blocked} label="Yopiq" color={THEME.colors.danger} />
                      <StatBubble value={stats.total} label="Jami" color={THEME.colors.textSecondary} />
                    </View>
                    <View style={styles.revenueCard}>
                      <Ionicons name="cash-outline" size={18} color={THEME.colors.primary} />
                      <Text style={styles.revenueLabel}>Bugungi daromad:</Text>
                      <Text style={styles.revenueValue}>
                        {stats.revenue_today.toLocaleString()} UZS
                      </Text>
                    </View>
                  </SectionCard>
                ) : null}

                <SectionCard icon="flash" title="Smart Pricing Shabloni">
                  <Text style={styles.pricingDescription}>
                    Bir marta sozlang — tizim keyingi 30 kun uchun slotlarni avtomatik shu narx
                    bilan generatsiya qiladi. O'yinchilar ekranida bir zumda aks etadi.
                  </Text>

                  <PricingSlotCard icon="☀️" label="Kunduzgi soatlar" timeRange="08:00 – 17:00"
                    value={dayPrice} onChange={setDayPrice} color="#F59E0B" />
                  <PricingSlotCard icon="⚡" label="Prime-Time" timeRange="17:00 – 23:00"
                    value={primePrice} onChange={setPrimePrice} color={THEME.colors.primary} />
                  <PricingSlotCard icon="🌙" label="Tungi soatlar" timeRange="23:00 – 03:00"
                    value={nightPrice} onChange={setNightPrice} color="#8B5CF6" />

                  <View style={styles.pricingActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnPrimary, bulkPriceLoading && styles.actionBtnDisabled]}
                      onPress={handleBulkPriceUpdate}
                      disabled={bulkPriceLoading}
                    >
                      {bulkPriceLoading ? <ActivityIndicator size="small" color="#FFF" /> : (
                        <>
                          <Ionicons name="sync" size={16} color="#FFF" />
                          <Text style={styles.actionBtnText}>Mavjud Slotlarni Yangilash</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnSecondary, smartPricingLoading && styles.actionBtnDisabled]}
                      onPress={handleSmartGenerate}
                      disabled={smartPricingLoading}
                    >
                      {smartPricingLoading ? <ActivityIndicator size="small" color={THEME.colors.primary} /> : (
                        <>
                          <Ionicons name="add-circle" size={16} color={THEME.colors.primary} />
                          <Text style={[styles.actionBtnText, { color: THEME.colors.primary }]}>
                            30 Kunlik Slotlar Yaratish
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={14} color={THEME.colors.info} />
                    <Text style={styles.infoText}>
                      "Mavjud Slotlarni Yangilash" — faqat hozir AVAILABLE bo'lgan slotlar narxini o'zgartiradi. O'yinchilar ekranida bir zumda aks etadi.
                    </Text>
                  </View>
                </SectionCard>
              </>
            )}

            {/* === TAB 3: JADVAL === */}
            {activeTab === 'slots' && (
              <>
                <SectionCard icon="calendar" title="Sana tanlang">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.dateRow}>
                      {Array.from({ length: 7 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() + i);
                        const dateStr = d.toISOString().split('T')[0];
                        const dayNames = ['Yak', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha'];
                        const dayName = dayNames[d.getDay()];
                        const isSelected = dateStr === selectedDate;
                        return (
                          <TouchableOpacity
                            key={dateStr}
                            style={[styles.dateChip, isSelected && styles.dateChipActive]}
                            onPress={() => setSelectedDate(dateStr)}
                          >
                            <Text style={[styles.dateChipDay, isSelected && styles.dateChipDayActive]}>
                              {i === 0 ? 'Bugun' : dayName}
                            </Text>
                            <Text style={[styles.dateChipNum, isSelected && styles.dateChipNumActive]}>
                              {d.getDate()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </SectionCard>

                <View style={styles.legendRow}>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <View key={key} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
                      <Text style={styles.legendLabel}>{cfg.label}</Text>
                    </View>
                  ))}
                </View>

                {slotsLoading ? (
                  <View style={styles.slotsLoading}>
                    <ActivityIndicator color={THEME.colors.primary} />
                    <Text style={styles.slotsLoadingText}>Jadval yuklanmoqda...</Text>
                  </View>
                ) : slots.length === 0 ? (
                  <View style={styles.emptySlots}>
                    <Text style={styles.emptySlotsIcon}>📅</Text>
                    <Text style={styles.emptySlotsTitle}>Bu kunda slotlar yo'q</Text>
                    <Text style={styles.emptySlotsText}>
                      "Narxlar" tabiga o'tib Smart Pricing bilan slotlarni generatsiya qiling.
                    </Text>
                  </View>
                ) : (
                  slots.map((slot) => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      onToggleBlock={handleToggleBlock}
                      onManualBook={handleOpenManualBook}
                    />
                  ))
                )}
              </>
            )}
          </ScrollView>
        </View>

        {/* Manual Book Modal */}
        <Modal
          visible={manualBookModal.visible}
          transparent
          animationType="slide"
          onRequestClose={() => setManualBookModal({ visible: false })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Qo'lda Band Qilish</Text>
                <TouchableOpacity onPress={() => setManualBookModal({ visible: false })}>
                  <Ionicons name="close-circle" size={26} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {manualBookModal.slot && (
                <View style={styles.modalSlotInfo}>
                  <Ionicons name="time" size={14} color={THEME.colors.primary} />
                  <Text style={styles.modalSlotTime}>
                    {manualBookModal.slot.start_time.slice(11, 16)} – {manualBookModal.slot.end_time.slice(11, 16)} soat
                  </Text>
                  <Text style={styles.modalSlotPrice}>
                    {manualBookModal.slot.price.toLocaleString()} UZS
                  </Text>
                </View>
              )}

              <LabeledInput label="Mijoz ismi *" value={manualName} onChangeText={setManualName}
                placeholder="Aziz bank" />
              <LabeledInput label="Telefon raqami *" value={manualPhone} onChangeText={setManualPhone}
                placeholder="+998 90 123 45 67" keyboardType="phone-pad" />

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Haftalik doimiy mijoz</Text>
                  <Text style={styles.switchSub}>Har haftaik bu vaqt band qilinadi</Text>
                </View>
                <Switch
                  value={manualRecurring}
                  onValueChange={setManualRecurring}
                  trackColor={{ false: THEME.colors.border, true: THEME.colors.primaryLight }}
                  thumbColor={manualRecurring ? THEME.colors.primary : '#CBD5E1'}
                />
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="paper-plane" size={13} color={THEME.colors.info} />
                <Text style={styles.infoText}>
                  Mijozning telefoni tizimda bo'lsa, Telegram bot orqali avtomatik xabar yuboriladi.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary, manualLoading && styles.actionBtnDisabled]}
                onPress={handleManualBook}
                disabled={manualLoading}
              >
                {manualLoading ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>Band Qilish</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Sub-Components ─────────────────────────────────────

const SectionCard: React.FC<{ icon: any; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionCardHeader}>
      <Ionicons name={icon} size={18} color={THEME.colors.primary} />
      <Text style={styles.sectionCardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const LabeledInput: React.FC<{
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: any;
}> = ({ label, value, onChangeText, placeholder, multiline, keyboardType }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline]}
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={THEME.colors.textMuted}
      multiline={multiline} numberOfLines={multiline ? 3 : 1}
      keyboardType={keyboardType || 'default'}
    />
  </View>
);

const PricingSlotCard: React.FC<{
  icon: string; label: string; timeRange: string;
  value: string; onChange: (v: string) => void; color: string;
}> = ({ icon, label, timeRange, value, onChange, color }) => (
  <View style={[styles.pricingCard, { borderLeftColor: color }]}>
    <Text style={styles.pricingIcon}>{icon}</Text>
    <View style={styles.pricingInfo}>
      <Text style={styles.pricingLabel}>{label}</Text>
      <Text style={[styles.pricingTime, { color }]}>{timeRange}</Text>
    </View>
    <View style={styles.pricingInputWrap}>
      <TextInput
        style={[styles.pricingInput, { borderColor: color + '40' }]}
        value={value} onChangeText={onChange}
        keyboardType="numeric" placeholder="0"
        placeholderTextColor={THEME.colors.textMuted}
      />
      <Text style={styles.pricingCurrency}>UZS</Text>
    </View>
  </View>
);

const StatBubble: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.statBubble}>
    <Text style={[styles.statBubbleValue, { color }]}>{value}</Text>
    <Text style={styles.statBubbleLabel}>{label}</Text>
  </View>
);

const SlotCard: React.FC<{
  slot: Slot;
  onToggleBlock: (s: Slot) => void;
  onManualBook: (s: Slot) => void;
}> = ({ slot, onToggleBlock, onManualBook }) => {
  const cfg = STATUS_CONFIG[slot.status] || STATUS_CONFIG['AVAILABLE'];
  const canBlock = slot.status === 'AVAILABLE' || slot.status === 'BLOCKED';
  const canManual = slot.status === 'AVAILABLE';

  return (
    <View style={[styles.slotCard, { borderLeftColor: cfg.color }]}>
      <View style={styles.slotCardTop}>
        <View style={styles.slotTime}>
          <Ionicons name="time-outline" size={14} color={THEME.colors.textMuted} />
          <Text style={styles.slotTimeText}>
            {slot.start_time.slice(11, 16)} – {slot.end_time.slice(11, 16)}
          </Text>
        </View>
        <View style={[styles.slotStatusPill, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
          <Text style={[styles.slotStatusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={styles.slotPrice}>{slot.price.toLocaleString()} UZS</Text>
      </View>

      {(slot.booked_by_name || slot.booked_by_phone) && (
        <View style={styles.slotBookedBy}>
          <Ionicons name="person" size={12} color={THEME.colors.textMuted} />
          <Text style={styles.slotBookedByText}>
            {slot.booked_by_name}{slot.booked_by_phone ? ` · ${slot.booked_by_phone}` : ''}
            {slot.is_recurring ? ' · Doimiy' : ''}
          </Text>
        </View>
      )}

      <View style={styles.slotActions}>
        {canBlock && (
          <TouchableOpacity
            style={[styles.slotActionBtn, slot.status === 'AVAILABLE' ? styles.slotBtnBlock : styles.slotBtnOpen]}
            onPress={() => onToggleBlock(slot)}
          >
            <Ionicons
              name={slot.status === 'AVAILABLE' ? 'ban' : 'checkmark-circle'}
              size={13}
              color={slot.status === 'AVAILABLE' ? THEME.colors.danger : THEME.colors.primary}
            />
            <Text style={[styles.slotActionBtnText, { color: slot.status === 'AVAILABLE' ? THEME.colors.danger : THEME.colors.primary }]}>
              {slot.status === 'AVAILABLE' ? 'Yopish' : 'Ochish'}
            </Text>
          </TouchableOpacity>
        )}
        {canManual && (
          <TouchableOpacity style={[styles.slotActionBtn, styles.slotBtnManual]} onPress={() => onManualBook(slot)}>
            <Ionicons name="call" size={13} color="#8B5CF6" />
            <Text style={[styles.slotActionBtnText, { color: '#8B5CF6' }]}>Qo'lda Band</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1, borderBottomColor: THEME.colors.border, gap: 10,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: THEME.colors.surfaceLight,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: THEME.colors.textPrimary },
  rtBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  rtDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.colors.primary, marginRight: 5 },
  rtText: { fontSize: 10, color: THEME.colors.primary, fontWeight: '600' },
  saveBtn: { backgroundColor: THEME.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnLoading: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  tabBar: { flexDirection: 'row', backgroundColor: THEME.colors.surface, paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: 12, backgroundColor: THEME.colors.surfaceLight,
  },
  tabBtnActive: { backgroundColor: THEME.colors.primaryBg },
  tabLabel: { fontSize: 12, color: THEME.colors.textMuted, fontWeight: '600' },
  tabLabelActive: { color: THEME.colors.primary },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionCard: {
    backgroundColor: THEME.colors.surface, borderRadius: 20, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: THEME.colors.border,
  },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionCardTitle: { fontSize: 15, fontWeight: '700', color: THEME.colors.textPrimary },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: THEME.colors.textSecondary, marginBottom: 5 },
  input: {
    borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: THEME.colors.textPrimary, backgroundColor: THEME.colors.surfaceLight,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  rowHalf: { flex: 1 },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: THEME.colors.border, marginTop: 4,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: THEME.colors.textPrimary },
  switchSub: { fontSize: 11, color: THEME.colors.textMuted, marginTop: 2 },
  amenitySub: { fontSize: 12, color: THEME.colors.textMuted, marginBottom: 12 },
  amenityRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: THEME.colors.border,
  },
  amenityIcon: { fontSize: 22, width: 36, textAlign: 'center' },
  amenityInfo: { flex: 1, marginLeft: 10 },
  amenityLabel: { fontSize: 14, fontWeight: '600', color: THEME.colors.textPrimary },
  amenitySub2: { fontSize: 11, color: THEME.colors.textMuted, marginTop: 1 },
  pricingDescription: { fontSize: 12, color: THEME.colors.textSecondary, marginBottom: 14, lineHeight: 18 },
  pricingCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 14, marginBottom: 10,
    backgroundColor: THEME.colors.surfaceLight, borderLeftWidth: 4,
  },
  pricingIcon: { fontSize: 24, marginRight: 10 },
  pricingInfo: { flex: 1 },
  pricingLabel: { fontSize: 13, fontWeight: '700', color: THEME.colors.textPrimary },
  pricingTime: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  pricingInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pricingInput: {
    width: 100, borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 14, fontWeight: '700', color: THEME.colors.textPrimary,
    textAlign: 'right', backgroundColor: THEME.colors.surface,
  },
  pricingCurrency: { fontSize: 12, color: THEME.colors.textMuted, fontWeight: '600' },
  pricingActions: { gap: 8, marginTop: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 14,
  },
  actionBtnPrimary: { backgroundColor: THEME.colors.primary },
  actionBtnSecondary: {
    backgroundColor: THEME.colors.primaryBg,
    borderWidth: 1.5, borderColor: THEME.colors.primary + '50',
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  statsLoading: { paddingVertical: 20, alignItems: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  statBubble: { alignItems: 'center' },
  statBubbleValue: { fontSize: 22, fontWeight: '800' },
  statBubbleLabel: { fontSize: 10, color: THEME.colors.textMuted, marginTop: 2 },
  revenueCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.colors.primaryBg, padding: 10, borderRadius: 12,
  },
  revenueLabel: { fontSize: 13, color: THEME.colors.textSecondary, fontWeight: '600' },
  revenueValue: { fontSize: 15, fontWeight: '800', color: THEME.colors.primary },
  infoBox: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    backgroundColor: 'rgba(14,165,233,0.06)', padding: 10, borderRadius: 10, marginTop: 10,
  },
  infoText: { flex: 1, fontSize: 11, color: THEME.colors.textSecondary, lineHeight: 16 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateChip: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 14, backgroundColor: THEME.colors.surfaceLight,
    borderWidth: 1, borderColor: THEME.colors.border,
  },
  dateChipActive: { backgroundColor: THEME.colors.primaryBg, borderColor: THEME.colors.primary },
  dateChipDay: { fontSize: 10, color: THEME.colors.textMuted, fontWeight: '600' },
  dateChipDayActive: { color: THEME.colors.primary },
  dateChipNum: { fontSize: 16, color: THEME.colors.textPrimary, fontWeight: '800' },
  dateChipNumActive: { color: THEME.colors.primary },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, color: THEME.colors.textMuted, fontWeight: '600' },
  slotsLoading: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  slotsLoadingText: { color: THEME.colors.textMuted, fontSize: 13 },
  emptySlots: {
    alignItems: 'center', paddingVertical: 48,
    backgroundColor: THEME.colors.surface, borderRadius: 20, marginTop: 4,
    borderWidth: 1, borderColor: THEME.colors.border,
  },
  emptySlotsIcon: { fontSize: 36, marginBottom: 10 },
  emptySlotsTitle: { fontSize: 16, fontWeight: '700', color: THEME.colors.textPrimary, marginBottom: 6 },
  emptySlotsText: {
    fontSize: 12, color: THEME.colors.textMuted, textAlign: 'center',
    lineHeight: 18, paddingHorizontal: 24,
  },
  slotCard: {
    backgroundColor: THEME.colors.surface, borderRadius: 16,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: THEME.colors.border, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  slotCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  slotTime: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slotTimeText: { fontSize: 14, fontWeight: '700', color: THEME.colors.textPrimary },
  slotStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  slotStatusText: { fontSize: 10, fontWeight: '700' },
  slotPrice: { marginLeft: 'auto', fontSize: 13, fontWeight: '700', color: THEME.colors.textSecondary },
  slotBookedBy: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, marginBottom: 4 },
  slotBookedByText: { fontSize: 11, color: THEME.colors.textMuted },
  slotActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  slotActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  slotBtnBlock: { borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.05)' },
  slotBtnOpen: { borderColor: 'rgba(5,150,105,0.25)', backgroundColor: 'rgba(5,150,105,0.05)' },
  slotBtnManual: { borderColor: 'rgba(139,92,246,0.25)', backgroundColor: 'rgba(139,92,246,0.05)' },
  slotActionBtnText: { fontSize: 11, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: THEME.colors.textPrimary },
  modalSlotInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.colors.primaryBg, padding: 10, borderRadius: 12, marginBottom: 14,
  },
  modalSlotTime: { fontSize: 14, fontWeight: '700', color: THEME.colors.primary, flex: 1 },
  modalSlotPrice: { fontSize: 13, fontWeight: '700', color: THEME.colors.textSecondary },
});
