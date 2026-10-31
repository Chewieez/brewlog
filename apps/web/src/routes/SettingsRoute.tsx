import React, { useMemo, useState } from 'react';
import {
  Settings,
  RotateCcw,
  Cloud,
  HardDrive,
  Gauge,
  Scale,
  Thermometer,
  Timer,
  Calendar,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import {
  WeightUnit,
  TemperatureUnit,
  TimerModePreference,
  DateFormatPreference,
  formatWeight,
  formatTemperature,
  formatDisplayDate,
} from '@brewlog/core';
import { useSettings } from '../features/settings/SettingsContext';
import { useAuth } from '../features/auth/AuthContext';
import { ConfirmationModal } from '../components/shared/ConfirmationModal';

export const SettingsRoute: React.FC = () => {
  const { settings, updateSettings, resetToDefaults } = useSettings();
  const { user } = useAuth();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Stable sample timestamp for preview calibration
  const sampleDate = useMemo(() => new Date('2026-10-18T12:00:00Z'), []);

  const handleConfirmReset = async () => {
    setIsResetModalOpen(false);
    await resetToDefaults();
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="border-b border-border-subtle pb-6">
        <div className="text-[11px] font-mono tracking-widest text-foreground-muted uppercase mb-1.5">
          SYSTEM // CALIBRATION
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-panel-recessed border border-border-subtle flex items-center justify-center text-accent">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Settings
            </h1>
          </div>
        </div>
      </div>

      {/* Live Calibration Preview Gauge Tile */}
      <section
        aria-labelledby="preview-heading"
        className="bg-panel border border-accent/40 rounded-xl p-5 sm:p-6 shadow-lg shadow-accent/5"
      >
        <div className="flex items-center pb-4 mb-5 border-b border-border-subtle">
          <div className="flex items-center space-x-2.5">
            <Gauge className="w-4 h-4 text-accent" />
            <h2
              id="preview-heading"
              className="text-xs font-mono font-bold tracking-widest uppercase text-accent"
            >
              Live Preview
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Dose Preview */}
          <div className="bg-panel-recessed border border-border-subtle rounded-lg p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted flex items-center space-x-1 mb-1">
              <Scale className="w-3 h-3 text-foreground-secondary" />
              <span>SAMPLE DOSE</span>
            </div>
            <div
              data-testid="preview-dose"
              className="text-lg sm:text-xl font-light tabular-nums text-foreground"
            >
              {formatWeight(18, settings.weightUnit)}
            </div>
          </div>

          {/* Water Target Preview */}
          <div className="bg-panel-recessed border border-border-subtle rounded-lg p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted flex items-center space-x-1 mb-1">
              <Scale className="w-3 h-3 text-foreground-secondary" />
              <span>SAMPLE WATER</span>
            </div>
            <div
              data-testid="preview-water"
              className="text-lg sm:text-xl font-light tabular-nums text-foreground"
            >
              {formatWeight(300, settings.weightUnit)}
            </div>
          </div>

          {/* Temperature Preview */}
          <div className="bg-panel-recessed border border-border-subtle rounded-lg p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted flex items-center space-x-1 mb-1">
              <Thermometer className="w-3 h-3 text-foreground-secondary" />
              <span>KETTLE TEMP</span>
            </div>
            <div
              data-testid="preview-temp"
              className="text-lg sm:text-xl font-light tabular-nums text-foreground"
            >
              {formatTemperature(94, settings.temperatureUnit)}
            </div>
          </div>

          {/* Default Timer Mode Preview */}
          <div className="bg-panel-recessed border border-border-subtle rounded-lg p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted flex items-center space-x-1 mb-1">
              <Timer className="w-3 h-3 text-foreground-secondary" />
              <span>DEFAULT MODE</span>
            </div>
            <div
              data-testid="preview-timer-mode"
              className="text-lg sm:text-xl font-light text-foreground truncate"
            >
              {settings.defaultTimerMode === 'free_brew' ? 'FREE BREW' : 'GUIDED RECIPE'}
            </div>
          </div>

          {/* Date Stamp Preview */}
          <div className="bg-panel-recessed border border-border-subtle rounded-lg p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted flex items-center space-x-1 mb-1">
              <Calendar className="w-3 h-3 text-foreground-secondary" />
              <span>DATE STAMP</span>
            </div>
            <div
              data-testid="preview-date"
              className="text-lg sm:text-xl font-light tabular-nums text-foreground truncate"
            >
              {formatDisplayDate(sampleDate, settings.dateFormat)}
            </div>
          </div>

          {/* Theme Preview */}
          <div className="bg-panel-recessed border border-border-subtle rounded-lg p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted flex items-center space-x-1 mb-1">
              <Sun className="w-3 h-3 text-foreground-secondary" />
              <span>THEME</span>
            </div>
            <div
              data-testid="preview-theme"
              className="text-lg sm:text-xl font-light text-foreground truncate"
            >
              {settings.theme === 'studio_light'
                ? 'LIGHT'
                : settings.theme === 'tactile_dark'
                  ? 'DARK'
                  : 'SYSTEM'}
            </div>
          </div>
        </div>
      </section>

      {/* Preferences Sections */}
      <div className="space-y-6">
        {/* Section: Appearance / Theme */}
        <section
          aria-labelledby="theme-heading"
          className="bg-panel border border-border-subtle rounded-xl p-5 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2
                id="theme-heading"
                className="text-sm font-mono font-bold uppercase tracking-wider text-foreground"
              >
                APPEARANCE // THEME
              </h2>
              <p className="text-xs text-foreground-muted mt-1">
                Visual workspace theme and ambient contrast
              </p>
            </div>

            <div className="segmented-track inline-flex p-1 rounded-lg space-x-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'system' })}
                aria-pressed={settings.theme === 'system'}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.theme === 'system'
                    ? 'segmented-thumb-active shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>SYSTEM</span>
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'tactile_dark' })}
                aria-pressed={settings.theme === 'tactile_dark'}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.theme === 'tactile_dark'
                    ? 'segmented-thumb-active shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>DARK</span>
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'studio_light' })}
                aria-pressed={settings.theme === 'studio_light'}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.theme === 'studio_light'
                    ? 'segmented-thumb-active shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>LIGHT</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section 1: Weight Unit */}
        <section
          aria-labelledby="weight-heading"
          className="bg-panel border border-border-subtle rounded-xl p-5 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2
                id="weight-heading"
                className="text-sm font-mono font-bold uppercase tracking-wider text-foreground"
              >
                WEIGHT UNIT
              </h2>
              <p className="text-xs text-foreground-muted mt-1">
                Primary mass measurement for coffee doses and extraction water
              </p>
            </div>

            <div className="segmented-track inline-flex p-1 rounded-lg space-x-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => updateSettings({ weightUnit: 'metric' })}
                aria-pressed={settings.weightUnit === 'metric'}
                className={`px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.weightUnit === 'metric'
                    ? 'segmented-thumb-active shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                METRIC (g)
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ weightUnit: 'imperial' })}
                aria-pressed={settings.weightUnit === 'imperial'}
                className={`px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.weightUnit === 'imperial'
                    ? 'segmented-thumb-active shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                IMPERIAL (oz)
              </button>
            </div>
          </div>
        </section>

        {/* Section 2: Temperature Unit */}
        <section
          aria-labelledby="temp-heading"
          className="bg-panel border border-border-subtle rounded-xl p-5 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2
                id="temp-heading"
                className="text-sm font-mono font-bold uppercase tracking-wider text-foreground"
              >
                TEMPERATURE UNIT
              </h2>
              <p className="text-xs text-foreground-muted mt-1">
                Water kettle and brew extraction temperature readings
              </p>
            </div>

            <div className="segmented-track inline-flex p-1 rounded-lg space-x-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => updateSettings({ temperatureUnit: 'celsius' })}
                aria-pressed={settings.temperatureUnit === 'celsius'}
                className={`px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.temperatureUnit === 'celsius'
                    ? 'segmented-thumb-active shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                CELSIUS (°C)
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ temperatureUnit: 'fahrenheit' })}
                aria-pressed={settings.temperatureUnit === 'fahrenheit'}
                className={`px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.temperatureUnit === 'fahrenheit'
                    ? 'segmented-thumb-active shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                FAHRENHEIT (°F)
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: Default Timer Mode */}
        <section
          aria-labelledby="timer-mode-heading"
          className="bg-panel border border-border-subtle rounded-xl p-5 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2
                id="timer-mode-heading"
                className="text-sm font-mono font-bold uppercase tracking-wider text-foreground"
              >
                DEFAULT TIMER MODE
              </h2>
              <p className="text-xs text-foreground-muted mt-1">
                Startup workflow preference for the brew timer interface
              </p>
            </div>

            <div className="segmented-track inline-flex p-1 rounded-lg space-x-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => updateSettings({ defaultTimerMode: 'free_brew' })}
                aria-pressed={settings.defaultTimerMode === 'free_brew'}
                className={`px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.defaultTimerMode === 'free_brew'
                    ? 'segmented-thumb-active shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                FREE BREW
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ defaultTimerMode: 'recipe' })}
                aria-pressed={settings.defaultTimerMode === 'recipe'}
                className={`px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.defaultTimerMode === 'recipe'
                    ? 'segmented-thumb-active shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                GUIDED RECIPE
              </button>
            </div>
          </div>
        </section>

        {/* Section 4: Date Format */}
        <section
          aria-labelledby="date-heading"
          className="bg-panel border border-border-subtle rounded-xl p-5 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2
                id="date-heading"
                className="text-sm font-mono font-bold uppercase tracking-wider text-foreground"
              >
                DATE FORMAT
              </h2>
              <p className="text-xs text-foreground-muted mt-1">
                Roast and tasting log timestamps display presentation
              </p>
            </div>

            <div className="segmented-track inline-flex p-1 rounded-lg space-x-1 flex-wrap sm:flex-nowrap gap-1 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => updateSettings({ dateFormat: 'locale' })}
                aria-pressed={settings.dateFormat === 'locale'}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.dateFormat === 'locale'
                    ? 'segmented-thumb-active shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                LOCALE
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ dateFormat: 'YYYY-MM-DD' })}
                aria-pressed={settings.dateFormat === 'YYYY-MM-DD'}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.dateFormat === 'YYYY-MM-DD'
                    ? 'segmented-thumb-active shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                YYYY-MM-DD
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ dateFormat: 'MM/DD/YYYY' })}
                aria-pressed={settings.dateFormat === 'MM/DD/YYYY'}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.dateFormat === 'MM/DD/YYYY'
                    ? 'segmented-thumb-active shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                MM/DD/YYYY
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ dateFormat: 'DD/MM/YYYY' })}
                aria-pressed={settings.dateFormat === 'DD/MM/YYYY'}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.dateFormat === 'DD/MM/YYYY'
                    ? 'segmented-thumb-active shadow-sm'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                DD/MM/YYYY
              </button>
            </div>
          </div>
        </section>

        {/* Cloud Sync Status Indicator */}
        <section
          aria-labelledby="sync-status-heading"
          className="bg-panel border border-border-subtle rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-start space-x-3.5">
            <div className="mt-0.5">
              {user ? (
                <Cloud className="w-5 h-5 text-status-success" />
              ) : (
                <HardDrive className="w-5 h-5 text-accent" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    user ? 'bg-status-success animate-pulse' : 'bg-accent'
                  }`}
                />
                <h2
                  id="sync-status-heading"
                  className={`text-xs font-mono font-bold uppercase tracking-wider ${
                    user ? 'text-status-success' : 'text-foreground'
                  }`}
                >
                  {user ? 'CLOUD SYNC ACTIVE' : 'LOCAL STORAGE ONLY'}
                </h2>
              </div>
              {user?.email && (
                <div className="text-xs font-mono text-foreground-muted">
                  {user.email}
                </div>
              )}
              <p className="text-xs text-foreground-secondary">
                {user
                  ? 'Instrument preferences synced across devices.'
                  : 'Saved to local device. Sign in to sync across platforms.'}
              </p>
            </div>
          </div>
        </section>

        {/* Reset to Factory Defaults */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg border border-border-subtle hover:border-status-error/50 hover:bg-status-error/10 text-foreground-muted hover:text-status-error font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET TO DEFAULTS</span>
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isResetModalOpen}
        title="RESTORE FACTORY DEFAULTS"
        message="Restore all instrument settings to factory defaults? This will reset all unit preferences, display formats, and timer modes."
        confirmLabel="Reset Defaults"
        cancelLabel="Cancel"
        variant="danger"
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmReset}
      />
    </div>
  );
};
