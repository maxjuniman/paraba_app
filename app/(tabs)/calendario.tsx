import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertError } from '@/components/ui/AlertError';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { STUDENT_CATEGORIES, type StudentCategory } from '@/constants/StudentCategories';
import { Theme } from '@/constants/Theme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import {
  parabaService,
  type AulaCategoria,
  type AulaCalendarioMes,
  type AulaRecorrencia,
  type TipoAula,
} from '@/services/parabaService';
import { brDateToIso, formatDate } from '@/utils/formatters';
import { getCurrentUser, type SessionUser } from '@/utils/session';

const WEEK_DAYS = [
  { id: 0, label: 'Domingo', shortLabel: 'Dom' },
  { id: 1, label: 'Segunda', shortLabel: 'Seg' },
  { id: 2, label: 'Terca', shortLabel: 'Ter' },
  { id: 3, label: 'Quarta', shortLabel: 'Qua' },
  { id: 4, label: 'Quinta', shortLabel: 'Qui' },
  { id: 5, label: 'Sexta', shortLabel: 'Sex' },
  { id: 6, label: 'Sabado', shortLabel: 'Sab' },
];

const RECORRENCIA_OPTIONS: { id: AulaRecorrencia; label: string }[] = [
  { id: 'recorrente', label: 'Recorrente' },
  { id: 'avulsa', label: 'Avulsa' },
];

type DayGroup = {
  data: string;
  diaSemana: number;
  aulas: AulaCalendarioMes[];
};

