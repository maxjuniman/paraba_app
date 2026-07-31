import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { LightTheme, type ThemeColors } from '@/constants/Theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type AppButtonProps = PressableProps & {
  children: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  /** Usa sempre o tema claro (telas de auth / boas-vindas). */
  forceLight?: boolean;
};

function contrastOnPrimary(primary: string): string {
  const normalized = primary.trim().toLowerCase();
  if (normalized === '#ffffff' || normalized === '#fff' || normalized === '#e5e7eb') {
    return '#000000';
  }
  return '#FFFFFF';
}

export function AppButton({
  children,
  variant = 'primary',
  loading,
  disabled,
  forceLight = false,
  style,
  ...props
}: AppButtonProps) {
  const { colors: themeColors } = useAppTheme();
  const colors = forceLight ? LightTheme : themeColors;
  const isDisabled = disabled || loading;
  const primaryTextColor = contrastOnPrimary(colors.primary);
  const styles = createStyles(colors, primaryTextColor);

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        styles[variant],
        state.pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? primaryTextColor : colors.primary} />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'primary' ? styles.primaryText : styles.altText,
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors, primaryTextColor: string) {
  return StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      borderRadius: 14,
      paddingHorizontal: 18,
      width: '100%',
    },
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.card,
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    pressed: {
      opacity: 0.82,
    },
    disabled: {
      opacity: 0.55,
    },
    text: {
      fontSize: 16,
      fontWeight: '700',
    },
    primaryText: {
      color: primaryTextColor,
    },
    altText: {
      color: colors.primary,
    },
  });
}
