import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AlertError } from '@/components/ui/AlertError';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService } from '@/services/parabaService';

export default function EnviarNotificacaoScreen() {
  const topPadding = useScreenTopPadding();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [saving, setSaving] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  const send = async () => {
    Keyboard.dismiss();

    if (!titulo.trim()) {
      showError('Informe o titulo da notificacao.');
      return;
    }
    if (!mensagem.trim()) {
      showError('Informe a mensagem da notificacao.');
      return;
    }

    try {
      setSaving(true);
      const result = await parabaService.enviarNotificacaoBroadcast({
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
      });
      setSuccessMessage(result.message);
      setSuccessVisible(true);
      setTitulo('');
      setMensagem('');
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel enviar a notificacao.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.title}>Enviar notificacao</Text>
        </View>

        <AppCard style={styles.card}>
          <Text style={styles.helper}>
            Envia uma notificacao push para todos os usuarios ativos que autorizaram o envio no app.
          </Text>

          <Text style={styles.label}>Titulo</Text>
          <TextInput
            style={styles.input}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Ex: Aviso importante"
            placeholderTextColor={colors.textMuted}
            maxLength={80}
          />

          <Text style={styles.label}>Mensagem</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={mensagem}
            onChangeText={setMensagem}
            placeholder="Escreva a mensagem que aparecera no celular"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            maxLength={400}
          />

          <AppButton loading={saving} onPress={() => void send()}>
            Enviar para todos
          </AppButton>
        </AppCard>

        <AlertError visible={errorVisible} message={errorMessage} title={errorTitle} onClose={hideError} />
      </ScrollView>

      <Modal
        transparent
        visible={successVisible}
        animationType="fade"
        onRequestClose={() => setSuccessVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Text style={styles.modalTitle}>Notificacao enviada</Text>
            <Text style={styles.modalMessage}>{successMessage}</Text>
            <AppButton onPress={() => setSuccessVisible(false)}>Ok</AppButton>
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      gap: 16,
      padding: 20,
      paddingBottom: 40,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    backButton: {
      marginLeft: -4,
      padding: 4,
    },
    title: {
      color: colors.text,
      flex: 1,
      fontSize: 28,
      fontWeight: '900',
    },
    card: {
      gap: 12,
    },
    helper: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 4,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    input: {
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      color: colors.text,
      fontSize: 15,
      minHeight: 50,
      paddingHorizontal: 14,
    },
    textArea: {
      minHeight: 140,
      paddingTop: 12,
      paddingBottom: 12,
    },
    modalOverlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.48)',
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    successModal: {
      backgroundColor: colors.card,
      borderRadius: 20,
      gap: 12,
      maxWidth: 420,
      padding: 20,
      width: '100%',
    },
    modalTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
      textAlign: 'center',
    },
    modalMessage: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 4,
      textAlign: 'center',
    },
  });
}
