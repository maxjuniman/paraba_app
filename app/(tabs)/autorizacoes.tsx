import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { apiErrorMessage } from '@/services/api';
import { parabaService, type Aluno, type PendingUser } from '@/services/parabaService';
import { brDateToIso, formatDate, formatPhone } from '@/utils/formatters';

const FAIXAS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
const GRAUS = [0, 1, 2, 3, 4];

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

  const resetAuthorizationForm = () => {
    setSelectedUserId('');
    setSelectedAlunoId('');
    setAlunoSearch('');
    setShowNewAluno(false);
    setNewAluno({
      nome: '',
      apelido: '',
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

    const dataNascimento = newAluno.dataNascimento ? brDateToIso(newAluno.dataNascimento) : null;
    if (newAluno.dataNascimento && !dataNascimento) {
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
          emailResponsavel: newAluno.emailResponsavel.trim() || undefined,
          celular: newAluno.celular.trim() || undefined,
          dataNascimento: dataNascimento ?? undefined,
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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Autorizações</Text>
      <Text style={styles.subtitle}>Autorize novos usuarios e vincule cada um a um aluno cadastrado.</Text>

      {loading ? <ActivityIndicator color={Theme.primary} /> : null}

      <AppCard style={styles.card}>
        <Text style={styles.cardTitle}>Usuarios pendentes</Text>
        {pendingUsers.length === 0 ? <Text style={styles.meta}>Nenhum usuario pendente.</Text> : null}
        {pendingUsers.map((user) => {
          const selected = selectedUserId === user.id;
          return (
            <Pressable
              key={user.id}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setSelectedUserId(user.id)}
            >
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{user.nome}</Text>
              <Text style={[styles.optionMeta, selected && styles.optionMetaSelected]}>{user.email}</Text>
            </Pressable>
          );
        })}
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={styles.cardTitle}>Vincular aluno existente</Text>
        <TextInput
          style={styles.input}
          value={alunoSearch}
          onChangeText={(value) => {
            setAlunoSearch(value);
            setSelectedAlunoId('');
          }}
          placeholder="Buscar aluno por nome, apelido ou ID"
          placeholderTextColor={Theme.textMuted}
        />
        {filteredAlunos.map((aluno) => {
          const selected = selectedAlunoId === aluno.id;
          return (
            <Pressable
              key={aluno.id}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => {
                setSelectedAlunoId(aluno.id);
                setAlunoSearch(alunoLabel(aluno));
                setShowNewAluno(false);
              }}
            >
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{alunoLabel(aluno)}</Text>
              <Text style={[styles.optionMeta, selected && styles.optionMetaSelected]}>ID: {aluno.id}</Text>
            </Pressable>
          );
        })}
        {!loading && filteredAlunos.length === 0 ? <Text style={styles.meta}>Nenhum aluno disponivel.</Text> : null}
        <AppButton loading={saving} onPress={authorizeWithExistingAluno}>
          Autorizar com aluno selecionado
        </AppButton>
      </AppCard>

      <AppButton variant={showNewAluno ? 'secondary' : 'primary'} onPress={() => setShowNewAluno((value) => !value)}>
        {showNewAluno ? 'Ocultar novo aluno' : 'Cadastrar aluno para autorizar'}
      </AppButton>

      {showNewAluno ? (
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>Novo aluno</Text>
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
            placeholder="Data nascimento DD/MM/AAAA"
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
    paddingTop: 58,
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
  cardTitle: {
    color: Theme.text,
    fontSize: 18,
    fontWeight: '800',
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
