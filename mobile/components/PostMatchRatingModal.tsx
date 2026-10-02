import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';

interface PostMatchRatingModalProps {
  visible: boolean;
  venueName: string;
  venueId: string;
  bookingId?: string;
  pitchName?: string;
  onSubmit: (rating: number, comment: string, tags: string[]) => Promise<void>;
  onClose?: () => void;
}

const AVAILABLE_TAGS = [
  { id: 'yaxshi_chim', label: '🌱 Yaxshi chim' },
  { id: 'toza_dush', label: '🚿 Toza dush' },
  { id: 'toza_kiyinish', label: '👕 Kiyinish xonasi' },
  { id: 'yoritish_alo', label: '💡 A’lo yoritish' },
  { id: 'qulay_parkovka', label: '🚗 Qulay parkovka' },
  { id: 'past_yoruglik', label: '⚠️ Kuchsiz yorug‘lik' },
];

export const PostMatchRatingModal: React.FC<PostMatchRatingModalProps> = ({
  visible,
  venueName,
  venueId,
  bookingId,
  pitchName,
  onSubmit,
  onClose,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSelectStar = (stars: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setRating(stars);
  };

  const handleToggleTag = (tagId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleSend = async () => {
    if (rating === 0) {
      Alert.alert(
        'Baholang',
        'Iltimos, stadion sifatini baholash uchun kamida 1 ta yulduzcha tanlang.'
      );
      return;
    }

    setSubmitting(true);
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      await onSubmit(rating, comment.trim(), selectedTags);
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Baholashni yuborishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Top Brand Circle */}
          <View style={styles.iconCircle}>
            <Ionicons name="football" size={32} color={THEME.colors.primary} />
          </View>

          <Text style={styles.title}>O‘yin qanday o‘tdi?</Text>
          <Text style={styles.subtitle}>
            <Text style={{ fontWeight: '700', color: '#0F172A' }}>{venueName}</Text>
            {pitchName ? ` (${pitchName})` : ''} stadionidagi tajribangizni baholang:
          </Text>

          {/* Yulduzchalar bloki (Majburiy) */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleSelectStar(star)}
                activeOpacity={0.7}
                style={styles.starTouch}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={38}
                  color={star <= rating ? '#EAB308' : '#CBD5E1'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Reyting holati ko'rsatkichi */}
          <Text style={styles.ratingHint}>
            {rating === 0
              ? 'Baho berish majburiy (1 - 5)'
              : rating === 5
              ? 'A’lo darajada! ⭐⭐⭐⭐⭐'
              : rating === 4
              ? 'Yaxshi! ⭐⭐⭐⭐'
              : rating === 3
              ? 'O‘rtacha ⭐⭐⭐'
              : 'Qoniqarsiz'}
          </Text>

          {/* One-tap badges / Quick tags */}
          <Text style={styles.tagsLabel}>Tezkor taassurotlar (teglar):</Text>
          <View style={styles.tagsWrap}>
            {AVAILABLE_TAGS.map((t) => {
              const active = selectedTags.includes(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tagPill, active && styles.tagPillActive]}
                  onPress={() => handleToggleTag(t.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Ixtiyoriy Sharh (Optional) */}
          <TextInput
            style={styles.input}
            placeholder="Fikringiz yoki taklifingiz bormi? (Ixtiyoriy)"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={comment}
            onChangeText={setComment}
          />

          {/* Tasdiqlash tugmasi */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (rating === 0 || submitting) && styles.disabledButton,
            ]}
            onPress={handleSend}
            disabled={rating === 0 || submitting}
            activeOpacity={0.88}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.btnRow}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>Yuborish va davom etish</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 19,
    paddingHorizontal: 10,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starTouch: {
    padding: 4,
  },
  ratingHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 14,
  },
  tagsLabel: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
    marginBottom: 14,
  },
  tagPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  tagText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  tagTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  input: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    height: 72,
    marginBottom: 16,
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
