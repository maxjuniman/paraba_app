import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AlertError } from '@/components/ui/AlertError';
import { AppCard } from '@/components/ui/AppCard';
import { type ThemeColors } from '@/constants/Theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService, type Aluno } from '@/services/parabaService';
import {
  currentPaymentReference,
  isPaidForReference,
  paymentStatus,
  paymentStatusLabel,
  previousPaymentReference,
  shouldCountForReference,
  type PaymentStatus,
} from '@/utils/paymentStatus';

type PaymentViewMode = 'current' | 'lastUnpaid';
type PaymentStatusFilter = 'todos' | 'pago' | 'emAberto' | 'atrasado';

const PAYMENT_STATUS_FILTERS: { id: PaymentStatusFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pago', label: 'Pago' },
  { id: 'emAberto', label: 'Em aberto' },
  { id: 'atrasado', label: 'Em atraso' },
];

function normalizePaymentDay(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2);
}

function isValidPaymentDay(value: string): boolean {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 31;
}

function selectedOnPrimaryText(primary: string): string {
  return primary === '#FFFFFF' || primary === '#E5E7EB' ? '#000000' : '#FFFFFF';
}

function paymentStatusColor(status: PaymentStatus, colors: ThemeColors): string {
  if (status === 'pago') return colors.secondary;
  if (status === 'atrasado') return colors.danger;
  if (status === 'venceHoje') return colors.warning;
  return colors.textMuted;
}

function matchesStatusFilter(status: PaymentStatus, filter: PaymentStatusFilter): boolean {
  if (filter === 'todos') return true;
  if (filter === 'pago') return status === 'pago';
  if (filter === 'atrasado') return status === 'atrasado';
  return status === 'aguardando' || status === 'venceHoje' || status === 'semDia' || status === 'naoIniciado';
}

