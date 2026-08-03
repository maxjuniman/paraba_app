import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertError } from '@/components/ui/AlertError';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService } from '@/services/parabaService';

export default function ConfiguracoesDepoimentoScreen() {
  const topPadding = useScreenTopPadding();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [texto, setTexto] = useState('');
  const [nome, setNome] = useState('');
  const [faixa, setFaixa] = useState<string | null>(null);
  const [hasExisting, setHasExisting] = useState(false);
  const [success, setSuccess] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        try {
          setLoading(true);
          setSuccess('');
          const [mine, aluno] = await Promise.all([
            parabaService.obterMeuDepoimento(),
            parabaService.obterMeuAluno().catch(() => null),
          ]);
          if (!active) return;
          setHasExisting(Boolean(mine));
          setTexto(mine?.texto ?? '');
          setNome(mine?.nome || aluno?.apelido?.trim() || aluno?.nome || 'Aluno');
          setFaixa(mine?.faixa ?? aluno?.faixaAtual ?? null);
        } catch (error) {
          if (active) showError(apiErrorMessage(error, 'Nao foi possivel carregar o depoimento.'));
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [showError])
  );

  const save = async () => {
    Keyboard.dismiss();
    const value = texto.trim();
    if (value.length < 10) {
      showError('O depoimento deve ter pelo menos 10 caracteres.');
      return;
    }
    if (value.length > 800) {
      showError('O depoimento deve ter no maximo 800 caracteres.');
      return;
    }

    try {
      setSaving(true);
      setSuccess('');
      const saved = await parabaService.salvarMeuDepoimento(value);
      setHasExisting(true);
      setTexto(saved.texto);
      setNome(saved.nome);
      setFaixa(saved.faixa ?? null);
      setSuccess('Depoimento publicado no site da equipe.');
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel salvar o depoimento.'));
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
        <Text style={styles.title}>Depoimento</Text>
      </View>

      <AppCard style={styles.card}>
        <Text style={styles.lead}>
          Conte como e treinar na Equipe Paraba. Seu depoimento aparece no site da equipe.
        </Text>
        <Text style={styles.meta}>
          {nome}
          {faixa ? ` · ${faixa}` : ''}
        </Text>

        <Text style={styles.label}>Seu depoimento</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={texto}
          onChangeText={setTexto}
          placeholder="Escreva aqui..."
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          maxLength={800}
          editable={!loading}
        />
        <Text style={styles.hint}>{texto.trim().length}/800</Text>

        {success ? <Text style={styles.success}>{success}</Text> : null}

        <AppButton onPress={() => void save()} loading={saving || loading}>
          {hasExisting ? 'Atualizar depoimento' : 'Publicar depoimento'}
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
    lead: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    meta: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 4,
    },
    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
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
    textarea: {
      minHeight: 140,
    },
    hint: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'right',
    },
    success: {
      color: colors.secondary ?? colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
