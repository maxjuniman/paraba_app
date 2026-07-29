import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertError } from '@/components/ui/AlertError';
import { AppButton } from '@/components/ui/AppButton';
import { Theme } from '@/constants/Theme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService } from '@/services/parabaService';
import { persistSession } from '@/utils/session';
import { syncPushTokenIfGranted } from '@/utils/registerPushNotifications';

export default function LoginScreen() {
  const topPadding = useScreenTopPadding();
  const router = useRouter();
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    senha: '',
  });

  const submit = async () => {
    Keyboard.dismiss();
    if (!form.email.trim() || !form.email.includes('@')) {
      showError('Informe um e-mail valido.');
      return;
    }
    if (!form.senha.trim()) {
      showError('Informe sua senha.');
      return;
    }

    try {
      setLoading(true);
      const session = await parabaService.login({
        email: form.email.trim(),
        senha: form.senha,
      });
      await persistSession(session);
      void syncPushTokenIfGranted().catch(() => {
        // Falha de push nao deve bloquear o login.
      });
      router.replace('/home');
    } catch (error) {
      showError(apiErrorMessage(error, 'Falha ao entrar.'), 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <TouchableOpacity style={styles.backRow} onPress={() => router.replace('/')} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color={Theme.primary} />
        <Text style={styles.backText}>Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Entrar</Text>
      <Text style={styles.subtitle}>Faça seu login para acessar sua conta.</Text>

      <Text style={styles.label}>E-mail</Text>
      <TextInput
        style={styles.input}
        value={form.email}
        onChangeText={(email) => setForm((previous) => ({ ...previous, email }))}
        placeholder="voce@email.com"
        placeholderTextColor={Theme.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Senha</Text>
      <View style={styles.passwordBox}>
        <TextInput
          style={styles.passwordInput}
          value={form.senha}
          onChangeText={(senha) => setForm((previous) => ({ ...previous, senha }))}
          placeholder="Sua senha"
          placeholderTextColor={Theme.textMuted}
          secureTextEntry={!showPassword}
        />
        <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={Theme.primary} />
        </Pressable>
      </View>

      <AppButton loading={loading} onPress={submit}>
        Entrar
      </AppButton>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ainda nao tem conta? </Text>
        <TouchableOpacity onPress={() => router.push('/auth/register')}>
          <Text style={styles.footerLink}>Criar conta</Text>
        </TouchableOpacity>
      </View>

      <AlertError
        visible={errorVisible}
        message={errorMessage}
        title={errorTitle}
        onClose={hideError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background,
    padding: 24,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 34,
  },
  backText: {
    color: Theme.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    color: Theme.text,
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: Theme.textMuted,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 28,
  },
  label: {
    color: Theme.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Theme.inputBg,
    borderColor: Theme.border,
    borderRadius: 14,
    borderWidth: 1,
    color: Theme.text,
    fontSize: 16,
    marginBottom: 14,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  passwordBox: {
    alignItems: 'center',
    backgroundColor: Theme.inputBg,
    borderColor: Theme.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 22,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  passwordInput: {
    color: Theme.text,
    flex: 1,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },
  footerText: {
    color: Theme.textMuted,
    fontSize: 15,
  },
  footerLink: {
    color: Theme.primary,
    fontSize: 15,
    fontWeight: '800',
  },
});
