import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import { Theme } from '@/constants/Theme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { apiErrorMessage } from '@/services/api';
import { parabaService, type Aluno } from '@/services/parabaService';
import { brDateToIso, formatDate, formatPhone } from '@/utils/formatters';

const FAIXAS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
const GRAUS = [0, 1, 2, 3, 4];

function normalizePaymentDay(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2);
}

function isValidPaymentDay(value: string): boolean {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 31;
}

function isoToBrDate(value?: string | null): string {
  if (!value) return 'nenhuma';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export default function AlunosScreen() {
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [form, setForm] = useState({
    nome: '',
    apelido: '',
    emailResponsavel: '',
    celular: '',
    dataNascimento: '',
    dataPagamento: '',
    faixaAtual: '',
    graus: 0,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setAlunos(await parabaService.listarAlunos());
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel carregar os alunos.'));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const submit = async () => {
    Keyboard.dismiss();
    if (!form.nome.trim()) {
      showError('Informe o nome do aluno.');
      return;
    }

    const dataNascimento = form.dataNascimento ? brDateToIso(form.dataNascimento) : null;
    if (form.dataNascimento && !dataNascimento) {
      showError('Informe a data de nascimento no formato DD/MM/AAAA.');
      return;
    }

    const dataPagamento = form.dataPagamento.trim();
    if (dataPagamento && !isValidPaymentDay(dataPagamento)) {
      showError('Informe o dia de pagamento entre 1 e 31.');
      return;
    }

    try {
      setSaving(true);
      const aluno = await parabaService.cadastrarAluno({
        nome: form.nome.trim(),
        apelido: form.apelido.trim() || undefined,
        emailResponsavel: form.emailResponsavel.trim() || undefined,
        celular: form.celular.trim() || undefined,
        dataNascimento: dataNascimento ?? undefined,
        dataPagamento: dataPagamento || undefined,
        faixaAtual: form.faixaAtual || undefined,
        graus: form.graus,
      });
      setAlunos((previous) => [aluno, ...previous]);
      setForm({
        nome: '',
        apelido: '',
        emailResponsavel: '',
        celular: '',
        dataNascimento: '',
        dataPagamento: '',
        faixaAtual: '',
        graus: 0,
      });
      setShowForm(false);
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel cadastrar o aluno.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Alunos</Text>
      <Text style={styles.subtitle}>
        Cadastro dos membros da Equipe Paraba.
      </Text>

      <AppButton variant={showForm ? 'secondary' : 'primary'} onPress={() => setShowForm((value) => !value)}>
        {showForm ? 'Ocultar cadastro' : 'Cadastrar aluno'}
      </AppButton>

      {showForm ? (
        <AppCard style={styles.formCard}>
          <Text style={styles.cardTitle}>Novo aluno</Text>
          <TextInput
            style={styles.input}
            value={form.nome}
            onChangeText={(nome) => setForm((previous) => ({ ...previous, nome }))}
            placeholder="Nome do aluno"
            placeholderTextColor={Theme.textMuted}
          />
          <TextInput
            style={styles.input}
            value={form.apelido}
            onChangeText={(apelido) => setForm((previous) => ({ ...previous, apelido }))}
            placeholder="Apelido (opcional)"
            placeholderTextColor={Theme.textMuted}
          />
          <TextInput
            style={styles.input}
            value={form.emailResponsavel}
            onChangeText={(emailResponsavel) =>
              setForm((previous) => ({ ...previous, emailResponsavel }))
            }
            placeholder="E-mail (opcional)"
            placeholderTextColor={Theme.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={form.celular}
            onChangeText={(celular) => setForm((previous) => ({ ...previous, celular: formatPhone(celular) }))}
            placeholder="Celular"
            placeholderTextColor={Theme.textMuted}
            keyboardType="phone-pad"
            maxLength={16}
          />
          <TextInput
            style={styles.input}
            value={form.dataNascimento}
            onChangeText={(dataNascimento) =>
              setForm((previous) => ({ ...previous, dataNascimento: formatDate(dataNascimento) }))
            }
            placeholder="Data nascimento DD/MM/AAAA"
            placeholderTextColor={Theme.textMuted}
            keyboardType="number-pad"
            maxLength={10}
          />
          <TextInput
            style={styles.input}
            value={form.dataPagamento}
            onChangeText={(dataPagamento) =>
              setForm((previous) => ({ ...previous, dataPagamento: normalizePaymentDay(dataPagamento) }))
            }
            placeholder="Dia pagamento mensal (1 a 31)"
            placeholderTextColor={Theme.textMuted}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.fieldLabel}>Faixa atual</Text>
          <View style={styles.optionsGrid}>
            {FAIXAS.map((faixa) => {
              const selected = form.faixaAtual === faixa;
              return (
                <Pressable
                  key={faixa}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => setForm((previous) => ({ ...previous, faixaAtual: faixa }))}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{faixa}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.fieldLabel}>Quantidade de graus</Text>
          <View style={styles.gradeRow}>
            {GRAUS.map((grau) => {
              const selected = form.graus === grau;
              return (
                <Pressable
                  key={grau}
                  style={[styles.gradeOption, selected && styles.optionSelected]}
                  onPress={() => setForm((previous) => ({ ...previous, graus: grau }))}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{grau}</Text>
                </Pressable>
              );
            })}
          </View>
          <AppButton loading={saving} onPress={submit}>
            Salvar aluno
          </AppButton>
        </AppCard>
      ) : null}

      <Text style={styles.sectionTitle}>Alunos cadastrados</Text>
      {loading ? <ActivityIndicator color={Theme.primary} /> : null}
      {alunos.map((aluno) => (
        <AppCard key={aluno.id} style={styles.studentCard}>
          <View style={styles.studentHeader}>
            <Text style={styles.studentName}>{aluno.nome}</Text>
          </View>
          {aluno.apelido ? <Text style={styles.studentMeta}>Apelido: {aluno.apelido}</Text> : null}
          <Text style={styles.studentMeta}>
            Usuario vinculado: {aluno.userId || aluno.user?.id || 'pendente'}
          </Text>
          <Text style={styles.studentMeta}>
            Faixa: {aluno.faixaAtual ?? 'nao informada'} ({aluno.graus ?? 0} graus)
          </Text>
          <Text style={styles.studentMeta}>
            Pagamento: {aluno.dataPagamento ? `todo dia ${aluno.dataPagamento}` : 'nao informado'}
          </Text>
          <Text style={styles.studentMeta}>
            Presencas: {aluno.totalPresencas ?? 0} | Ultima: {isoToBrDate(aluno.ultimaPresenca)}
          </Text>
        </AppCard>
      ))}

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
    gap: 16,
    padding: 20,
    paddingTop: 58,
  },
  title: {
    color: Theme.text,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: Theme.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  formCard: {
    gap: 12,
  },
  cardTitle: {
    color: Theme.text,
    fontSize: 18,
    fontWeight: '800',
  },
  input: {
    backgroundColor: Theme.inputBg,
    borderColor: Theme.border,
    borderRadius: 14,
    borderWidth: 1,
    color: Theme.text,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  fieldLabel: {
    color: Theme.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    borderColor: Theme.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionSelected: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  optionText: {
    color: Theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: Theme.white,
  },
  gradeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gradeOption: {
    alignItems: 'center',
    borderColor: Theme.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sectionTitle: {
    color: Theme.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  studentCard: {
    gap: 6,
  },
  studentHeader: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  studentName: {
    color: Theme.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  studentId: {
    color: Theme.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  studentMeta: {
    color: Theme.textMuted,
    fontSize: 13,
  },
});
