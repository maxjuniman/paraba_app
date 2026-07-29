import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { AppCard } from '@/components/ui/AppCard';
import { Theme } from '@/constants/Theme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService, type Aluno } from '@/services/parabaService';
import { paymentDueDate, resolvePaymentDayInMonth } from '@/utils/paymentDay';

type PaymentStatus = 'pago' | 'atrasado' | 'venceHoje' | 'aguardando' | 'semDia' | 'naoIniciado';
type PaymentViewMode = 'current' | 'lastUnpaid';
type PaymentStatusFilter = 'todos' | 'pago' | 'emAberto' | 'atrasado';

const PAYMENT_STATUS_FILTERS: { id: PaymentStatusFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pago', label: 'Pago' },
  { id: 'emAberto', label: 'Em aberto' },
  { id: 'atrasado', label: 'Em atraso' },
];

function currentPaymentReference(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function previousPaymentReference(): string {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function isPaidForReference(aluno: Aluno, reference: string): boolean {
  return (
    aluno.pagamentosPagos?.includes(reference) ||
    (aluno.pagamentoPago === true && aluno.pagamentoReferencia === reference)
  );
}

function shouldCountForReference(aluno: Aluno, reference: string): boolean {
  if (!aluno.createdAt) return true;

  const paymentDay = Number(aluno.dataPagamento);
  if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) return true;

  const [year, month] = reference.split('-').map(Number);
  const dueDate = paymentDueDate(paymentDay, year, month - 1);
  const createdAt = new Date(aluno.createdAt);

  if (Number.isNaN(createdAt.getTime())) return true;

  return createdAt.getTime() <= dueDate.getTime();
}

function paymentStatus(aluno: Aluno, reference: string): PaymentStatus {
  const paymentDay = Number(aluno.dataPagamento);
  if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) return 'semDia';

  if (isPaidForReference(aluno, reference)) return 'pago';
  if (!shouldCountForReference(aluno, reference)) return 'naoIniciado';
  if (reference !== currentPaymentReference()) return 'atrasado';

  const now = new Date();
  const dueDay = resolvePaymentDayInMonth(paymentDay, now.getFullYear(), now.getMonth());
  const today = now.getDate();
  if (today > dueDay) return 'atrasado';
  if (today === dueDay) return 'venceHoje';
  return 'aguardando';
}

function paymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    pago: 'Pago',
    atrasado: 'Em atraso',
    venceHoje: 'Vence hoje',
    aguardando: 'Nao chegou o dia de pagar ainda',
    semDia: 'Dia de pagamento nao informado',
    naoIniciado: 'Cobranca inicia no proximo vencimento',
  };

  return labels[status];
}

function paymentStatusColor(status: PaymentStatus): string {
  if (status === 'pago') return Theme.secondary;
  if (status === 'atrasado') return Theme.danger;
  if (status === 'venceHoje') return Theme.warning;
  return Theme.textMuted;
}

function matchesStatusFilter(status: PaymentStatus, filter: PaymentStatusFilter): boolean {
  if (filter === 'todos') return true;
  if (filter === 'pago') return status === 'pago';
  if (filter === 'atrasado') return status === 'atrasado';
  return status === 'aguardando' || status === 'venceHoje' || status === 'semDia' || status === 'naoIniciado';
}

export default function PagamentosScreen() {
  const topPadding = useScreenTopPadding();
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingAlunoId, setSavingAlunoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<PaymentViewMode>('current');
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('todos');
  const [search, setSearch] = useState('');

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
  const baseAlunos =
    viewMode === 'lastUnpaid'
      ? alunos.filter((aluno) => {
          const paymentDay = Number(aluno.dataPagamento);
          return (
            Number.isInteger(paymentDay) &&
            paymentDay >= 1 &&
            paymentDay <= 31 &&
            shouldCountForReference(aluno, activeReference) &&
            !isPaidForReference(aluno, activeReference)
          );
        })
      : alunos;
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

  const updatePaymentStatus = async (aluno: Aluno, pago: boolean, reference: string) => {
    try {
      setSavingAlunoId(aluno.id);
      const updated = await parabaService.atualizarStatusPagamento({
        alunoId: aluno.id,
        pago,
        referencia: reference,
      });
      setAlunos((previous) => previous.map((aluno) => (aluno.id === updated.id ? updated : aluno)));
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel atualizar o status do pagamento.'));
    } finally {
      setSavingAlunoId(null);
    }
  };

  const deactivateUser = async (aluno: Aluno) => {
    try {
      setSavingAlunoId(aluno.id);
      const updated = await parabaService.desativarUsuarioAluno(aluno.id);
      setAlunos((previous) => previous.map((aluno) => (aluno.id === updated.id ? updated : aluno)));
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel desativar o usuario.'));
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
        placeholderTextColor={Theme.textMuted}
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
      {loading ? <ActivityIndicator color={Theme.primary} /> : null}
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
              <View style={[styles.statusBadge, { borderColor: paymentStatusColor(status) }]}>
                <Text style={[styles.statusText, { color: paymentStatusColor(status) }]}>
                  {paymentStatusLabel(status)}
                </Text>
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
                onPress={() => void updatePaymentStatus(aluno, !paid, activeReference)}
              >
                {isSaving ? (
                  <ActivityIndicator color={paid ? Theme.primary : Theme.white} size="small" />
                ) : (
                  <Ionicons
                    name={paid ? 'close-circle-outline' : 'checkmark-circle-outline'}
                    size={18}
                    color={paid ? Theme.primary : Theme.white}
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
                    <ActivityIndicator color={Theme.danger} size="small" />
                  ) : (
                    <Ionicons name="person-remove-outline" size={18} color={Theme.danger} />
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: Theme.white,
    borderColor: Theme.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  filterButtonSelected: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  filterText: {
    color: Theme.text,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  filterTextSelected: {
    color: Theme.white,
  },
  searchInput: {
    backgroundColor: Theme.inputBg,
    borderColor: Theme.border,
    borderRadius: 14,
    borderWidth: 1,
    color: Theme.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  sectionTitle: {
    color: Theme.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  emptyText: {
    color: Theme.textMuted,
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
    color: Theme.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 5,
  },
  studentMeta: {
    color: Theme.textMuted,
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
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  actionButtonSecondary: {
    backgroundColor: Theme.white,
    borderColor: Theme.primary,
  },
  actionButtonDanger: {
    backgroundColor: Theme.white,
    borderColor: Theme.danger,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionTextPrimary: {
    color: Theme.white,
  },
  actionTextSecondary: {
    color: Theme.primary,
  },
  actionTextDanger: {
    color: Theme.danger,
  },
});
