import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface PitchImageCarouselProps {
  images: string[];
  city?: string;
  rating?: number;
  height?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const PitchImageCarousel: React.FC<PitchImageCarouselProps> = ({
  images,
  city = 'Toshkent',
  rating = 4.9,
  height = 180,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const defaultImages = [
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=900&auto=format&fit=crop',
  ];

  const displayImages = images && images.length > 0 ? images : defaultImages;

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
    if (slide !== activeIndex && slide >= 0 && slide < displayImages.length) {
      setActiveIndex(slide);
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {displayImages.map((imgUri, index) => (
          <View key={index} style={[styles.slide, { height }]}>
            <Image source={{ uri: imgUri }} style={styles.image} resizeMode="cover" />
            {/* Top & Bottom gradient shadows via layered views */}
            <View style={styles.topShadow} />
            <View style={styles.bottomShadow} />
          </View>
        ))}
      </ScrollView>

      {/* Top Badges */}
      <View style={styles.topOverlay}>
        <View style={styles.cityBadge}>
          <Ionicons name="location" size={11} color={THEME.colors.textDark} />
          <Text style={styles.cityText}>{city}</Text>
        </View>

        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={THEME.colors.gold} />
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
        </View>
      </View>

      {/* Dots Indicator */}
      {displayImages.length > 1 && (
        <View style={styles.dotsContainer}>
          {displayImages.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                activeIndex === i ? styles.activeDot : null,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    backgroundColor: THEME.colors.surfaceElevated,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  slide: {
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(9, 13, 22, 0.4)',
  },
  bottomShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(9, 13, 22, 0.6)',
  },
  topOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  cityText: {
    color: THEME.colors.textDark,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  ratingText: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  activeDot: {
    width: 20,
    backgroundColor: THEME.colors.primary,
  },
});
