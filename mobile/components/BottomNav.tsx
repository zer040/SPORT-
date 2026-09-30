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
  const tabs: { key: TabKey; label: string; iconName: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'venues', label: 'Maydonlar', iconName: 'grid-outline', activeIcon: 'grid' },
    { key: 'solo', label: 'Solo Play', iconName: 'football-outline', activeIcon: 'football' },
    { key: 'bookings', label: 'Bronlar', iconName: 'ticket-outline', activeIcon: 'ticket' },
    ...(isOwner ? [{ key: 'owner' as TabKey, label: 'Boshqaruv', iconName: 'shield-outline' as keyof typeof Ionicons.glyphMap, activeIcon: 'shield-checkmark' as keyof typeof Ionicons.glyphMap }] : []),
    { key: 'profile', label: 'Profil', iconName: 'person-outline', activeIcon: 'person' },
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
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.iconName}
                size={22}
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
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  navBar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 26,  // safe area bottom
    paddingHorizontal: 4,
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: THEME.radius.md,
    position: 'relative',
    gap: 3,
  },
  activeTabButton: {
    // Subtle green tint pill around active icon
  },
  label: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  activeLabel: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 10,
    backgroundColor: THEME.colors.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: THEME.colors.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
});
