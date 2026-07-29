import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { Theme } from '@/constants/Theme';
import { AppButton } from './AppButton';

type AlertErrorProps = {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
};

export function AlertError({ visible, title = 'Atenção', message, onClose }: AlertErrorProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <AppButton onPress={onClose}>Entendi</AppButton>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: Theme.white,
    borderRadius: 18,
    padding: 22,
    gap: 14,
  },
  title: {
    color: Theme.text,
    fontSize: 20,
    fontWeight: '800',
  },
  message: {
    color: Theme.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});
