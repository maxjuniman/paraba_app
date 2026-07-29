import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { Theme } from '@/constants/Theme';
import { hasSession } from '@/utils/session';

export default function WelcomeScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      const logged = await hasSession();
      if (!active) return;
      if (logged) {
        router.replace('/home');
        return;
      }
      setChecking(false);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  if (checking) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoArea}>
        <Image source={require('../assets/img/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.actions}>
        <AppButton onPress={() => router.push('/auth/login')}>Entrar</AppButton>
        <AppButton variant="secondary" onPress={() => router.push('/auth/register')}>
          Criar conta
        </AppButton>
        <Text style={styles.version}>Versão {Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: Theme.background,
    paddingHorizontal: 24,
    paddingBottom: 42,
    paddingTop: 42,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    height: 320,
    maxHeight: '70%',
    width: 320,
    maxWidth: '90%',
  },
  actions: {
    gap: 12,
  },
  version: {
    color: Theme.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
