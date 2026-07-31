import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AnimatedSplash } from '@/components/ui/AnimatedSplash';
import { Theme } from '@/constants/Theme';
import { useScreenTopPadding } from '@/hooks/useScreenTopPadding';
import { hasSession } from '@/utils/session';

export default function WelcomeScreen() {
  const topPadding = useScreenTopPadding();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [splashFinished, setSplashFinished] = useState(false);
  const [shouldRedirectHome, setShouldRedirectHome] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      const logged = await hasSession();
      if (!active) return;
      if (logged) {
        setShouldRedirectHome(true);
        return;
      }
      setChecking(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (splashFinished && shouldRedirectHome) {
      router.replace('/home');
    }
  }, [router, shouldRedirectHome, splashFinished]);

  const finishSplash = useCallback(() => {
    setSplashFinished(true);
  }, []);

  if (!splashFinished) {
    return <AnimatedSplash onFinish={finishSplash} />;
  }

  if (checking) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: topPadding }]}>
        <ActivityIndicator color={Theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.logoArea}>
        <Image source={require('../assets/img/logo-padded.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.actions}>
        <AppButton forceLight onPress={() => router.push('/auth/login')}>
          Entrar
        </AppButton>
        <AppButton forceLight variant="secondary" onPress={() => router.push('/auth/register')}>
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
    height: 280,
    maxHeight: '62%',
    width: 280,
    maxWidth: '78%',
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
