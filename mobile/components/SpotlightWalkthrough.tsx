import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

const { width, height } = Dimensions.get('window');

interface SpotlightWalkthroughProps {
  visible: boolean;
  onFinish: () => void;
}

const STEPS = [
  {
    key: 'map',
    stepNumber: 1,
    title: 'Maydonlar Xaritasi 📍',
    badge: 'XARITA VA STADIONLAR',
    description: 'O‘zingizga eng yaqin stadionlarni shu yerdan topasiz. Jonli narxlar va qulay filtrlardan foydalaning.',
    icon: 'map' as const,
    accentColor: '#38BDF8',
    previewCard: {
      tag: 'Toshkent • 1.2 km',
      title: 'Bunyodkor Arena (7x7)',
      detail: 'Jonli holat: 3 ta slot bo‘sh',
    },
  },
  {
    key: 'booking',
    stepNumber: 2,
    title: '1-Bosishda Bron ⚡',
    badge: 'KAFOLATLI SLOTLAR',
    description: '10,000 so‘m kafolat bilan slotni o‘zingizga mustahkamlang. Qolgan to‘lovni maydonda amalga oshirasiz.',
    icon: 'flash' as const,
    accentColor: '#00FF87',
    previewCard: {
      tag: 'Kafolat depoziti',
      title: '10,000 UZS Slot Kafolati',
      detail: '10 daqiqa HELD taymeri bilan bron qilinadi',
    },
  },
  {
    key: 'solo',
    stepNumber: 3,
    title: 'Solo Play (Matchmaking) ⚽',
    badge: 'YAKKA O‘YINCHILAR',
    description: 'Jamoangiz yo‘qmi? Bu tugma orqali yaqin atrofdagi boshqa o‘yinchilarga qo‘shiling va yangi tarkib tuzing.',
    icon: 'people' as const,
    accentColor: '#CCFF00',
    previewCard: {
      tag: 'Jonli Radar & Lobby',
      title: 'Solo O‘yin Topish (4/10)',
      detail: 'Bugun, 20:00 • 35,000 UZS / kishi',
    },
  },
];

export const SpotlightWalkthrough: React.FC<SpotlightWalkthroughProps> = ({
  visible,
  onFinish,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const currentStep = STEPS[currentStepIndex];

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(15);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentStepIndex, visible, fadeAnim, slideAnim]);

  if (!visible) return null;

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onFinish();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onFinish}
    >
      <View style={styles.overlay}>
        {/* Dimming Background */}
        <View style={styles.backdropDim} />

        {/* Top Header Controls (Skip Button & Step Counter) */}
        <View style={styles.topBar}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>
              QADAM {currentStep.stepNumber} / {STEPS.length}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={onFinish}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBtnText}>O‘tkazib yuborish</Text>
            <Ionicons name="close" size={16} color="rgba(255, 255, 255, 0.6)" />
          </TouchableOpacity>
        </View>

        {/* Center Spotlight & Explanatory Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Spotlight Header with Icon */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: `${currentStep.accentColor}18`, borderColor: `${currentStep.accentColor}40` },
            ]}
          >
            <Ionicons name={currentStep.icon} size={30} color={currentStep.accentColor} />
          </View>

          {/* Subtitle Badge */}
          <View style={styles.categoryBadge}>
            <Text style={[styles.categoryBadgeText, { color: currentStep.accentColor }]}>
              {currentStep.badge}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{currentStep.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{currentStep.description}</Text>

          {/* Spotlight Target Cutout Simulation with Glowing Border and Pointer Indicator */}
          <View style={[styles.spotlightCutoutBox, { borderColor: currentStep.accentColor }]}>
            <View style={[styles.cutoutPill, { backgroundColor: currentStep.accentColor }]}>
              <Ionicons name="sparkles" size={12} color="#090D16" />
              <Text style={styles.cutoutPillText}>FOKUS MAYDONI</Text>
            </View>

            <View style={styles.previewHeader}>
              <View style={[styles.previewDot, { backgroundColor: currentStep.accentColor }]} />
              <Text style={styles.previewTag}>{currentStep.previewCard.tag}</Text>
            </View>
            <Text style={styles.previewTitle}>{currentStep.previewCard.title}</Text>
            <Text style={styles.previewDetail}>{currentStep.previewCard.detail}</Text>

            {/* Glowing Pointer Arrow & Action Hint */}
            <View style={styles.pointerIndicator}>
              <Ionicons name="arrow-down" size={15} color={currentStep.accentColor} />
              <Text style={[styles.pointerText, { color: currentStep.accentColor }]}>
                {currentStep.stepNumber === 1 && 'Xaritadan eng yaqin maydonni tanlang'}
                {currentStep.stepNumber === 2 && '10,000 so‘m bilan darhol band qiling'}
                {currentStep.stepNumber === 3 && 'Radar orqali yaqin o‘yinchilarni toping'}
              </Text>
            </View>
          </View>


          {/* Step Progress Indicators */}
          <View style={styles.progressDotsRow}>
            {STEPS.map((s, idx) => (
              <View
                key={s.key}
                style={[
                  styles.dot,
                  idx === currentStepIndex
                    ? [styles.activeDot, { backgroundColor: currentStep.accentColor }]
                    : null,
                ]}
              />
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            {currentStepIndex > 0 ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleBack}
                activeOpacity={0.7}
              >
                <Text style={styles.backBtnText}>Orqaga</Text>
              </TouchableOpacity>
            ) : <View style={{ flex: 1 }} />}

            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: currentStep.accentColor }]}
              onPress={handleNext}
              activeOpacity={0.88}
            >
              <Text style={styles.nextBtnText}>
                {currentStepIndex === STEPS.length - 1 ? 'Boshlash 🚀' : 'Keyingisi →'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  backdropDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 8, 16, 0.88)',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  stepBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipBtnText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    width: Math.min(360, width - 36),
    backgroundColor: 'rgba(18, 25, 38, 0.96)',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 36,
    elevation: 24,
    zIndex: 30,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  spotlightCutoutBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  cutoutPill: {
    position: 'absolute',
    top: -10,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cutoutPillText: {
    color: '#090D16',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  previewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewTag: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '600',
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  previewDetail: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
  },
  pointerIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  pointerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressDotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeDot: {
    width: 22,
    borderRadius: 4,
  },
  btnRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtnText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  nextBtnText: {
    color: '#090D16',
    fontSize: 15,
    fontWeight: '800',
  },
});
