import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { Theme } from '@/constants/Theme';
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

export default function AutorizacoesScreen() {
  const topPadding = useScreenTopPadding();
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [alunoSearch, setAlunoSearch] = useState('');
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

  const filteredAlunos = alunos
    .filter((aluno) => !aluno.userId)
    .filter((aluno) => {
      const search = alunoSearch.trim().toLowerCase();
      if (!search) return true;

      return [aluno.nome, aluno.apelido, aluno.id]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(search));
    })
    .slice(0, 8);
  const selectedPendingUser = pendingUsers.find((user) => user.id === selectedUserId);
  const selectedAluno = alunos.find((aluno) => aluno.id === selectedAlunoId);

  const resetAuthorizationForm = () => {
    setSelectedUserId('');
    setSelectedAlunoId('');
    setAlunoSearch('');
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
      <Text style={styles.subtitle}>Selecione o cadastro pendente e busque o aluno que deve ser vinculado.</Text>

      {loading ? <ActivityIndicator color={Theme.primary} /> : null}

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
        <Text style={styles.helpText}>Busque pelo nome ou apelido do aluno ja cadastrado.</Text>
        {selectedPendingUser ? (
          <Text style={styles.contextText}>
            Cadastro escolhido: <Text style={styles.contextStrong}>{selectedPendingUser.nome}</Text>
          </Text>
        ) : (
          <Text style={styles.meta}>Selecione um cadastro pendente acima antes de autorizar.</Text>
        )}
        <TextInput
          style={styles.input}
          value={alunoSearch}
          onChangeText={(value) => {
            setAlunoSearch(value);
            setSelectedAlunoId('');
          }}
          placeholder="Buscar aluno por nome ou apelido"
          placeholderTextColor={Theme.textMuted}
        />
        {alunoSearch.trim() && !selectedAluno ? (
          filteredAlunos.length > 0 ? (
            filteredAlunos.map((aluno) => (
              <Pressable
                key={aluno.id}
                style={styles.option}
                onPress={() => {
                  setSelectedAlunoId(aluno.id);
                  setAlunoSearch(alunoLabel(aluno));
                  setShowNewAluno(false);
                }}
              >
                <Text style={styles.optionKicker}>ALUNO CADASTRADO</Text>
                <Text style={styles.optionTitle}>{alunoLabel(aluno)}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.meta}>Nenhum aluno encontrado com essa busca.</Text>
          )
        ) : null}
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
                onPress={() => {
                  setSelectedAlunoId('');
                  setAlunoSearch('');
                }}
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
            placeholderTextColor={Theme.textMuted}
          />
          <TextInput
            style={styles.input}
            value={newAluno.apelido}
            onChangeText={(apelido) => setNewAluno((previous) => ({ ...previous, apelido }))}
            placeholder="Apelido (opcional)"
            placeholderTextColor={Theme.textMuted}
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
            placeholderTextColor={Theme.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={newAluno.celular}
            onChangeText={(celular) => setNewAluno((previous) => ({ ...previous, celular: formatPhone(celular) }))}
            placeholder="Celular"
            placeholderTextColor={Theme.textMuted}
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
            placeholderTextColor={Theme.textMuted}
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
            placeholderTextColor={Theme.textMuted}
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
  card: {
    gap: 12,
  },
  stepHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  stepNumber: {
    backgroundColor: Theme.primary,
    borderRadius: 999,
    color: Theme.white,
    fontSize: 14,
    fontWeight: '900',
    height: 28,
    lineHeight: 28,
    textAlign: 'center',
    width: 28,
  },
  stepTitleBox: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    color: Theme.text,
    fontSize: 18,
    fontWeight: '800',
  },
  helpText: {
    color: Theme.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  contextText: {
    color: Theme.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  contextStrong: {
    color: Theme.text,
    fontWeight: '900',
  },
  input: {
    backgroundColor: Theme.inputBg,
    borderColor: Theme.border,
    borderRadius: 14,
    borderWidth: 1,
    color: Theme.text,
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
    backgroundColor: Theme.inputBg,
    borderColor: Theme.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  optionSelected: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  optionTitle: {
    color: Theme.text,
    fontSize: 14,
    fontWeight: '800',
  },
  optionKicker: {
    color: Theme.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  optionTitleSelected: {
    color: Theme.white,
  },
  optionMeta: {
    color: Theme.textMuted,
    fontSize: 12,
  },
  optionMetaSelected: {
    color: Theme.white,
  },
  meta: {
    color: Theme.textMuted,
    fontSize: 13,
  },
  selectedBox: {
    backgroundColor: 'rgba(34, 160, 107, 0.08)',
    borderColor: Theme.secondary,
    borderRadius: 14,
    borderWidth: 1,
    gap: 3,
    padding: 12,
  },
  selectedLabel: {
    color: Theme.secondary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  selectedText: {
    color: Theme.text,
    fontSize: 14,
    fontWeight: '800',
  },
  selectedMeta: {
    color: Theme.textMuted,
    fontSize: 12,
  },
  confirmBox: {
    backgroundColor: 'rgba(34, 160, 107, 0.08)',
    borderColor: Theme.secondary,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  confirmTitle: {
    color: Theme.text,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  confirmMeta: {
    color: Theme.textMuted,
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
    backgroundColor: Theme.white,
    borderColor: Theme.border,
  },
  confirmButtonYes: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  confirmButtonDisabled: {
    opacity: 0.55,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
  confirmButtonTextNo: {
    color: Theme.text,
  },
  confirmButtonTextYes: {
    color: Theme.white,
  },
  linkBox: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkText: {
    color: Theme.primary,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  label: {
    color: Theme.text,
    fontSize: 13,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderColor: Theme.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  gradeChip: {
    alignItems: 'center',
    borderColor: Theme.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  chipText: {
    color: Theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
});
