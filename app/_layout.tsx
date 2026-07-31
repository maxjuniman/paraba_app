import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { useInitializeAds } from '@/components/ui/AdBanner';
import { UpdateReadyModal } from '@/components/ui/UpdateReadyModal';
import { AppThemeProvider, useAppTheme } from '@/hooks/useAppTheme';

void SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { isDark, colors } = useAppTheme();
  const [updateReady, setUpdateReady] = useState(false);
  const [reloading, setReloading] = useState(false);
  useInitializeAds();

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
        <Stack.Screen name="configuracoes-cadastrar-professor" />
        <Stack.Screen name="+not-found" />
      </Stack>
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
