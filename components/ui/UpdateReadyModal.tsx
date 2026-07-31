import { Image, Modal, Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppButton } from './AppButton';

type UpdateReadyModalProps = {
  visible: boolean;
  loading?: boolean;
  onRestart: () => void;
  onLater: () => void;
};

export function UpdateReadyModal({ visible, loading, onRestart, onLater }: UpdateReadyModalProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onLater}>
      <Pressable style={styles.overlay} onPress={onLater}>
        <Pressable style={styles.box}>
          <Image source={require('../../assets/img/logo-padded.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Atualização pronta</Text>
          <Text style={styles.message}>
            Uma nova versão foi baixada. Reinicie o app para aplicar as mudanças.
          </Text>
          <AppButton onPress={onRestart} loading={loading}>
            Reiniciar agora
          </AppButton>
          <AppButton variant="ghost" onPress={onLater} disabled={loading}>
            Depois
          </AppButton>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
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
      alignItems: 'center',
    },
    logo: {
      height: 72,
      width: 72,
      marginBottom: 4,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center',
    },
    message: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 4,
    },
  });
}
