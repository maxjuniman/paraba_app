import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Component, useCallback, useMemo, useState, type ErrorInfo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
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
import { parabaService, type VideoUpdate } from '@/services/parabaService';
import { resolveMediaUrl } from '@/utils/mediaUrl';
import { getCurrentUser, type SessionUser } from '@/utils/session';

function isProfessorUser(user?: SessionUser | null): boolean {
  return user?.tipo === 1 || user?.tipo === 'admin' || user?.tipo === 'professor';
}

type PickedVideo = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

class VideoScreenErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Videos screen error:', error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function VideosScreenContent() {
  const topPadding = useScreenTopPadding();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [videos, setVideos] = useState<VideoUpdate[]>([]);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
  });
  const [picked, setPicked] = useState<PickedVideo | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');
      const current = await getCurrentUser();
      setUser(current);
      setVideos(await parabaService.listarVideos());
    } catch (error) {
      const message = apiErrorMessage(error, 'Nao foi possivel carregar os videos.');
      setLoadError(message);
      showError(message);
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

  const pickVideo = async () => {
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime', 'video/webm', 'video/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPicked({
        uri: asset.uri,
        name: asset.name || 'video.mp4',
        mimeType: asset.mimeType,
      });
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel selecionar o video.'));
    }
  };

  const submit = async () => {
    Keyboard.dismiss();
    if (!form.titulo.trim()) {
      showError('Informe o titulo do video.');
      return;
    }
    if (!picked) {
      showError('Selecione o arquivo de video.');
      return;
    }

    try {
      setSaving(true);
      const video = await parabaService.publicarVideo({
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || undefined,
        uri: picked.uri,
        name: picked.name,
        mimeType: picked.mimeType,
      });
      setVideos((previous) => [video, ...previous]);
      setForm({ titulo: '', descricao: '' });
      setPicked(null);
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel publicar o video.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (video: VideoUpdate) => {
    try {
      setBusyId(video.id);
      await parabaService.excluirVideo(video.id);
      setVideos((previous) => previous.filter((item) => item.id !== video.id));
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel excluir o video.'));
    } finally {
      setBusyId(null);
    }
  };

  const openVideo = async (video: VideoUpdate) => {
    const url = resolveMediaUrl(video.url);
    try {
      // Nao usar canOpenURL: no Android costuma falhar para https sem queries extras.
      await Linking.openURL(url);
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel abrir o video.'));
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Videos</Text>
      <Text style={styles.subtitle}>
        {isProfessor
          ? 'Envie videos para o servidor; a equipe abre no player do celular.'
          : 'Toque em Assistir para abrir o video no player do celular.'}
      </Text>

      {loadError ? (
        <AppCard style={styles.formCard}>
          <Text style={styles.videoText}>{loadError}</Text>
          <AppButton onPress={() => void load()}>Tentar novamente</AppButton>
        </AppCard>
      ) : null}

      {isProfessor ? (
        <AppCard style={styles.formCard}>
          <Text style={styles.cardTitle}>Novo video</Text>
          <TextInput
            style={styles.input}
            value={form.titulo}
            onChangeText={(titulo) => setForm((previous) => ({ ...previous, titulo }))}
            placeholder="Titulo"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            value={form.descricao}
            onChangeText={(descricao) => setForm((previous) => ({ ...previous, descricao }))}
            placeholder="Descricao"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
          <Pressable style={styles.pickButton} onPress={() => void pickVideo()}>
            <Ionicons name="videocam-outline" size={20} color={colors.primary} />
            <Text style={styles.pickButtonText}>
              {picked ? picked.name : 'Selecionar arquivo de video'}
            </Text>
          </Pressable>
          <Text style={styles.hint}>MP4, WebM ou MOV. Maximo 200 MB.</Text>
          <AppButton loading={saving} onPress={() => void submit()}>
            {saving ? 'Enviando video...' : 'Publicar video'}
          </AppButton>
        </AppCard>
      ) : null}

      <Text style={styles.sectionTitle}>{isProfessor ? 'Videos publicados' : 'Biblioteca'}</Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && videos.length === 0 && !loadError ? (
        <Text style={styles.empty}>Nenhum video publicado ainda.</Text>
      ) : null}

      {videos.map((video) => (
        <AppCard key={video.id} style={styles.videoCard}>
          <View style={styles.videoHeader}>
            <Text style={styles.videoTitle}>{video.titulo}</Text>
            {isProfessor ? (
              <Pressable
                onPress={() => void remove(video)}
                disabled={busyId === video.id}
                hitSlop={8}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={busyId === video.id ? colors.textMuted : colors.danger}
                />
              </Pressable>
            ) : null}
          </View>
          {video.descricao ? <Text style={styles.videoText}>{video.descricao}</Text> : null}
          <Pressable style={styles.playButton} onPress={() => void openVideo(video)}>
            <Ionicons name="play-circle" size={28} color={colors.primary} />
            <Text style={styles.playButtonText}>Assistir video</Text>
          </Pressable>
        </AppCard>
      ))}

      <AlertError visible={errorVisible} message={errorMessage} title={errorTitle} onClose={hideError} />
    </ScrollView>
  );
}

export default function VideosScreen() {
  const { colors } = useAppTheme();
  const topPadding = useScreenTopPadding();

  return (
    <VideoScreenErrorBoundary
      fallback={
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            padding: 20,
            paddingTop: topPadding,
            gap: 12,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>Videos</Text>
          <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
            Nao foi possivel abrir a tela de videos. Feche o app e abra de novo.
          </Text>
        </View>
      }
    >
      <VideosScreenContent />
    </VideoScreenErrorBoundary>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
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
    formCard: {
      gap: 12,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    input: {
      backgroundColor: colors.inputBg ?? colors.background,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      color: colors.text,
      fontSize: 15,
      minHeight: 50,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    multiline: {
      minHeight: 92,
    },
    pickButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 14,
      borderStyle: 'dashed',
      borderWidth: 1,
      flexDirection: 'row',
      gap: 10,
      minHeight: 52,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    pickButtonText: {
      color: colors.text,
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
    },
    hint: {
      color: colors.textMuted,
      fontSize: 12,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginTop: 6,
    },
    empty: {
      color: colors.textMuted,
      fontSize: 14,
    },
    videoCard: {
      gap: 10,
    },
    videoHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
    },
    videoTitle: {
      color: colors.text,
      flex: 1,
      fontSize: 16,
      fontWeight: '800',
    },
    videoText: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    playButton: {
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 10,
      minHeight: 52,
      paddingHorizontal: 14,
    },
    playButtonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
  });
}
