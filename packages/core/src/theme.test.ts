import { describe, it, expect } from 'vitest';
import { INDUSTRIAL_PRECISION_THEME, THEMES } from './theme';

describe('theme tokens', () => {
  it('exports INDUSTRIAL_PRECISION_THEME with all required color keys', () => {
    expect(INDUSTRIAL_PRECISION_THEME.id).toBe('industrial-precision');
    expect(INDUSTRIAL_PRECISION_THEME.isDark).toBe(true);
    expect(INDUSTRIAL_PRECISION_THEME.colors.canvas).toBe('#121214');
    expect(INDUSTRIAL_PRECISION_THEME.colors.panel).toBe('#18181b');
    expect(INDUSTRIAL_PRECISION_THEME.colors.panelRecessed).toBe('#202024');
    expect(INDUSTRIAL_PRECISION_THEME.colors.borderSubtle).toBe('#27272a');
    expect(INDUSTRIAL_PRECISION_THEME.colors.borderActive).toBe('#3f3f46');
    expect(INDUSTRIAL_PRECISION_THEME.colors.accent).toBe('#d97736');
    expect(INDUSTRIAL_PRECISION_THEME.colors.accentHover).toBe('#e88344');
    expect(INDUSTRIAL_PRECISION_THEME.colors.textPrimary).toBe('#f4f4f5');
    expect(INDUSTRIAL_PRECISION_THEME.colors.textSecondary).toBe('#a1a1aa');
    expect(INDUSTRIAL_PRECISION_THEME.colors.textMuted).toBe('#71717a');
    expect(INDUSTRIAL_PRECISION_THEME.colors.statusSuccess).toBe('#22c55e');
    expect(INDUSTRIAL_PRECISION_THEME.colors.statusWarning).toBe('#f59e0b');
  });

  it('includes INDUSTRIAL_PRECISION_THEME in THEMES map', () => {
    expect(THEMES['industrial-precision']).toBe(INDUSTRIAL_PRECISION_THEME);
  });
});
