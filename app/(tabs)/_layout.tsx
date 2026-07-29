import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/Theme';
import { getCurrentUser, type SessionUser } from '@/utils/session';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icons: Record<string, IconName> = {
  home: 'home',
  alunos: 'people',
  presencas: 'checkbox',
  pagamentos: 'calendar',
  calendario: 'calendar-outline',
  videos: 'videocam',
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<SessionUser | null>(null);
  const isProfessor = user?.tipo === 1 || user?.tipo === 'admin' || user?.tipo === 'professor';
  const isAluno = user?.tipo === 2 || user?.tipo === 'aluno';
  const bottomInset = Math.max(insets.bottom, 8);

  useEffect(() => {
    void (async () => {
      setUser(await getCurrentUser());
    })();
  }, []);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Theme.primary,
        tabBarInactiveTintColor: Theme.textMuted,
        tabBarStyle: {
          borderTopColor: Theme.border,
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
        tabBarIcon: ({ color, size }) =>
          route.name === 'equipe' ? (
            <Image
              source={require('../../assets/img/logo.png')}
              style={{ height: size + 4, opacity: color === Theme.primary ? 1 : 0.5, width: size + 4 }}
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
      <Tabs.Screen name="videos" options={{ href: null }} />
    </Tabs>
  );
}
