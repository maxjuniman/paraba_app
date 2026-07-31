import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { Theme } from '@/constants/Theme';

type AnimatedSplashProps = {
  onFinish: () => void;
};

export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 72,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(720),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) onFinish();
    });

    return () => animation.stop();
  }, [onFinish, opacity, scale, translateY]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity,
            transform: [{ scale }, { translateY }],
          },
        ]}
      >
        <Image source={require('../../assets/img/logo-padded.png')} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: Theme.white,
    flex: 1,
    justifyContent: 'center',
    overflow: 'visible',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  logo: {
    height: 260,
    maxHeight: '48%',
    maxWidth: '78%',
    width: 260,
  },
});
