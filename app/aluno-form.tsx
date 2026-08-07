import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { parabaService } from '@/services/parabaService';
import { brDateToIso, formatDate, formatPhone, isValidBrazilMobile } from '@/utils/formatters';
import { pickStudentPhoto } from '@/utils/pickStudentPhoto';

const FAIXAS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
const GRAUS = [0, 1, 2, 3, 4];
const DEFAULT_STUDENT_PHOTO = require('../assets/img/sem_foto.png');

function selectedOnPrimaryText(primary: string): string {
  return primary === '#FFFFFF' || primary === '#E5E7EB' ? '#000000' : '#FFFFFF';
}

function normalizePaymentDay(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2);
}

function isValidPaymentDay(value: string): boolean {
  const day = Number(value);
  return Number.isInteger(day) && day >= 1 && day <= 31;
}

function isoToBrDate(value?: string | null): string {
  if (!value) return '';
  const dateOnly = value.trim().slice(0, 10);
  const [year, month, day] = dateOnly.split('-');
  if (!year || !month || !day || year.length !== 4) return value;
  return `${day}/${month}/${year}`;
}

const emptyForm = {
  nome: '',
  apelido: '',
  foto: '',
  nomeResponsavel: '',
  emailResponsavel: '',
  celular: '',
  dataNascimento: '',
  dataPagamento: '',
  faixaAtual: '',
  graus: 0,
};

