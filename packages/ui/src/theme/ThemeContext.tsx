import React, { createContext, useContext, useMemo } from 'react';
import { ThemeTokens, DEFAULT_THEME, ThemeColors } from './theme';

export interface ThemeContextValue {
  theme: ThemeTokens;
  colors: ThemeColors;
  isDark: boolean;
}

const defaultContextValue: ThemeContextValue = {
  theme: DEFAULT_THEME,
  colors: DEFAULT_THEME.colors,
  isDark: DEFAULT_THEME.isDark,
};

const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

export interface ThemeProviderProps {
  theme?: ThemeTokens;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  theme = DEFAULT_THEME,
  children,
}) => {
  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    colors: theme.colors,
    isDark: theme.isDark,
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  try {
    const dispatcher =
      (React as any)?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentDispatcher
        ?.current;
    if (dispatcher) {
      const context = useContext(ThemeContext);
      return context ?? defaultContextValue;
    }
    return defaultContextValue;
  } catch {
    return defaultContextValue;
  }
}
