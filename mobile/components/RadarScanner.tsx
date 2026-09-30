import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface RadarScannerProps {
  isLooking: boolean;
  nearbyCount: number;
  loading: boolean;
  onToggle: () => void;
}

export const RadarScanner: React.FC<RadarScannerProps> = ({
  isLooking,
  nearbyCount,
  loading,
  onToggle,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.radarCard}>
        <View style={styles.radarVisual}>
          <View style={[styles.pulseOuter, isLooking && styles.pulseActive]}>
            <View style={[styles.pulseInner, isLooking && styles.pulseInnerActive]}>
              <Ionicons
                name={isLooking ? 'radio' : 'football'}
                size={18}
                color={isLooking ? THEME.colors.textDark : THEME.colors.textSecondary}
              />
            </View>
          </View>
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.radarTitle}>
            {isLooking ? "Radar Faol: O'yin qidirilmoqda" : "Solo Radar O'chiq"}
          </Text>
          <Text style={styles.radarDesc}>
            {isLooking
              ? `Yaqin 15 km radiusda ${nearbyCount} ta o'yinchi tayyor`
              : "Rejimni yoqing — jamoalar sizni o'yinga taklif qiladi"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.toggleBtn, isLooking ? styles.toggleBtnActive : styles.toggleBtnInactive]}
          onPress={onToggle}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={isLooking ? THEME.colors.danger : THEME.colors.textDark} />
          ) : (
            <Text style={[styles.toggleText, isLooking ? styles.toggleTextActive : styles.toggleTextInactive]}>
              {isLooking ? "O'chirish" : 'Yoqish'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  radarCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  radarVisual: {
    marginRight: 12,
  },
  pulseOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseActive: {
    backgroundColor: THEME.colors.primaryBg,
  },
  pulseInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseInnerActive: {
    backgroundColor: THEME.colors.primary,
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  radarTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  radarDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radius.full,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  toggleBtnInactive: {
    backgroundColor: THEME.colors.primary,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  toggleTextActive: {
    color: THEME.colors.danger,
  },
  toggleTextInactive: {
    color: '#FFFFFF',
  },
});
