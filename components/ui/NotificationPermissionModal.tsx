import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '@/constants/Theme';
import { AppButton } from './AppButton';

type NotificationPermissionModalProps = {
  visible: boolean;
  loading?: boolean;
  onAllow: () => void;
  onLater: () => void;
};

export function NotificationPermissionModal({
  visible,
  loading,
  onAllow,
  onLater,
}: NotificationPermissionModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onLater}>
      <Pressable style={styles.overlay} onPress={onLater}>
        <Pressable style={styles.box}>
          <Image source={require('../../assets/img/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Fique por dentro</Text>
          <Text style={styles.message}>
            Queremos avisar quando uma aula avulsa for criada. Ative as notificações para receber esses avisos no
            celular.
          </Text>
          <AppButton onPress={onAllow} loading={loading}>
            Permitir notificações
          </AppButton>
          <AppButton variant="ghost" onPress={onLater} disabled={loading}>
            Agora não
          </AppButton>
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
    gap: 12,
    alignItems: 'center',
  },
  logo: {
    height: 72,
    width: 72,
    marginBottom: 4,
  },
  title: {
    color: Theme.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: Theme.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 4,
  },
});
