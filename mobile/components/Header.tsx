import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface HeaderProps {
  user: any | null;
  reliabilityScore?: number;
  onProfilePress?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  reliabilityScore = 98.5,
  onProfilePress,
  onLogout,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <Ionicons name="football" size={20} color={THEME.colors.primary} />
          <Text style={styles.logoText}>SPORT<Text style={styles.plusSign}>+</Text></Text>
        </View>
        <Text style={styles.subtitle}>Toshkent & Jizzax Futbol Ekotizimi</Text>
      </View>

      <View style={styles.actionsRow}>
        {user ? (
          <TouchableOpacity style={styles.profileBadge} onPress={onProfilePress} activeOpacity={0.8}>
            <View style={styles.karmaChip}>
              <Ionicons name="shield-checkmark" size={13} color={THEME.colors.accent} />
              <Text style={styles.karmaText}>{reliabilityScore.toFixed(0)}%</Text>
            </View>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {user.full_name
                  ? user.full_name.trim().charAt(0).toUpperCase()
                  : user.first_name
                  ? user.first_name.trim().charAt(0).toUpperCase()
                  : 'U'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.loginChip} onPress={onProfilePress} activeOpacity={0.8}>
            <Ionicons name="log-in-outline" size={16} color={THEME.colors.textDark} />
            <Text style={styles.loginText}>Kirish</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  brandRow: {
    flexDirection: 'column',
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 1,
  },
  plusSign: {
    color: THEME.colors.primary,
  },
  subtitle: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  karmaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(204, 255, 0, 0.1)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.25)',
  },
  karmaText: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.accent,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: THEME.colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  loginChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.radius.full,
  },
  loginText: {
    color: THEME.colors.textDark,
    fontWeight: '900',
    fontSize: 12,
  },
});
