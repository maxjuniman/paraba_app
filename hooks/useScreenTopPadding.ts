import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Espaco extra abaixo da status bar / notch. */
const EXTRA_TOP = 16;

export function useScreenTopPadding(extra = EXTRA_TOP): number {
  const insets = useSafeAreaInsets();
  return insets.top + extra;
}
