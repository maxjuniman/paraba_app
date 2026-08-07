import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { useInitializeAds } from '@/components/ui/AdBanner';
import { NotificationPermissionModal } from '@/components/ui/NotificationPermissionModal';
import { UpdateReadyModal } from '@/components/ui/UpdateReadyModal';
import { AppThemeProvider, useAppTheme } from '@/hooks/useAppTheme';
import {
  getNotificationPermissionStatus,
  requestNotificationPermissionAndSync,
  syncPushTokenIfGranted,
} from '@/utils/registerPushNotifications';

void SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { isDark, colors } = useAppTheme();
  const [updateReady, setUpdateReady] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [requestingNotifications, setRequestingNotifications] = useState(false);
  const skippedNotificationsRef = useRef(false);
  useInitializeAds();

  useEffect(() => {
    void (async () => {
      try {
        const status = await getNotificationPermissionStatus();
        if (status == null) return;

        if (status === 'granted') {
          await syncPushTokenIfGranted().catch(() => undefined);
          return;
        }

        if (!skippedNotificationsRef.current) {
          setShowNotificationPrompt(true);
        }
      } catch {
        // Notificacoes nao devem bloquear o app.
      }
    })();
  }, []);

  useEffect(() => {
    if (!Updates.isEnabled) return;

    void (async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (!update.isAvailable) return;

        await Updates.fetchUpdateAsync();
        setUpdateReady(true);
      } catch {
        // Falhas de OTA nao devem bloquear o uso do aplicativo.
      }
    })();
  }, []);

  const handleRestart = useCallback(() => {
    setReloading(true);
    void Updates.reloadAsync().catch(() => {
      setReloading(false);
    });
  }, []);

  const allowNotifications = useCallback(async () => {
    try {
      setRequestingNotifications(true);
      await requestNotificationPermissionAndSync();
      await syncPushTokenIfGranted().catch(() => undefined);
    } catch {
      // Mantem o app utilizavel mesmo se a permissao falhar.
    } finally {
      setRequestingNotifications(false);
      setShowNotificationPrompt(false);
    }
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="configuracoes" />
        <Stack.Screen name="configuracoes-editar" />
        <Stack.Screen name="configuracoes-depoimento" />
        <Stack.Screen name="depoimentos" />
        <Stack.Screen name="configuracoes-cadastrar-professor" />
        <Stack.Screen name="configuracoes-vinculos" />
        <Stack.Screen name="aluno-form" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <NotificationPermissionModal
        visible={showNotificationPrompt}
        loading={requestingNotifications}
        onAllow={() => {
          void allowNotifications();
        }}
        onLater={() => {
          skippedNotificationsRef.current = true;
          setShowNotificationPrompt(false);
        }}
      />
      <UpdateReadyModal
        visible={updateReady}
        loading={reloading}
        onRestart={handleRestart}
        onLater={() => setUpdateReady(false)}
      />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <RootNavigation />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
