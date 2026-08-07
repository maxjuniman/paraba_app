import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getCurrentUser, type SessionUser } from '@/utils/session';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icons: Record<string, IconName> = {
  home: 'home',
  alunos: 'people',
  presencas: 'checkbox',
  pagamentos: 'wallet',
  calendario: 'calendar',
  videos: 'videocam',
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const [user, setUser] = useState<SessionUser | null>(null);
  const isProfessor = user?.tipo === 1 || user?.tipo === 'admin' || user?.tipo === 'professor';
  const isAluno = user?.tipo === 2 || user?.tipo === 'aluno';
  const bottomInset = Math.max(insets.bottom, 8);
  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: colors.card,
      borderTopColor: colors.border,
      height: 56 + bottomInset,
      paddingBottom: bottomInset,
      paddingTop: 8,
    }),
    [bottomInset, colors.border, colors.card]
  );

  useEffect(() => {
    void (async () => {
      setUser(await getCurrentUser());
    })();
  }, []);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle,
        sceneStyle: { backgroundColor: colors.background },
        tabBarIcon: ({ color, size }) =>
          route.name === 'equipe' ? (
            <Image
              source={require('../../assets/img/logo3.png')}
              style={{ height: size + 4, opacity: color === colors.primary ? 1 : 0.5, width: size + 4 }}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />
          ),
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="equipe" options={{ title: 'Equipe', href: isAluno ? undefined : null }} />
      <Tabs.Screen name="calendario" options={{ title: 'Calendário', href: isProfessor || isAluno ? undefined : null }} />
      <Tabs.Screen name="alunos" options={{ title: 'Alunos', href: isProfessor ? undefined : null }} />
      <Tabs.Screen name="presencas" options={{ title: 'Presenças', href: isProfessor ? undefined : null }} />
      <Tabs.Screen name="autorizacoes" options={{ href: null }} />
      <Tabs.Screen name="pagamentos" options={{ title: 'Pagamentos', href: isProfessor ? undefined : null }} />
      <Tabs.Screen name="videos" options={{ title: 'Vídeos', href: isProfessor || isAluno ? undefined : null }} />
    </Tabs>
  );
}
