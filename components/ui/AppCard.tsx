import { StyleSheet, View, type ViewProps } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export function AppCard({ style, ...props }: ViewProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return <View {...props} style={[styles.card, style]} />;
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderColor: colors.border,
      borderWidth: 1,
      padding: 18,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 3,
    },
  });
}
