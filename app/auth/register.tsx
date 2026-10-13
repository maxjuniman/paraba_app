import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Keyboard,
  Modal,
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
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService, type TipoAula } from '@/services/parabaService';
import {
  brDateToIso,
  formatDate,
  formatPhone,
  isValidBrazilMobile,
  normalizePhoneWithBrazilCode,
} from '@/utils/formatters';

const FAIXAS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
const GRAUS = [0, 1, 2, 3, 4];

export default function RegisterScreen() {
  const topPadding = useScreenTopPadding();
  const router = useRouter();
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(false);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);
  const [tipos, setTipos] = useState<TipoAula[]>([]);
  const [form, setForm] = useState({
    nome: '',
    apelido: '',
    email: '',
    celular: '',
    senha: '',
    confirmacaoSenha: '',
    nomeResponsavel: '',
    emailResponsavel: '',
    dataNascimento: '',
    faixaAtual: '',
    graus: 0,
    tiposAulaIds: [] as string[],
  });

  useEffect(() => {
    void (async () => {
      try {
        setLoadingTipos(true);
        setTipos(await parabaService.listarTiposAula());
      } catch (error) {
        showError(apiErrorMessage(error, 'Nao foi possivel carregar os tipos de aula.'));
      } finally {
        setLoadingTipos(false);
      }
    })();
  }, [showError]);

  const toggleTipo = (tipoId: string) => {
    setForm((previous) => ({
      ...previous,
      tiposAulaIds: previous.tiposAulaIds.includes(tipoId)
        ? previous.tiposAulaIds.filter((id) => id !== tipoId)
        : [...previous.tiposAulaIds, tipoId],
    }));
  };

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
    if (!isValidBrazilMobile(form.celular)) {
      showError('Informe um celular valido com DDD.');
      return;
    }
    const dataNascimento = brDateToIso(form.dataNascimento);
    if (!dataNascimento) {
      showError('Informe a data de nascimento no formato DD/MM/AAAA.');
      return;
    }
    if (form.tiposAulaIds.length === 0) {
      showError('Selecione ao menos um tipo de aula.');
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
        apelido: form.apelido.trim() || undefined,
        email: form.email.trim(),
        celular: normalizePhoneWithBrazilCode(form.celular),
        senha: form.senha,
        confirmacao_senha: form.confirmacaoSenha,
        nomeResponsavel: form.nomeResponsavel.trim() || undefined,
        emailResponsavel: form.emailResponsavel.trim() || undefined,
        dataNascimento,
        faixaAtual: form.faixaAtual || undefined,
        graus: form.graus,
        tiposAulaIds: form.tiposAulaIds,
      });
      setSuccessMessage(response.message);
      setSuccessVisible(true);
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel criar sua conta.'), 'Falha no cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={Theme.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>
          Cadastre sua conta e os dados do aluno juntos. Depois, aguarde o professor aprovar o acesso.
        </Text>

        <Text style={styles.section}>Conta de acesso</Text>

        <Text style={styles.label}>Nome completo</Text>
        <TextInput
          style={styles.input}
          value={form.nome}
          onChangeText={(nome) => setForm((previous) => ({ ...previous, nome }))}
          placeholder="Seu nome"
          placeholderTextColor={Theme.textMuted}
        />

        <Text style={styles.label}>Apelido (opcional)</Text>
        <TextInput
          style={styles.input}
          value={form.apelido}
          onChangeText={(apelido) => setForm((previous) => ({ ...previous, apelido }))}
          placeholder="Como prefere ser chamado"
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

        <Text style={styles.section}>Dados do aluno</Text>

        <Text style={styles.label}>Data de nascimento</Text>
        <TextInput
          style={styles.input}
          value={form.dataNascimento}
          onChangeText={(dataNascimento) =>
            setForm((previous) => ({ ...previous, dataNascimento: formatDate(dataNascimento) }))
          }
          placeholder="DD/MM/AAAA"
          placeholderTextColor={Theme.textMuted}
          keyboardType="number-pad"
          maxLength={10}
        />

        <Text style={styles.label}>Nome do responsavel (opcional)</Text>
        <TextInput
          style={styles.input}
          value={form.nomeResponsavel}
          onChangeText={(nomeResponsavel) => setForm((previous) => ({ ...previous, nomeResponsavel }))}
          placeholder="Se for menor de idade"
          placeholderTextColor={Theme.textMuted}
        />

        <Text style={styles.label}>E-mail do responsavel (opcional)</Text>
        <TextInput
          style={styles.input}
          value={form.emailResponsavel}
          onChangeText={(emailResponsavel) => setForm((previous) => ({ ...previous, emailResponsavel }))}
          placeholder="responsavel@email.com"
          placeholderTextColor={Theme.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Tipo de aula</Text>
        {loadingTipos ? <Text style={styles.help}>Carregando tipos...</Text> : null}
        {!loadingTipos && tipos.length === 0 ? (
          <Text style={styles.help}>Nenhum tipo cadastrado. Fale com o professor.</Text>
        ) : null}
        <View style={styles.chips}>
          {tipos.map((tipo) => {
            const selected = form.tiposAulaIds.includes(tipo.id);
            return (
              <Pressable
                key={tipo.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleTipo(tipo.id)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tipo.nome}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Faixa atual (opcional)</Text>
        <View style={styles.chips}>
          {FAIXAS.map((faixa) => {
            const selected = form.faixaAtual === faixa;
            return (
              <Pressable
                key={faixa}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() =>
                  setForm((previous) => ({
                    ...previous,
                    faixaAtual: previous.faixaAtual === faixa ? '' : faixa,
                  }))
                }
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{faixa}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Graus</Text>
        <View style={styles.chips}>
          {GRAUS.map((grau) => {
            const selected = form.graus === grau;
            return (
              <Pressable
                key={grau}
                style={[styles.gradeChip, selected && styles.chipSelected]}
                onPress={() => setForm((previous) => ({ ...previous, graus: grau }))}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{grau}</Text>
              </Pressable>
            );
          })}
        </View>

        <AppButton forceLight loading={loading} onPress={submit}>
          Enviar cadastro
        </AppButton>

        <AlertError
          forceLight
          visible={errorVisible}
          message={errorMessage}
          title={errorTitle}
          onClose={hideError}
        />
      </ScrollView>

      <Modal transparent visible={successVisible} animationType="fade" onRequestClose={() => setSuccessVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Image source={require('../../assets/img/logo-padded.png')} style={styles.modalLogo} resizeMode="contain" />
            <Text style={styles.modalTitle}>osss</Text>
            <Text style={styles.modalSubtitle}>Cadastro enviado</Text>
            <Text style={styles.modalMessage}>{successMessage}</Text>
            <AppButton
              forceLight
              onPress={() => {
                setSuccessVisible(false);
                router.replace('/auth/login');
              }}
            >
              Ir para login
            </AppButton>
          </View>
        </View>
      </Modal>
    </>
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
  section: {
    color: Theme.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
    marginTop: 8,
  },
  label: {
    color: Theme.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  help: {
    color: Theme.textMuted,
    fontSize: 13,
    marginBottom: 10,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderColor: Theme.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  gradeChip: {
    alignItems: 'center',
    borderColor: Theme.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  chipSelected: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  chipText: {
    color: Theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: Theme.white,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  successModal: {
    alignItems: 'center',
    backgroundColor: Theme.white,
    borderRadius: 24,
    gap: 12,
    maxWidth: 420,
    padding: 24,
    width: '100%',
  },
  modalLogo: {
    height: 110,
    width: 160,
  },
  modalTitle: {
    color: Theme.primary,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalSubtitle: {
    color: Theme.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalMessage: {
    color: Theme.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
    textAlign: 'center',
  },
});
