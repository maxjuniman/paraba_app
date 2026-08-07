import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AlertError } from '@/components/ui/AlertError';
import { AppCard } from '@/components/ui/AppCard';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PasswordModal } from '@/components/ui/PasswordModal';
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

const DEFAULT_STUDENT_PHOTO = require('../../assets/img/sem_foto.png');

function selectedOnPrimaryText(primary: string): string {
  return primary === '#FFFFFF' || primary === '#E5E7EB' ? '#000000' : '#FFFFFF';
}

function isoToBrDate(value?: string | null): string {
  if (!value) return 'nenhuma';
  const dateOnly = value.trim().slice(0, 10);
  const [year, month, day] = dateOnly.split('-');
  if (!year || !month || !day || year.length !== 4) return value;
  return `${day}/${month}/${year}`;
}

type ConfirmAction =
  | { type: 'toggleAtivo'; aluno: Aluno; nextAtivo: boolean }
  | { type: 'unlink'; aluno: Aluno }
  | { type: 'delete'; aluno: Aluno };

export default function AlunosScreen() {
  const router = useRouter();
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const topPadding = useScreenTopPadding();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const onPrimary = selectedOnPrimaryText(colors.primary);
  const [loading, setLoading] = useState(false);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<StudentCategoryId>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedAlunoId, setExpandedAlunoId] = useState<string | null>(null);
  const [unlinkingAlunoId, setUnlinkingAlunoId] = useState<string | null>(null);
  const [togglingAtivoAlunoId, setTogglingAtivoAlunoId] = useState<string | null>(null);
  const [deletingAlunoId, setDeletingAlunoId] = useState<string | null>(null);
  const [passwordAluno, setPasswordAluno] = useState<Aluno | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

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

  const activeAlunosCount = useMemo(
    () => alunos.filter((aluno) => aluno.ativo !== false).length,
    [alunos]
  );

  const unlinkUser = useCallback(
    async (alunoId: string) => {
      try {
        setUnlinkingAlunoId(alunoId);
        const updated = await parabaService.desvincularAlunoUser(alunoId);
        setAlunos((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
        setConfirmAction(null);
      } catch (error) {
        showError(apiErrorMessage(error, 'Nao foi possivel desvincular o usuario.'));
      } finally {
        setUnlinkingAlunoId(null);
      }
    },
    [showError]
  );

  const toggleAtivo = useCallback(
    async (alunoId: string, ativo: boolean) => {
      try {
        setTogglingAtivoAlunoId(alunoId);
        const updated = await parabaService.atualizarStatusAluno(alunoId, ativo);
        setAlunos((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
        setConfirmAction(null);
      } catch (error) {
        showError(apiErrorMessage(error, 'Nao foi possivel atualizar o status do aluno.'));
      } finally {
        setTogglingAtivoAlunoId(null);
      }
    },
    [showError]
  );

  const deleteAluno = useCallback(
    async (alunoId: string) => {
      try {
        setDeletingAlunoId(alunoId);
        await parabaService.excluirAluno(alunoId);
        setAlunos((previous) => previous.filter((item) => item.id !== alunoId));
        setExpandedAlunoId((current) => (current === alunoId ? null : current));
        setConfirmAction(null);
      } catch (error) {
        showError(apiErrorMessage(error, 'Nao foi possivel excluir o aluno.'));
      } finally {
        setDeletingAlunoId(null);
      }
    },
    [showError]
  );

  const openPasswordModal = (aluno: Aluno) => {
    setNovaSenha('');
    setConfirmacaoSenha('');
    setPasswordAluno(aluno);
  };

  const closePasswordModal = () => {
    if (savingPassword) return;
    setPasswordAluno(null);
    setNovaSenha('');
    setConfirmacaoSenha('');
  };

  const savePassword = async () => {
    if (!passwordAluno) return;
    if (novaSenha.length < 6) {
      showError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmacaoSenha) {
      showError('A confirmacao da senha nao confere.');
      return;
    }
    try {
      setSavingPassword(true);
      await parabaService.alterarSenhaAluno(passwordAluno.id, {
        senha: novaSenha,
        confirmacao_senha: confirmacaoSenha,
      });
      setPasswordAluno(null);
      setNovaSenha('');
      setConfirmacaoSenha('');
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel alterar a senha.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const confirmModal = useMemo(() => {
    if (!confirmAction) return null;

    if (confirmAction.type === 'toggleAtivo') {
      const { aluno, nextAtivo } = confirmAction;
      const isDeactivating = !nextAtivo;
      return {
        title: isDeactivating ? 'Desativar aluno' : 'Reativar aluno',
        message: isDeactivating
          ? `Desativar ${aluno.nome}? O aluno sai das listas ativas e perde o acesso ao aplicativo.`
          : `Reativar ${aluno.nome}? O aluno volta a aparecer nas listas e recupera o acesso ao app se tiver usuario vinculado.`,
        confirmLabel: isDeactivating ? 'Desativar' : 'Reativar',
        danger: isDeactivating,
        loading: togglingAtivoAlunoId === aluno.id,
        onConfirm: () => {
          void toggleAtivo(aluno.id, nextAtivo);
        },
      };
    }

    if (confirmAction.type === 'delete') {
      return {
        title: 'Excluir aluno',
        message: `Excluir ${confirmAction.aluno.nome} permanentemente? Presencas desse aluno serao removidas. Esta acao nao pode ser desfeita.`,
        confirmLabel: 'Excluir',
        danger: true,
        loading: deletingAlunoId === confirmAction.aluno.id,
        onConfirm: () => {
          void deleteAluno(confirmAction.aluno.id);
        },
      };
    }

    return {
      title: 'Desvincular usuario',
      message: `Remover o vinculo de ${confirmAction.aluno.nome}? O usuario volta a ficar pendente de autorizacao.`,
      confirmLabel: 'Desvincular',
      danger: true,
      loading: unlinkingAlunoId === confirmAction.aluno.id,
      onConfirm: () => {
        void unlinkUser(confirmAction.aluno.id);
      },
    };
  }, [
    confirmAction,
    togglingAtivoAlunoId,
    unlinkingAlunoId,
    deletingAlunoId,
    toggleAtivo,
    unlinkUser,
    deleteAluno,
  ]);

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
      .sort((a, b) => {
        const aActive = a.ativo !== false ? 0 : 1;
        const bActive = b.ativo !== false ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
      });
  }, [alunos, categoryFilter, nameFilter]);

  const hasActiveFilters = Boolean(nameFilter.trim()) || categoryFilter !== 'all';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>Alunos</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/aluno-form')}
          hitSlop={8}
          accessibilityLabel="Cadastrar aluno"
        >
          <Ionicons name="add" size={28} color={onPrimary} />
        </Pressable>
      </View>
      <Text style={styles.subtitle}>
        {activeAlunosCount} aluno{activeAlunosCount === 1 ? '' : 's'} ativo
        {activeAlunosCount === 1 ? '' : 's'}
        {alunos.length !== activeAlunosCount ? ` · ${alunos.length} no total` : ''}
      </Text>

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
        const isActive = aluno.ativo !== false;

        return (
          <AppCard
            key={aluno.id}
            style={[
              styles.studentCard,
              expanded && styles.studentCardExpanded,
              !isActive && styles.studentCardInactive,
            ]}
          >
            <Pressable
              style={({ pressed }) => [styles.studentSummary, pressed && styles.cardPressed]}
              onPress={() => setExpandedAlunoId((current) => (current === aluno.id ? null : aluno.id))}
            >
              <Image
                source={aluno.foto ? { uri: aluno.foto } : DEFAULT_STUDENT_PHOTO}
                style={[styles.studentPhoto, !isActive && styles.studentPhotoInactive]}
              />
              <View style={styles.studentSummaryText}>
                <Text style={[styles.studentName, !isActive && styles.studentNameInactive]} numberOfLines={1}>
                  {aluno.nome}
                </Text>
                <Text style={styles.studentMeta} numberOfLines={1}>
                  {!isActive ? 'Inativo · ' : ''}
                  {aluno.apelido ? `${aluno.apelido} · ` : ''}
                  {category?.label ?? 'sem categoria'}
                </Text>
              </View>
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
                <Text style={styles.studentMeta}>
                  Status: {isActive ? 'Ativo' : 'Inativo (sem acesso ao app)'}
                </Text>
                {aluno.nomeResponsavel ? (
                  <Text style={styles.studentMeta}>Responsavel: {aluno.nomeResponsavel}</Text>
                ) : null}
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
                    onPress={() =>
                      router.push({
                        pathname: '/aluno-form',
                        params: { id: aluno.id },
                      })
                    }
                  >
                    <Ionicons name="create-outline" size={16} color={onPrimary} />
                    <Text style={styles.editButtonText}>Editar</Text>
                  </Pressable>
                  {hasUser ? (
                    <Pressable style={styles.unlinkButton} onPress={() => openPasswordModal(aluno)}>
                      <Ionicons name="key-outline" size={16} color={colors.text} />
                      <Text style={styles.unlinkButtonText}>Senha</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={[
                      isActive ? styles.deactivateButton : styles.reactivateButton,
                      togglingAtivoAlunoId === aluno.id && styles.unlinkButtonDisabled,
                    ]}
                    disabled={togglingAtivoAlunoId === aluno.id}
                    onPress={() =>
                      setConfirmAction({
                        type: 'toggleAtivo',
                        aluno,
                        nextAtivo: !isActive,
                      })
                    }
                  >
                    {togglingAtivoAlunoId === aluno.id ? (
                      <ActivityIndicator color={isActive ? colors.danger : colors.secondary} size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name={isActive ? 'ban-outline' : 'checkmark-circle-outline'}
                          size={16}
                          color={isActive ? colors.danger : colors.secondary}
                        />
                        <Text style={isActive ? styles.deactivateButtonText : styles.reactivateButtonText}>
                          {isActive ? 'Desativar' : 'Reativar'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                  {hasUser ? (
                    <Pressable
                      style={[styles.unlinkButton, unlinkingAlunoId === aluno.id && styles.unlinkButtonDisabled]}
                      disabled={unlinkingAlunoId === aluno.id}
                      onPress={() => setConfirmAction({ type: 'unlink', aluno })}
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
                  {!isActive ? (
                    <Pressable
                      style={[
                        styles.deactivateButton,
                        deletingAlunoId === aluno.id && styles.unlinkButtonDisabled,
                      ]}
                      disabled={deletingAlunoId === aluno.id}
                      onPress={() => setConfirmAction({ type: 'delete', aluno })}
                    >
                      {deletingAlunoId === aluno.id ? (
                        <ActivityIndicator color={colors.danger} size="small" />
                      ) : (
                        <>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          <Text style={styles.deactivateButtonText}>Excluir</Text>
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

      <ConfirmModal
        visible={Boolean(confirmModal)}
        title={confirmModal?.title ?? ''}
        message={confirmModal?.message ?? ''}
        confirmLabel={confirmModal?.confirmLabel ?? 'Confirmar'}
        danger={confirmModal?.danger}
        loading={confirmModal?.loading}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => {
          if (!confirmModal?.loading) setConfirmAction(null);
        }}
      />

      <PasswordModal
        visible={Boolean(passwordAluno)}
        title="Trocar senha"
        subtitle={
          passwordAluno
            ? `Nova senha para ${passwordAluno.nome}${passwordAluno.user?.email ? ` (${passwordAluno.user.email})` : ''}.`
            : undefined
        }
        password={novaSenha}
        confirmPassword={confirmacaoSenha}
        loading={savingPassword}
        onChangePassword={setNovaSenha}
        onChangeConfirmPassword={setConfirmacaoSenha}
        onConfirm={() => void savePassword()}
        onCancel={closePasswordModal}
      />

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
    titleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    title: {
      color: colors.text,
      flex: 1,
      fontSize: 30,
      fontWeight: '900',
    },
    addButton: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 999,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
      marginTop: -8,
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
    studentCard: {
      gap: 0,
      overflow: 'hidden',
      paddingVertical: 12,
    },
    studentCardExpanded: {
      gap: 12,
    },
    studentCardInactive: {
      opacity: 0.72,
    },
    studentSummary: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      minHeight: 48,
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
    studentPhotoInactive: {
      opacity: 0.7,
    },
    expandIcon: {
      marginLeft: 2,
    },
    studentName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    studentNameInactive: {
      color: colors.textMuted,
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
    deactivateButton: {
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderColor: colors.danger,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      minHeight: 40,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    deactivateButtonText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: '800',
    },
    reactivateButton: {
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderColor: colors.secondary,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      minHeight: 40,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    reactivateButtonText: {
      color: colors.secondary,
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
