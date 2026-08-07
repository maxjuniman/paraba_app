import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
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
import { useAppTheme } from '@/hooks/useAppTheme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService, type Depoimento } from '@/services/parabaService';

export default function DepoimentosAdminScreen() {
  const topPadding = useScreenTopPadding();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState<Depoimento[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Depoimento | null>(null);
  const [editing, setEditing] = useState<Depoimento | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editTexto, setEditTexto] = useState('');
  const [editFaixa, setEditFaixa] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLista(await parabaService.listarDepoimentos());
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel carregar os depoimentos.'));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const toggleAtivo = async (item: Depoimento) => {
    try {
      setBusyId(item.id);
      const updated = await parabaService.atualizarDepoimento(item.id, { ativo: !item.ativo });
      setLista((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel atualizar o depoimento.'));
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (item: Depoimento) => {
    setEditing(item);
    setEditNome(item.nome);
    setEditTexto(item.texto);
    setEditFaixa(item.faixa ?? '');
  };

  const closeEdit = () => {
    if (savingEdit) return;
    setEditing(null);
    setEditNome('');
    setEditTexto('');
    setEditFaixa('');
  };

  const saveEdit = async () => {
    if (!editing) return;
    Keyboard.dismiss();
    const nome = editNome.trim();
    const texto = editTexto.trim();
    if (!nome) {
      showError('Informe o nome.');
      return;
    }
    if (texto.length < 10) {
      showError('O depoimento deve ter pelo menos 10 caracteres.');
      return;
    }
    if (texto.length > 800) {
      showError('O depoimento deve ter no maximo 800 caracteres.');
      return;
    }
    try {
      setSavingEdit(true);
      const updated = await parabaService.atualizarDepoimento(editing.id, {
        nome,
        texto,
        faixa: editFaixa.trim() || null,
      });
      setLista((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setEditing(null);
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel salvar o depoimento.'));
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      setBusyId(toDelete.id);
      await parabaService.excluirDepoimento(toDelete.id);
      setLista((prev) => prev.filter((row) => row.id !== toDelete.id));
      setToDelete(null);
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel excluir o depoimento.'));
    } finally {
      setBusyId(null);
    }
  };

  const pendentes = lista.filter((item) => !item.ativo).length;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Depoimentos</Text>
            <Text style={styles.subtitle}>
              {pendentes > 0
                ? `${pendentes} pendente${pendentes === 1 ? '' : 's'} de aprovacao`
                : 'Gerencie os depoimentos do site'}
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : lista.length === 0 ? (
          <AppCard>
            <Text style={styles.empty}>Nenhum depoimento cadastrado.</Text>
          </AppCard>
        ) : (
          lista.map((item) => (
            <AppCard key={item.id} style={styles.card}>
              <Text style={styles.nome}>{item.nome}</Text>
              {item.faixa ? <Text style={styles.faixa}>{item.faixa}</Text> : null}
              <Text style={[styles.status, item.ativo ? styles.statusOk : styles.statusPending]}>
                {item.ativo ? 'Aprovado · visivel no site' : 'Pendente de aprovacao'}
              </Text>
              <Text style={styles.texto}>{item.texto}</Text>
              <View style={styles.actions}>
                <AppButton
                  onPress={() => openEdit(item)}
                  variant="secondary"
                  disabled={busyId === item.id}
                >
                  Editar
                </AppButton>
                <AppButton
                  onPress={() => void toggleAtivo(item)}
                  loading={busyId === item.id}
                  variant={item.ativo ? 'secondary' : 'primary'}
                >
                  {item.ativo ? 'Ocultar' : 'Aprovar'}
                </AppButton>
                <Pressable
                  style={[styles.deleteBtn, busyId === item.id && styles.deleteDisabled]}
                  disabled={busyId === item.id}
                  onPress={() => setToDelete(item)}
                >
                  <Text style={styles.deleteText}>Excluir</Text>
                </Pressable>
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>

      <Modal transparent visible={Boolean(editing)} animationType="fade" onRequestClose={closeEdit}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFillObject} disabled={savingEdit} onPress={closeEdit} />
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Editar depoimento</Text>
            <TextInput
              style={styles.input}
              value={editNome}
              onChangeText={setEditNome}
              placeholder="Nome"
              placeholderTextColor={colors.textMuted}
              editable={!savingEdit}
            />
            <TextInput
              style={styles.input}
              value={editFaixa}
              onChangeText={setEditFaixa}
              placeholder="Faixa (opcional)"
              placeholderTextColor={colors.textMuted}
              editable={!savingEdit}
            />
            <TextInput
              style={[styles.input, styles.textarea]}
              value={editTexto}
              onChangeText={setEditTexto}
              placeholder="Texto do depoimento"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              maxLength={800}
              editable={!savingEdit}
            />
            <Text style={styles.counter}>{editTexto.trim().length}/800</Text>
            <AppButton onPress={() => void saveEdit()} loading={savingEdit}>
              Salvar
            </AppButton>
            <AppButton variant="ghost" onPress={closeEdit} disabled={savingEdit}>
              Cancelar
            </AppButton>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={Boolean(toDelete)} animationType="fade" onRequestClose={() => setToDelete(null)}>
        <Pressable style={styles.overlay} onPress={() => (busyId ? undefined : setToDelete(null))}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Image source={require('../assets/img/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.modalTitle}>Excluir depoimento?</Text>
            <Text style={styles.modalText}>
              O depoimento de {toDelete?.nome} sera removido permanentemente.
            </Text>
            {toDelete?.texto ? (
              <Text style={styles.modalQuote} numberOfLines={4}>
                “{toDelete.texto}”
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <AppButton
                onPress={() => setToDelete(null)}
                variant="secondary"
                disabled={busyId === toDelete?.id}
              >
                Cancelar
              </AppButton>
              <Pressable
                style={[styles.deleteBtn, styles.deleteBtnWide, busyId === toDelete?.id && styles.deleteDisabled]}
                disabled={busyId === toDelete?.id}
                onPress={() => void confirmDelete()}
              >
                {busyId === toDelete?.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteText}>Excluir</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <AlertError visible={errorVisible} message={errorMessage} title={errorTitle} onClose={hideError} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    container: {
      gap: 12,
      padding: 20,
      paddingBottom: 40,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      marginBottom: 4,
    },
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
    title: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '900',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 2,
    },
    card: {
      gap: 8,
    },
    nome: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    faixa: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    status: {
      fontSize: 13,
      fontWeight: '800',
    },
    statusOk: {
      color: colors.secondary,
    },
    statusPending: {
      color: colors.warning ?? '#F79009',
    },
    texto: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 22,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    deleteBtn: {
      alignItems: 'center',
      backgroundColor: colors.danger,
      borderRadius: 12,
      justifyContent: 'center',
      minHeight: 46,
      paddingHorizontal: 18,
    },
    deleteBtnWide: {
      flexGrow: 1,
      minWidth: 120,
    },
    deleteDisabled: {
      opacity: 0.55,
    },
    deleteText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '800',
    },
    empty: {
      color: colors.textMuted,
      fontSize: 14,
    },
    overlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(15,20,25,0.55)',
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    modalBox: {
      backgroundColor: colors.card,
      borderRadius: 18,
      gap: 10,
      maxWidth: 400,
      padding: 22,
      width: '100%',
      zIndex: 1,
    },
    logo: {
      alignSelf: 'center',
      height: 64,
      width: 64,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
      textAlign: 'center',
    },
    modalText: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    modalQuote: {
      color: colors.text,
      fontSize: 14,
      fontStyle: 'italic',
      lineHeight: 20,
      textAlign: 'center',
    },
    modalActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
      marginTop: 6,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      color: colors.text,
      fontSize: 15,
      minHeight: 48,
      paddingHorizontal: 14,
    },
    textarea: {
      minHeight: 140,
      paddingTop: 12,
      paddingBottom: 12,
    },
    counter: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'right',
    },
  });
}
