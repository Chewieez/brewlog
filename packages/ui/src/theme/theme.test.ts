import { describe, it, expect } from 'vitest';
import {
  INDUSTRIAL_PRECISION_THEME,
  TACTILE_DARK_THEME,
  CRISP_STUDIO_LIGHT_THEME,
  THEMES,
  resolveTheme,
  DEFAULT_THEME,
  darkTheme,
} from './theme';
import { resolveFreshnessColor, resolveFreshnessBadgeVariant } from './freshness';

describe('theme tokens in @brewlog/ui', () => {
  it('exports INDUSTRIAL_PRECISION_THEME with all required color keys', () => {
    expect(INDUSTRIAL_PRECISION_THEME.id).toBe('industrial-precision');
    expect(INDUSTRIAL_PRECISION_THEME.isDark).toBe(true);
    expect(INDUSTRIAL_PRECISION_THEME.colors.canvas).toBe('#121214');
    expect(INDUSTRIAL_PRECISION_THEME.colors.panel).toBe('#18181b');
    expect(INDUSTRIAL_PRECISION_THEME.colors.panelRecessed).toBe('#202024');
    expect(INDUSTRIAL_PRECISION_THEME.colors.borderSubtle).toBe('#3f3f46');
    expect(INDUSTRIAL_PRECISION_THEME.colors.borderActive).toBe('#52525b');
    expect(INDUSTRIAL_PRECISION_THEME.colors.accent).toBe('#d97736');
    expect(INDUSTRIAL_PRECISION_THEME.colors.accentHover).toBe('#e88344');
    expect(INDUSTRIAL_PRECISION_THEME.colors.textPrimary).toBe('#f4f4f5');
    expect(INDUSTRIAL_PRECISION_THEME.colors.textSecondary).toBe('#a1a1aa');
    expect(INDUSTRIAL_PRECISION_THEME.colors.textMuted).toBe('#71717a');
    expect(INDUSTRIAL_PRECISION_THEME.colors.statusSuccess).toBe('#22c55e');
    expect(INDUSTRIAL_PRECISION_THEME.colors.statusWarning).toBe('#f59e0b');
    expect(INDUSTRIAL_PRECISION_THEME.colors.statusError).toBe('#ef4444');
    expect(INDUSTRIAL_PRECISION_THEME.colors.statusInfo).toBe('#38bdf8');
  });

  it('exports TACTILE_DARK_THEME and CRISP_STUDIO_LIGHT_THEME', () => {
    expect(TACTILE_DARK_THEME.id).toBe('tactile-dark');
    expect(TACTILE_DARK_THEME.isDark).toBe(true);
    expect(TACTILE_DARK_THEME.colors.canvas).toBe('#0e0d0c');

    expect(CRISP_STUDIO_LIGHT_THEME.id).toBe('studio-light');
    expect(CRISP_STUDIO_LIGHT_THEME.isDark).toBe(false);
    expect(CRISP_STUDIO_LIGHT_THEME.colors.canvas).toBe('#f8fafc');
  });

  it('includes themes in THEMES map', () => {
    expect(THEMES['industrial-precision']).toBe(INDUSTRIAL_PRECISION_THEME);
    expect(THEMES['tactile-dark']).toBe(TACTILE_DARK_THEME);
    expect(THEMES['studio-light']).toBe(CRISP_STUDIO_LIGHT_THEME);
  });

  it('exports semantic foreground tokens on all registered themes with backward-compatible aliases', () => {
    Object.values(THEMES).forEach((theme) => {
      expect(theme.colors.foreground).toBeDefined();
      expect(theme.colors.foregroundSecondary).toBeDefined();
      expect(theme.colors.foregroundMuted).toBeDefined();
      expect(theme.colors.textPrimary).toBe(theme.colors.foreground);
      expect(theme.colors.textSecondary).toBe(theme.colors.foregroundSecondary);
      expect(theme.colors.textMuted).toBe(theme.colors.foregroundMuted);
    });
  });

  it('exports DEFAULT_THEME and darkTheme aliases', () => {
    expect(DEFAULT_THEME).toBe(TACTILE_DARK_THEME);
    expect(darkTheme).toBe(TACTILE_DARK_THEME);
  });

  describe('resolveTheme', () => {
    it('resolves system preference to dark or light based on system state', () => {
      expect(resolveTheme('system', true)).toBe(TACTILE_DARK_THEME);
      expect(resolveTheme('system', false)).toBe(CRISP_STUDIO_LIGHT_THEME);
      expect(resolveTheme(undefined, true)).toBe(TACTILE_DARK_THEME);
      expect(resolveTheme(undefined, false)).toBe(CRISP_STUDIO_LIGHT_THEME);
    });

    it('resolves explicit tactile_dark and studio_light preferences regardless of system state', () => {
      expect(resolveTheme('tactile_dark', false)).toBe(TACTILE_DARK_THEME);
      expect(resolveTheme('tactile_dark', true)).toBe(TACTILE_DARK_THEME);
      expect(resolveTheme('studio_light', true)).toBe(CRISP_STUDIO_LIGHT_THEME);
      expect(resolveTheme('studio_light', false)).toBe(CRISP_STUDIO_LIGHT_THEME);
    });
  });

  describe('freshness presentation resolvers', () => {
    const colors = INDUSTRIAL_PRECISION_THEME.colors;

    it('resolves colors for standard resting stages', () => {
      expect(resolveFreshnessColor({ status: 'peak' }, colors)).toBe(colors.statusSuccess);
      expect(resolveFreshnessColor({ status: 'resting' }, colors)).toBe(colors.statusWarning);
      expect(resolveFreshnessColor({ status: 'aging' }, colors)).toBe(colors.accent);
      expect(resolveFreshnessColor({ status: 'past-peak' }, colors)).toBe(colors.textMuted);
    });

    it('resolves frozen status to statusInfo color regardless of stage', () => {
      expect(resolveFreshnessColor({ status: 'peak', isFrozen: true }, colors)).toBe(colors.statusInfo);
      expect(resolveFreshnessColor({ status: 'resting', isFrozen: true }, colors)).toBe(colors.statusInfo);
    });

    it('resolves unspecified roast date to textMuted color', () => {
      expect(resolveFreshnessColor({ status: 'resting', hasRoastDate: false }, colors)).toBe(colors.textMuted);
    });

    it('resolves badge variants accurately', () => {
      expect(resolveFreshnessBadgeVariant({ status: 'peak' })).toBe('success');
      expect(resolveFreshnessBadgeVariant({ status: 'resting' })).toBe('warning');
      expect(resolveFreshnessBadgeVariant({ status: 'aging' })).toBe('accent');
      expect(resolveFreshnessBadgeVariant({ status: 'past-peak' })).toBe('default');
      expect(resolveFreshnessBadgeVariant({ status: 'peak', isFrozen: true })).toBe('info');
      expect(resolveFreshnessBadgeVariant({ status: 'resting', hasRoastDate: false })).toBe('default');
    });
  });
});
