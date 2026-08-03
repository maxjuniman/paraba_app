import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AdBanner } from '@/components/ui/AdBanner';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { parabaService, type Aluno, type MeuAluno } from '@/services/parabaService';
import { getCurrentUser, type SessionUser } from '@/utils/session';
import {
  currentPaymentReference,
  formatPaymentReference,
  normalizePaymentDay,
  paymentStatus,
  paymentStatusLabel,
  unpaidPreviousReferences,
  type PaymentStatus,
} from '@/utils/paymentStatus';

function isProfessorUser(user?: SessionUser | null): boolean {
  return user?.tipo === 1 || user?.tipo === 'admin' || user?.tipo === 'professor';
}

type MonthlyBirthday = {
  id: string;
  nome: string;
  dia: number;
  idade: number;
};

function getMonthlyBirthdays(
  alunos: Array<Pick<Aluno, 'id' | 'nome' | 'apelido' | 'dataNascimento'>>,
  referenceDate = new Date()
): MonthlyBirthday[] {
  const currentMonth = referenceDate.getMonth() + 1;
  const currentYear = referenceDate.getFullYear();

  return alunos
    .map((aluno) => {
      const [year, month, day] = (aluno.dataNascimento ?? '').split('-').map(Number);
      if (!year || !month || !day || month !== currentMonth) return null;

      return {
        id: aluno.id,
        nome: aluno.apelido || aluno.nome,
        dia: day,
        idade: currentYear - year,
      };
    })
    .filter((item): item is MonthlyBirthday => item != null)
    .sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome));
}

function paymentStatusColor(status: PaymentStatus, colors: ReturnType<typeof useAppTheme>['colors']): string {
  if (status === 'pago') return colors.secondary;
  if (status === 'atrasado') return colors.danger;
  if (status === 'venceHoje') return colors.warning;
  return colors.textMuted;
}

