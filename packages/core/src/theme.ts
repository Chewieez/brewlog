export interface ThemeColors {
  canvas: string;
  panel: string;
  panelRecessed: string;
  borderSubtle: string;
  borderActive: string;
  accent: string;
  accentHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  statusSuccess: string;
  statusWarning: string;
  statusError: string;
  statusInfo: string;
}

export interface ThemeTokens {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
}

export const INDUSTRIAL_PRECISION_THEME: ThemeTokens = {
  id: 'industrial-precision',
  name: 'Industrial Precision',
  isDark: true,
  colors: {
    canvas: '#121214',
    panel: '#18181b',
    panelRecessed: '#202024',
    borderSubtle: '#27272a',
    borderActive: '#3f3f46',
    accent: '#d97736',
    accentHover: '#e88344',
    textPrimary: '#f4f4f5',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    statusSuccess: '#22c55e',
    statusWarning: '#f59e0b',
    statusError: '#ef4444',
    statusInfo: '#38bdf8',
  },
};

export const THEMES: Record<string, ThemeTokens> = {
  [INDUSTRIAL_PRECISION_THEME.id]: INDUSTRIAL_PRECISION_THEME,
};
