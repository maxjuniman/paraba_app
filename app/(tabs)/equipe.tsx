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
import { Theme, type ThemeColors } from '@/constants/Theme';
import { useAppTheme } from '@/hooks/useAppTheme';
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

/** Ordem do jiu-jitsu: faixa mais alta primeiro (preta -> branca). */
const FAIXA_RANK: Record<string, number> = {
  preta: 0,
  marrom: 1,
  roxa: 2,
  azul: 3,
  verde: 4,
  laranja: 5,
  amarela: 6,
  cinza: 7,
  branca: 8,
};

function faixaRank(faixa?: string | null): number {
  if (!faixa) return 99;
  return FAIXA_RANK[faixa.trim().toLowerCase()] ?? 98;
}

function formatBirthDateWithAge(isoDate?: string | null): string {
  if (!isoDate) return 'Nascimento nao informado';
  const dateOnly = isoDate.trim().slice(0, 10);
  const [year, month, day] = dateOnly.split('-');
  if (!year || !month || !day || year.length !== 4) return 'Nascimento nao informado';

  const age = calculateAgeFromIsoDate(dateOnly);
  return `${day}/${month}/${year}${age == null ? '' : ` (${age} anos)`}`;
}

function getBeltColor(faixa?: string | null, fallback = Theme.textMuted): string {
  if (!faixa) return fallback;
  return BELT_COLORS[faixa.trim().toLowerCase()] ?? fallback;
}

function normalizeGraus(graus?: number | null): number {
  return Math.max(0, Math.min(4, graus ?? 0));
}

export default function EquipeScreen() {
  const topPadding = useScreenTopPadding();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { errorVisible, errorMessage, errorTitle, showError, hideError } = useErrorAlert();
  const [loading, setLoading] = useState(false);
  const [savingPhotoId, setSavingPhotoId] = useState<string | null>(null);
  const [alunos, setAlunos] = useState<EquipeAluno[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<StudentCategoryId>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

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

    return alunos
      .filter((aluno) => {
        const matchesName =
          !normalizedName ||
          aluno.nome.toLowerCase().includes(normalizedName) ||
          (aluno.apelido ?? '').toLowerCase().includes(normalizedName);
        const category = getStudentCategoryByBirthDate(aluno.dataNascimento);
        const matchesCategory = categoryFilter === 'all' || category?.id === categoryFilter;

        return matchesName && matchesCategory;
      })
      .sort((a, b) => {
        const byFaixa = faixaRank(a.faixaAtual) - faixaRank(b.faixaAtual);
        if (byFaixa !== 0) return byFaixa;
        const byGraus = (b.graus ?? 0) - (a.graus ?? 0);
        if (byGraus !== 0) return byGraus;
        const aName = a.apelido?.trim() || a.nome;
        const bName = b.apelido?.trim() || b.nome;
        return aName.localeCompare(bName, 'pt-BR', { sensitivity: 'base' });
      });
  }, [alunos, categoryFilter, nameFilter]);

  const hasActiveFilters = Boolean(nameFilter.trim()) || categoryFilter !== 'all';

  const updateMyPhoto = async (alunoId: string) => {
    try {
      const foto = await pickStudentPhoto();
      if (!foto) return;

      setSavingPhotoId(alunoId);
      const updated = await parabaService.atualizarMinhaFotoEquipe(foto, alunoId);
      setAlunos((previous) =>
        previous.map((aluno) => (aluno.id === updated.id ? { ...aluno, ...updated, isMe: true } : aluno))
      );
    } catch (error) {
      showError(apiErrorMessage(error, 'Nao foi possivel atualizar sua foto.'));
    } finally {
      setSavingPhotoId(null);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: topPadding }]}>
      <Text style={styles.title}>Equipe</Text>
      <Text style={styles.subtitle}>Conheca os alunos da Equipe Paraba.</Text>

      <AppCard style={styles.filtersCard}>
        <Pressable
          style={styles.filtersHeader}
          onPress={() => setFiltersOpen((open) => !open)}
          hitSlop={6}
        >
          <View style={styles.filtersHeaderText}>
            <Text style={styles.cardTitle}>Procurar Atleta</Text>
            {hasActiveFilters && !filtersOpen ? (
              <Text style={styles.filtersHint}>Filtros ativos</Text>
            ) : null}
          </View>
          <Ionicons
            name={filtersOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textMuted}
          />
        </Pressable>

        {filtersOpen ? (
          <>
            <TextInput
              style={styles.input}
              value={nameFilter}
              onChangeText={setNameFilter}
              placeholder="Filtrar por nome ou apelido"
              placeholderTextColor={colors.textMuted}
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
          </>
        ) : null}
      </AppCard>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && filteredAlunos.length === 0 ? <Text style={styles.empty}>Nenhum aluno encontrado.</Text> : null}

      {filteredAlunos.map((aluno) => {
        const category = getStudentCategoryByBirthDate(aluno.dataNascimento);
        const graus = normalizeGraus(aluno.graus);
        const beltColor = getBeltColor(aluno.faixaAtual, colors.textMuted);
        const isMe = Boolean(aluno.isMe);
        const savingThisPhoto = savingPhotoId === aluno.id;

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
                <Pressable
                  style={styles.editPhotoButton}
                  onPress={() => void updateMyPhoto(aluno.id)}
                  disabled={savingThisPhoto}
                >
                  {savingThisPhoto ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={16} color={colors.primary} />
                      <Text style={styles.editPhotoText}>{aluno.foto ? 'Trocar minha foto' : 'Adicionar minha foto'}</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>
            <Pressable
              style={styles.photoWrap}
              onPress={isMe ? () => void updateMyPhoto(aluno.id) : undefined}
              disabled={!isMe || savingThisPhoto}
            >
              <Image source={aluno.foto ? { uri: aluno.foto } : DEFAULT_STUDENT_PHOTO} style={styles.photo} />
              <View style={styles.beltOverlay}>
                <View style={[styles.beltEnd, { backgroundColor: beltColor }]} />
                <View style={styles.beltBlackPatch}>
                  {Array.from({ length: graus }).map((_, index) => (
                    <View key={index} style={styles.degreeStripe} />
                  ))}
                </View>
                <View style={[styles.beltEnd, { backgroundColor: beltColor }]} />
              </View>
              {isMe ? (
                <View style={styles.photoEditBadge}>
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    gap: 14,
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
  filtersCard: {
    gap: 12,
  },
  filtersHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filtersHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  filtersHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
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
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  filterChipTextSelected: {
    color: colors.primary === '#FFFFFF' ? '#000000' : '#FFFFFF',
  },
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  myCard: {
    borderColor: colors.primary,
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
    borderColor: colors.border,
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
    backgroundColor: '#000000',
    borderColor: '#000000',
    borderWidth: 1.5,
    bottom: 12,
    flexDirection: 'row',
    height: 12,
    left: -4,
    overflow: 'hidden',
    position: 'absolute',
    right: -4,
  },
  beltEnd: {
    alignSelf: 'stretch',
    flex: 1,
  },
  beltBlackPatch: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#000000',
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    minWidth: 42,
    paddingHorizontal: 4,
  },
  degreeStripe: {
    backgroundColor: '#FFFFFF',
    height: '100%',
    width: 3,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  meta: {
    color: colors.textMuted,
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
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  empty: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
});
}

