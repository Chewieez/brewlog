import { describe, it, expect } from 'vitest';
import {
  TACTILE_DARK_THEME,
  CRISP_STUDIO_LIGHT_THEME,
  THEMES,
  resolveTheme,
  DEFAULT_THEME,
  darkTheme,
} from './theme';
import { resolveFreshnessColor, resolveFreshnessBadgeVariant } from './freshness';

describe('theme tokens in @brewlog/ui', () => {
  it('exports TACTILE_DARK_THEME and CRISP_STUDIO_LIGHT_THEME with all required color keys', () => {
    expect(TACTILE_DARK_THEME.id).toBe('tactile-dark');
    expect(TACTILE_DARK_THEME.isDark).toBe(true);
    expect(TACTILE_DARK_THEME.colors.canvas).toBe('#0e0d0c');
    expect(TACTILE_DARK_THEME.colors.panel).toBe('#171513');
    expect(TACTILE_DARK_THEME.colors.panelRecessed).toBe('#12100f');
    expect(TACTILE_DARK_THEME.colors.accent).toBe('#d97736');

    expect(CRISP_STUDIO_LIGHT_THEME.id).toBe('studio-light');
    expect(CRISP_STUDIO_LIGHT_THEME.isDark).toBe(false);
    expect(CRISP_STUDIO_LIGHT_THEME.colors.canvas).toBe('#f8fafc');
    expect(CRISP_STUDIO_LIGHT_THEME.colors.panel).toBe('#ffffff');
    expect(CRISP_STUDIO_LIGHT_THEME.colors.panelRecessed).toBe('#f1f5f9');
    expect(CRISP_STUDIO_LIGHT_THEME.colors.accent).toBe('#c25412');
  });

  it('includes themes in THEMES map', () => {
    expect(THEMES['tactile-dark']).toBe(TACTILE_DARK_THEME);
    expect(THEMES['studio-light']).toBe(CRISP_STUDIO_LIGHT_THEME);
    expect(THEMES['industrial-precision']).toBeUndefined();
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
    const colors = TACTILE_DARK_THEME.colors;

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

    it('falls back defensively to neutral defaults for unrecognized statuses', () => {
      expect(resolveFreshnessColor({ status: 'unknown' as any }, colors)).toBe(colors.textMuted);
    });

    it('maps freshness statuses to semantic Badge variants', () => {
      expect(resolveFreshnessBadgeVariant({ status: 'peak' })).toBe('success');
      expect(resolveFreshnessBadgeVariant({ status: 'resting' })).toBe('warning');
      expect(resolveFreshnessBadgeVariant({ status: 'aging' })).toBe('accent');
      expect(resolveFreshnessBadgeVariant({ status: 'past-peak' })).toBe('default');
      expect(resolveFreshnessBadgeVariant({ status: 'peak', isFrozen: true })).toBe('info');
      expect(resolveFreshnessBadgeVariant({ status: 'peak', hasRoastDate: false })).toBe('default');
    });
  });
});
