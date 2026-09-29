import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

export type TabKey = 'venues' | 'solo' | 'bookings' | 'owner' | 'profile';

interface BottomNavProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  bookingCount?: number;
  isOwner?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, bookingCount = 0, isOwner = false }) => {
  const tabs: { key: TabKey; label: string; iconName: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'venues', label: 'Maydonlar', iconName: 'grid' },
    { key: 'solo', label: 'Solo Play', iconName: 'football' },
    { key: 'bookings', label: 'Bronlar', iconName: 'ticket' },
    ...(isOwner ? [{ key: 'owner' as TabKey, label: 'Boshqaruv', iconName: 'shield-checkmark' as keyof typeof Ionicons.glyphMap }] : []),
    { key: 'profile', label: 'Profil', iconName: 'person' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={tab.iconName}
                size={20}
                color={isActive ? THEME.colors.primary : THEME.colors.textMuted}
              />
              <Text style={[styles.label, isActive && styles.activeLabel]}>{tab.label}</Text>

              {tab.key === 'bookings' && bookingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{bookingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: THEME.spacing.md,
    paddingBottom: 22,
    backgroundColor: 'transparent',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(17, 23, 38, 0.96)',
    borderRadius: THEME.radius.full,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.full,
    position: 'relative',
    gap: 3,
  },
  activeTabButton: {
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
  },
  label: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  activeLabel: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 12,
    backgroundColor: THEME.colors.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
});
