import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
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
import { apiErrorMessage } from '@/services/api';
import { parabaService } from '@/services/parabaService';
import { formatPhone, normalizePhoneWithBrazilCode } from '@/utils/formatters';

export default function RegisterScreen() {
  const router = useRouter();
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    celular: '',
    senha: '',
    confirmacaoSenha: '',
  });

  const submit = async () => {
    Keyboard.dismiss();
    if (!form.nome.trim()) {
      showError('Informe seu nome.');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      showError('Informe um e-mail valido.');
      return;
    }
    if (form.senha.length < 6) {
      showError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (form.senha !== form.confirmacaoSenha) {
      showError('A confirmacao de senha nao confere.');
      return;
    }

    try {
      setLoading(true);
      const response = await parabaService.cadastro({
        nome: form.nome.trim(),
        email: form.email.trim(),
        celular: normalizePhoneWithBrazilCode(form.celular),
        senha: form.senha,
        confirmacao_senha: form.confirmacaoSenha,
      });
      Alert.alert('Cadastro enviado', response.message, [
        {
          text: 'OK',
          onPress: () => router.replace('/auth/login'),
        },
      ]);
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel criar sua conta.'), 'Falha no cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color={Theme.primary} />
        <Text style={styles.backText}>Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Criar conta</Text>
      <Text style={styles.subtitle}>
        Depois do cadastro, aguarde o professor autorizar seu acesso e vincular seu aluno.
      </Text>

      <Text style={styles.label}>Nome completo</Text>
      <TextInput
        style={styles.input}
        value={form.nome}
        onChangeText={(nome) => setForm((previous) => ({ ...previous, nome }))}
        placeholder="Seu nome"
        placeholderTextColor={Theme.textMuted}
      />

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

      <Text style={styles.label}>Celular</Text>
      <TextInput
        style={styles.input}
        value={form.celular}
        onChangeText={(celular) => setForm((previous) => ({ ...previous, celular: formatPhone(celular) }))}
        placeholder="(51) 99999-9999"
        placeholderTextColor={Theme.textMuted}
        keyboardType="phone-pad"
        maxLength={16}
      />

      <Text style={styles.label}>Senha</Text>
      <View style={styles.passwordBox}>
        <TextInput
          style={styles.passwordInput}
          value={form.senha}
          onChangeText={(senha) => setForm((previous) => ({ ...previous, senha }))}
          placeholder="Minimo 6 caracteres"
          placeholderTextColor={Theme.textMuted}
          secureTextEntry={!showPassword}
        />
        <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={Theme.primary} />
        </Pressable>
      </View>

      <Text style={styles.label}>Confirmar senha</Text>
      <View style={styles.passwordBox}>
        <TextInput
          style={styles.passwordInput}
          value={form.confirmacaoSenha}
          onChangeText={(confirmacaoSenha) =>
            setForm((previous) => ({ ...previous, confirmacaoSenha }))
          }
          placeholder="Repita sua senha"
          placeholderTextColor={Theme.textMuted}
          secureTextEntry
        />
        <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={Theme.primary} />
        </Pressable>
      </View>

      <AppButton loading={loading} onPress={submit}>
        Criar conta
      </AppButton>

      <AlertError
        visible={errorVisible}
        message={errorMessage}
        title={errorTitle}
        onClose={hideError}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  container: {
    padding: 24,
    paddingBottom: 42,
    paddingTop: 64,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 30,
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
    marginBottom: 26,
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
    marginBottom: 14,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  passwordInput: {
    color: Theme.text,
    flex: 1,
    fontSize: 16,
  },
});
