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

export const TACTILE_DARK_THEME: ThemeTokens = {
  id: 'tactile-dark',
  name: 'Tactile Dark Craft',
  isDark: true,
  colors: {
    canvas: '#0e0d0c',
    panel: '#171513',
    panelRecessed: '#12100f',
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    borderActive: 'rgba(255, 255, 255, 0.12)',
    accent: '#d97736',
    accentHover: '#e88344',
    textPrimary: '#f5f0eb',
    textSecondary: '#a8a29e',
    textMuted: '#78716c',
    statusSuccess: '#22c55e',
    statusWarning: '#f59e0b',
    statusError: '#ef4444',
    statusInfo: '#38bdf8',
  },
};

export const CRISP_STUDIO_LIGHT_THEME: ThemeTokens = {
  id: 'studio-light',
  name: 'Crisp Studio Light',
  isDark: false,
  colors: {
    canvas: '#f8fafc',
    panel: '#ffffff',
    panelRecessed: '#f1f5f9',
    borderSubtle: '#e2e8f0',
    borderActive: '#cbd5e1',
    accent: '#c25412',
    accentHover: '#9a3412',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    statusSuccess: '#16a34a',
    statusWarning: '#d97706',
    statusError: '#dc2626',
    statusInfo: '#0284c7',
  },
};

export const INDUSTRIAL_PRECISION_THEME: ThemeTokens = {
  id: 'industrial-precision',
  name: 'Industrial Precision',
  isDark: true,
  colors: {
    canvas: '#121214',
    panel: '#18181b',
    panelRecessed: '#202024',
    borderSubtle: '#3f3f46',
    borderActive: '#52525b',
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
  [TACTILE_DARK_THEME.id]: TACTILE_DARK_THEME,
  [CRISP_STUDIO_LIGHT_THEME.id]: CRISP_STUDIO_LIGHT_THEME,
  [INDUSTRIAL_PRECISION_THEME.id]: INDUSTRIAL_PRECISION_THEME,
};

export function resolveTheme(
  preference: 'system' | 'tactile_dark' | 'studio_light' = 'system',
  isSystemDark = true
): ThemeTokens {
  if (preference === 'studio_light') return CRISP_STUDIO_LIGHT_THEME;
  if (preference === 'tactile_dark') return TACTILE_DARK_THEME;
  return isSystemDark ? TACTILE_DARK_THEME : CRISP_STUDIO_LIGHT_THEME;
}
