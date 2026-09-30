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

const { width } = Dimensions.get('window');

interface SpotlightWalkthroughProps {
  visible: boolean;
  onFinish: () => void;
}

const STEPS = [
  {
    key: 'map',
    stepNumber: 1,
    title: 'Maydonlar Xaritasi',
    badge: 'VENUE EXPLORER MAP',
    description: 'Atrofdagi barcha tekshirilgan stadionlar, jonli bo‘sh vaqtlar va masofaga ko‘ra saralangan maydonlar joylashuvi.',
    icon: 'map-outline' as const,
    accentColor: '#0284C7',
    previewCard: {
      tag: 'Toshkent • 1.2 km',
      title: 'Bunyodkor Arena (7x7)',
      detail: 'Jonli holat: 3 ta slot mavjud',
      actionHint: 'Xaritadan eng yaqin maydonni tanlang',
    },
  },
  {
    key: 'calendar',
    stepNumber: 2,
    title: 'Slot Bron Taqvimi',
    badge: 'SLOT BOOKING CALENDAR',
    description: '10,000 UZS qatʼiy xizmat haqi va 10 daqiqalik kafolatlangan HELD taymeri bilan maydonni darhol band qiling.',
    icon: 'calendar-outline' as const,
    accentColor: '#059669',
    previewCard: {
      tag: 'Kafolatlangan bron',
      title: '10,000 UZS Platforma Haq',
      detail: 'Deterministik qulflash: 10 daqiqa HELD',
      actionHint: 'Slotni belgilang va tasdiqlang',
    },
  },
  {
    key: 'solo',
    stepNumber: 3,
    title: 'Solo Play Matchmaking',
    badge: 'SOLO PLAY MATCHMAKING',
    description: 'Jamoa to‘liq emasmi? Jonli radar orqali yaqin atrofdagi o‘yinchilarni toping va tarkibni tezda to‘ldiring.',
    icon: 'people-outline' as const,
    accentColor: '#D97706',
    previewCard: {
      tag: 'Jonli Radar & Lobby',
      title: 'Solo O‘yin Qidiruvi (4/10)',
      detail: 'Bugun, 20:00 • 35,000 UZS / kishi',
      actionHint: 'Radar orqali o‘yinchilarga qo‘shiling',
    },
  },
];

export const SpotlightWalkthrough: React.FC<SpotlightWalkthroughProps> = ({
  visible,
  onFinish,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const currentStep = STEPS[currentStepIndex];

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(16);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
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
        {/* Dimming Inactive Background to exactly 75% opacity per spec */}
        <View style={styles.backdropDim} />

        {/* Top Controls */}
        <View style={styles.topBar}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>
              {currentStep.stepNumber} / {STEPS.length}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={onFinish}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBtnText}>O‘tkazib yuborish</Text>
            <Ionicons name="close" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Frosted Glass Spotlight Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Spotlight Icon Circle */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: `${currentStep.accentColor}12`,
                borderColor: `${currentStep.accentColor}30`,
              },
            ]}
          >
            <Ionicons
              name={currentStep.icon}
              size={28}
              color={currentStep.accentColor}
            />
          </View>

          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text
              style={[
                styles.categoryBadgeText,
                { color: currentStep.accentColor },
              ]}
            >
              {currentStep.badge}
            </Text>
          </View>

          {/* Title & Description */}
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.description}>{currentStep.description}</Text>

          {/* Cutout Spotlight Simulation Box */}
          <View
            style={[
              styles.spotlightCutoutBox,
              { borderColor: `${currentStep.accentColor}40` },
            ]}
          >
            <View
              style={[
                styles.cutoutPill,
                { backgroundColor: currentStep.accentColor },
              ]}
            >
              <Text style={styles.cutoutPillText}>FOKUS MAYDONI</Text>
            </View>

            <View style={styles.previewHeader}>
              <View
                style={[
                  styles.previewDot,
                  { backgroundColor: currentStep.accentColor },
                ]}
              />
              <Text style={styles.previewTag}>
                {currentStep.previewCard.tag}
              </Text>
            </View>
            <Text style={styles.previewTitle}>
              {currentStep.previewCard.title}
            </Text>
            <Text style={styles.previewDetail}>
              {currentStep.previewCard.detail}
            </Text>

            <View style={styles.pointerIndicator}>
              <Ionicons
                name="arrow-forward"
                size={14}
                color={currentStep.accentColor}
              />
              <Text
                style={[
                  styles.pointerText,
                  { color: currentStep.accentColor },
                ]}
              >
                {currentStep.previewCard.actionHint}
              </Text>
            </View>
          </View>

          {/* Progress Indicators */}
          <View style={styles.progressDotsRow}>
            {STEPS.map((s, idx) => (
              <View
                key={s.key}
                style={[
                  styles.dot,
                  idx === currentStepIndex
                    ? [styles.activeDot, { backgroundColor: '#1E232B' }]
                    : null,
                ]}
              />
            ))}
          </View>

          {/* Action Row */}
          <View style={styles.btnRow}>
            {currentStepIndex > 0 ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleBack}
                activeOpacity={0.7}
              >
                <Text style={styles.backBtnText}>Orqaga</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity
              style={styles.primaryNextBtn}
              onPress={handleNext}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryNextBtnText}>
                {currentStepIndex === STEPS.length - 1
                  ? 'Boshlash'
                  : 'Davom etish'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
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
  /* Inactive background dimmed to 75% opacity per spec */
  backdropDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  /* Frosted Glass Card per spec */
  card: {
    width: Math.min(360, width - 36),
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 16,
    zIndex: 30,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
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
    color: '#1E232B',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  spotlightCutoutBox: {
    width: '100%',
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 18,
    position: 'relative',
  },
  cutoutPill: {
    position: 'absolute',
    top: -9,
    right: 14,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cutoutPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  previewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewTag: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  previewTitle: {
    color: '#1E232B',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  previewDetail: {
    color: '#64748B',
    fontSize: 12,
  },
  pointerIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.06)',
  },
  pointerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressDotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
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
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
  },
  backBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  /* Dark Slate Primary CTA per spec: #1E232B, pill 28px */
  primaryNextBtn: {
    flex: 2,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E232B',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#1E232B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryNextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