export default function PagamentosScreen() {
  const topPadding = useScreenTopPadding();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const onPrimary = selectedOnPrimaryText(colors.primary);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingAlunoId, setSavingAlunoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<PaymentViewMode>('current');
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('todos');
  const [search, setSearch] = useState('');
  const [modalAluno, setModalAluno] = useState<Aluno | null>(null);
  const [modalDay, setModalDay] = useState('');
  const [modalError, setModalError] = useState('');

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

  const activeReference = viewMode === 'lastUnpaid' ? previousPaymentReference() : currentPaymentReference();
  const activeAlunos = alunos.filter((aluno) => aluno.ativo !== false);
  const baseAlunos =
    viewMode === 'lastUnpaid'
      ? activeAlunos.filter((aluno) => {
          const paymentDay = Number(aluno.dataPagamento);
          return (
            Number.isInteger(paymentDay) &&
            paymentDay >= 1 &&
            paymentDay <= 31 &&
            shouldCountForReference(aluno, activeReference) &&
            !isPaidForReference(aluno, activeReference)
          );
        })
      : activeAlunos;
  const visibleAlunos = baseAlunos.filter((aluno) => {
    const normalizedSearch = search.trim().toLowerCase();
    const status = paymentStatus(aluno, activeReference);
    const matchesStatus = matchesStatusFilter(status, statusFilter);
    if (!matchesStatus) return false;

    if (!normalizedSearch) return true;

    return [aluno.nome, aluno.apelido]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(normalizedSearch));
  });

  const closeModal = () => {
    if (savingAlunoId) return;
    setModalAluno(null);
    setModalDay('');
    setModalError('');
  };

  const openMarkPaidModal = (aluno: Aluno) => {
    setModalError('');
    setModalAluno(aluno);
    setModalDay(normalizePaymentDay(String(aluno.dataPagamento ?? '')));
  };

  const unmarkPaid = async (aluno: Aluno) => {
    try {
      setSavingAlunoId(aluno.id);
      const updated = await parabaService.atualizarStatusPagamento({
        alunoId: aluno.id,
        pago: false,
        referencia: activeReference,
      });
      setAlunos((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel atualizar o status do pagamento.'));
    } finally {
      setSavingAlunoId(null);
    }
  };

  const confirmMarkPaid = async () => {
    if (!modalAluno) return;

    const dataPagamento = modalDay.trim();
    if (!dataPagamento || !isValidPaymentDay(dataPagamento)) {
      setModalError('Informe o dia em que foi pago (1 a 31).');
      return;
    }

    try {
      setModalError('');
      setSavingAlunoId(modalAluno.id);
      const updated = await parabaService.atualizarStatusPagamento({
        alunoId: modalAluno.id,
        pago: true,
        referencia: activeReference,
        dataPagamento,
      });
      setAlunos((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      setModalAluno(null);
      setModalDay('');
    } catch (error) {
      setModalError(apiErrorMessage(error, 'Nao foi possivel marcar o pagamento.'));
    } finally {
      setSavingAlunoId(null);
    }
  };

  const deactivateUser = async (aluno: Aluno) => {
    try {
      setSavingAlunoId(aluno.id);
      const updated = await parabaService.desativarUsuarioAluno(aluno.id);
      setAlunos((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel desativar o usuario.'));
    } finally {
      setSavingAlunoId(null);
    }
  };

  const modalBusy = Boolean(modalAluno && savingAlunoId === modalAluno.id);

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Pagamentos</Text>
        <Text style={styles.subtitle}>Marque pagamentos do mes e acompanhe atrasos automaticamente.</Text>

        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterButton, viewMode === 'current' && styles.filterButtonSelected]}
            onPress={() => setViewMode('current')}
          >
            <Text style={[styles.filterText, viewMode === 'current' && styles.filterTextSelected]}>Mes atual</Text>
          </Pressable>
          <Pressable
            style={[styles.filterButton, viewMode === 'lastUnpaid' && styles.filterButtonSelected]}
            onPress={() => setViewMode('lastUnpaid')}
          >
            <Text style={[styles.filterText, viewMode === 'lastUnpaid' && styles.filterTextSelected]}>
              Mes passado nao pago
            </Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nome ou apelido"
          placeholderTextColor={colors.textMuted}
        />

        <View style={styles.filterRow}>
          {PAYMENT_STATUS_FILTERS.map((filter) => {
            const selected = statusFilter === filter.id;
            return (
              <Pressable
                key={filter.id}
                style={[styles.filterButton, selected && styles.filterButtonSelected]}
                onPress={() => setStatusFilter(filter.id)}
              >
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>
          {viewMode === 'lastUnpaid' ? 'Pendencias do mes passado' : 'Status atual'}
        </Text>
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {!loading && visibleAlunos.length === 0 ? (
          <Text style={styles.emptyText}>
            {viewMode === 'lastUnpaid' ? 'Nenhum aluno pendente do mes passado.' : 'Nenhum aluno cadastrado.'}
          </Text>
        ) : null}
        {visibleAlunos.map((aluno) => {
          const status = paymentStatus(aluno, activeReference);
          const paid = isPaidForReference(aluno, activeReference);
          const isOverdue = status === 'atrasado';
          const accessBlocked = Boolean(aluno.userId) && aluno.user?.ativo === false;
          const isSaving = savingAlunoId === aluno.id;
          const statusColor = paymentStatusColor(status, colors);

          return (
            <AppCard key={aluno.id} style={styles.paymentCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleBox}>
                  <Text style={styles.studentName}>{aluno.nome}</Text>
                  {aluno.apelido ? <Text style={styles.studentMeta}>Apelido: {aluno.apelido}</Text> : null}
                  <Text style={styles.studentMeta}>
                    Pagamento: {aluno.dataPagamento ? `Dia ${aluno.dataPagamento}` : 'nao informado'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{paymentStatusLabel(status)}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  disabled={isSaving}
                  style={[
                    styles.actionButton,
                    paid ? styles.actionButtonSecondary : styles.actionButtonPrimary,
                    isSaving && styles.actionButtonDisabled,
                  ]}
                  onPress={() => {
                    if (paid) {
                      void unmarkPaid(aluno);
                      return;
                    }
                    openMarkPaidModal(aluno);
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator color={paid ? colors.primary : onPrimary} size="small" />
                  ) : (
                    <Ionicons
                      name={paid ? 'close-circle-outline' : 'checkmark-circle-outline'}
                      size={18}
                      color={paid ? colors.primary : onPrimary}
                    />
                  )}
                  <Text style={[styles.actionText, paid ? styles.actionTextSecondary : styles.actionTextPrimary]}>
                    {paid ? 'Nao pago' : 'Pago'}
                  </Text>
                </Pressable>

                {isOverdue ? (
                  <Pressable
                    disabled={isSaving || accessBlocked}
                    style={[
                      styles.actionButton,
                      styles.actionButtonDanger,
                      (isSaving || accessBlocked) && styles.actionButtonDisabled,
                    ]}
                    onPress={() => {
                      if (!aluno.userId) {
                        showError('Este aluno nao possui usuario vinculado para bloquear.');
                        return;
                      }

                      void deactivateUser(aluno);
                    }}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={colors.danger} size="small" />
                    ) : (
                      <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
                    )}
                    <Text style={[styles.actionText, styles.actionTextDanger]}>
                      {accessBlocked ? 'Acesso bloqueado' : 'Bloquear acesso'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </AppCard>
          );
        })}

        <AlertError visible={errorVisible} message={errorMessage} title={errorTitle} onClose={hideError} />
      </ScrollView>

      <Modal transparent visible={Boolean(modalAluno)} animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Marcar pagamento</Text>
            <Text style={styles.modalSubtitle}>
              Em que dia do mes {modalAluno?.nome} pagou?
            </Text>
            {modalError ? <Text style={styles.modalError}>{modalError}</Text> : null}
            <Text style={styles.modalLabel}>Dia (1 a 31)</Text>
            <TextInput
              style={styles.modalInput}
              value={modalDay}
              onChangeText={(value) => setModalDay(normalizePaymentDay(value))}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="Ex: 10"
              placeholderTextColor={colors.textMuted}
              editable={!modalBusy}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                disabled={modalBusy}
                style={[styles.modalButton, styles.modalButtonGhost, modalBusy && styles.actionButtonDisabled]}
                onPress={closeModal}
              >
                <Text style={styles.modalButtonGhostText}>Cancelar</Text>
              </Pressable>
              <Pressable
                disabled={modalBusy}
                style={[styles.modalButton, styles.modalButtonPrimary, modalBusy && styles.actionButtonDisabled]}
                onPress={() => void confirmMarkPaid()}
              >
                {modalBusy ? (
                  <ActivityIndicator color={onPrimary} size="small" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Confirmar</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
    filterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterButton: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    filterButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      textAlign: 'center',
    },
    filterTextSelected: {
      color: onPrimary,
    },
    searchInput: {
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      color: colors.text,
      fontSize: 15,
      minHeight: 48,
      paddingHorizontal: 14,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginTop: 6,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
    paymentCard: {
      gap: 7,
      padding: 12,
    },
    cardHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
    },
    cardTitleBox: {
      flex: 1,
    },
    studentName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 5,
    },
    studentMeta: {
      color: colors.textMuted,
      fontSize: 12,
    },
    statusBadge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '800',
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 2,
    },
    actionButton: {
      alignItems: 'center',
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 5,
      minHeight: 34,
      paddingHorizontal: 11,
    },
    actionButtonPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    actionButtonSecondary: {
      backgroundColor: colors.card,
      borderColor: colors.primary,
    },
    actionButtonDanger: {
      backgroundColor: colors.card,
      borderColor: colors.danger,
    },
    actionButtonDisabled: {
      opacity: 0.55,
    },
    actionText: {
      fontSize: 12,
      fontWeight: '800',
    },
    actionTextPrimary: {
      color: onPrimary,
    },
    actionTextSecondary: {
      color: colors.primary,
    },
    actionTextDanger: {
      color: colors.danger,
    },
    modalOverlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.48)',
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      gap: 12,
      maxWidth: 420,
      padding: 20,
      width: '100%',
    },
    modalTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
      textAlign: 'center',
    },
    modalSubtitle: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    modalError: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
    modalLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    modalInput: {
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      minHeight: 52,
      paddingHorizontal: 14,
      textAlign: 'center',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    modalButton: {
      alignItems: 'center',
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      justifyContent: 'center',
      minHeight: 44,
    },
    modalButtonGhost: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    modalButtonPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modalButtonGhostText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    modalButtonPrimaryText: {
      color: onPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
  });
}
