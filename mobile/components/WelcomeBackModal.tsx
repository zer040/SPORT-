import React, { useEffect, useRef } from 'react';
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
import { THEME } from '../constants/theme';

interface WelcomeBackModalProps {
  visible: boolean;
  firstName: string;
  onClose: () => void;
}

export const WelcomeBackModal: React.FC<WelcomeBackModalProps> = ({
  visible,
  firstName,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);

  const handleDismiss = () => {
    if (isClosing.current) return;
    isClosing.current = true;

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isClosing.current = false;
      onClose();
    });
  };

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Avtomatik 2.5 soniyadan so'ng silliq so'nib yopilish (Auto-dismiss)
      const timer = setTimeout(() => {
        handleDismiss();
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleDismiss}
        />

        <Animated.View
          style={[
            styles.cardContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Frosted Glass Highlight Ring */}
          <View style={styles.topAccent} />

          {/* Welcome Greeting */}
          <Text style={styles.title}>
            Welcome Back, {firstName || 'Foydalanuvchi'}!
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Bugungi o'yinlar va maydonlar sizni kutmoqda.
          </Text>

          {/* CTA Button — Dark Slate per spec */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDismiss}
            activeOpacity={0.88}
          >
            <Text style={styles.actionBtnText}>Davom etish</Text>
          </TouchableOpacity>

          {/* Auto-closing hint */}
          <Text style={styles.timerHint}>2.5 soniyada avtomatik o'tiladi</Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardContainer: {
    width: Math.min(340, Dimensions.get('window').width - 40),
    backgroundColor: 'rgba(255, 255, 255, 0.45)',  // Frosted glass per spec
    borderRadius: 32,                               // Glass borderRadius per spec
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',       // Glass border per spec
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 50,
    right: 50,
    height: 3,
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: '#1E232B',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 26,
  },
  actionBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#1E232B',    // Dark slate CTA per spec
    borderRadius: 28,              // Pill radius per spec
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E232B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  timerHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 14,
  },
});
