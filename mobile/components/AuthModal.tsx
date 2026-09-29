import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { THEME } from '../constants/theme';
import { Api } from '../services/api';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (authData: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose, onSuccess }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+998901234567');
  const [code, setCode] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await Api.sendOtp(phone);
      setStep('otp');
    } catch (err: any) {
      setErrorMsg(err.message || 'SMS kod yuborishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await Api.verifyOtp(phone, code);
      onSuccess(data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Kodni tasdiqlashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 'phone' ? 'Tizimga kirish' : 'SMS Kodni kiriting'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.desc}>
            {step === 'phone'
              ? 'Sport+ platformasida o\'yin qidirish va maydon bron qilish uchun telefon raqamingizni kiriting.'
              : `${phone} raqamiga yuborilgan 6-xonali kodni kiriting (Test uchun: 123456)`}
          </Text>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          )}

          {step === 'phone' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefon raqam</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+998XXXXXXXXX"
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={THEME.colors.textDark} />
                ) : (
                  <Text style={styles.actionBtnText}>SMS Kod olish →</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>6-xonali tasdiqlash kodi</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={THEME.colors.textDark} />
                ) : (
                  <Text style={styles.actionBtnText}>Tasdiqlash va Kirish ✓</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setStep('phone')}
                style={styles.backBtn}
              >
                <Text style={styles.backBtnText}>← Boshqa raqam kiritish</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  desc: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: THEME.radius.sm,
    marginBottom: 14,
  },
  errorText: {
    color: THEME.colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  codeInput: {
    fontSize: 22,
    letterSpacing: 6,
    textAlign: 'center',
    color: THEME.colors.accent,
  },
  actionBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  actionBtnText: {
    color: THEME.colors.textDark,
    fontSize: 15,
    fontWeight: '800',
  },
  backBtn: {
    alignItems: 'center',
    marginTop: 10,
  },
  backBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
  },
});
