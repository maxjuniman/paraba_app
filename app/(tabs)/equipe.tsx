import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AlertError } from '@/components/ui/AlertError';
import { AppCard } from '@/components/ui/AppCard';
import {
  calculateAgeFromIsoDate,
  getStudentCategoryByBirthDate,
  STUDENT_CATEGORY_FILTERS,
  type StudentCategoryId,
} from '@/constants/StudentCategories';
import { Theme } from '@/constants/Theme';
import { useErrorAlert } from '@/hooks/useErrorAlert';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { apiErrorMessage } from '@/services/api';
import { parabaService, type EquipeAluno } from '@/services/parabaService';
import { pickStudentPhoto } from '@/utils/pickStudentPhoto';

const DEFAULT_STUDENT_PHOTO = require('../../assets/img/sem_foto.png');

const BELT_COLORS: Record<string, string> = {
  branca: '#f7f7f7',
  cinza: '#9ca3af',
  amarela: '#facc15',
  laranja: '#f97316',
  verde: '#22c55e',
  azul: '#2563eb',
  roxa: '#7c3aed',
  marrom: '#7c2d12',
  preta: '#111827',
};

function formatBirthDateWithAge(isoDate?: string | null): string {
  if (!isoDate) return 'Nascimento nao informado';
  const dateOnly = isoDate.trim().slice(0, 10);
  const [year, month, day] = dateOnly.split('-');
  if (!year || !month || !day || year.length !== 4) return 'Nascimento nao informado';

  const age = calculateAgeFromIsoDate(dateOnly);
  return `${day}/${month}/${year}${age == null ? '' : ` (${age} anos)`}`;
}

function getBeltColor(faixa?: string | null): string {
  if (!faixa) return Theme.textMuted;
  return BELT_COLORS[faixa.trim().toLowerCase()] ?? Theme.textMuted;
}

function normalizeGraus(graus?: number | null): number {
  return Math.max(0, Math.min(4, graus ?? 0));
}

