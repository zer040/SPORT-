import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { PitchImageCarousel } from './PitchImageCarousel';

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    address: string;
    city: string;
    district?: string;
    avg_rating: number;
    min_price?: number;
    facilities?: Record<string, boolean>;
    primary_image_url?: string;
    images?: string[];
  };
  onSelect: (venue: any) => void;
}

export const VenueCard: React.FC<VenueCardProps> = ({ venue, onSelect }) => {
  // 3-photo curated gallery for each venue
  const galleryImages = [
    venue.primary_image_url || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=900&auto=format&fit=crop',
  ];

  return (
    <View style={styles.card}>
      {/* Premium Multi-Photo Slider */}
      <PitchImageCarousel
        images={galleryImages}
        city={venue.city}
        rating={venue.avg_rating || 4.9}
        height={170}
      />

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={THEME.colors.textSecondary} />
          <Text style={styles.address} numberOfLines={1}>{venue.address}</Text>
        </View>

        {/* Professional Facility Badges (No emojis!) */}
        <View style={styles.facilitiesRow}>
          {venue.facilities?.parking && (
            <View style={styles.facilityPill}>
              <Ionicons name="car-outline" size={13} color={THEME.colors.primary} />
              <Text style={styles.facilityText}>Parkovka</Text>
            </View>
          )}
          {venue.facilities?.shower && (
            <View style={styles.facilityPill}>
              <Ionicons name="water-outline" size={13} color={THEME.colors.primary} />
              <Text style={styles.facilityText}>Dush</Text>
            </View>
          )}
          {venue.facilities?.lighting && (
            <View style={styles.facilityPill}>
              <Ionicons name="flashlight-outline" size={13} color={THEME.colors.primary} />
              <Text style={styles.facilityText}>Yoritgich</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.priceLabel}>Narx (1 soat)</Text>
            <Text style={styles.priceValue}>
              {venue.min_price ? `${Number(venue.min_price).toLocaleString()} UZS` : '180,000 UZS'}
            </Text>
          </View>

          <TouchableOpacity style={styles.bookButton} onPress={() => onSelect(venue)} activeOpacity={0.85}>
            <Text style={styles.bookButtonText}>Bron qilish</Text>
            <Ionicons name="arrow-forward" size={15} color={THEME.colors.textDark} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    marginBottom: THEME.spacing.md,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  address: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  facilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  facilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 255, 135, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
  },
  facilityText: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  priceLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
  },
  bookButtonText: {
    color: THEME.colors.textDark,
    fontSize: 13,
    fontWeight: '800',
  },
});
