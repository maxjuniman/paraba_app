import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { type ThemeColors } from '@/constants/Theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppButton } from './AppButton';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  loading,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={loading ? undefined : onCancel}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          disabled={loading}
          onPress={loading ? undefined : onCancel}
        />
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {danger ? (
            <Pressable
              style={[styles.dangerButton, loading && styles.disabled]}
              disabled={loading}
              onPress={onConfirm}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.dangerButtonText}>{confirmLabel}</Text>
              )}
            </Pressable>
          ) : (
            <AppButton onPress={onConfirm} loading={loading}>
              {confirmLabel}
            </AppButton>
          )}
          <AppButton variant="ghost" onPress={onCancel} disabled={loading}>
            {cancelLabel}
          </AppButton>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      padding: 24,
    },
    box: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 22,
      gap: 12,
      zIndex: 1,
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    message: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 4,
    },
    dangerButton: {
      alignItems: 'center',
      backgroundColor: colors.danger,
      borderRadius: 14,
      justifyContent: 'center',
      minHeight: 50,
      paddingHorizontal: 18,
      width: '100%',
    },
    dangerButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    disabled: {
      opacity: 0.55,
    },
  });
}
