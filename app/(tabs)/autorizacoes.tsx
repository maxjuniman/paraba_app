import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
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
import { type ThemeColors } from '@/constants/Theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService, type Aluno, type PendingUser } from '@/services/parabaService';
import { brDateToIso, formatDate, formatPhone } from '@/utils/formatters';
import { pickStudentPhoto } from '@/utils/pickStudentPhoto';

const FAIXAS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
const GRAUS = [0, 1, 2, 3, 4];
const DEFAULT_STUDENT_PHOTO = require('../../assets/img/sem_foto.png');

function alunoLabel(aluno: Aluno): string {
  return aluno.apelido ? `${aluno.nome} (${aluno.apelido})` : aluno.nome;
}

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

export default function AutorizacoesScreen() {
  const topPadding = useScreenTopPadding();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [showNewAluno, setShowNewAluno] = useState(false);
  const [newAluno, setNewAluno] = useState({
    nome: '',
    apelido: '',
    foto: '',
    emailResponsavel: '',
    celular: '',
    dataNascimento: '',
    dataPagamento: '',
    faixaAtual: '',
    graus: 0,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, alunosData] = await Promise.all([
        parabaService.listarUsuariosPendentes(),
        parabaService.listarAlunos(),
      ]);
      setPendingUsers(usersData);
      setAlunos(alunosData);
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel carregar as autorizacoes.'));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const alunosSemVinculo = alunos.filter((aluno) => !aluno.userId);
  const selectedPendingUser = pendingUsers.find((user) => user.id === selectedUserId);
  const selectedAluno = alunos.find((aluno) => aluno.id === selectedAlunoId);

  const resetAuthorizationForm = () => {
    setSelectedUserId('');
    setSelectedAlunoId('');
    setShowNewAluno(false);
    setNewAluno({
      nome: '',
      apelido: '',
      foto: '',
      emailResponsavel: '',
      celular: '',
      dataNascimento: '',
      dataPagamento: '',
      faixaAtual: '',
      graus: 0,
    });
  };

  const authorizeWithExistingAluno = async () => {
    Keyboard.dismiss();
    if (!selectedUserId) {
      showError('Selecione um usuario para autorizar.');
      return;
    }
    if (!selectedAlunoId) {
      showError('Selecione um aluno para vincular.');
      return;
    }

    try {
      setSaving(true);
      const result = await parabaService.autorizarUsuario(selectedUserId, { alunoId: selectedAlunoId });
      setPendingUsers((previous) => previous.filter((user) => user.id !== result.user.id));
      setAlunos((previous) => previous.map((aluno) => (aluno.id === result.aluno.id ? result.aluno : aluno)));
      resetAuthorizationForm();
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel autorizar o usuario.'));
    } finally {
      setSaving(false);
    }
  };

  const authorizeWithNewAluno = async () => {
    Keyboard.dismiss();
    if (!selectedUserId) {
      showError('Selecione um usuario para autorizar.');
      return;
    }
    if (!newAluno.nome.trim()) {
      showError('Informe o nome do aluno.');
      return;
    }

    const dataNascimento = brDateToIso(newAluno.dataNascimento);
    if (!dataNascimento) {
      showError('Informe a data de nascimento no formato DD/MM/AAAA.');
      return;
    }

    const dataPagamento = newAluno.dataPagamento.trim();
    if (dataPagamento && !isValidPaymentDay(dataPagamento)) {
      showError('Informe o dia de pagamento entre 1 e 31.');
      return;
    }

    try {
      setSaving(true);
      const result = await parabaService.autorizarUsuario(selectedUserId, {
        aluno: {
          nome: newAluno.nome.trim(),
          apelido: newAluno.apelido.trim() || undefined,
          foto: newAluno.foto || undefined,
          emailResponsavel: newAluno.emailResponsavel.trim() || undefined,
          celular: newAluno.celular.trim() || undefined,
          dataNascimento,
          dataPagamento: dataPagamento || undefined,
          faixaAtual: newAluno.faixaAtual || undefined,
          graus: newAluno.graus,
        },
      });
      setPendingUsers((previous) => previous.filter((user) => user.id !== result.user.id));
      setAlunos((previous) => [result.aluno, ...previous]);
      resetAuthorizationForm();
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel autorizar o usuario.'));
    } finally {
      setSaving(false);
    }
  };

  const chooseNewAlunoPhoto = async () => {
    try {
      const foto = await pickStudentPhoto();
      if (foto) {
        setNewAluno((previous) => ({ ...previous, foto }));
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Nao foi possivel selecionar a foto.');
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Autorizações</Text>
      <Text style={styles.subtitle}>Selecione o cadastro pendente e o aluno sem vinculo para autorizar.</Text>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}

      <AppCard style={styles.card}>
        <Text style={styles.cardTitle}>Cadastro pendente</Text>
        <Text style={styles.helpText}>Usuario que criou conta no app e aguarda autorizacao.</Text>
        {pendingUsers.length === 0 ? <Text style={styles.meta}>Nenhum usuario pendente.</Text> : null}
        {pendingUsers.map((user) => {
          const selected = selectedUserId === user.id;
          return (
            <Pressable
              key={user.id}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setSelectedUserId(user.id)}
            >
              <Text style={[styles.optionKicker, selected && styles.optionMetaSelected]}>CADASTRO PENDENTE</Text>
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{user.nome}</Text>
              <Text style={[styles.optionMeta, selected && styles.optionMetaSelected]}>{user.email}</Text>
            </Pressable>
          );
        })}
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={styles.cardTitle}>Aluno cadastrado</Text>
        <Text style={styles.helpText}>Alunos cadastrados sem usuario vinculado.</Text>
        {selectedPendingUser ? (
          <Text style={styles.contextText}>
            Cadastro escolhido: <Text style={styles.contextStrong}>{selectedPendingUser.nome}</Text>
          </Text>
        ) : (
          <Text style={styles.meta}>Selecione um cadastro pendente acima antes de autorizar.</Text>
        )}
        {!loading && alunosSemVinculo.length === 0 ? (
          <Text style={styles.meta}>Nenhum aluno sem vinculo disponivel.</Text>
        ) : null}
        {alunosSemVinculo.map((aluno) => {
          const selected = selectedAlunoId === aluno.id;
          return (
            <Pressable
              key={aluno.id}
              style={[styles.alunoButton, selected && styles.optionSelected]}
              onPress={() => {
                setSelectedAlunoId(aluno.id);
                setShowNewAluno(false);
              }}
            >
              <Text style={[styles.alunoButtonText, selected && styles.optionTitleSelected]}>
                {alunoLabel(aluno)}
              </Text>
            </Pressable>
          );
        })}
        {selectedAluno ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Vincular esse cadastro ao aluno {alunoLabel(selectedAluno)}?</Text>
            <Text style={styles.confirmMeta}>
              {selectedPendingUser
                ? `Cadastro: ${selectedPendingUser.nome}`
                : 'Selecione um cadastro pendente antes de confirmar.'}
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={[styles.confirmButton, styles.confirmButtonNo]}
                onPress={() => setSelectedAlunoId('')}
              >
                <Text style={[styles.confirmButtonText, styles.confirmButtonTextNo]}>Não</Text>
              </Pressable>
              <Pressable
                disabled={saving}
                style={[styles.confirmButton, styles.confirmButtonYes, saving && styles.confirmButtonDisabled]}
                onPress={() => void authorizeWithExistingAluno()}
              >
                <Text style={[styles.confirmButtonText, styles.confirmButtonTextYes]}>Sim</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </AppCard>

      <Pressable style={styles.linkBox} onPress={() => setShowNewAluno((value) => !value)}>
        <Text style={styles.linkText}>
          {showNewAluno ? 'Ocultar cadastro de novo aluno' : 'Não achou o aluno cadastrado? Cadastre agora'}
        </Text>
      </Pressable>

      {showNewAluno ? (
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Novo aluno</Text>
          <Text style={styles.helpText}>Cadastre o aluno e autorize o cadastro pendente em seguida.</Text>
          <TextInput
            style={styles.input}
            value={newAluno.nome}
            onChangeText={(nome) => setNewAluno((previous) => ({ ...previous, nome }))}
            placeholder="Nome do aluno"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={newAluno.apelido}
            onChangeText={(apelido) => setNewAluno((previous) => ({ ...previous, apelido }))}
            placeholder="Apelido (opcional)"
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.photoRow}>
            <Image source={newAluno.foto ? { uri: newAluno.foto } : DEFAULT_STUDENT_PHOTO} style={styles.formPhoto} />
            <View style={styles.photoButtons}>
              <AppButton variant="secondary" onPress={chooseNewAlunoPhoto}>
                {newAluno.foto ? 'Trocar foto' : 'Adicionar foto'}
              </AppButton>
              {newAluno.foto ? (
                <AppButton variant="ghost" onPress={() => setNewAluno((previous) => ({ ...previous, foto: '' }))}>
                  Remover foto
                </AppButton>
              ) : null}
            </View>
          </View>
          <TextInput
            style={styles.input}
            value={newAluno.emailResponsavel}
            onChangeText={(emailResponsavel) => setNewAluno((previous) => ({ ...previous, emailResponsavel }))}
            placeholder="E-mail do responsavel"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={newAluno.celular}
            onChangeText={(celular) => setNewAluno((previous) => ({ ...previous, celular: formatPhone(celular) }))}
            placeholder="Celular"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            maxLength={16}
          />
          <TextInput
            style={styles.input}
            value={newAluno.dataNascimento}
            onChangeText={(dataNascimento) =>
              setNewAluno((previous) => ({ ...previous, dataNascimento: formatDate(dataNascimento) }))
            }
            placeholder="Data nascimento DD/MM/AAAA (obrigatorio)"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={10}
          />
          <TextInput
            style={styles.input}
            value={newAluno.dataPagamento}
            onChangeText={(dataPagamento) =>
              setNewAluno((previous) => ({ ...previous, dataPagamento: normalizePaymentDay(dataPagamento) }))
            }
            placeholder="Dia pagamento mensal (1 a 31)"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.label}>Faixa atual</Text>
          <View style={styles.chips}>
            {FAIXAS.map((faixa) => {
              const selected = newAluno.faixaAtual === faixa;
              return (
                <Pressable
                  key={faixa}
                  style={[styles.chip, selected && styles.optionSelected]}
                  onPress={() => setNewAluno((previous) => ({ ...previous, faixaAtual: faixa }))}
                >
                  <Text style={[styles.chipText, selected && styles.optionTitleSelected]}>{faixa}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>Graus</Text>
          <View style={styles.chips}>
            {GRAUS.map((grau) => {
              const selected = newAluno.graus === grau;
              return (
                <Pressable
                  key={grau}
                  style={[styles.gradeChip, selected && styles.optionSelected]}
                  onPress={() => setNewAluno((previous) => ({ ...previous, graus: grau }))}
                >
                  <Text style={[styles.chipText, selected && styles.optionTitleSelected]}>{grau}</Text>
                </Pressable>
              );
            })}
          </View>
          <AppButton loading={saving} onPress={authorizeWithNewAluno}>
            Cadastrar e autorizar
          </AppButton>
        </AppCard>
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
    card: {
      gap: 12,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    helpText: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    contextText: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    contextStrong: {
      color: colors.text,
      fontWeight: '900',
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
    photoRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
    },
    formPhoto: {
      borderRadius: 34,
      height: 68,
      width: 68,
    },
    photoButtons: {
      flex: 1,
      gap: 8,
    },
    option: {
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: 4,
      padding: 12,
    },
    alunoButton: {
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    alunoButtonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
    },
    optionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    optionKicker: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    optionTitleSelected: {
      color: onPrimary,
    },
    optionMeta: {
      color: colors.textMuted,
      fontSize: 12,
    },
    optionMetaSelected: {
      color: onPrimary,
    },
    meta: {
      color: colors.textMuted,
      fontSize: 13,
    },
    confirmBox: {
      backgroundColor: 'rgba(34, 160, 107, 0.12)',
      borderColor: colors.secondary,
      borderRadius: 16,
      borderWidth: 1,
      gap: 10,
      padding: 14,
    },
    confirmTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
      lineHeight: 22,
    },
    confirmMeta: {
      color: colors.textMuted,
      fontSize: 13,
    },
    confirmActions: {
      flexDirection: 'row',
      gap: 10,
    },
    confirmButton: {
      alignItems: 'center',
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      minHeight: 42,
      justifyContent: 'center',
    },
    confirmButtonNo: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    confirmButtonYes: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    confirmButtonDisabled: {
      opacity: 0.55,
    },
    confirmButtonText: {
      fontSize: 14,
      fontWeight: '900',
    },
    confirmButtonTextNo: {
      color: colors.text,
    },
    confirmButtonTextYes: {
      color: onPrimary,
    },
    linkBox: {
      alignItems: 'center',
      paddingVertical: 4,
    },
    linkText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '900',
      textAlign: 'center',
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    gradeChip: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    chipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}
