import { StyleSheet, View, type ViewProps } from 'react-native';
import { Theme } from '@/constants/Theme';

export function AppCard({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.card,
    borderRadius: 18,
    borderColor: Theme.border,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
});
