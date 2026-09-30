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
      {/* Brand Logo only — no subtitle clutter */}
      <View style={styles.logoBadge}>
        <View style={styles.logoIcon}>
          <Ionicons name="football" size={18} color={THEME.colors.primary} />
        </View>
        <Text style={styles.logoText}>
          SPORT<Text style={styles.plusSign}>+</Text>
        </Text>
      </View>

      <View style={styles.actionsRow}>
        {user ? (
          <TouchableOpacity style={styles.profileBadge} onPress={onProfilePress} activeOpacity={0.8}>
            <View style={styles.karmaChip}>
              <Ionicons name="shield-checkmark" size={12} color={THEME.colors.primary} />
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
            <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
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
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: THEME.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: 0.5,
  },
  plusSign: {
    color: THEME.colors.primary,
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
    backgroundColor: THEME.colors.primaryBg,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderActive,
  },
  karmaText: {
    fontSize: 11,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.primaryMuted,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: THEME.colors.primary,
    fontWeight: '800',
    fontSize: 14,
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
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
});
