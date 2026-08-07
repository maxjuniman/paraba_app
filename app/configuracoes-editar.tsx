import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
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
import { useAppTheme } from '@/hooks/useAppTheme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService } from '@/services/parabaService';
import { formatPhone } from '@/utils/formatters';
import { pickStudentPhoto } from '@/utils/pickStudentPhoto';
import { getCurrentUser, updateCurrentUser } from '@/utils/session';

const FAIXAS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];
const GRAUS = [0, 1, 2, 3, 4];

export default function ConfiguracoesEditarScreen() {
  const topPadding = useScreenTopPadding();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [isProfessor, setIsProfessor] = useState(false);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoInicial, setFotoInicial] = useState<string | null>(null);
  const [alunoFotoId, setAlunoFotoId] = useState<string | null>(null);
  const [faixaAtual, setFaixaAtual] = useState('Preta');
  const [graus, setGraus] = useState(0);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        try {
          setLoading(true);
          const local = await getCurrentUser();
          const profile = await parabaService.obterMeuPerfil().catch(() => local);
          if (!active || !profile) return;
          const professor =
            profile.tipo === 1 || profile.tipo === 'admin' || profile.tipo === 'professor';
          const alunoUser = profile.tipo === 2 || profile.tipo === 'aluno';
          setIsProfessor(professor);
          setEmail(profile.email);
          setNome(profile.nome);
          setCelular(profile.celular ? formatPhone(profile.celular) : '');
          setFaixaAtual(profile.faixaAtual?.trim() || 'Preta');
          setGraus(Math.max(0, Math.min(4, profile.graus ?? 0)));

          if (alunoUser) {
            try {
              const meuAluno = await parabaService.obterMeuAluno();
              if (!active) return;
              setAlunoFotoId(meuAluno.id);
              setFoto(meuAluno.foto ?? null);
              setFotoInicial(meuAluno.foto ?? null);
            } catch {
              if (!active) return;
              setAlunoFotoId(null);
              setFoto(null);
              setFotoInicial(null);
            }
          } else {
            setFoto(profile.foto ?? null);
            setFotoInicial(profile.foto ?? null);
          }

          await updateCurrentUser(profile);
        } catch (error) {
          if (active) showError(apiErrorMessage(error, 'Nao foi possivel carregar seu cadastro.'));
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [showError])
  );

  const pickPhoto = async () => {
    try {
      setPickingPhoto(true);
      const next = await pickStudentPhoto();
      if (next) setFoto(next);
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel selecionar a foto.'));
    } finally {
      setPickingPhoto(false);
    }
  };

  const save = async () => {
    Keyboard.dismiss();
    if (!nome.trim()) {
      showError('Informe seu nome.');
      return;
    }
    if (novaSenha || confirmacaoSenha) {
      if (novaSenha.length < 6) {
        showError('A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (novaSenha !== confirmacaoSenha) {
        showError('A confirmacao da nova senha nao confere.');
        return;
      }
    }

    try {
      setSaving(true);
      const updated = await parabaService.atualizarMeuPerfil({
        nome: nome.trim(),
        celular: celular.trim() || undefined,
        ...(isProfessor
          ? {
              foto,
              faixaAtual: faixaAtual.trim() || null,
              graus,
            }
          : {}),
        novaSenha: novaSenha || undefined,
      });
      await updateCurrentUser(updated);

      if (!isProfessor) {
        if (foto !== fotoInicial) {
          const savedAluno = await parabaService.atualizarMinhaFotoEquipe(
            foto,
            alunoFotoId ?? undefined
          );
          setAlunoFotoId(savedAluno.id);
          setFoto(savedAluno.foto ?? null);
          setFotoInicial(savedAluno.foto ?? null);
        }
      } else {
        setFoto(updated.foto ?? null);
        setFotoInicial(updated.foto ?? null);
        setFaixaAtual(updated.faixaAtual?.trim() || 'Preta');
        setGraus(Math.max(0, Math.min(4, updated.graus ?? 0)));
      }

      setNovaSenha('');
      setConfirmacaoSenha('');
      router.back();
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel salvar o cadastro.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Editar cadastro</Text>
      </View>

      <AppCard style={styles.card}>
        <View style={styles.photoRow}>
          <View style={styles.avatar}>
            {foto ? (
              <Image source={{ uri: foto }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarLetter}>{(nome.trim().charAt(0) || '?').toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.photoActions}>
            <AppButton onPress={() => void pickPhoto()} loading={pickingPhoto} variant="secondary">
              {foto ? 'Trocar foto' : 'Adicionar foto'}
            </AppButton>
            {foto ? (
              <Pressable onPress={() => setFoto(null)} hitSlop={8}>
                <Text style={styles.removePhoto}>Remover foto</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <Text style={styles.photoHint}>
          {isProfessor
            ? 'A foto, faixa e graus aparecem em Nossos lutadores e no carrossel de depoimentos.'
            : 'Mesma foto da pagina Equipe. Tambem aparece no carrossel de depoimentos, se voce tiver depoimento publicado.'}
        </Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} />

        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Seu nome"
          placeholderTextColor={colors.textMuted}
          editable={!loading}
        />

        <Text style={styles.label}>Celular</Text>
        <TextInput
          style={styles.input}
          value={celular}
          onChangeText={(value) => setCelular(formatPhone(value))}
          placeholder="(00) 00000-0000"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          editable={!loading}
        />

        {isProfessor ? (
          <>
            <Text style={styles.label}>Faixa</Text>
            <View style={styles.chips}>
              {FAIXAS.map((faixa) => {
                const active = faixaAtual === faixa;
                return (
                  <Pressable
                    key={faixa}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setFaixaAtual(faixa)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{faixa}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Graus</Text>
            <View style={styles.chips}>
              {GRAUS.map((grau) => {
                const active = graus === grau;
                return (
                  <Pressable
                    key={grau}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setGraus(grau)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{grau}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Alterar senha (opcional)</Text>
        <TextInput
          style={styles.input}
          value={novaSenha}
          onChangeText={setNovaSenha}
          placeholder="Nova senha"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          value={confirmacaoSenha}
          onChangeText={setConfirmacaoSenha}
          placeholder="Confirmar nova senha"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          editable={!loading}
        />

        <AppButton onPress={() => void save()} loading={saving || loading}>
          Salvar alteracoes
        </AppButton>
      </AppCard>

      <AlertError visible={errorVisible} message={errorMessage} title={errorTitle} onClose={hideError} />
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      gap: 14,
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
      fontSize: 28,
      fontWeight: '900',
    },
    card: {
      gap: 10,
    },
    photoRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 14,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 72,
      justifyContent: 'center',
      overflow: 'hidden',
      width: 72,
    },
    avatarImage: {
      height: '100%',
      width: '100%',
    },
    avatarLetter: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '900',
    },
    photoActions: {
      flex: 1,
      gap: 8,
    },
    removePhoto: {
      color: colors.danger ?? '#F04438',
      fontSize: 13,
      fontWeight: '700',
    },
    photoHint: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 4,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      marginTop: 6,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    chipTextActive: {
      color: colors.background,
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      color: colors.text,
      fontSize: 16,
      minHeight: 48,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    inputDisabled: {
      opacity: 0.7,
    },
  });
}
