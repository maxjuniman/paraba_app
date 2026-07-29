import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Theme } from '@/constants/Theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Nao encontrado' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Tela nao encontrada</Text>
        <Link href="/" style={styles.link}>
          Voltar para o inicio
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Theme.background,
  },
  title: {
    color: Theme.text,
    fontSize: 22,
    fontWeight: '800',
  },
  link: {
    color: Theme.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
