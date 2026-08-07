import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useMemo, useState } from 'react';
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

function VideoPlayerCard({ url }: { url: string }) {
  const src = resolveMediaUrl(url);
  const player = useVideoPlayer(src, (instance) => {
    instance.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={playerStyles.video}
      contentFit="contain"
      nativeControls
      allowsFullscreen
      allowsPictureInPicture
    />
  );
}

const playerStyles = StyleSheet.create({
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0f1419',
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default function VideosScreen() {
  const topPadding = useScreenTopPadding();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [videos, setVideos] = useState<VideoUpdate[]>([]);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
  });
  const [picked, setPicked] = useState<PickedVideo | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const current = await getCurrentUser();
      setUser(current);
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

  const pickVideo = async () => {
    try {
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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Videos</Text>
      <Text style={styles.subtitle}>
        {isProfessor
          ? 'Envie videos para o servidor (titulo, descricao e arquivo) e a equipe assiste no player.'
          : 'Assista aos videos publicados pelos professores.'}
      </Text>

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
      {!loading && videos.length === 0 ? (
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
          <VideoPlayerCard url={video.url} />
        </AppCard>
      ))}

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
      gap: 8,
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
  });
}
