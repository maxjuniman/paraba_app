import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertError } from '@/components/ui/AlertError';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService } from '@/services/parabaService';
import { formatPhone } from '@/utils/formatters';
import { getCurrentUser, updateCurrentUser } from '@/utils/session';

export default function ConfiguracoesEditarScreen() {
  const topPadding = useScreenTopPadding();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        try {
          setLoading(true);
          const local = await getCurrentUser();
          const profile = await parabaService.obterMeuPerfil().catch(() => local);
          if (!active || !profile) return;
          setEmail(profile.email);
          setNome(profile.nome);
          setCelular(profile.celular ? formatPhone(profile.celular) : '');
          await updateCurrentUser(profile);
        } catch (error) {
          if (active) showError(apiErrorMessage(error, 'Nao foi possivel carregar seu cadastro.'));
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [showError])
  );

  const save = async () => {
    Keyboard.dismiss();
    if (!nome.trim()) {
      showError('Informe seu nome.');
      return;
    }
    if (novaSenha || confirmacaoSenha || senhaAtual) {
      if (!senhaAtual) {
        showError('Informe a senha atual para alterar a senha.');
        return;
      }
      if (novaSenha.length < 6) {
        showError('A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (novaSenha !== confirmacaoSenha) {
        showError('A confirmacao da nova senha nao confere.');
        return;
      }
    }

    try {
      setSaving(true);
      const updated = await parabaService.atualizarMeuPerfil({
        nome: nome.trim(),
        celular: celular.trim() || undefined,
        senhaAtual: senhaAtual || undefined,
        novaSenha: novaSenha || undefined,
      });
      await updateCurrentUser(updated);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmacaoSenha('');
      router.back();
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel salvar o cadastro.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Editar cadastro</Text>
      </View>

      <AppCard style={styles.card}>
        <Text style={styles.label}>E-mail</Text>
        <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} />

        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Seu nome"
          placeholderTextColor={colors.textMuted}
          editable={!loading}
        />

        <Text style={styles.label}>Celular</Text>
        <TextInput
          style={styles.input}
          value={celular}
          onChangeText={(value) => setCelular(formatPhone(value))}
          placeholder="(00) 00000-0000"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          editable={!loading}
        />

        <Text style={styles.sectionTitle}>Alterar senha (opcional)</Text>

        <Text style={styles.label}>Senha atual</Text>
        <TextInput
          style={styles.input}
          value={senhaAtual}
          onChangeText={setSenhaAtual}
          placeholder="Senha atual"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />

        <Text style={styles.label}>Nova senha</Text>
        <TextInput
          style={styles.input}
          value={novaSenha}
          onChangeText={setNovaSenha}
          placeholder="Nova senha"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />

        <Text style={styles.label}>Confirmar nova senha</Text>
        <TextInput
          style={styles.input}
          value={confirmacaoSenha}
          onChangeText={setConfirmacaoSenha}
          placeholder="Confirme a nova senha"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />

        <AppButton onPress={() => void save()} loading={saving || loading}>
          Salvar alteracoes
        </AppButton>
      </AppCard>

      <AlertError visible={errorVisible} message={errorMessage} title={errorTitle} onClose={hideError} />
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      gap: 14,
      padding: 20,
      paddingBottom: 40,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    backButton: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
    },
    card: {
      gap: 10,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
      marginTop: 8,
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
    inputDisabled: {
      opacity: 0.7,
    },
  });
}
