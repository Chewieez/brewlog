/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

import { renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import { makeStyles } from './makeStyles';
import { TACTILE_DARK_THEME, CRISP_STUDIO_LIGHT_THEME } from './theme';

describe('ThemeContext & useTheme', () => {
  it('falls back to DEFAULT_THEME when rendered outside a ThemeProvider', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme.id).toBe(TACTILE_DARK_THEME.id);
    expect(result.current.isDark).toBe(true);
    expect(result.current.colors.canvas).toBe(TACTILE_DARK_THEME.colors.canvas);
  });

  it('provides the custom theme when wrapped in ThemeProvider', () => {
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ThemeProvider theme={CRISP_STUDIO_LIGHT_THEME}>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme.id).toBe(CRISP_STUDIO_LIGHT_THEME.id);
    expect(result.current.isDark).toBe(false);
    expect(result.current.colors.canvas).toBe(CRISP_STUDIO_LIGHT_THEME.colors.canvas);
  });
});

describe('makeStyles', () => {
  it('generates styles for the active theme and memoizes by theme id', () => {
    const useStyles = makeStyles((colors) => ({
      box: {
        backgroundColor: colors.canvas,
      },
    }));

    const { result, rerender } = renderHook(() => useStyles(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider theme={TACTILE_DARK_THEME}>{children}</ThemeProvider>
      ),
    });

    const darkStyles = result.current;
    expect(darkStyles.box.backgroundColor).toBe(TACTILE_DARK_THEME.colors.canvas);

    rerender();
    expect(result.current).toBe(darkStyles);
  });

  it('recomputes styles when the theme changes', () => {
    const useStyles = makeStyles((colors) => ({
      box: {
        backgroundColor: colors.canvas,
      },
    }));

    let currentTheme = TACTILE_DARK_THEME;
    const { result, rerender } = renderHook(() => useStyles(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider theme={currentTheme}>{children}</ThemeProvider>
      ),
    });

    expect(result.current.box.backgroundColor).toBe(TACTILE_DARK_THEME.colors.canvas);

    currentTheme = CRISP_STUDIO_LIGHT_THEME;
    rerender();

    expect(result.current.box.backgroundColor).toBe(CRISP_STUDIO_LIGHT_THEME.colors.canvas);
  });
});
