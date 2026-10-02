import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Api } from '../services/api';

const { width } = Dimensions.get('window');

interface VenueDetailsModalProps {
  visible: boolean;
  venueId: string;
  initialVenue?: any;
  onClose: () => void;
  onBookNow: (venue: any) => void;
}

export const VenueDetailsModal: React.FC<VenueDetailsModalProps> = ({
  visible,
  venueId,
  initialVenue,
  onClose,
  onBookNow,
}) => {
  const [venue, setVenue] = useState<any>(initialVenue || null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(!initialVenue);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  useEffect(() => {
    if (visible && venueId) {
      loadVenueDetails();
    }
  }, [visible, venueId]);

  const loadVenueDetails = async () => {
    try {
      setLoading(true);
      const data = await Api.getVenueDetails(venueId);
      if (data) {
        setVenue(data);
        if (data.reviews) {
          setReviews(data.reviews);
        }
      }
    } catch {
      // Fallback: load reviews separately
      try {
        const revs = await Api.getVenueReviews(venueId);
        setReviews(revs || []);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const openNavigation = () => {
    const lat = venue?.location?.lat || venue?.lat || 41.2858;
    const lon = venue?.location?.lon || venue?.lon || 69.2163;
    const label = encodeURIComponent(venue?.name || 'Futbol Maydoni');
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}(${label})`,
      default: `https://yandex.uz/maps/?pt=${lon},${lat}&z=16&l=map`,
    });
    Linking.openURL(url || `https://yandex.uz/maps/?pt=${lon},${lat}`);
  };

  if (!visible) return null;

  const currentVenue = venue || initialVenue;
  const gallery = currentVenue?.images && currentVenue.images.length > 0
    ? currentVenue.images.map((img: any) => (typeof img === 'string' ? img : img.image_url))
    : [
        currentVenue?.primary_image_url ||
          'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=900&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=900&auto=format&fit=crop',
      ];

  const avgRating = Number(currentVenue?.avg_rating || 5.0).toFixed(1);
  const totalReviews = currentVenue?.total_reviews || reviews.length || 0;
  const isSuperHost = Number(avgRating) >= 4.5;
  const minPrice = currentVenue?.min_price || currentVenue?.base_price_per_hour || 180000;
  const facilities = currentVenue?.facilities || {};

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Sticky Close Button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#0F172A" />
        </TouchableOpacity>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Yuqori Galereya Slayderi */}
          <View style={styles.galleryWrap}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                setActiveImageIndex(idx);
              }}
            >
              {gallery.map((imgUri: string, idx: number) => (
                <Image key={idx} source={{ uri: imgUri }} style={styles.sliderImage} />
              ))}
            </ScrollView>

            {/* Pagination dots */}
            <View style={styles.dotsWrap}>
              {gallery.map((_: any, idx: number) => (
                <View
                  key={idx}
                  style={[styles.dot, activeImageIndex === idx && styles.activeDot]}
                />
              ))}
            </View>

            {/* Super Host Badge on Image */}
            {isSuperHost && (
              <View style={styles.superHostBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                <Text style={styles.superHostText}>TOP TAVSIYA</Text>
              </View>
            )}
          </View>

          {/* 2. Asosiy Ma'lumot (Header Card) */}
          <View style={styles.mainInfoCard}>
            <View style={styles.titleRow}>
              <Text style={styles.venueName}>{currentVenue?.name || 'Bunyodkor Arena'}</Text>
              <View style={styles.ratingBox}>
                <Ionicons name="star" size={15} color="#EAB308" />
                <Text style={styles.ratingScore}>{avgRating}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="location" size={15} color="#059669" />
              <Text style={styles.venueAddress}>
                {currentVenue?.address || 'Chilonzor tumani'}, {currentVenue?.city || 'Toshkent'}
              </Text>
            </View>

            <View style={styles.reviewsCountRow}>
              <Text style={styles.reviewsCountText}>
                ⭐ {avgRating} • {totalReviews} ta o‘yinchi baholagan
              </Text>
            </View>
          </View>

          {/* 3. Stadion Pasporti (Owner Kiritgan Ma'lumotlar) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Stadion Pasporti</Text>

            <View style={styles.passportGrid}>
              <View style={styles.passportItem}>
                <MaterialCommunityIcons name="soccer-field" size={20} color="#059669" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.passportLabel}>Maydon o‘lchami</Text>
                  <Text style={styles.passportValue}>7x7 va 5x5 Mini</Text>
                </View>
              </View>

              <View style={styles.passportItem}>
                <Feather name="clock" size={18} color="#059669" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.passportLabel}>Ish vaqti</Text>
                  <Text style={styles.passportValue}>
                    {currentVenue?.working_hours_start?.slice(0, 5) || '07:00'} – {currentVenue?.working_hours_end?.slice(0, 5) || '02:00'}
                  </Text>
                </View>
              </View>

              <View style={styles.passportItem}>
                <Ionicons name="sparkles-outline" size={18} color="#059669" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.passportLabel}>Chim qoplami</Text>
                  <Text style={styles.passportValue}>Sun’iy monofilament (40mm)</Text>
                </View>
              </View>
            </View>

            {/* Qulayliklar (Icons: Dush, Parkovka, Projektor, Kiyinish xonasi, Kafe) */}
            <Text style={[styles.sectionSubHeading, { marginTop: 16 }]}>Qulayliklar (Amenities)</Text>
            <View style={styles.amenitiesRow}>
              <View style={[styles.amenityChip, facilities.shower && styles.amenityChipActive]}>
                <Ionicons name="water-outline" size={16} color={facilities.shower ? '#059669' : '#94A3B8'} />
                <Text style={[styles.amenityText, facilities.shower && styles.amenityTextActive]}>Issiq dush</Text>
              </View>

              <View style={[styles.amenityChip, facilities.parking && styles.amenityChipActive]}>
                <Ionicons name="car-outline" size={16} color={facilities.parking ? '#059669' : '#94A3B8'} />
                <Text style={[styles.amenityText, facilities.parking && styles.amenityTextActive]}>Parkovka</Text>
              </View>

              <View style={[styles.amenityChip, facilities.lighting && styles.amenityChipActive]}>
                <Ionicons name="flashlight-outline" size={16} color={facilities.lighting ? '#059669' : '#94A3B8'} />
                <Text style={[styles.amenityText, facilities.lighting && styles.amenityTextActive]}>Projektor</Text>
              </View>

              <View style={[styles.amenityChip, styles.amenityChipActive]}>
                <Ionicons name="shirt-outline" size={16} color="#059669" />
                <Text style={[styles.amenityText, styles.amenityTextActive]}>Kiyinish xonasi</Text>
              </View>

              <View style={[styles.amenityChip, facilities.cafe && styles.amenityChipActive]}>
                <Ionicons name="cafe-outline" size={16} color={facilities.cafe ? '#059669' : '#94A3B8'} />
                <Text style={[styles.amenityText, facilities.cafe && styles.amenityTextActive]}>Kafe & Suv</Text>
              </View>
            </View>

            {/* Maydon Qoidalari */}
            <View style={styles.rulesBox}>
              <Ionicons name="information-circle" size={18} color="#0284C7" />
              <Text style={styles.rulesText}>
                Maydon qoidasi: Faqat butsa (kopi) yoki krossovkada o‘ynashga ruxsat etiladi. Metall tishli oyoq kiyim taqiqlanadi.
              </Text>
            </View>
          </View>

          {/* 4. Interaktiv Xarita & Navigator */}
          <View style={styles.sectionCard}>
            <View style={styles.mapHeaderRow}>
              <View>
                <Text style={styles.sectionHeading}>Joylashuv va Xarita</Text>
                <Text style={styles.mapSubText}>{currentVenue?.address || 'Toshkent shahri'}</Text>
              </View>
              <TouchableOpacity style={styles.navButton} onPress={openNavigation} activeOpacity={0.85}>
                <Ionicons name="navigate" size={16} color="#FFFFFF" />
                <Text style={styles.navButtonText}>Xaritada ochish</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 5. Foydalanuvchilar Sharhlari (Reviews & Comments) */}
          <View style={styles.sectionCard}>
            <View style={styles.reviewsHeaderRow}>
              <Text style={styles.sectionHeading}>O‘yinchilar Sharhlari</Text>
              <Text style={styles.reviewsCountBadge}>{reviews.length} ta</Text>
            </View>

            {loading ? (
              <ActivityIndicator color={THEME.colors.primary} style={{ marginVertical: 20 }} />
            ) : reviews.length === 0 ? (
              <View style={styles.emptyReviews}>
                <Ionicons name="chatbubbles-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyReviewsTitle}>Hali sharhlar qoldirilmagan</Text>
                <Text style={styles.emptyReviewsSub}>O‘yindan so‘ng birinchi bo‘lib baho bering!</Text>
              </View>
            ) : (
              reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewItem}>
                  <View style={styles.reviewUserRow}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.avatarLetter}>
                        {(rev.user_name || 'O')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.reviewUserName}>{rev.user_name || 'O‘yinchi'}</Text>
                      <Text style={styles.reviewDate}>
                        {new Date(rev.created_at).toLocaleDateString('uz-UZ', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= rev.rating ? 'star' : 'star-outline'}
                          size={13}
                          color={s <= rev.rating ? '#EAB308' : '#CBD5E1'}
                        />
                      ))}
                    </View>
                  </View>

                  {/* Tags */}
                  {rev.tags && rev.tags.length > 0 && (
                    <View style={styles.reviewTagsRow}>
                      {rev.tags.map((tg: string, tIdx: number) => (
                        <View key={tIdx} style={styles.reviewTagPill}>
                          <Text style={styles.reviewTagText}>#{tg.replace('_', ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {rev.comment ? (
                    <Text style={styles.reviewComment}>{rev.comment}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* 6. Pastki Qotirilgan Tugma (Sticky Bottom Bar) */}
        <View style={styles.bottomBar}>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Narx (1 soat)</Text>
            <Text style={styles.priceValue}>{Number(minPrice).toLocaleString()} UZS</Text>
          </View>

          <TouchableOpacity
            style={styles.bookNowBtn}
            onPress={() => {
              onClose();
              onBookNow(currentVenue);
            }}
            activeOpacity={0.88}
          >
            <Ionicons name="calendar" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.bookNowBtnText}>Vaqt tanlash va bron</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 24,
    right: 18,
    zIndex: 100,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  galleryWrap: {
    width: width,
    height: 250,
    position: 'relative',
  },
  sliderImage: {
    width: width,
    height: 250,
    resizeMode: 'cover',
  },
  dotsWrap: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  activeDot: {
    width: 20,
    backgroundColor: '#FFFFFF',
  },
  superHostBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 16 : 24,
    left: 18,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 5,
  },
  superHostText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainInfoCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  venueName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  ratingScore: {
    fontSize: 14,
    fontWeight: '800',
    color: '#854D0E',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  venueAddress: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  reviewsCountRow: {
    marginTop: 10,
  },
  reviewsCountText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  passportGrid: {
    marginTop: 12,
    gap: 12,
  },
  passportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passportLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  passportValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amenityChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  amenityText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  amenityTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  rulesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 16,
    gap: 10,
  },
  rulesText: {
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 18,
    flex: 1,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 6,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  reviewsCountBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyReviewsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
  },
  emptyReviewsSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 14,
  },
  reviewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  reviewUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  reviewTagPill: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewTagText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  reviewComment: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    marginTop: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  priceCol: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
    marginTop: 2,
  },
  bookNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  bookNowBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
