import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface SoloMatchCardProps {
  match: {
    id: string;
    match_type: string;
    venue_name?: string;
    host_name?: string;
    start_time: string;
    end_time: string;
    required_players: number;
    joined_players: number;
    available_spots: number;
    price_per_player: number;
    skill_level: string;
    status: string;
  };
  onJoin: (match: any) => void;
}

export const SoloMatchCard: React.FC<SoloMatchCardProps> = ({ match, onJoin }) => {
  const percent = Math.min(100, Math.round((match.joined_players / match.required_players) * 100));
  const startTime = new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(match.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.typeBadge}>
          <Ionicons
            name={match.match_type === 'HOST_BASED' ? 'football-outline' : 'locate-outline'}
            size={12}
            color={THEME.colors.primary}
          />
          <Text style={styles.typeText}>
            {match.match_type === 'HOST_BASED' ? 'Host Match' : 'Draft Match'}
          </Text>
        </View>

        <View style={styles.skillBadge}>
          <Ionicons name="ribbon-outline" size={11} color={THEME.colors.textSecondary} />
          <Text style={styles.skillText}>{match.skill_level}</Text>
        </View>
      </View>

      <Text style={styles.venueTitle}>{match.venue_name || 'Lokal Stadion'}</Text>
      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={13} color={THEME.colors.textSecondary} />
        <Text style={styles.timeText}>Bugun, {startTime} – {endTime}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Tarkib yig'ilishi</Text>
          <Text style={styles.progressValue}>
            {match.joined_players}/{match.required_players} ({match.available_spots} ta joy qoldi)
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
        </View>
      </View>

      <View style={styles.footerRow}>
        <View>
          <Text style={styles.priceLabel}>Ulush (1 kishi)</Text>
          <Text style={styles.priceValue}>{Number(match.price_per_player).toLocaleString()} UZS</Text>
        </View>

        <TouchableOpacity
          style={[styles.joinBtn, match.available_spots === 0 && styles.disabledBtn]}
          onPress={() => onJoin(match)}
          disabled={match.available_spots === 0}
          activeOpacity={0.85}
        >
          <Text style={styles.joinBtnText}>{match.available_spots === 0 ? "To'lgan" : "Qo'shilish"}</Text>
          {match.available_spots > 0 && (
            <Ionicons name="add" size={16} color={THEME.colors.textDark} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
    marginHorizontal: THEME.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderActive,
  },
  typeText: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.surfaceLight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  skillText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  venueTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  timeText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: THEME.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  priceLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: THEME.radius.md,
  },
  disabledBtn: {
    backgroundColor: THEME.colors.border,
    opacity: 0.7,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
