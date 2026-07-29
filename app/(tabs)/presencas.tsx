import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { STUDENT_CATEGORY_FILTERS } from '@/constants/StudentCategories';
import { Theme } from '@/constants/Theme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import {
  parabaService,
  type PresencaAulaDoDia,
  type PresencaDiaAluno,
} from '@/services/parabaService';
import { brDateToIso, formatDate } from '@/utils/formatters';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoToBrDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

function categoryLabel(categoria: string): string {
  return STUDENT_CATEGORY_FILTERS.find((item) => item.id === categoria)?.label ?? categoria;
}

export default function PresencasScreen() {
  const topPadding = useScreenTopPadding();
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [dateInput, setDateInput] = useState(isoToBrDate(todayIso()));
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [aulas, setAulas] = useState<PresencaAulaDoDia[]>([]);
  const [selectedAulaId, setSelectedAulaId] = useState<string | null>(null);
  const [alunos, setAlunos] = useState<PresencaDiaAluno[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingAlunoId, setSavingAlunoId] = useState<string | null>(null);

  const selectedAula = useMemo(
    () => aulas.find((aula) => aula.aulaId === selectedAulaId) ?? null,
    [aulas, selectedAulaId]
  );
  const presentes = useMemo(() => alunos.filter((aluno) => aluno.presente).length, [alunos]);

  const load = useCallback(
    async (dataPresenca = selectedDate, aulaId = selectedAulaId ?? undefined) => {
      try {
        setLoading(true);
        const result = await parabaService.listarPresencas(dataPresenca, aulaId);
        setAulas(result.aulas);
        const nextAulaId = result.aulaSelecionada?.aulaId ?? result.aulas[0]?.aulaId ?? null;
        setSelectedAulaId(nextAulaId);
        setAlunos(result.alunos);
      } catch (error) {
        showError(apiErrorMessage(error, 'Nao foi possivel carregar a lista de presenca.'));
      } finally {
        setLoading(false);
      }
    },
    [selectedAulaId, selectedDate, showError]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const applyDate = () => {
    const iso = brDateToIso(dateInput);
    if (!iso) {
      showError('Informe a data no formato DD/MM/AAAA.');
      return;
    }

    setSelectedDate(iso);
    setSelectedAulaId(null);
    void load(iso, undefined);
  };

  const selectAula = (aulaId: string) => {
    setSelectedAulaId(aulaId);
    void load(selectedDate, aulaId);
  };

  const togglePresenca = async (alunoId: string) => {
    if (!selectedAulaId) {
      showError('Selecione a aula para marcar a presenca.');
      return;
    }

    try {
      setSavingAlunoId(alunoId);
      const result = await parabaService.alternarPresenca(selectedDate, selectedAulaId, alunoId);
      setAlunos((previous) => previous.map((aluno) => (aluno.id === alunoId ? result.aluno : aluno)));
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
        <View style={styles.dateRow}>
          <TextInput
            style={styles.input}
            value={dateInput}
            onChangeText={(value) => setDateInput(formatDate(value))}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={Theme.textMuted}
            keyboardType="number-pad"
            maxLength={10}
          />
          <View style={styles.dateButton}>
            <AppButton onPress={applyDate}>Buscar</AppButton>
          </View>
        </View>

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
                    {categoryLabel(aula.categoria)}
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

      {loading ? <ActivityIndicator color={Theme.primary} /> : null}

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
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{aluno.nome}</Text>
                      {aluno.apelido ? <Text style={styles.studentMeta}>Apelido: {aluno.apelido}</Text> : null}
                      <Text style={styles.studentMeta}>Total de presenças: {aluno.totalPresencas ?? 0}</Text>
                    </View>
                    {saving ? (
                      <ActivityIndicator color={Theme.primary} />
                    ) : (
                      <Ionicons
                        name={aluno.presente ? 'checkmark-circle' : 'ellipse-outline'}
                        size={30}
                        color={aluno.presente ? Theme.secondary : Theme.textMuted}
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
  dateCard: {
    gap: 12,
  },
  cardTitle: {
    color: Theme.text,
    fontSize: 18,
    fontWeight: '800',
  },
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    backgroundColor: Theme.inputBg,
    borderColor: Theme.border,
    borderRadius: 14,
    borderWidth: 1,
    color: Theme.text,
    flex: 1,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  dateButton: {
    width: 110,
  },
  aulaChips: {
    gap: 8,
  },
  aulaChip: {
    borderColor: Theme.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  aulaChipSelected: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  aulaChipTitle: {
    color: Theme.text,
    fontSize: 15,
    fontWeight: '900',
  },
  aulaChipMeta: {
    color: Theme.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  aulaChipTextSelected: {
    color: Theme.white,
  },
  emptyInline: {
    color: Theme.textMuted,
    fontSize: 14,
  },
  summary: {
    color: Theme.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
  studentCard: {
    borderColor: Theme.border,
  },
  studentPresent: {
    borderColor: Theme.secondary,
    borderWidth: 2,
  },
  studentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  studentInfo: {
    flex: 1,
    gap: 4,
  },
  studentName: {
    color: Theme.text,
    fontSize: 17,
    fontWeight: '900',
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
});
