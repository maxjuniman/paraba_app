import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DarkTheme, LightTheme, type ThemeColors } from '@/constants/Theme';
import { secureGetItem, secureSetItem } from '@/utils/secureStorage';

const THEME_KEY = 'PARABA_THEME_MODE';

export type ThemeMode = 'light' | 'dark';

type AppThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggleDark: () => void;
  ready: boolean;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await secureGetItem(THEME_KEY);
        if (stored === 'dark' || stored === 'light') {
          setModeState(stored);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void secureSetItem(THEME_KEY, next);
  }, []);

  const toggleDark = useCallback(() => {
    setModeState((previous) => {
      const next = previous === 'dark' ? 'light' : 'dark';
      void secureSetItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      isDark: mode === 'dark',
      colors: mode === 'dark' ? DarkTheme : LightTheme,
      setMode,
      toggleDark,
      ready,
    }),
    [mode, ready, setMode, toggleDark]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const context = useContext(AppThemeContext);
  if (!context) {
    return {
      mode: 'light',
      isDark: false,
      colors: LightTheme,
      setMode: () => undefined,
      toggleDark: () => undefined,
      ready: true,
    };
  }
  return context;
}