function isProfessorUser(user?: SessionUser | null): boolean {
  return user?.tipo === 1 || user?.tipo === 'admin' || user?.tipo === 'professor';
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function moveMonth(month: string, direction: -1 | 1): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + direction, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const monthName = new Date(year, monthNumber - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
  });
  const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${capitalized}/${year}`;
}

function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

function categoryLabels(categorias: AulaCategoria[]): string {
  if (!categorias?.length) return 'Todas';
  return categorias
    .map((id) => STUDENT_CATEGORIES.find((category) => category.id === id)?.label ?? id)
    .join(', ');
}

function dayLabel(dayId: number): string {
  return WEEK_DAYS.find((day) => day.id === dayId)?.label ?? 'Dia';
}

function normalizeHour(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 4);
  if (numbers.length <= 2) return numbers;
  return `${numbers.slice(0, 2)}:${numbers.slice(2)}`;
}

function formatPresentes(
  presentes?: {
    id: string;
    nome: string;
    apelido?: string | null;
  }[]
): string {
  if (!presentes || presentes.length === 0) return 'Nenhum presente marcado';
  return presentes.map((aluno) => aluno.apelido || aluno.nome).join(', ');
}

function hasAulaOccurred(data: string, hora: string, now = new Date()): boolean {
  const [year, month, day] = data.split('-').map(Number);
  const [hours = 0, minutes = 0] = hora.split(':').map(Number);
  if (!year || !month || !day) return false;

  const classDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return classDate.getTime() <= now.getTime();
}

function groupAulasByDay(aulas: AulaCalendarioMes[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const aula of aulas) {
    const existing = groups.get(aula.data);
    if (existing) {
      existing.aulas.push(aula);
      continue;
    }

    groups.set(aula.data, {
      data: aula.data,
      diaSemana: aula.diaSemana,
      aulas: [aula],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      aulas: [...group.aulas].sort((a, b) => a.hora.localeCompare(b.hora)),
    }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

export default function CalendarioScreen() {
  const topPadding = useScreenTopPadding();
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [tiposAula, setTiposAula] = useState<TipoAula[]>([]);
  const [aulas, setAulas] = useState<AulaCalendarioMes[]>([]);
  const [selectedTipoAulaId, setSelectedTipoAulaId] = useState('');
  const [newTipoAula, setNewTipoAula] = useState('');
  const [showNewTipoInput, setShowNewTipoInput] = useState(false);
  const [recorrencia, setRecorrencia] = useState<AulaRecorrencia>('recorrente');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dataAvulsa, setDataAvulsa] = useState('');
  const [hora, setHora] = useState('');
  const [categorias, setCategorias] = useState<AulaCategoria[]>([]);

  const isProfessor = isProfessorUser(user);
  const tiposAulaVisiveis = useMemo(
    () =>
      tiposAula.filter(
        (tipo) => tipo.id !== 'aula-avulsa' && tipo.nome.trim().toLowerCase() !== 'aula avulsa'
      ),
    [tiposAula]
  );
  const aulasVisiveis = useMemo(() => {
    if (isProfessor) return aulas;
    return aulas.filter((aula) => !hasAulaOccurred(aula.data, aula.hora));
  }, [aulas, isProfessor]);
  const aulasPorDia = useMemo(() => groupAulasByDay(aulasVisiveis), [aulasVisiveis]);

  const resetForm = useCallback(() => {
    setNewTipoAula('');
    setShowNewTipoInput(false);
    setSelectedDays([]);
    setDataAvulsa('');
    setHora('');
    setCategorias([]);
    setRecorrencia('recorrente');
    setSelectedTipoAulaId((previous) => previous || '');
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [currentUser, tipos, calendario] = await Promise.all([
        getCurrentUser(),
        parabaService.listarTiposAula(),
        parabaService.listarCalendarioMes(month),
      ]);
      setUser(currentUser);
      setTiposAula(tipos);
      setAulas(calendario.aulas);
      const tiposVisiveis = tipos.filter(
        (tipo) => tipo.id !== 'aula-avulsa' && tipo.nome.trim().toLowerCase() !== 'aula avulsa'
      );
      setSelectedTipoAulaId((previous) => {
        if (previous && tiposVisiveis.some((tipo) => tipo.id === previous)) return previous;
        return tiposVisiveis[0]?.id || '';
      });
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel carregar o calendario.'));
    } finally {
      setLoading(false);
    }
  }, [month, showError]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const toggleDay = (day: number) => {
    setSelectedDays((previous) =>
      previous.includes(day) ? previous.filter((item) => item !== day) : [...previous, day].sort((a, b) => a - b)
    );
  };

  const toggleCategoria = (category: StudentCategory) => {
    setCategorias((previous) =>
      previous.includes(category.id)
        ? previous.filter((item) => item !== category.id)
        : [...previous, category.id]
    );
  };

  const saveClass = async () => {
    const trimmedNewType = newTipoAula.trim();

    if (showNewTipoInput) {
      if (!trimmedNewType) {
        showError('Informe o nome do novo tipo de aula.');
        return;
      }
    } else if (!selectedTipoAulaId) {
      showError('Selecione um tipo de aula.');
      return;
    }

    if (categorias.length === 0) {
      showError('Selecione ao menos uma categoria.');
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(hora)) {
      showError('Informe a hora no formato HH:mm.');
      return;
    }

    if (recorrencia === 'recorrente' && selectedDays.length === 0) {
      showError('Selecione ao menos um dia da semana.');
      return;
    }

    const dataIso = recorrencia === 'avulsa' ? brDateToIso(dataAvulsa) : undefined;
    if (recorrencia === 'avulsa' && !dataIso) {
      showError('Informe a data da aula avulsa no formato DD/MM/AAAA.');
      return;
    }

    try {
      setSaving(true);
      await parabaService.cadastrarAulaCalendario({
        tipoAulaId: showNewTipoInput ? undefined : selectedTipoAulaId,
        novoTipoAula: showNewTipoInput ? trimmedNewType : undefined,
        recorrencia,
        diasSemana: recorrencia === 'recorrente' ? selectedDays : undefined,
        data: dataIso ?? undefined,
        hora,
        categorias,
      });
      resetForm();
      setShowForm(false);
      await load();
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel cadastrar a aula.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: topPadding }]}>
      <Text style={styles.title}>Calendario</Text>
      <Text style={styles.subtitle}>
        {isProfessor ? 'Veja as aulas do mes e seus horarios.' : 'Veja suas proximas aulas e horarios.'}
      </Text>

      {isProfessor ? (
        <>
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
            {showForm ? 'Fechar cadastro' : 'Cadastrar aula'}
          </AppButton>

          {showForm ? (
            <AppCard style={styles.card}>
              <Text style={styles.cardTitle}>Cadastrar aula</Text>

              <Text style={styles.label}>Tipo de aula</Text>
              <View style={styles.chips}>
                {tiposAulaVisiveis.map((tipo) => {
                  const selected = selectedTipoAulaId === tipo.id && !showNewTipoInput;
                  return (
                    <Pressable
                      key={tipo.id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => {
                        setSelectedTipoAulaId(tipo.id);
                        setNewTipoAula('');
                        setShowNewTipoInput(false);
                      }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tipo.nome}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={[styles.addTipoChip, showNewTipoInput && styles.chipSelected]}
                  onPress={() => {
                    setShowNewTipoInput((previous) => {
                      const next = !previous;
                      if (!next) {
                        setNewTipoAula('');
                      } else {
                        setSelectedTipoAulaId('');
                      }
                      return next;
                    });
                  }}
                >
                  <Ionicons name="add" size={18} color={showNewTipoInput ? Theme.white : Theme.primary} />
                </Pressable>
              </View>

              {showNewTipoInput ? (
                <TextInput
                  style={styles.input}
                  value={newTipoAula}
                  onChangeText={setNewTipoAula}
                  placeholder="Criar novo tipo de aula"
                  placeholderTextColor={Theme.textMuted}
                  autoFocus
                />
              ) : null}

              <Text style={styles.label}>Recorrencia</Text>
              <View style={styles.chips}>
                {RECORRENCIA_OPTIONS.map((option) => {
                  const selected = recorrencia === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => {
                        setRecorrencia(option.id);
                        if (option.id === 'avulsa') {
                          setSelectedDays([]);
                        } else {
                          setDataAvulsa('');
                        }
                      }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {recorrencia === 'recorrente' ? (
                <>
                  <Text style={styles.label}>Dia da semana</Text>
                  <View style={styles.chips}>
                    {WEEK_DAYS.map((day) => {
                      const selected = selectedDays.includes(day.id);
                      return (
                        <Pressable
                          key={day.id}
                          style={[styles.dayChip, selected && styles.chipSelected]}
                          onPress={() => toggleDay(day.id)}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{day.shortLabel}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Data da aula</Text>
                  <TextInput
                    style={styles.input}
                    value={dataAvulsa}
                    onChangeText={(value) => setDataAvulsa(formatDate(value))}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={Theme.textMuted}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </>
              )}

              <Text style={styles.label}>Hora</Text>
              <TextInput
                style={styles.input}
                value={hora}
                onChangeText={(value) => setHora(normalizeHour(value))}
                placeholder="19:30"
                placeholderTextColor={Theme.textMuted}
                keyboardType="numeric"
                maxLength={5}
              />

              <Text style={styles.label}>Categorias</Text>
              <View style={styles.chips}>
                {STUDENT_CATEGORIES.map((category) => {
                  const selected = categorias.includes(category.id);
                  return (
                    <Pressable
                      key={category.id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => toggleCategoria(category)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{category.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <AppButton onPress={saveClass} loading={saving}>
                Salvar aula
              </AppButton>
            </AppCard>
          ) : null}
        </>
      ) : null}

      <View style={styles.monthHeader}>
        <Pressable style={styles.monthButton} onPress={() => setMonth((previous) => moveMonth(previous, -1))}>
          <Ionicons name="chevron-back" size={20} color={Theme.primary} />
        </Pressable>
        <Text style={styles.monthTitle}>{formatMonth(month)}</Text>
        <Pressable style={styles.monthButton} onPress={() => setMonth((previous) => moveMonth(previous, 1))}>
          <Ionicons name="chevron-forward" size={20} color={Theme.primary} />
        </Pressable>
      </View>

      {loading ? <ActivityIndicator color={Theme.primary} /> : null}

      {!loading && aulasPorDia.length === 0 ? (
        <Text style={styles.empty}>
          {isProfessor ? 'Nenhuma aula cadastrada para este mes.' : 'Nenhuma aula proxima neste mes.'}
        </Text>
      ) : null}

      {aulasPorDia.map((group) => (
        <AppCard key={group.data} style={styles.dayCard}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{formatDateLabel(group.data)}</Text>
            <Text style={styles.daySubtitle}>{dayLabel(group.diaSemana)}</Text>
          </View>

          <View style={styles.dayLessons}>
            {group.aulas.map((aula, index) => (
              <View
                key={aula.id}
                style={[styles.lessonRow, index < group.aulas.length - 1 && styles.lessonRowDivider]}
              >
                <Text style={styles.lessonHour}>{aula.hora}</Text>
                <View style={styles.lessonInfo}>
                  <Text style={styles.lessonTitle}>{aula.tipoAula.nome}</Text>
                  <Text style={styles.lessonMeta}>{categoryLabels(aula.categorias ?? [])}</Text>
                  {aula.recorrencia ? (
                    <Text style={styles.lessonMeta}>
                      {aula.recorrencia === 'avulsa' ? 'Avulsa' : 'Recorrente'}
                    </Text>
                  ) : null}
                  {isProfessor && hasAulaOccurred(aula.data, aula.hora) ? (
                    <Text style={styles.lessonPresentes}>
                      Presentes ({aula.totalPresentes ?? 0}): {formatPresentes(aula.presentes)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </AppCard>
      ))}

      <AlertError visible={errorVisible} message={errorMessage} title={errorTitle} onClose={hideError} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  container: {
    gap: 14,
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
  card: {
    gap: 12,
  },
  cardTitle: {
    color: Theme.text,
    fontSize: 18,
    fontWeight: '900',
  },
  label: {
    color: Theme.text,
    fontSize: 13,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderColor: Theme.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  addTipoChip: {
    alignItems: 'center',
    borderColor: Theme.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  dayChip: {
    alignItems: 'center',
    borderColor: Theme.border,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  chipSelected: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  chipText: {
    color: Theme.text,
    fontSize: 13,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: Theme.white,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: Theme.white,
    borderColor: Theme.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  monthTitle: {
    color: Theme.text,
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  empty: {
    color: Theme.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
  dayCard: {
    gap: 12,
  },
  dayHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
  },
  dayTitle: {
    color: Theme.text,
    fontSize: 17,
    fontWeight: '900',
  },
  daySubtitle: {
    color: Theme.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  dayLessons: {
    gap: 0,
  },
  lessonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  lessonRowDivider: {
    borderBottomColor: Theme.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lessonHour: {
    color: Theme.primary,
    fontSize: 15,
    fontWeight: '900',
    minWidth: 52,
  },
  lessonInfo: {
    flex: 1,
    gap: 2,
  },
  lessonTitle: {
    color: Theme.text,
    fontSize: 15,
    fontWeight: '800',
  },
  lessonMeta: {
    color: Theme.textMuted,
    fontSize: 13,
  },
  lessonPresentes: {
    color: Theme.secondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 2,
  },
});
