import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { type ThemeColors } from '@/constants/Theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService, type Aluno } from '@/services/parabaService';
import { brDateToIso, formatDate, formatPhone } from '@/utils/formatters';
import { pickStudentPhoto } from '@/utils/pickStudentPhoto';

const FAIXAS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
const GRAUS = [0, 1, 2, 3, 4];
const DEFAULT_STUDENT_PHOTO = require('../../assets/img/sem_foto.png');

function selectedOnPrimaryText(primary: string): string {
  return primary === '#FFFFFF' || primary === '#E5E7EB' ? '#000000' : '#FFFFFF';
}

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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const onPrimary = selectedOnPrimaryText(colors.primary);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [editingAlunoId, setEditingAlunoId] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<StudentCategoryId>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedAlunoId, setExpandedAlunoId] = useState<string | null>(null);
  const [unlinkingAlunoId, setUnlinkingAlunoId] = useState<string | null>(null);
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

      const aluno = editingAlunoId
        ? await parabaService.atualizarAluno(editingAlunoId, alunoBody)
        : await parabaService.cadastrarAluno(alunoBody);

      setAlunos((previous) =>
        editingAlunoId
          ? previous.map((item) => (item.id === aluno.id ? aluno : item))
          : [aluno, ...previous]
      );
      resetForm();
      setShowForm(false);
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
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

  const confirmUnlinkUser = (aluno: Aluno) => {
    Alert.alert(
      'Desvincular usuario',
      `Remover o vinculo de ${aluno.nome}? O usuario volta a ficar pendente de autorizacao.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: () => {
            void unlinkUser(aluno.id);
          },
        },
      ]
    );
  };

  const unlinkUser = async (alunoId: string) => {
    try {
      setUnlinkingAlunoId(alunoId);
      const updated = await parabaService.desvincularAlunoUser(alunoId);
      setAlunos((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel desvincular o usuario.'));
    } finally {
      setUnlinkingAlunoId(null);
    }
  };

  const filteredAlunos = useMemo(() => {
    const normalizedName = nameFilter.trim().toLowerCase();

    return alunos
      .filter((aluno) => {
        const matchesName =
          !normalizedName ||
          aluno.nome.toLowerCase().includes(normalizedName) ||
          (aluno.apelido ?? '').toLowerCase().includes(normalizedName);

        const category = getStudentCategoryByBirthDate(aluno.dataNascimento);
        const matchesCategory = categoryFilter === 'all' || category?.id === categoryFilter;

        return matchesName && matchesCategory;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  }, [alunos, categoryFilter, nameFilter]);

  const hasActiveFilters = Boolean(nameFilter.trim()) || categoryFilter !== 'all';

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
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={form.apelido}
            onChangeText={(apelido) => setForm((previous) => ({ ...previous, apelido }))}
            placeholder="Apelido (opcional)"
            placeholderTextColor={colors.textMuted}
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
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={form.celular}
            onChangeText={(celular) => setForm((previous) => ({ ...previous, celular: formatPhone(celular) }))}
            placeholder="Celular"
            placeholderTextColor={colors.textMuted}
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
            placeholderTextColor={colors.textMuted}
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
            placeholderTextColor={colors.textMuted}
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
        <Pressable
          style={styles.filtersHeader}
          onPress={() => setFiltersOpen((open) => !open)}
          hitSlop={6}
        >
          <View style={styles.filtersHeaderText}>
            <Text style={styles.cardTitle}>Filtros</Text>
            {hasActiveFilters && !filtersOpen ? (
              <Text style={styles.filtersHint}>Filtros ativos</Text>
            ) : null}
          </View>
          <Ionicons
            name={filtersOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textMuted}
          />
        </Pressable>

        {filtersOpen ? (
          <>
            <TextInput
              style={styles.input}
              value={nameFilter}
              onChangeText={setNameFilter}
              placeholder="Filtrar por nome ou apelido"
              placeholderTextColor={colors.textMuted}
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
          </>
        ) : null}
      </AppCard>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {filteredAlunos.map((aluno) => {
        const category = getStudentCategoryByBirthDate(aluno.dataNascimento);
        const expanded = expandedAlunoId === aluno.id;
        const hasUser = Boolean(aluno.userId);

        return (
          <AppCard key={aluno.id} style={[styles.studentCard, expanded && styles.studentCardExpanded]}>
            <Pressable
              style={({ pressed }) => [styles.studentSummary, pressed && styles.cardPressed]}
              onPress={() => setExpandedAlunoId((current) => (current === aluno.id ? null : aluno.id))}
            >
              <View
                style={[
                  styles.userLinkBadge,
                  hasUser ? styles.userLinkBadgeOn : styles.userLinkBadgeOff,
                ]}
              >
                <Ionicons
                  name={hasUser ? 'person' : 'person-outline'}
                  size={16}
                  color={hasUser ? colors.secondary : colors.textMuted}
                />
              </View>
              <View style={styles.studentSummaryText}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {aluno.nome}
                </Text>
                <Text style={styles.studentMeta} numberOfLines={1}>
                  {aluno.apelido ? `${aluno.apelido} · ` : ''}
                  {category?.label ?? 'sem categoria'}
                </Text>
              </View>
              <Image
                source={aluno.foto ? { uri: aluno.foto } : DEFAULT_STUDENT_PHOTO}
                style={styles.studentPhoto}
              />
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
                style={styles.expandIcon}
              />
            </Pressable>

            {expanded ? (
              <View style={styles.studentDetails}>
                <View style={styles.userLinkRow}>
                  <Ionicons
                    name={hasUser ? 'person' : 'person-outline'}
                    size={15}
                    color={hasUser ? colors.secondary : colors.textMuted}
                  />
                  <Text style={[styles.studentMeta, hasUser && styles.userLinkTextOn]}>
                    {hasUser ? 'Usuario vinculado' : 'Sem usuario vinculado'}
                  </Text>
                </View>
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
                <View style={styles.studentActions}>
                  <Pressable
                    style={styles.editButton}
                    onPress={() => startEditingAluno(aluno)}
                  >
                    <Ionicons name="create-outline" size={16} color={onPrimary} />
                    <Text style={styles.editButtonText}>Editar</Text>
                  </Pressable>
                  {hasUser ? (
                    <Pressable
                      style={[styles.unlinkButton, unlinkingAlunoId === aluno.id && styles.unlinkButtonDisabled]}
                      disabled={unlinkingAlunoId === aluno.id}
                      onPress={() => confirmUnlinkUser(aluno)}
                    >
                      {unlinkingAlunoId === aluno.id ? (
                        <ActivityIndicator color={colors.text} size="small" />
                      ) : (
                        <>
                          <Ionicons name="person-remove-outline" size={16} color={colors.text} />
                          <Text style={styles.unlinkButtonText}>Desvincular</Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
          </AppCard>
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

function createStyles(colors: ThemeColors) {
  const onPrimary = selectedOnPrimaryText(colors.primary);

  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      gap: 16,
      padding: 20,
    },
    title: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '900',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    formCard: {
      gap: 12,
    },
    filtersCard: {
      gap: 12,
    },
    filtersHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    filtersHeaderText: {
      flex: 1,
      gap: 2,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    filtersHint: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
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
      color: colors.text,
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
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    optionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    optionTextSelected: {
      color: onPrimary,
    },
    gradeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    gradeOption: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginTop: 6,
    },
    studentCard: {
      gap: 0,
      overflow: 'hidden',
      paddingVertical: 12,
    },
    studentCardExpanded: {
      gap: 12,
    },
    studentSummary: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      minHeight: 48,
    },
    userLinkBadge: {
      alignItems: 'center',
      borderRadius: 999,
      height: 30,
      justifyContent: 'center',
      width: 30,
    },
    userLinkBadgeOn: {
      backgroundColor: 'rgba(34, 160, 107, 0.14)',
    },
    userLinkBadgeOff: {
      backgroundColor: colors.inputBg,
    },
    studentSummaryText: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    userLinkRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    userLinkTextOn: {
      color: colors.secondary,
      fontWeight: '700',
    },
    studentPhoto: {
      borderColor: colors.border,
      borderRadius: 22,
      borderWidth: 1,
      height: 44,
      width: 44,
    },
    expandIcon: {
      marginLeft: 2,
    },
    studentName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    studentMeta: {
      color: colors.textMuted,
      fontSize: 13,
    },
    studentDetails: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      gap: 6,
      paddingTop: 12,
    },
    studentActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 6,
    },
    editButton: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 12,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    editButtonText: {
      color: onPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    unlinkButton: {
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      minHeight: 40,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    unlinkButtonDisabled: {
      opacity: 0.6,
    },
    unlinkButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    empty: {
      color: colors.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },
    cardPressed: {
      opacity: 0.82,
    },
  });
}