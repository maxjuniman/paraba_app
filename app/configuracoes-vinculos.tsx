import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertError } from '@/components/ui/AlertError';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import {
  parabaService,
  type Aluno,
  type UsuarioAtivoComVinculos,
  type VinculoAlunoResumo,
} from '@/services/parabaService';
import { getCurrentUser, updateCurrentUser, type SessionUser } from '@/utils/session';

export default function ConfiguracoesVinculosScreen() {
  const topPadding = useScreenTopPadding();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [usuariosAtivos, setUsuariosAtivos] = useState<UsuarioAtivoComVinculos[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [vinculados, setVinculados] = useState<VinculoAlunoResumo[]>([]);
  const [alunoPrimarioId, setAlunoPrimarioId] = useState<string | null>(null);
  const [maxAlunos, setMaxAlunos] = useState(2);
  const [pickingAluno, setPickingAluno] = useState(false);

  const [meusVinculos, setMeusVinculos] = useState<VinculoAlunoResumo[]>([]);
  const [meuPrimarioId, setMeuPrimarioId] = useState<string | null>(null);

  const isProfessor = user?.tipo === 1 || user?.tipo === 'admin' || user?.tipo === 'professor';
  const isAluno = user?.tipo === 2 || user?.tipo === 'aluno';

  const semVinculo = useMemo(
    () =>
      alunos
        .filter((item) => !item.userId && item.ativo !== false)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [alunos]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const current = await getCurrentUser();
      setUser(current);
      if (!current) return;

      const professor =
        current.tipo === 1 || current.tipo === 'admin' || current.tipo === 'professor';
      const alunoUser = current.tipo === 2 || current.tipo === 'aluno';

      if (professor) {
        const [users, list] = await Promise.all([
          parabaService.listarUsuariosAtivos(),
          parabaService.listarAlunos(),
        ]);
        setUsuariosAtivos(users);
        setAlunos(list);
        if (selectedUserId) {
          const detail = await parabaService.listarAlunosDoUsuario(selectedUserId);
          setVinculados(detail.alunos);
          setAlunoPrimarioId(detail.alunoPrimarioId);
          setMaxAlunos(detail.maxAlunos);
        }
      }

      if (alunoUser) {
        const detail = await parabaService.listarMeusAlunosVinculados();
        setMeusVinculos(detail.alunos);
        setMeuPrimarioId(detail.alunoPrimarioId);
        setMaxAlunos(detail.maxAlunos);
      }
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel carregar os vinculos.'));
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, showError]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const selectUser = async (userId: string) => {
    setSelectedUserId(userId);
    setPickingAluno(false);
    try {
      setSaving(true);
      const detail = await parabaService.listarAlunosDoUsuario(userId);
      setVinculados(detail.alunos);
      setAlunoPrimarioId(detail.alunoPrimarioId);
      setMaxAlunos(detail.maxAlunos);
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel carregar os alunos do usuario.'));
    } finally {
      setSaving(false);
    }
  };

  const vincular = async (alunoId: string) => {
    if (!selectedUserId) return;
    try {
      setSaving(true);
      await parabaService.vincularAlunoUser(alunoId, selectedUserId);
      setPickingAluno(false);
      const [users, list, detail] = await Promise.all([
        parabaService.listarUsuariosAtivos(),
        parabaService.listarAlunos(),
        parabaService.listarAlunosDoUsuario(selectedUserId),
      ]);
      setUsuariosAtivos(users);
      setAlunos(list);
      setVinculados(detail.alunos);
      setAlunoPrimarioId(detail.alunoPrimarioId);
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel vincular o aluno.'));
    } finally {
      setSaving(false);
    }
  };

  const desvincular = async (alunoId: string) => {
    if (!selectedUserId) return;
    try {
      setSaving(true);
      await parabaService.desvincularAlunoUser(alunoId);
      const [users, list, detail] = await Promise.all([
        parabaService.listarUsuariosAtivos(),
        parabaService.listarAlunos(),
        parabaService.listarAlunosDoUsuario(selectedUserId),
      ]);
      setUsuariosAtivos(users);
      setAlunos(list);
      setVinculados(detail.alunos);
      setAlunoPrimarioId(detail.alunoPrimarioId);
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel desvincular o aluno.'));
    } finally {
      setSaving(false);
    }
  };

  const setPrimario = async (alunoId: string) => {
    if (!selectedUserId) return;
    try {
      setSaving(true);
      const detail = await parabaService.definirAlunoPrimario(selectedUserId, alunoId);
      setVinculados(detail.alunos);
      setAlunoPrimarioId(detail.alunoPrimarioId);
      setUsuariosAtivos(await parabaService.listarUsuariosAtivos());
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel definir o aluno primario.'));
    } finally {
      setSaving(false);
    }
  };

  const setMeuPrimario = async (alunoId: string) => {
    try {
      setSaving(true);
      const detail = await parabaService.definirMeuAlunoPrimario(alunoId);
      setMeusVinculos(detail.alunos);
      setMeuPrimarioId(detail.alunoPrimarioId);
      await updateCurrentUser(detail.user);
      setUser(detail.user);
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel definir o aluno primario.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Alunos vinculados</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <>
          {isAluno ? (
            <AppCard style={styles.card}>
              <Text style={styles.helper}>
                Sua conta pode ter ate {maxAlunos} alunos. O primario aparece na home e no pagamento.
              </Text>
              {meusVinculos.length === 0 ? (
                <Text style={styles.empty}>Nenhum aluno vinculado.</Text>
              ) : (
                meusVinculos.map((item) => (
                  <View key={item.id} style={styles.item}>
                    <View style={styles.itemText}>
                      <Text style={styles.itemTitle}>{item.nome}</Text>
                      <Text style={styles.itemSub}>
                        {meuPrimarioId === item.id ? 'Primario' : 'Secundario'}
                      </Text>
                    </View>
                    {meusVinculos.length > 1 && meuPrimarioId !== item.id ? (
                      <Pressable
                        style={styles.chip}
                        disabled={saving}
                        onPress={() => void setMeuPrimario(item.id)}
                      >
                        <Text style={styles.chipText}>Primario</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))
              )}
            </AppCard>
          ) : null}

          {isProfessor ? (
            <>
              <AppCard style={styles.card}>
                <Text style={styles.helper}>
                  Vincule ate {maxAlunos} alunos ao mesmo usuario (ex.: dois filhos).
                </Text>
                <Text style={styles.sectionLabel}>Usuario ativo</Text>
                {usuariosAtivos.length === 0 ? (
                  <Text style={styles.empty}>Nenhum usuario ativo.</Text>
                ) : (
                  usuariosAtivos.map((item) => {
                    const selected = selectedUserId === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.userRow, selected && styles.userRowSelected]}
                        onPress={() => void selectUser(item.id)}
                      >
                        <View style={styles.itemText}>
                          <Text style={styles.itemTitle}>{item.nome}</Text>
                          <Text style={styles.itemSub}>
                            {item.email} · {item.alunosCount}/{item.maxAlunos}
                          </Text>
                        </View>
                        <Ionicons
                          name={selected ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={colors.primary}
                        />
                      </Pressable>
                    );
                  })
                )}
              </AppCard>

              {selectedUserId ? (
                <AppCard style={styles.card}>
                  <Text style={styles.sectionLabel}>
                    Vinculados ({vinculados.length}/{maxAlunos})
                  </Text>
                  {vinculados.length === 0 ? (
                    <Text style={styles.empty}>Nenhum aluno vinculado.</Text>
                  ) : (
                    vinculados.map((item) => (
                      <View key={item.id} style={styles.itemColumn}>
                        <View style={styles.item}>
                          <View style={styles.itemText}>
                            <Text style={styles.itemTitle}>{item.nome}</Text>
                            <Text style={styles.itemSub}>
                              {alunoPrimarioId === item.id ? 'Primario' : 'Secundario'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.actions}>
                          {alunoPrimarioId !== item.id ? (
                            <Pressable
                              style={styles.chip}
                              disabled={saving}
                              onPress={() => void setPrimario(item.id)}
                            >
                              <Text style={styles.chipText}>Primario</Text>
                            </Pressable>
                          ) : null}
                          <Pressable
                            style={styles.chipDanger}
                            disabled={saving}
                            onPress={() => void desvincular(item.id)}
                          >
                            <Text style={styles.chipDangerText}>Remover</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}

                  {vinculados.length < maxAlunos ? (
                    <>
                      <AppButton
                        onPress={() => setPickingAluno((value) => !value)}
                        disabled={saving}
                        style={{ marginTop: 8 }}
                      >
                        {pickingAluno ? 'Cancelar' : 'Vincular aluno'}
                      </AppButton>
                      {pickingAluno ? (
                        semVinculo.length === 0 ? (
                          <Text style={styles.empty}>Nao ha alunos sem usuario.</Text>
                        ) : (
                          semVinculo.map((item) => (
                            <Pressable
                              key={item.id}
                              style={styles.userRow}
                              onPress={() => void vincular(item.id)}
                              disabled={saving}
                            >
                              <Text style={styles.itemTitle}>{item.nome}</Text>
                              <Ionicons name="link-outline" size={18} color={colors.primary} />
                            </Pressable>
                          ))
                        )
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.empty}>Limite de {maxAlunos} alunos atingido.</Text>
                  )}
                </AppCard>
              ) : null}
            </>
          ) : null}
        </>
      )}

      <AlertError
        visible={errorVisible}
        title={errorTitle}
        message={errorMessage}
        onClose={hideError}
      />
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.background },
    container: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    backButton: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    title: { fontSize: 22, fontWeight: '700', color: colors.text },
    card: { gap: 10, padding: 14 },
    helper: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    sectionLabel: { color: colors.text, fontWeight: '700', fontSize: 15, marginTop: 4 },
    empty: { color: colors.textMuted, fontSize: 14 },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    userRowSelected: { backgroundColor: colors.card },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    itemColumn: {
      gap: 8,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    itemText: { flex: 1, gap: 2 },
    itemTitle: { color: colors.text, fontWeight: '600', fontSize: 15 },
    itemSub: { color: colors.textMuted, fontSize: 13 },
    actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      borderColor: colors.primary,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    chipDanger: {
      borderColor: colors.danger,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipDangerText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  });
}
