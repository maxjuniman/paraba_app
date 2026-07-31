import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { LightTheme, type ThemeColors } from '@/constants/Theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppButton } from './AppButton';

type AlertErrorProps = {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  forceLight?: boolean;
};

export function AlertError({
  visible,
  title = 'Atenção',
  message,
  onClose,
  forceLight = false,
}: AlertErrorProps) {
  const { colors: themeColors } = useAppTheme();
  const colors = forceLight ? LightTheme : themeColors;
  const styles = createStyles(colors);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <AppButton forceLight={forceLight} onPress={onClose}>
            Entendi
          </AppButton>
        </Pressable>
      </Pressable>
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
      gap: 14,
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
    },
  });
}
