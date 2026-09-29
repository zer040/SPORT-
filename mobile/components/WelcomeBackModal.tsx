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

          {/* Emoji */}
          <Text style={styles.emoji}>👋</Text>

          {/* Title */}
          <Text style={styles.title}>
            Xush kelibsiz, {firstName || 'Foydalanuvchi'}!
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Bugungi o‘yinlar va maydonlar sizni kutmoqda.
          </Text>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDismiss}
            activeOpacity={0.88}
          >
            <Text style={styles.actionBtnText}>Davom etish (Maydonlar) →</Text>
          </TouchableOpacity>

          {/* Auto-closing hint */}
          <Text style={styles.timerHint}>2.5 soniyada avtomatik o‘tiladi</Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardContainer: {
    width: Math.min(340, Dimensions.get('window').width - 40),
    backgroundColor: 'rgba(21, 28, 44, 0.94)',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 32,
    paddingHorizontal: 26,
    alignItems: 'center',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 40,
    right: 40,
    height: 3,
    backgroundColor: THEME.colors.primary,
    borderRadius: 2,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  emoji: {
    fontSize: 42,
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#00FF87',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  actionBtnText: {
    color: '#090D16',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  timerHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 12,
  },
});