export default function HomeScreen() {
  const topPadding = useScreenTopPadding();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadedUser, setLoadedUser] = useState(false);
  const [pendingAuthorizations, setPendingAuthorizations] = useState(0);
  const [monthlyBirthdays, setMonthlyBirthdays] = useState<MonthlyBirthday[]>([]);
  const [meuPagamento, setMeuPagamento] = useState<MeuAluno | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const current = await getCurrentUser();
        if (!active) return;

        setUser(current);
        setLoadedUser(true);

        if (isProfessorUser(current)) {
          try {
            const [pendingUsers, alunos] = await Promise.all([
              parabaService.listarUsuariosPendentes(),
              parabaService.listarAlunos(),
            ]);
            if (active) {
              setPendingAuthorizations(pendingUsers.length);
              setMonthlyBirthdays(getMonthlyBirthdays(alunos));
              setMeuPagamento(null);
            }
          } catch {
            if (active) {
              setPendingAuthorizations(0);
              setMonthlyBirthdays([]);
              setMeuPagamento(null);
            }
          }
          return;
        }

        try {
          const [equipe, meuAluno] = await Promise.all([
            parabaService.listarEquipe(),
            parabaService.obterMeuAluno().catch(() => null),
          ]);
          if (active) {
            const fromEquipe =
              equipe.find((aluno) => aluno.isMe) ??
              (current?.alunoId ? equipe.find((aluno) => aluno.id === current.alunoId) : undefined);

            const pagamentoRaw = meuAluno || fromEquipe
              ? {
                  ...(fromEquipe ?? {}),
                  ...(meuAluno ?? {}),
                }
              : null;
            const pagamento = pagamentoRaw
              ? {
                  ...pagamentoRaw,
                  dataPagamento:
                    normalizePaymentDay(
                      (pagamentoRaw as { dataPagamento?: unknown; data_pagamento?: unknown }).dataPagamento ??
                        (pagamentoRaw as { data_pagamento?: unknown }).data_pagamento ??
                        (fromEquipe as { dataPagamento?: unknown; data_pagamento?: unknown } | undefined)
                          ?.dataPagamento ??
                        (fromEquipe as { data_pagamento?: unknown } | undefined)?.data_pagamento
                    ) ?? null,
                  pagamentoPago: pagamentoRaw.pagamentoPago ?? false,
                  pagamentoReferencia: pagamentoRaw.pagamentoReferencia ?? null,
                  pagamentosPagos: pagamentoRaw.pagamentosPagos ?? [],
                  createdAt: pagamentoRaw.createdAt,
                  cadastroAppAt: pagamentoRaw.cadastroAppAt ?? null,
                }
              : null;

            setPendingAuthorizations(0);
            setMonthlyBirthdays(getMonthlyBirthdays(equipe));
            setMeuPagamento(pagamento);
          }
        } catch {
          if (active) {
            setPendingAuthorizations(0);
            setMonthlyBirthdays([]);
            setMeuPagamento(null);
          }
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const isProfessor = isProfessorUser(user);
  const paymentReference = currentPaymentReference();
  const paymentDay = meuPagamento ? normalizePaymentDay(meuPagamento.dataPagamento) : null;
  const meuPaymentStatus = meuPagamento ? paymentStatus(meuPagamento, paymentReference) : null;
  const unpaidPrevious = meuPagamento ? unpaidPreviousReferences(meuPagamento) : [];
  const hasPaymentAlert =
    meuPaymentStatus === 'atrasado' || meuPaymentStatus === 'venceHoje' || unpaidPrevious.length > 0;
  const meuPaymentColor = hasPaymentAlert
    ? colors.danger
    : meuPaymentStatus
      ? paymentStatusColor(meuPaymentStatus, colors)
      : colors.textMuted;

  return (
    <View style={styles.screen}>
      <Image source={require('../../assets/img/logo-padded.png')} style={styles.backgroundLogo} resizeMode="contain" />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Bem-vindo</Text>
            <Text style={styles.title}>{user?.nome ?? 'Paraba'}</Text>
          </View>
          <TouchableOpacity style={styles.settings} onPress={() => router.push('/configuracoes')} hitSlop={10}>
            <Ionicons name="settings-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {loadedUser && !isProfessor ? (
          <View style={[styles.summaryCard, styles.birthdayCard]}>
            <View style={styles.authorizationHeader}>
              <Ionicons name="gift" size={24} color={colors.warning} />
              <Text style={styles.cardTitle}>Aniversariantes do mês</Text>
            </View>
            {monthlyBirthdays.length > 0 ? (
              monthlyBirthdays.map((birthday) => (
                <Text key={birthday.id} style={styles.birthdayText}>
                  Dia {birthday.dia.toString().padStart(2, '0')} · {birthday.nome} faz {birthday.idade} anos
                </Text>
              ))
            ) : (
              <Text style={styles.cardText}>Nenhum aluno faz aniversário neste mês.</Text>
            )}
          </View>
        ) : null}

        {loadedUser && !isProfessor && meuPagamento ? (
          <View style={[styles.summaryCard, styles.paymentCard, hasPaymentAlert && styles.paymentCardAlert]}>
            <View style={styles.authorizationHeader}>
              <Ionicons name="card" size={24} color={meuPaymentColor} />
              <Text style={styles.cardTitle}>Status do pagamento</Text>
            </View>
            <View style={styles.paymentRow}>
              <View style={styles.paymentInfo}>
                <Text style={styles.cardText}>Mes atual: {formatPaymentReference(paymentReference)}</Text>
                <Text style={styles.cardText}>
                  Vencimento: {paymentDay ? `Dia ${paymentDay}` : 'nao informado'}
                </Text>
              </View>
              {meuPaymentStatus ? (
                <View style={[styles.statusBadge, { borderColor: paymentStatusColor(meuPaymentStatus, colors) }]}>
                  <Text style={[styles.statusText, { color: paymentStatusColor(meuPaymentStatus, colors) }]}>
                    {paymentStatusLabel(meuPaymentStatus)}
                  </Text>
                </View>
              ) : null}
            </View>
            {unpaidPrevious.length > 0 ? (
              <View style={styles.unpaidBox}>
                <Text style={[styles.unpaidTitle, { color: colors.danger }]}>
                  {unpaidPrevious.length === 1
                    ? 'Ha 1 mes anterior em aberto'
                    : `Ha ${unpaidPrevious.length} meses anteriores em aberto`}
                </Text>
                <Text style={styles.unpaidText}>
                  {unpaidPrevious.map((reference) => formatPaymentReference(reference)).join(' · ')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {isProfessor && pendingAuthorizations > 0 ? (
          <TouchableOpacity activeOpacity={0.82} style={styles.summaryCard} onPress={() => router.push('/autorizacoes')}>
            <View style={styles.authorizationHeader}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              <Text style={styles.cardTitle}>Autorizações pendentes</Text>
            </View>
            <Text style={styles.cardText}>
              {pendingAuthorizations} usuario{pendingAuthorizations > 1 ? 's' : ''} aguardando autorizacao.
            </Text>
          </TouchableOpacity>
        ) : null}

        {isProfessor ? (
          <>
            <View style={[styles.summaryCard, styles.birthdayCard]}>
              <View style={styles.authorizationHeader}>
                <Ionicons name="gift" size={24} color={colors.warning} />
                <Text style={styles.cardTitle}>Aniversariantes do mês</Text>
              </View>
              {monthlyBirthdays.length > 0 ? (
                monthlyBirthdays.map((birthday) => (
                  <Text key={birthday.id} style={styles.birthdayText}>
                    Dia {birthday.dia.toString().padStart(2, '0')} · {birthday.nome} faz {birthday.idade} anos
                  </Text>
                ))
              ) : (
                <Text style={styles.cardText}>Nenhum aluno faz aniversário neste mês.</Text>
              )}
            </View>

            <View style={styles.grid}>
              <TouchableOpacity activeOpacity={0.82} style={styles.quickCard} onPress={() => router.push('/alunos')}>
                <Ionicons name="person-add" size={24} color={colors.secondary} />
                <Text style={styles.quickTitle}>Aluno</Text>
                <Text style={styles.quickText}>Cadastre alunos e gere o codigo de vinculo.</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.82} style={styles.quickCard} onPress={() => router.push('/pagamentos')}>
                <Ionicons name="calendar" size={24} color={colors.warning} />
                <Text style={styles.quickTitle}>Pagamento</Text>
                <Text style={styles.quickText}>Atualize a data de pagamento por aluno.</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={0.82} style={styles.summaryCard} onPress={() => router.push('/presencas')}>
              <View style={styles.authorizationHeader}>
                <Ionicons name="checkbox" size={24} color={colors.secondary} />
                <Text style={styles.cardTitle}>Presenças</Text>
              </View>
              <Text style={styles.cardText}>Faça a chamada do dia e acompanhe a presença dos alunos.</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>

      {loadedUser ? (
        <View style={styles.adFooter}>
          <AdBanner />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backgroundLogo: {
      height: 360,
      left: 0,
      opacity: 0.08,
      position: 'absolute',
      right: 0,
      top: '50%',
      transform: [{ translateY: -180 }],
      width: '100%',
    },
    scroll: {
      flex: 1,
    },
    adFooter: {
      backgroundColor: colors.background,
      borderTopColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingBottom: 4,
      paddingTop: 4,
    },
    container: {
      gap: 18,
      padding: 20,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    kicker: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
    },
    settings: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    summaryCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: 8,
      padding: 18,
    },
    birthdayCard: {
      borderColor: colors.warning,
    },
    paymentCard: {
      borderColor: colors.border,
    },
    paymentCardAlert: {
      borderColor: colors.danger,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
    },
    cardText: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    birthdayText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    paymentRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
    },
    paymentInfo: {
      flex: 1,
      gap: 2,
    },
    statusBadge: {
      borderRadius: 999,
      borderWidth: 1.5,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '800',
    },
    unpaidBox: {
      gap: 4,
      marginTop: 4,
    },
    unpaidTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    unpaidText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
    },
    paymentHint: {
      color: colors.textMuted,
      fontSize: 12,
      fontStyle: 'italic',
      marginTop: 2,
    },
    authorizationHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    logo: {
      height: 28,
      width: 28,
    },
    grid: {
      flexDirection: 'row',
      gap: 12,
    },
    quickCard: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      flex: 1,
      gap: 8,
      padding: 16,
    },
    quickTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
    },
    quickText: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
