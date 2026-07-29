import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { Theme } from '@/constants/Theme';

type AppButtonProps = PressableProps & {
  children: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
};

export function AppButton({
  children,
  variant = 'primary',
  loading,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;

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
        <ActivityIndicator color={variant === 'primary' ? Theme.white : Theme.primary} />
      ) : (
        <Text style={[styles.text, variant === 'primary' ? styles.primaryText : styles.altText]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 18,
    width: '100%',
  },
  primary: {
    backgroundColor: Theme.primary,
  },
  secondary: {
    backgroundColor: Theme.white,
    borderColor: Theme.primary,
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
    color: Theme.white,
  },
  altText: {
    color: Theme.primary,
  },
});
