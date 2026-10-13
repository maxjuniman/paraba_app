import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AlertError } from '@/components/ui/AlertError';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { type ThemeColors } from '@/constants/Theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService, type PendingUser } from '@/services/parabaService';
function formatBirth(value?: string | null): string {
  if (!value) return 'nao informado';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export default function AutorizacoesScreen() {
  const topPadding = useScreenTopPadding();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);

  const load = useCallback(
    async (options?: { refresh?: boolean }) => {
      const isRefresh = Boolean(options?.refresh);
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setPendingUsers(await parabaService.listarUsuariosPendentes());
      } catch (error) {
        showError(apiErrorMessage(error, 'Nao foi possivel carregar as autorizacoes.'));
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [showError]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const approve = async (user: PendingUser) => {
    if (!user.alunos?.length) {
      showError('Este cadastro antigo nao tem aluno vinculado. Peca para a pessoa se cadastrar de novo.');
      return;
    }

    try {
      setSavingId(user.id);
      await parabaService.autorizarUsuario(user.id);
      setPendingUsers((previous) => previous.filter((item) => item.id !== user.id));
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel autorizar o cadastro.'));
      await load();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void load({ refresh: true });
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <Text style={styles.title}>Autorizações</Text>
      <Text style={styles.subtitle}>
        Revise os cadastros enviados pelo app e aprove para liberar o acesso.
      </Text>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && pendingUsers.length === 0 ? (
        <Text style={styles.empty}>Nenhum cadastro pendente.</Text>
      ) : null}

      {pendingUsers.map((user) => {
        const aluno = user.alunos?.[0];
        const tipos = aluno?.tiposAula?.map((tipo) => tipo.nome).join(', ') || 'nao informado';
        const isSaving = savingId === user.id;

        return (
          <AppCard key={user.id} style={styles.card}>
            <Text style={styles.kicker}>CADASTRO PENDENTE</Text>
            <Text style={styles.name}>{user.nome}</Text>
            <Text style={styles.meta}>{user.email}</Text>
            {user.celular ? <Text style={styles.meta}>Celular: {user.celular}</Text> : null}

            {aluno ? (
              <View style={styles.alunoBox}>
                <Text style={styles.alunoTitle}>Aluno</Text>
                <Text style={styles.meta}>
                  {aluno.apelido ? `${aluno.nome} (${aluno.apelido})` : aluno.nome}
                </Text>
                <Text style={styles.meta}>Nascimento: {formatBirth(aluno.dataNascimento)}</Text>
                <Text style={styles.meta}>Tipos: {tipos}</Text>
                {aluno.faixaAtual ? <Text style={styles.meta}>Faixa: {aluno.faixaAtual}</Text> : null}
                {aluno.nomeResponsavel ? (
                  <Text style={styles.meta}>Responsavel: {aluno.nomeResponsavel}</Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.warning}>
                Cadastro antigo sem aluno. Oriente a pessoa a se cadastrar novamente no app.
              </Text>
            )}

            <AppButton
              loading={isSaving}
              disabled={!aluno || Boolean(savingId)}
              onPress={() => void approve(user)}
            >
              Aprovar cadastro
            </AppButton>
          </AppCard>
        );
      })}

      <AlertError visible={errorVisible} message={errorMessage} title={errorTitle} onClose={hideError} />
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
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
    empty: {
      color: colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
    card: {
      gap: 8,
    },
    kicker: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    name: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    meta: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    alunoBox: {
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      gap: 4,
      marginVertical: 6,
      padding: 12,
    },
    alunoTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 2,
    },
    warning: {
      color: colors.danger,
      fontSize: 13,
      lineHeight: 19,
      marginVertical: 4,
    },
  });
}
