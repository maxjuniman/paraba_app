import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { type ThemeColors } from '@/constants/Theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppButton } from './AppButton';

type PasswordModalProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  password: string;
  confirmPassword: string;
  loading?: boolean;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PasswordModal({
  visible,
  title,
  subtitle,
  password,
  confirmPassword,
  loading,
  onChangePassword,
  onChangeConfirmPassword,
  onConfirm,
  onCancel,
}: PasswordModalProps) {
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
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={onChangePassword}
            placeholder="Nova senha (6+)"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={onChangeConfirmPassword}
            placeholder="Confirmar senha"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />
          <AppButton onPress={onConfirm} loading={loading}>
            Salvar senha
          </AppButton>
          <AppButton variant="ghost" onPress={onCancel} disabled={loading}>
            Cancelar
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
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 2,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      color: colors.text,
      fontSize: 15,
      minHeight: 48,
      paddingHorizontal: 14,
    },
  });
}
