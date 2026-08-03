import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AlertError } from '@/components/ui/AlertError';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { getStudentCategoryByBirthDate, STUDENT_CATEGORY_FILTERS } from '@/constants/StudentCategories';
import { type ThemeColors } from '@/constants/Theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import {
  parabaService,
  type PresencaAulaDoDia,
  type PresencaDiaAluno,
} from '@/services/parabaService';
import { brDateToIso } from '@/utils/formatters';

const WEEK_DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function selectedOnPrimaryText(primary: string): string {
  return primary === '#FFFFFF' || primary === '#E5E7EB' ? '#000000' : '#FFFFFF';
}

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isoToBrDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

function isoToLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function localDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatMonthTitle(date: Date): string {
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildMonthDays(month: Date): (Date | null)[] {
  const first = startOfMonth(month);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const startWeekday = first.getDay();
  const cells: (Date | null)[] = Array.from({ length: startWeekday }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function categoryLabel(categoria: string): string {
  return STUDENT_CATEGORY_FILTERS.find((item) => item.id === categoria)?.label ?? categoria;
}

function resolveCategorias(aula: PresencaAulaDoDia & { categoria?: string }): string[] {
  if (Array.isArray(aula.categorias) && aula.categorias.length > 0) {
    return aula.categorias;
  }
  if (aula.categoria && aula.categoria !== 'all') {
    return [aula.categoria];
  }
  return [];
}

function categoryLabels(categorias?: string[] | null): string {
  if (!categorias?.length) return 'Todas';
  return categorias.map((categoria) => categoryLabel(categoria)).join(', ');
}

function alunoMatchesAula(aluno: PresencaDiaAluno, aula: PresencaAulaDoDia): boolean {
  const categorias = resolveCategorias(aula);
  if (!categorias.length) return true;
  const category = getStudentCategoryByBirthDate(aluno.dataNascimento);
  if (!category) return false;
  return categorias.includes(category.id);
}

export default function PresencasScreen() {
  const topPadding = useScreenTopPadding();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const onPrimary = selectedOnPrimaryText(colors.primary);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [dateInput, setDateInput] = useState(isoToBrDate(todayIso()));
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draftDate, setDraftDate] = useState(todayIso());
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [aulas, setAulas] = useState<PresencaAulaDoDia[]>([]);
  const [selectedAulaId, setSelectedAulaId] = useState<string | null>(null);
  const [allAlunos, setAllAlunos] = useState<PresencaDiaAluno[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingAlunoId, setSavingAlunoId] = useState<string | null>(null);

  const selectedAula = useMemo(
    () => aulas.find((aula) => aula.aulaId === selectedAulaId) ?? null,
    [aulas, selectedAulaId]
  );

  const alunos = useMemo(() => {
    if (!selectedAula) return [];

    return allAlunos
      .filter((aluno) => alunoMatchesAula(aluno, selectedAula))
      .map((aluno) => ({
        ...aluno,
        presente: aluno.presentePorAula?.[selectedAula.aulaId] ?? false,
      }));
  }, [allAlunos, selectedAula]);

  const presentes = useMemo(() => alunos.filter((aluno) => aluno.presente).length, [alunos]);
  const monthDays = useMemo(() => buildMonthDays(calendarMonth), [calendarMonth]);
  const today = todayIso();

  const load = useCallback(
    async (dataPresenca: string) => {
      try {
        setLoading(true);
        const result = await parabaService.listarPresencas(dataPresenca);
        setAulas(result.aulas);
        setSelectedAulaId((current) => {
          if (current && result.aulas.some((aula) => aula.aulaId === current)) {
            return current;
          }
          return result.aulaSelecionada?.aulaId ?? result.aulas[0]?.aulaId ?? null;
        });
        setAllAlunos(result.alunos);
      } catch (error) {
        showError(apiErrorMessage(error, 'Nao foi possivel carregar a lista de presenca.'));
      } finally {
        setLoading(false);
      }
    },
    [showError]
  );

  useFocusEffect(
    useCallback(() => {
      void load(selectedDateRef.current);
    }, [load])
  );

  const applyIsoDate = (iso: string) => {
    setDateInput(isoToBrDate(iso));
    setSelectedDate(iso);
    setSelectedAulaId(null);
    void load(iso);
  };

  const openDatePicker = () => {
    const iso = brDateToIso(dateInput) || selectedDate || todayIso();
    setDraftDate(iso);
    setCalendarMonth(startOfMonth(isoToLocalDate(iso)));
    setShowDatePicker(true);
  };

  const confirmDate = () => {
    applyIsoDate(draftDate);
    setShowDatePicker(false);
  };

  const selectAula = (aulaId: string) => {
    setSelectedAulaId(aulaId);
  };

  const togglePresenca = async (alunoId: string) => {
    if (!selectedAulaId) {
      showError('Selecione a aula para marcar a presenca.');
      return;
    }

    try {
      setSavingAlunoId(alunoId);
      const result = await parabaService.alternarPresenca(selectedDate, selectedAulaId, alunoId);
      setAllAlunos((previous) =>
        previous.map((aluno) => {
          if (aluno.id !== alunoId) return aluno;
          return {
            ...aluno,
            ...result.aluno,
            presentePorAula: {
              ...(aluno.presentePorAula ?? {}),
              [selectedAulaId]: result.aluno.presente,
            },
          };
        })
      );
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel atualizar a presenca.'));
    } finally {
      setSavingAlunoId(null);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Lista de presença</Text>
      <Text style={styles.subtitle}>Escolha o dia, a aula e toque no aluno para marcar presença.</Text>

      <AppCard style={styles.dateCard}>
        <Text style={styles.cardTitle}>Dia da aula</Text>
        <Pressable style={styles.dateInput} onPress={openDatePicker}>
          <Text style={[styles.dateInputText, !dateInput && styles.dateInputPlaceholder]}>
            {dateInput || 'Selecionar data'}
          </Text>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </Pressable>

        <Modal
          transparent
          visible={showDatePicker}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <Pressable style={styles.pickerOverlay} onPress={() => setShowDatePicker(false)}>
            <Pressable style={styles.pickerSheet} onPress={(event) => event.stopPropagation()}>
              <View style={styles.calendarHeader}>
                <Pressable
                  style={styles.monthButton}
                  onPress={() => setCalendarMonth((current) => addMonths(current, -1))}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.primary} />
                </Pressable>
                <Text style={styles.pickerTitle}>{formatMonthTitle(calendarMonth)}</Text>
                <Pressable
                  style={styles.monthButton}
                  onPress={() => setCalendarMonth((current) => addMonths(current, 1))}
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {WEEK_DAY_LABELS.map((label, index) => (
                  <Text key={`${label}-${index}`} style={styles.weekLabel}>
                    {label}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {monthDays.map((day, index) => {
                  if (!day) {
                    return <View key={`empty-${index}`} style={styles.dayCell} />;
                  }

                  const iso = localDateToIso(day);
                  const selected = iso === draftDate;
                  const isToday = iso === today;

                  return (
                    <Pressable
                      key={iso}
                      style={[
                        styles.dayCell,
                        isToday && !selected && styles.dayToday,
                        selected && styles.daySelected,
                      ]}
                      onPress={() => setDraftDate(iso)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isToday && !selected && styles.dayTodayText,
                          selected && { color: onPrimary },
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.pickerActions}>
                <AppButton variant="secondary" onPress={() => setShowDatePicker(false)}>
                  Cancelar
                </AppButton>
                <AppButton onPress={confirmDate}>Confirmar</AppButton>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Text style={styles.cardTitle}>Aulas do dia</Text>
        {aulas.length > 0 ? (
          <View style={styles.aulaChips}>
            {aulas.map((aula) => {
              const selected = selectedAulaId === aula.aulaId;
              return (
                <Pressable
                  key={aula.aulaId}
                  style={[styles.aulaChip, selected && styles.aulaChipSelected]}
                  onPress={() => selectAula(aula.aulaId)}
                >
                  <Text style={[styles.aulaChipTitle, selected && styles.aulaChipTextSelected]}>
                    {aula.hora} · {aula.tipoAula.nome}
                  </Text>
                  <Text style={[styles.aulaChipMeta, selected && styles.aulaChipTextSelected]}>
                    {categoryLabels(resolveCategorias(aula))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyInline}>Nenhuma aula cadastrada para este dia.</Text>
        )}

        {selectedAula ? (
          <Text style={styles.summary}>
            {presentes} de {alunos.length} aluno{alunos.length === 1 ? '' : 's'} presentes em {selectedAula.hora} ·{' '}
            {selectedAula.tipoAula.nome}
          </Text>
        ) : null}
      </AppCard>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      {selectedAula
        ? alunos.map((aluno) => {
            const saving = savingAlunoId === aluno.id;
            return (
              <Pressable
                key={aluno.id}
                onPress={() => void togglePresenca(aluno.id)}
                disabled={saving}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <AppCard style={[styles.studentCard, aluno.presente && styles.studentPresent]}>
                  <View style={styles.studentRow}>
                    <Text style={styles.studentName} numberOfLines={1}>
                      {aluno.apelido ? `${aluno.nome} (${aluno.apelido})` : aluno.nome}
                    </Text>
                    {saving ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Ionicons
                        name={aluno.presente ? 'checkmark-circle' : 'ellipse-outline'}
                        size={26}
                        color={aluno.presente ? colors.secondary : colors.textMuted}
                      />
                    )}
                  </View>
                </AppCard>
              </Pressable>
            );
          })
        : null}

      {!loading && selectedAula && alunos.length === 0 ? (
        <Text style={styles.empty}>Nenhum aluno nesta categoria para a chamada.</Text>
      ) : null}

      <AlertError visible={errorVisible} message={errorMessage} title={errorTitle} onClose={hideError} />
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
    dateCard: {
      gap: 12,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    dateInput: {
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
      minHeight: 50,
      paddingHorizontal: 14,
    },
    dateInputText: {
      color: colors.text,
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
    },
    dateInputPlaceholder: {
      color: colors.textMuted,
      fontWeight: '500',
    },
    pickerOverlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    pickerSheet: {
      backgroundColor: colors.card,
      borderRadius: 18,
      gap: 12,
      padding: 16,
      width: '100%',
    },
    pickerTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    calendarHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    monthButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    weekRow: {
      flexDirection: 'row',
    },
    weekLabel: {
      color: colors.textMuted,
      flex: 1,
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'center',
    },
    daysGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      alignItems: 'center',
      height: 40,
      justifyContent: 'center',
      marginVertical: 2,
      width: '14.2857%',
    },
    dayToday: {
      borderColor: colors.primary,
      borderRadius: 999,
      borderWidth: 1.5,
    },
    daySelected: {
      backgroundColor: colors.primary,
      borderRadius: 999,
    },
    dayText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    dayTodayText: {
      color: colors.primary,
      fontWeight: '900',
    },
    pickerActions: {
      gap: 8,
      marginTop: 4,
    },
    aulaChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    aulaChip: {
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: '30%',
      gap: 2,
      minWidth: 96,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    aulaChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    aulaChipTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
    },
    aulaChipMeta: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    aulaChipTextSelected: {
      color: onPrimary,
    },
    emptyInline: {
      color: colors.textMuted,
      fontSize: 14,
    },
    summary: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '800',
    },
    pressed: {
      opacity: 0.82,
    },
    studentCard: {
      borderColor: colors.border,
      paddingVertical: 10,
    },
    studentPresent: {
      borderColor: colors.secondary,
      borderWidth: 2,
    },
    studentRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
      minHeight: 28,
    },
    studentName: {
      color: colors.text,
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
    },
    empty: {
      color: colors.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },
  });
}
