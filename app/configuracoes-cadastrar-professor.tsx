import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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

export default function CadastrarProfessorScreen() {
  const topPadding = useScreenTopPadding();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');

  const save = async () => {
    Keyboard.dismiss();

    if (!nome.trim()) {
      showError('Informe o nome do professor.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showError('Informe um e-mail valido.');
      return;
    }
    if (senha.length < 6) {
      showError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmacaoSenha) {
      showError('A confirmacao da senha nao confere.');
      return;
    }

    try {
      setSaving(true);
      await parabaService.cadastrarProfessor({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        celular: celular.trim() || undefined,
        senha,
        confirmacao_senha: confirmacaoSenha,
      });
      router.back();
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel cadastrar o professor.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Cadastrar professor</Text>
      </View>

      <AppCard style={styles.card}>
        <Text style={styles.helper}>Cria um usuario tipo 1 com acesso imediato ao aplicativo.</Text>

        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Nome do professor"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
        />

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@exemplo.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Celular</Text>
        <TextInput
          style={styles.input}
          value={celular}
          onChangeText={(value) => setCelular(formatPhone(value))}
          placeholder="(00) 00000-0000"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          value={senha}
          onChangeText={setSenha}
          placeholder="Minimo 6 caracteres"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />

        <Text style={styles.label}>Confirmar senha</Text>
        <TextInput
          style={styles.input}
          value={confirmacaoSenha}
          onChangeText={setConfirmacaoSenha}
          placeholder="Repita a senha"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />

        <AppButton loading={saving} onPress={() => void save()}>
          Cadastrar professor
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
      flex: 1,
      fontSize: 26,
      fontWeight: '900',
    },
    card: {
      gap: 10,
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
  });
}
