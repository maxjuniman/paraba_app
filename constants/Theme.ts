export type ThemeColors = {
  background: string;
  card: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  danger: string;
  warning: string;
  text: string;
  textMuted: string;
  border: string;
  inputBg: string;
  white: string;
};

export const LightTheme: ThemeColors = {
  background: '#F6F7FB',
  card: '#FFFFFF',
  primary: '#000000',
  primaryDark: '#000000',
  secondary: '#22A06B',
  danger: '#D92D20',
  warning: '#F79009',
  text: '#172033',
  textMuted: '#667085',
  border: '#D0D5DD',
  inputBg: '#FFFFFF',
  white: '#FFFFFF',
};

export const DarkTheme: ThemeColors = {
  background: '#0F1419',
  card: '#1A222D',
  primary: '#FFFFFF',
  primaryDark: '#E5E7EB',
  secondary: '#22A06B',
  danger: '#F97066',
  warning: '#F79009',
  text: '#F5F7FA',
  textMuted: '#98A2B3',
  border: '#2D3745',
  inputBg: '#151B23',
  white: '#1A222D',
};

/** Mantido para compatibilidade; prefira useAppTheme().colors */
export const Theme = LightTheme;
