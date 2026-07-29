import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { AlertError } from '@/components/ui/AlertError';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Theme } from '@/constants/Theme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService, type VideoUpdate } from '@/services/parabaService';
import { getCurrentUser, type SessionUser } from '@/utils/session';

function isProfessorUser(user?: SessionUser | null): boolean {
  return user?.tipo === 1 || user?.tipo === 'admin' || user?.tipo === 'professor';
}

const VIDEOS_ENABLED = false;

export default function VideosScreen() {
  const topPadding = useScreenTopPadding();
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadedUser, setLoadedUser] = useState(false);
  const [videos, setVideos] = useState<VideoUpdate[]>([]);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    url: '',
    alunoId: '',
  });

  const load = useCallback(async () => {
    if (!VIDEOS_ENABLED) return;

    try {
      setLoading(true);
      const current = await getCurrentUser();
      setUser(current);
      setLoadedUser(true);
      if (!isProfessorUser(current)) {
        setVideos([]);
        return;
      }
      setVideos(await parabaService.listarVideos());
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel carregar os videos.'));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const isProfessor = isProfessorUser(user);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const submit = async () => {
    Keyboard.dismiss();
    if (!form.titulo.trim()) {
      showError('Informe o titulo do video.');
      return;
    }
    if (!form.url.trim().startsWith('http')) {
      showError('Informe uma URL valida do video.');
      return;
    }

    try {
      setSaving(true);
      const video = await parabaService.publicarVideo({
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || undefined,
        url: form.url.trim(),
        alunoId: form.alunoId.trim() || undefined,
      });
      setVideos((previous) => [video, ...previous]);
      setForm({ titulo: '', descricao: '', url: '', alunoId: '' });
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel publicar o video.'));
    } finally {
      setSaving(false);
    }
  };

  if (!VIDEOS_ENABLED) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: topPadding }]}>
        <Text style={styles.title}>Videos</Text>
        <Text style={styles.subtitle}>Esta area esta desabilitada no momento.</Text>
        <AppCard style={styles.formCard}>
          <Text style={styles.cardTitle}>Recurso em pausa</Text>
          <Text style={styles.videoText}>A publicacao e listagem de videos sera reativada em uma etapa futura.</Text>
        </AppCard>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Videos</Text>
      <Text style={styles.subtitle}>
        {isProfessor
          ? 'Publique atualizacoes gerais ou vincule um video a um aluno especifico.'
          : 'Esta area esta liberada apenas para usuarios tipo 1 por enquanto.'}
      </Text>

      {loadedUser && !isProfessor ? (
        <AppCard style={styles.formCard}>
          <Text style={styles.cardTitle}>Area em preparacao</Text>
          <Text style={styles.videoText}>A parte do usuario tipo 2 sera feita em uma proxima etapa.</Text>
        </AppCard>
      ) : null}

      {isProfessor ? (
        <AppCard style={styles.formCard}>
          <Text style={styles.cardTitle}>Nova atualizacao</Text>
          <TextInput
            style={styles.input}
            value={form.titulo}
            onChangeText={(titulo) => setForm((previous) => ({ ...previous, titulo }))}
            placeholder="Titulo"
            placeholderTextColor={Theme.textMuted}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            value={form.descricao}
            onChangeText={(descricao) => setForm((previous) => ({ ...previous, descricao }))}
            placeholder="Descricao"
            placeholderTextColor={Theme.textMuted}
            multiline
          />
          <TextInput
            style={styles.input}
            value={form.url}
            onChangeText={(url) => setForm((previous) => ({ ...previous, url }))}
            placeholder="https://..."
            placeholderTextColor={Theme.textMuted}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TextInput
            style={styles.input}
            value={form.alunoId}
            onChangeText={(alunoId) => setForm((previous) => ({ ...previous, alunoId }))}
            placeholder="ID do aluno (opcional)"
            placeholderTextColor={Theme.textMuted}
            autoCapitalize="none"
          />
          <AppButton loading={saving} onPress={submit}>
            Publicar video
          </AppButton>
        </AppCard>
      ) : null}

      <Text style={styles.sectionTitle}>Atualizacoes publicadas</Text>
      {loading ? <ActivityIndicator color={Theme.primary} /> : null}
      {videos.map((video) => (
        <AppCard key={video.id} style={styles.videoCard}>
          <Text style={styles.videoTitle}>{video.titulo}</Text>
          {video.descricao ? <Text style={styles.videoText}>{video.descricao}</Text> : null}
          <TouchableOpacity onPress={() => void Linking.openURL(video.url)}>
            <Text style={styles.videoLink}>{video.url}</Text>
          </TouchableOpacity>
          <Text style={styles.videoMeta}>Aluno: {video.alunoId ?? 'geral'}</Text>
        </AppCard>
      ))}

      <AlertError
        visible={errorVisible}
        message={errorMessage}
        title={errorTitle}
        onClose={hideError}
      />
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
  formCard: {
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
  multiline: {
    minHeight: 92,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    color: Theme.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  videoCard: {
    gap: 7,
  },
  videoTitle: {
    color: Theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  videoText: {
    color: Theme.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  videoLink: {
    color: Theme.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  videoMeta: {
    color: Theme.textMuted,
    fontSize: 12,
  },
});
