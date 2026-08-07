import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { AppCard } from '@/components/ui/AppCard';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { getCurrentUser, signOut, type SessionUser } from '@/utils/session';

type SettingRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
};

function SettingRow({ icon, label, subtitle, onPress, right, danger }: SettingRowProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const content = (
    <>
      <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null)}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      {content}
    </Pressable>
  );
}

export default function ConfiguracoesScreen() {
  const topPadding = useScreenTopPadding();
  const router = useRouter();
  const { colors, isDark, toggleDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        setUser(await getCurrentUser());
      })();
    }, [])
  );

  const logout = async () => {
    await signOut();
    router.replace('/');
  };

  const isProfessor = user?.tipo === 1 || user?.tipo === 'admin' || user?.tipo === 'professor';
  const isAluno = user?.tipo === 2 || user?.tipo === 'aluno';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Configuracoes</Text>
      </View>

      <AppCard style={styles.profileCard}>
        <Text style={styles.profileName}>{user?.nome ?? 'Usuario'}</Text>
        <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
      </AppCard>

      <AppCard style={styles.section}>
        <SettingRow
          icon="person-outline"
          label="Editar cadastro"
          subtitle={
            isProfessor ? 'Nome, celular, foto, faixa e senha' : 'Nome, celular, foto e senha'
          }
          onPress={() => router.push('/configuracoes-editar')}
        />
        {isAluno ? (
          <>
            <View style={styles.divider} />
            <SettingRow
              icon="people-outline"
              label="Alunos vinculados"
              subtitle="Ver e escolher o aluno primario"
              onPress={() => router.push('/configuracoes-vinculos')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="chatbubble-ellipses-outline"
              label="Deixar depoimento"
              subtitle="Publicar no site da equipe"
              onPress={() => router.push('/configuracoes-depoimento')}
            />
          </>
        ) : null}
        {isProfessor ? (
          <>
            <View style={styles.divider} />
            <SettingRow
              icon="chatbubble-ellipses-outline"
              label="Meu depoimento"
              subtitle="Texto no carrossel do site"
              onPress={() => router.push('/configuracoes-depoimento')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="chatbubbles-outline"
              label="Depoimentos"
              subtitle="Aprovar, editar e gerenciar"
              onPress={() => router.push('/depoimentos')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="people-outline"
              label="Alunos vinculados"
              subtitle="Ate 2 alunos por usuario"
              onPress={() => router.push('/configuracoes-vinculos')}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="school-outline"
              label="Cadastrar professor"
              subtitle="Criar usuário para outro professor"
              onPress={() => router.push('/configuracoes-cadastrar-professor')}
            />
          </>
        ) : null}
        <View style={styles.divider} />
        <SettingRow
          icon="moon-outline"
          label="Tema escuro"
          subtitle={isDark ? 'Ativado' : 'Desativado'}
          right={
            <Switch
              value={isDark}
              onValueChange={toggleDark}
              trackColor={{ false: colors.border, true: colors.text }}
              thumbColor={isDark ? colors.background : colors.card}
              ios_backgroundColor={colors.border}
            />
          }
        />
        <View style={styles.divider} />
        <SettingRow
          icon="notifications-outline"
          label="Notificacoes"
          subtitle="Abrir configuracoes do aparelho"
          onPress={() => {
            void Linking.openSettings();
          }}
        />
        <View style={styles.divider} />
        <SettingRow icon="information-circle-outline" label="Versao do app" subtitle={appVersion} />
      </AppCard>

      <AppCard style={styles.section}>
        <SettingRow icon="log-out-outline" label="Sair" danger onPress={() => void logout()} />
      </AppCard>
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
    profileCard: {
      gap: 4,
    },
    profileName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    profileEmail: {
      color: colors.textMuted,
      fontSize: 14,
    },
    section: {
      gap: 0,
      paddingVertical: 4,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      minHeight: 58,
      paddingVertical: 8,
    },
    rowPressed: {
      opacity: 0.75,
    },
    iconWrap: {
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderColor: colors.border,
      borderRadius: 12,
      borderWidth: 1,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    iconWrapDanger: {
      borderColor: colors.danger,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowLabel: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    rowLabelDanger: {
      color: colors.danger,
    },
    rowSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
    },
    divider: {
      backgroundColor: colors.border,
      height: StyleSheet.hairlineWidth,
      marginLeft: 52,
    },
  });
}
