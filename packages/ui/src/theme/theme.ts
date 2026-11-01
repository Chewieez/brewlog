export interface ThemeColors {
  canvas: string;
  panel: string;
  panelRecessed: string;
  borderSubtle: string;
  borderActive: string;
  accent: string;
  accentHover: string;

  // Semantic foreground tokens
  foreground: string;
  foregroundSecondary: string;
  foregroundMuted: string;

  // Backward compatibility for existing mobile consumers
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
    foreground: '#f5f0eb',
    foregroundSecondary: '#a8a29e',
    foregroundMuted: '#78716c',
    get textPrimary() { return this.foreground; },
    get textSecondary() { return this.foregroundSecondary; },
    get textMuted() { return this.foregroundMuted; },
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
    foreground: '#0f172a',
    foregroundSecondary: '#475569',
    foregroundMuted: '#64748b',
    get textPrimary() { return this.foreground; },
    get textSecondary() { return this.foregroundSecondary; },
    get textMuted() { return this.foregroundMuted; },
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
    foreground: '#f4f4f5',
    foregroundSecondary: '#a1a1aa',
    foregroundMuted: '#71717a',
    get textPrimary() { return this.foreground; },
    get textSecondary() { return this.foregroundSecondary; },
    get textMuted() { return this.foregroundMuted; },
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

export const DEFAULT_THEME = TACTILE_DARK_THEME;
export const darkTheme = TACTILE_DARK_THEME;

export function resolveTheme(
  preference: 'system' | 'tactile_dark' | 'studio_light' = 'system',
  isSystemDark = true
): ThemeTokens {
  if (preference === 'studio_light') return CRISP_STUDIO_LIGHT_THEME;
  if (preference === 'tactile_dark') return TACTILE_DARK_THEME;
  return isSystemDark ? TACTILE_DARK_THEME : CRISP_STUDIO_LIGHT_THEME;
}