export default function EquipeScreen() {
  const topPadding = useScreenTopPadding();
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [alunos, setAlunos] = useState<EquipeAluno[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<StudentCategoryId>('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setAlunos(await parabaService.listarEquipe());
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel carregar a equipe.'));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filteredAlunos = useMemo(() => {
    const normalizedName = nameFilter.trim().toLowerCase();

    return alunos.filter((aluno) => {
      const matchesName =
        !normalizedName ||
        aluno.nome.toLowerCase().includes(normalizedName) ||
        (aluno.apelido ?? '').toLowerCase().includes(normalizedName);
      const category = getStudentCategoryByBirthDate(aluno.dataNascimento);
      const matchesCategory = categoryFilter === 'all' || category?.id === categoryFilter;

      return matchesName && matchesCategory;
    });
  }, [alunos, categoryFilter, nameFilter]);

  const updateMyPhoto = async () => {
    try {
      const foto = await pickStudentPhoto();
      if (!foto) return;

      setSavingPhoto(true);
      const updated = await parabaService.atualizarMinhaFotoEquipe(foto);
      setAlunos((previous) => previous.map((aluno) => (aluno.id === updated.id ? { ...aluno, ...updated } : aluno)));
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel atualizar sua foto.'));
    } finally {
      setSavingPhoto(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: topPadding }]}>
      <Text style={styles.title}>Equipe</Text>
      <Text style={styles.subtitle}>Conheca os alunos da Equipe Paraba.</Text>

      <AppCard style={styles.filtersCard}>
        <Text style={styles.cardTitle}>Filtros</Text>
        <TextInput
          style={styles.input}
          value={nameFilter}
          onChangeText={setNameFilter}
          placeholder="Filtrar por nome ou apelido"
          placeholderTextColor={Theme.textMuted}
        />
        <View style={styles.filterOptions}>
          {STUDENT_CATEGORY_FILTERS.map((category) => {
            const selected = categoryFilter === category.id;
            return (
              <Pressable
                key={category.id}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
                onPress={() => setCategoryFilter(category.id)}
              >
                <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      {loading ? <ActivityIndicator color={Theme.primary} /> : null}
      {!loading && filteredAlunos.length === 0 ? <Text style={styles.empty}>Nenhum aluno encontrado.</Text> : null}

      {filteredAlunos.map((aluno) => {
        const category = getStudentCategoryByBirthDate(aluno.dataNascimento);
        const graus = normalizeGraus(aluno.graus);
        const beltColor = getBeltColor(aluno.faixaAtual);
        const isMe = Boolean(aluno.isMe);

        return (
          <AppCard key={aluno.id} style={[styles.card, isMe && styles.myCard]}>
            <View style={styles.info}>
              <Text style={styles.name}>
                {aluno.nome}
                {isMe ? ' (voce)' : ''}
              </Text>
              {aluno.apelido ? <Text style={styles.meta}>Apelido: {aluno.apelido}</Text> : null}
              <Text style={styles.meta}>{formatBirthDateWithAge(aluno.dataNascimento)}</Text>
              <Text style={styles.meta}>Categoria: {category?.label ?? 'sem categoria'}</Text>
              {isMe ? (
                <Pressable style={styles.editPhotoButton} onPress={() => void updateMyPhoto()} disabled={savingPhoto}>
                  {savingPhoto ? (
                    <ActivityIndicator color={Theme.primary} size="small" />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={16} color={Theme.primary} />
                      <Text style={styles.editPhotoText}>{aluno.foto ? 'Trocar minha foto' : 'Adicionar minha foto'}</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>
            <Pressable
              style={styles.photoWrap}
              onPress={isMe ? () => void updateMyPhoto() : undefined}
              disabled={!isMe || savingPhoto}
            >
              <Image source={aluno.foto ? { uri: aluno.foto } : DEFAULT_STUDENT_PHOTO} style={styles.photo} />
              <View style={[styles.beltOverlay, { backgroundColor: beltColor }]}>
                <View style={styles.beltBlackPatch}>
                  {Array.from({ length: graus }).map((_, index) => (
                    <View key={index} style={styles.degreeStripe} />
                  ))}
                </View>
              </View>
              {isMe ? (
                <View style={styles.photoEditBadge}>
                  <Ionicons name="camera" size={14} color={Theme.white} />
                </View>
              ) : null}
            </Pressable>
          </AppCard>
        );
      })}

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
    gap: 14,
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
  filtersCard: {
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
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderColor: Theme.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterChipSelected: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  filterChipText: {
    color: Theme.text,
    fontSize: 13,
    fontWeight: '800',
  },
  filterChipTextSelected: {
    color: Theme.white,
  },
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  myCard: {
    borderColor: Theme.primary,
    borderWidth: 1.5,
  },
  photoWrap: {
    borderRadius: 12,
    height: 112,
    overflow: 'hidden',
    position: 'relative',
    width: 112,
  },
  photo: {
    borderColor: Theme.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 112,
    width: 112,
  },
  photoEditBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 6,
    width: 28,
  },
  beltOverlay: {
    alignItems: 'center',
    borderColor: '#000000',
    borderWidth: 1.5,
    bottom: 12,
    flexDirection: 'row',
    height: 12,
    justifyContent: 'center',
    left: -4,
    position: 'absolute',
    right: -4,
  },
  beltBlackPatch: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#000000',
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    minWidth: 42,
  },
  degreeStripe: {
    backgroundColor: Theme.white,
    borderColor: '#000000',
    borderWidth: 1,
    height: 14,
    width: 5,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: Theme.text,
    fontSize: 17,
    fontWeight: '900',
  },
  meta: {
    color: Theme.textMuted,
    fontSize: 13,
  },
  editPhotoButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    minHeight: 28,
  },
  editPhotoText: {
    color: Theme.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  empty: {
    color: Theme.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
});
