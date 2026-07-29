import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Theme } from '@/constants/Theme';
import { getCurrentUser, type SessionUser } from '@/utils/session';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icons: Record<string, IconName> = {
  home: 'home',
  alunos: 'people',
  presencas: 'checkbox',
  pagamentos: 'calendar',
  videos: 'videocam',
};

export default function TabsLayout() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const isProfessor = user?.tipo === 1 || user?.tipo === 'admin' || user?.tipo === 'professor';

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
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="alunos" options={{ title: 'Alunos', href: isProfessor ? undefined : null }} />
      <Tabs.Screen name="presencas" options={{ title: 'Presenças', href: isProfessor ? undefined : null }} />
      <Tabs.Screen name="autorizacoes" options={{ href: null }} />
      <Tabs.Screen name="pagamentos" options={{ title: 'Pagamentos', href: isProfessor ? undefined : null }} />
      <Tabs.Screen name="videos" options={{ title: 'Videos' }} />
    </Tabs>
  );
}
