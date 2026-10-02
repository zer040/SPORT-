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
    total_reviews?: number;
    is_super_host?: boolean;
    recommendation_score?: number;
    min_price?: number;
    facilities?: Record<string, boolean>;
    primary_image_url?: string;
    images?: string[];
  };
  onSelect: (venue: any) => void;
  onPressDetails?: (venue: any) => void;
}

export const VenueCard: React.FC<VenueCardProps> = ({ venue, onSelect, onPressDetails }) => {
  // 3-photo curated gallery for each venue
  const galleryImages = [
    venue.primary_image_url || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=900&auto=format&fit=crop',
  ];

  const ratingVal = Number(venue.avg_rating || 4.9).toFixed(1);
  const reviewsCount = venue.total_reviews ?? 0;
  const isSuperHost = venue.is_super_host || Number(ratingVal) >= 4.5;

  const handleCardPress = () => {
    if (onPressDetails) {
      onPressDetails(venue);
    } else {
      onSelect(venue);
    }
  };

  return (
    <View style={styles.card}>
      {/* Clickable Image Carousel Header */}
      <TouchableOpacity activeOpacity={0.92} onPress={handleCardPress}>
        <PitchImageCarousel
          images={galleryImages}
          city={venue.city}
          rating={venue.avg_rating || 4.9}
          height={170}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.content} activeOpacity={0.9} onPress={handleCardPress}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
          {isSuperHost && (
            <View style={styles.superHostBadge}>
              <Ionicons name="sparkles" size={11} color="#059669" />
              <Text style={styles.superHostText}>TOP TAVSIYA</Text>
            </View>
          )}
        </View>

        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={THEME.colors.textSecondary} />
          <Text style={styles.address} numberOfLines={1}>{venue.address}</Text>
        </View>

        {/* Rating & Reviews summary line */}
        <View style={styles.ratingRow}>
          <View style={styles.starPill}>
            <Ionicons name="star" size={13} color="#EAB308" />
            <Text style={styles.ratingNum}>{ratingVal}</Text>
          </View>
          <Text style={styles.reviewsCountText}>
            {reviewsCount > 0 ? `(${reviewsCount} ta sharh)` : '(Yangi maydon)'}
          </Text>
        </View>

        {/* Professional Facility Badges */}
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

          <View style={styles.actionButtonsRow}>
            {onPressDetails && (
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => onPressDetails(venue)}
                activeOpacity={0.8}
              >
                <Ionicons name="information-circle-outline" size={16} color={THEME.colors.textSecondary} />
                <Text style={styles.detailsButtonText}>Tafsilotlar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.bookButton} onPress={() => onSelect(venue)} activeOpacity={0.85}>
              <Text style={styles.bookButtonText}>Bron qilish</Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
    marginHorizontal: THEME.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    flex: 1,
    letterSpacing: -0.3,
  },
  superHostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.full,
    marginLeft: 8,
  },
  superHostText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  address: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#854D0E',
  },
  reviewsCountText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
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
    backgroundColor: THEME.colors.primaryBg,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderActive,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
  },
  facilityText: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
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
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailsButtonText: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: THEME.radius.md,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
