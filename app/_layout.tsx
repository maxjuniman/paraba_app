import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

void SplashScreen.preventAutoHideAsync();

async function checkForOtaUpdate() {
  if (!Updates.isEnabled) return;

  try {
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) return;

    await Updates.fetchUpdateAsync();
    Alert.alert('Atualização pronta', 'Uma atualização foi baixada. Reinicie o app para aplicar.', [
      {
        text: 'Reiniciar agora',
        onPress: () => {
          void Updates.reloadAsync();
        },
      },
    ]);
  } catch {
    // Falhas de OTA nao devem bloquear o uso do aplicativo.
  }
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
    void checkForOtaUpdate();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </SafeAreaProvider>
  );
}