export default function AlunoFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const alunoId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  const isEditing = Boolean(alunoId);

  const topPadding = useScreenTopPadding();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [userEmail, setUserEmail] = useState('');

  const loadAluno = useCallback(async () => {
    if (!alunoId) {
      setForm(emptyForm);
      setUserEmail('');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const alunos = await parabaService.listarAlunos();
      const aluno = alunos.find((item) => item.id === alunoId);
      if (!aluno) {
        showError('Aluno nao encontrado.');
        return;
      }

      const raw = aluno as typeof aluno & { email_responsavel?: string | null };
      setUserEmail(aluno.user?.email ?? '');
      setForm({
        nome: aluno.nome,
        apelido: aluno.apelido ?? '',
        foto: aluno.foto ?? '',
        nomeResponsavel: aluno.nomeResponsavel ?? '',
        emailResponsavel: aluno.emailResponsavel ?? raw.email_responsavel ?? '',
        celular: aluno.celular ? formatPhone(aluno.celular) : '',
        dataNascimento: isoToBrDate(aluno.dataNascimento),
        dataPagamento: aluno.dataPagamento ?? '',
        faixaAtual: aluno.faixaAtual ?? '',
        graus: aluno.graus ?? 0,
      });
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel carregar o aluno.'));
    } finally {
      setLoading(false);
    }
  }, [alunoId, showError]);

  useEffect(() => {
    void loadAluno();
  }, [loadAluno]);

  const choosePhoto = async () => {
    try {
      const foto = await pickStudentPhoto();
      if (foto) {
        setForm((previous) => ({ ...previous, foto }));
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Nao foi possivel selecionar a foto.');
    }
  };

  const submit = async () => {
    Keyboard.dismiss();
    if (!form.nome.trim()) {
      showError('Informe o nome do aluno.');
      return;
    }

    const dataNascimento = brDateToIso(form.dataNascimento);
    if (!dataNascimento) {
      showError('Informe a data de nascimento no formato DD/MM/AAAA.');
      return;
    }

    if (!isValidBrazilMobile(form.celular)) {
      showError('Informe um celular valido com DDD.');
      return;
    }

    const dataPagamento = form.dataPagamento.trim();
    if (dataPagamento && !isValidPaymentDay(dataPagamento)) {
      showError('Informe o dia de pagamento entre 1 e 31.');
      return;
    }

    try {
      setSaving(true);
      const alunoBody = {
        nome: form.nome.trim(),
        apelido: form.apelido.trim() || undefined,
        foto: form.foto || undefined,
        nomeResponsavel: form.nomeResponsavel.trim() || undefined,
        emailResponsavel: form.emailResponsavel.trim() || undefined,
        celular: form.celular.trim(),
        dataNascimento,
        dataPagamento: dataPagamento || undefined,
        faixaAtual: form.faixaAtual || undefined,
        graus: form.graus,
      };

      if (alunoId) {
        await parabaService.atualizarAluno(alunoId, alunoBody);
      } else {
        await parabaService.cadastrarAluno(alunoBody);
      }

      router.back();
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel salvar o aluno.'));
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
        <Text style={styles.title}>{isEditing ? 'Editar aluno' : 'Novo aluno'}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <AppCard style={styles.formCard}>
          <TextInput
            style={styles.input}
            value={form.nome}
            onChangeText={(nome) => setForm((previous) => ({ ...previous, nome }))}
            placeholder="Nome do aluno"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={form.apelido}
            onChangeText={(apelido) => setForm((previous) => ({ ...previous, apelido }))}
            placeholder="Apelido (opcional)"
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.photoRow}>
            <Image source={form.foto ? { uri: form.foto } : DEFAULT_STUDENT_PHOTO} style={styles.formPhoto} />
            <View style={styles.photoButtons}>
              <AppButton variant="secondary" onPress={() => void choosePhoto()}>
                {form.foto ? 'Trocar foto' : 'Adicionar foto'}
              </AppButton>
              {form.foto ? (
                <AppButton variant="ghost" onPress={() => setForm((previous) => ({ ...previous, foto: '' }))}>
                  Remover foto
                </AppButton>
              ) : null}
            </View>
          </View>
          <TextInput
            style={styles.input}
            value={form.nomeResponsavel}
            onChangeText={(nomeResponsavel) => setForm((previous) => ({ ...previous, nomeResponsavel }))}
            placeholder="Nome do responsavel (opcional)"
            placeholderTextColor={colors.textMuted}
          />
          {userEmail ? (
            <>
              <Text style={styles.fieldLabel}>E-mail do usuario (app)</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={userEmail}
                editable={false}
                placeholderTextColor={colors.textMuted}
              />
            </>
          ) : null}
          <TextInput
            style={styles.input}
            value={form.emailResponsavel}
            onChangeText={(emailResponsavel) => setForm((previous) => ({ ...previous, emailResponsavel }))}
            placeholder="E-mail do responsavel (opcional)"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={form.celular}
            onChangeText={(celular) => setForm((previous) => ({ ...previous, celular: formatPhone(celular) }))}
            placeholder="Celular com DDD (obrigatorio)"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            maxLength={16}
          />
          <TextInput
            style={styles.input}
            value={form.dataNascimento}
            onChangeText={(dataNascimento) =>
              setForm((previous) => ({ ...previous, dataNascimento: formatDate(dataNascimento) }))
            }
            placeholder="Data nascimento DD/MM/AAAA (obrigatorio)"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={10}
          />
          <TextInput
            style={styles.input}
            value={form.dataPagamento}
            onChangeText={(dataPagamento) =>
              setForm((previous) => ({ ...previous, dataPagamento: normalizePaymentDay(dataPagamento) }))
            }
            placeholder="Dia pagamento mensal (1 a 31)"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.fieldLabel}>Faixa atual</Text>
          <View style={styles.optionsGrid}>
            {FAIXAS.map((faixa) => {
              const selected = form.faixaAtual === faixa;
              return (
                <Pressable
                  key={faixa}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => setForm((previous) => ({ ...previous, faixaAtual: faixa }))}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{faixa}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.fieldLabel}>Quantidade de graus</Text>
          <View style={styles.gradeRow}>
            {GRAUS.map((grau) => {
              const selected = form.graus === grau;
              return (
                <Pressable
                  key={grau}
                  style={[styles.gradeOption, selected && styles.optionSelected]}
                  onPress={() => setForm((previous) => ({ ...previous, graus: grau }))}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{grau}</Text>
                </Pressable>
              );
            })}
          </View>
          <AppButton loading={saving} onPress={() => void submit()}>
            {isEditing ? 'Salvar alterações' : 'Salvar aluno'}
          </AppButton>
        </AppCard>
      )}

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
      paddingBottom: 40,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
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
      flex: 1,
      fontSize: 28,
      fontWeight: '900',
    },
    loader: {
      marginTop: 24,
    },
    formCard: {
      gap: 12,
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
    inputDisabled: {
      opacity: 0.75,
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
    fieldLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      marginTop: 2,
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
    gradeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    gradeOption: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
  });
}
