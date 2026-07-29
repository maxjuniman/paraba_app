import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import {
  getStudentCategoryByBirthDate,
  STUDENT_CATEGORY_FILTERS,
  type StudentCategoryId,
} from '@/constants/StudentCategories';
import { Theme } from '@/constants/Theme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService, type Aluno } from '@/services/parabaService';
import { brDateToIso, formatDate, formatPhone } from '@/utils/formatters';
import { pickStudentPhoto } from '@/utils/pickStudentPhoto';

const FAIXAS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
const GRAUS = [0, 1, 2, 3, 4];
const DEFAULT_STUDENT_PHOTO = require('../../assets/img/sem_foto.png');

function normalizePaymentDay(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2);
}

function isValidPaymentDay(value: string): boolean {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 31;
}

function isoToBrDate(value?: string | null): string {
  if (!value) return 'nenhuma';
  const dateOnly = value.trim().slice(0, 10);
  const [year, month, day] = dateOnly.split('-');
  if (!year || !month || !day || year.length !== 4) return value;
  return `${day}/${month}/${year}`;
}

function isoToFormDate(value?: string | null): string {
  if (!value) return '';
  const brDate = isoToBrDate(value);
  return brDate === 'nenhuma' ? '' : brDate;
}

export default function AlunosScreen() {
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const topPadding = useScreenTopPadding();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [editingAlunoId, setEditingAlunoId] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<StudentCategoryId>('all');
  const [form, setForm] = useState({
    nome: '',
    apelido: '',
    foto: '',
    emailResponsavel: '',
    celular: '',
    dataNascimento: '',
    dataPagamento: '',
    faixaAtual: '',
    graus: 0,
  });

  const resetForm = useCallback(() => {
    setEditingAlunoId(null);
    setForm({
      nome: '',
      apelido: '',
      foto: '',
      emailResponsavel: '',
      celular: '',
      dataNascimento: '',
      dataPagamento: '',
      faixaAtual: '',
      graus: 0,
    });
  }, []);

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

    const dataNascimento = brDateToIso(form.dataNascimento);
    if (!dataNascimento) {
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
      const alunoBody = {
        nome: form.nome.trim(),
        apelido: form.apelido.trim() || undefined,
        foto: form.foto || undefined,
        emailResponsavel: form.emailResponsavel.trim() || undefined,
        celular: form.celular.trim() || undefined,
        dataNascimento,
        dataPagamento: dataPagamento || undefined,
        faixaAtual: form.faixaAtual || undefined,
        graus: form.graus,
      };

      console.log('[Alunos] enviando cadastro/edicao:', {
        editingAlunoId,
        ...alunoBody,
        foto: alunoBody.foto ? `[base64 ${alunoBody.foto.length} chars]` : undefined,
      });

      const aluno = editingAlunoId
        ? await parabaService.atualizarAluno(editingAlunoId, alunoBody)
        : await parabaService.cadastrarAluno(alunoBody);

      console.log('[Alunos] sucesso:', aluno.id);

      setAlunos((previous) =>
        editingAlunoId
          ? previous.map((item) => (item.id === aluno.id ? aluno : item))
          : [aluno, ...previous]
      );
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.log('[Alunos] erro ao salvar aluno:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
        console.log('[Alunos] status:', axiosError.response?.status);
        console.log('[Alunos] response data:', axiosError.response?.data);
      }
      showError(apiErrorMessage(error, 'Nao foi possivel cadastrar o aluno.'));
    } finally {
      setSaving(false);
    }
  };

  const startEditingAluno = (aluno: Aluno) => {
    setEditingAlunoId(aluno.id);
    setForm({
      nome: aluno.nome,
      apelido: aluno.apelido ?? '',
      foto: aluno.foto ?? '',
      emailResponsavel: aluno.emailResponsavel ?? '',
      celular: aluno.celular ? formatPhone(aluno.celular) : '',
      dataNascimento: isoToFormDate(aluno.dataNascimento),
      dataPagamento: aluno.dataPagamento ?? '',
      faixaAtual: aluno.faixaAtual ?? '',
      graus: aluno.graus ?? 0,
    });
    setShowForm(true);
  };

  const choosePhoto = async () => {
    try {
      const foto = await pickStudentPhoto();
      if (foto) {
        setForm((previous) => ({ ...previous, foto }));
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Nao foi possivel selecionar a foto.');
    }
  };

  const filteredAlunos = useMemo(() => {
    const normalizedName = nameFilter.trim().toLowerCase();

    return alunos.filter((aluno) => {
      const matchesName =
        !normalizedName ||
        aluno.nome.toLowerCase().includes(normalizedName) ||
        (aluno.apelido ?? '').toLowerCase().includes(normalizedName);

      const category = getStudentCategoryByBirthDate(aluno.dataNascimento);
      const matchesCategory = categoryFilter === 'all' || category?.id === categoryFilter;

      return matchesName && matchesCategory;
    });
  }, [alunos, categoryFilter, nameFilter]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Alunos</Text>
      <Text style={styles.subtitle}>
        Cadastro dos membros da Equipe Paraba.
      </Text>

      <AppButton
        variant={showForm ? 'secondary' : 'primary'}
        onPress={() => {
          if (showForm) {
            resetForm();
            setShowForm(false);
            return;
          }
          setShowForm(true);
        }}
      >
        {showForm ? (editingAlunoId ? 'Cancelar edição' : 'Ocultar cadastro') : 'Cadastrar aluno'}
      </AppButton>

      {showForm ? (
        <AppCard style={styles.formCard}>
          <Text style={styles.cardTitle}>{editingAlunoId ? 'Editar aluno' : 'Novo aluno'}</Text>
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
          <View style={styles.photoRow}>
            <Image source={form.foto ? { uri: form.foto } : DEFAULT_STUDENT_PHOTO} style={styles.formPhoto} />
            <View style={styles.photoButtons}>
              <AppButton variant="secondary" onPress={choosePhoto}>
                {form.foto ? 'Trocar foto' : 'Adicionar foto'}
              </AppButton>
              {form.foto ? (
                <AppButton variant="ghost" onPress={() => setForm((previous) => ({ ...previous, foto: '' }))}>
                  Remover foto
                </AppButton>
              ) : null}
            </View>
          </View>
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
            placeholder="Data nascimento DD/MM/AAAA (obrigatorio)"
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
            {editingAlunoId ? 'Salvar alterações' : 'Salvar aluno'}
          </AppButton>
        </AppCard>
      ) : null}

      <Text style={styles.sectionTitle}>Alunos cadastrados</Text>
      <AppCard style={styles.filtersCard}>
        <Text style={styles.cardTitle}>Filtros</Text>
        <TextInput
          style={styles.input}
          value={nameFilter}
          onChangeText={setNameFilter}
          placeholder="Filtrar por nome ou apelido"
          placeholderTextColor={Theme.textMuted}
        />
        <View style={styles.optionsGrid}>
          {STUDENT_CATEGORY_FILTERS.map((category) => {
            const selected = categoryFilter === category.id;
            return (
              <Pressable
                key={category.id}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => setCategoryFilter(category.id)}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </AppCard>
      {loading ? <ActivityIndicator color={Theme.primary} /> : null}
      {filteredAlunos.map((aluno) => {
        const category = getStudentCategoryByBirthDate(aluno.dataNascimento);
        return (
          <Pressable key={aluno.id} onPress={() => startEditingAluno(aluno)} style={({ pressed }) => pressed && styles.cardPressed}>
            <AppCard style={styles.studentCard}>
              <Image source={aluno.foto ? { uri: aluno.foto } : DEFAULT_STUDENT_PHOTO} style={styles.studentPhoto} />
              <View style={styles.studentHeader}>
                <Text style={styles.studentName}>{aluno.nome}</Text>
              </View>
              {aluno.apelido ? <Text style={styles.studentMeta}>Apelido: {aluno.apelido}</Text> : null}
              <Text style={styles.studentMeta}>Categoria: {category?.label ?? 'sem categoria'}</Text>
              <Text style={styles.studentMeta}>Nascimento: {isoToBrDate(aluno.dataNascimento)}</Text>
              <Text style={styles.studentMeta}>
                Faixa: {aluno.faixaAtual ?? 'nao informada'} ({aluno.graus ?? 0} graus)
              </Text>
              <Text style={styles.studentMeta}>
                Pagamento: {aluno.dataPagamento ? `todo dia ${aluno.dataPagamento}` : 'nao informado'}
              </Text>
              <Text style={styles.studentMeta}>
                Presencas: {aluno.totalPresencas ?? 0} | Ultima: {isoToBrDate(aluno.ultimaPresenca)}
              </Text>
              <Text style={styles.editHint}>Toque para editar</Text>
            </AppCard>
          </Pressable>
        );
      })}
      {!loading && filteredAlunos.length === 0 ? (
        <Text style={styles.empty}>Nenhum aluno encontrado com os filtros atuais.</Text>
      ) : null}

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
  filtersCard: {
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
  photoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  formPhoto: {
    borderRadius: 34,
    height: 68,
    width: 68,
  },
  photoButtons: {
    flex: 1,
    gap: 8,
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
    minHeight: 92,
    paddingRight: 92,
    position: 'relative',
  },
  studentPhoto: {
    borderColor: Theme.border,
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    position: 'absolute',
    right: 16,
    top: 16,
    width: 56,
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
  empty: {
    color: Theme.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
  cardPressed: {
    opacity: 0.82,
  },
  editHint: {
    color: Theme.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
});
