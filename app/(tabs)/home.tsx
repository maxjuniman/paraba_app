import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { Theme } from '@/constants/Theme';
import { parabaService } from '@/services/parabaService';
import { getCurrentUser, signOut, type SessionUser } from '@/utils/session';

function isProfessorUser(user?: SessionUser | null): boolean {
  return user?.tipo === 1 || user?.tipo === 'admin' || user?.tipo === 'professor';
}

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [pendingAuthorizations, setPendingAuthorizations] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const current = await getCurrentUser();
        if (!active) return;

        setUser(current);

        if (!isProfessorUser(current)) {
          setPendingAuthorizations(0);
          return;
        }

        try {
          const pendingUsers = await parabaService.listarUsuariosPendentes();
          if (active) setPendingAuthorizations(pendingUsers.length);
        } catch {
          if (active) setPendingAuthorizations(0);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const logout = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <View style={styles.screen}>
      <Image source={require('../../assets/img/logo.png')} style={styles.backgroundLogo} resizeMode="contain" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Bem-vindo</Text>
            <Text style={styles.title}>{user?.nome ?? 'Paraba'}</Text>
          </View>
          <TouchableOpacity style={styles.logout} onPress={logout} hitSlop={10}>
            <Ionicons name="log-out-outline" size={22} color={Theme.primary} />
          </TouchableOpacity>
        </View>

        {isProfessorUser(user) && pendingAuthorizations > 0 ? (
          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.summaryCard}
            onPress={() => router.push('/autorizacoes')}
          >
            <View style={styles.authorizationHeader}>
              <Ionicons name="checkmark-circle" size={24} color={Theme.primary} />
              <Text style={styles.cardTitle}>Autorizações pendentes</Text>
            </View>
            <Text style={styles.cardText}>
              {pendingAuthorizations} usuario{pendingAuthorizations > 1 ? 's' : ''} aguardando autorizacao.
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.grid}>
          <TouchableOpacity activeOpacity={0.82} style={styles.quickCard} onPress={() => router.push('/alunos')}>
            <Ionicons name="person-add" size={24} color={Theme.secondary} />
            <Text style={styles.quickTitle}>Aluno</Text>
            <Text style={styles.quickText}>Cadastre alunos e gere o codigo de vinculo.</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.82} style={styles.quickCard} onPress={() => router.push('/pagamentos')}>
            <Ionicons name="calendar" size={24} color={Theme.warning} />
            <Text style={styles.quickTitle}>Pagamento</Text>
            <Text style={styles.quickText}>Atualize a data de pagamento por aluno.</Text>
          </TouchableOpacity>
        </View>

        {isProfessorUser(user) ? (
          <TouchableOpacity activeOpacity={0.82} style={styles.summaryCard} onPress={() => router.push('/presencas')}>
            <View style={styles.authorizationHeader}>
              <Ionicons name="checkbox" size={24} color={Theme.secondary} />
              <Text style={styles.cardTitle}>Lista de presença</Text>
            </View>
            <Text style={styles.cardText}>Abra a chamada do dia e toque no nome para marcar presença.</Text>
          </TouchableOpacity>
        ) : null}

        <AppButton variant="secondary" onPress={() => router.push('/videos')}>
          Publicar foto/video
        </AppButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  backgroundLogo: {
    height: 360,
    left: 0,
    opacity: 0.08,
    position: 'absolute',
    right: 0,
    top: 190,
    width: '100%',
  },
  scroll: {
    flex: 1,
  },
  container: {
    gap: 18,
    padding: 20,
    paddingTop: 58,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kicker: {
    color: Theme.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    color: Theme.text,
    fontSize: 30,
    fontWeight: '900',
  },
  logout: {
    alignItems: 'center',
    backgroundColor: Theme.white,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: Theme.border,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 3,
    gap: 10,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  cardTitle: {
    color: Theme.text,
    fontSize: 20,
    fontWeight: '800',
  },
  cardText: {
    color: Theme.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  authorizationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: Theme.border,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 3,
    flex: 1,
    gap: 8,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  quickTitle: {
    color: Theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  quickText: {
    color: Theme.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
