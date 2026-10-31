import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { ThemePreference } from '@brewlog/core';
import { useSettings } from '../../features/settings/SettingsContext';

export const ThemeToggle: React.FC = () => {
  let settings: { theme?: ThemePreference } = { theme: 'system' };
  let updateSettings: (updates: { theme: ThemePreference }) => Promise<void> = async () => {};

  try {
    const ctx = useSettings();
    settings = ctx.settings as any;
    updateSettings = ctx.updateSettings;
  } catch {
    // Graceful fallback for test harnesses or isolated headers without SettingsProvider
  }

  const theme = settings.theme ?? 'system';

  const handleCycleTheme = () => {
    if (theme === 'system') {
      updateSettings({ theme: 'tactile_dark' });
    } else if (theme === 'tactile_dark') {
      updateSettings({ theme: 'studio_light' });
    } else {
      updateSettings({ theme: 'system' });
    }
  };

  const getThemeInfo = () => {
    switch (theme) {
      case 'tactile_dark':
        return {
          label: 'Theme: Dark (click for Light)',
          icon: <Moon className="w-4 h-4 text-accent" />,
        };
      case 'studio_light':
        return {
          label: 'Theme: Light (click for System)',
          icon: <Sun className="w-4 h-4 text-accent" />,
        };
      case 'system':
      default:
        return {
          label: 'Theme: System (click for Dark)',
          icon: <Monitor className="w-4 h-4" />,
        };
    }
  };

  const { label, icon } = getThemeInfo();

  return (
    <button
      type="button"
      onClick={handleCycleTheme}
      aria-label={label}
      title={label}
      data-testid="theme-toggle-button"
      className="btn-tactile-secondary w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
    >
      {icon}
    </button>
  );
};
