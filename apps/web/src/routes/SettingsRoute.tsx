import React, { useMemo } from 'react';
import {
  Sliders,
  RotateCcw,
  Cloud,
  HardDrive,
  Gauge,
  Scale,
  Thermometer,
  Timer,
  Calendar,
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

export const SettingsRoute: React.FC = () => {
  const { settings, updateSettings, resetToDefaults } = useSettings();
  const { user } = useAuth();

  // Stable sample timestamp for preview calibration
  const sampleDate = useMemo(() => new Date('2026-10-18T12:00:00Z'), []);

  const handleReset = async () => {
    const confirmed = window.confirm(
      'Restore all instrument settings to factory defaults?'
    );
    if (!confirmed) return;
    await resetToDefaults();
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="border-b border-border-subtle pb-6">
        <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-1.5">
          SYSTEM // CALIBRATION
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-panel-recessed border border-border-subtle flex items-center justify-center text-accent">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              INSTRUMENT SETTINGS
            </h1>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Configure measurement scales, extraction defaults, and telemetry timestamps.
            </p>
          </div>
        </div>
      </div>

      {/* Live Calibration Preview Gauge Tile */}
      <section
        aria-labelledby="preview-heading"
        className="bg-panel border border-accent/40 rounded-xl p-5 sm:p-6 shadow-lg shadow-accent/5 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent-hover to-accent" />
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-border-subtle">
          <div className="flex items-center space-x-2.5">
            <Gauge className="w-4 h-4 text-accent" />
            <h2
              id="preview-heading"
              className="text-xs font-mono font-bold tracking-widest uppercase text-accent"
            >
              CALIBRATION PREVIEW
            </h2>
          </div>
          <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider hidden sm:inline">
            REAL-TIME INSTRUMENT TELEMETRY
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Dose Preview */}
          <div className="bg-panel-recessed border border-border-subtle rounded-lg p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted flex items-center space-x-1 mb-1">
              <Scale className="w-3 h-3 text-text-secondary" />
              <span>SAMPLE DOSE</span>
            </div>
            <div
              data-testid="preview-dose"
              className="text-lg sm:text-xl font-light tabular-nums text-text-primary"
            >
              {formatWeight(18, settings.weightUnit)}
            </div>
          </div>

          {/* Water Target Preview */}
          <div className="bg-panel-recessed border border-border-subtle rounded-lg p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted flex items-center space-x-1 mb-1">
              <Scale className="w-3 h-3 text-text-secondary" />
              <span>SAMPLE WATER</span>
            </div>
            <div
              data-testid="preview-water"
              className="text-lg sm:text-xl font-light tabular-nums text-text-primary"
            >
              {formatWeight(300, settings.weightUnit)}
            </div>
          </div>

          {/* Temperature Preview */}
          <div className="bg-panel-recessed border border-border-subtle rounded-lg p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted flex items-center space-x-1 mb-1">
              <Thermometer className="w-3 h-3 text-text-secondary" />
              <span>KETTLE TEMP</span>
            </div>
            <div
              data-testid="preview-temp"
              className="text-lg sm:text-xl font-light tabular-nums text-text-primary"
            >
              {formatTemperature(94, settings.temperatureUnit)}
            </div>
          </div>

          {/* Default Timer Mode Preview */}
          <div className="bg-panel-recessed border border-border-subtle rounded-lg p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted flex items-center space-x-1 mb-1">
              <Timer className="w-3 h-3 text-text-secondary" />
              <span>DEFAULT MODE</span>
            </div>
            <div
              data-testid="preview-timer-mode"
              className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary mt-1 truncate"
            >
              {settings.defaultTimerMode === 'free_brew' ? 'FREE BREW' : 'GUIDED RECIPE'}
            </div>
          </div>

          {/* Date Stamp Preview */}
          <div className="bg-panel-recessed border border-border-subtle rounded-lg p-3 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted flex items-center space-x-1 mb-1">
              <Calendar className="w-3 h-3 text-text-secondary" />
              <span>DATE STAMP</span>
            </div>
            <div
              data-testid="preview-date"
              className="text-xs font-mono tabular-nums text-text-primary mt-1 truncate"
            >
              {formatDisplayDate(sampleDate, settings.dateFormat)}
            </div>
          </div>
        </div>
      </section>

      {/* Preferences Sections */}
      <div className="space-y-6">
        {/* Section 1: Weight Unit */}
        <section
          aria-labelledby="weight-heading"
          className="bg-panel border border-border-subtle rounded-xl p-5 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2
                id="weight-heading"
                className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary"
              >
                WEIGHT UNIT
              </h2>
              <p className="text-xs text-text-muted mt-1">
                PRIMARY MASS MEASUREMENT FOR COFFEE DOSES AND EXTRACTION WATER
              </p>
            </div>

            <div className="inline-flex p-1 bg-panel-recessed border border-border-subtle rounded-lg space-x-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => updateSettings({ weightUnit: 'metric' })}
                aria-pressed={settings.weightUnit === 'metric'}
                className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.weightUnit === 'metric'
                    ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-panel'
                }`}
              >
                METRIC (g)
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ weightUnit: 'imperial' })}
                aria-pressed={settings.weightUnit === 'imperial'}
                className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.weightUnit === 'imperial'
                    ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-panel'
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
                className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary"
              >
                TEMPERATURE UNIT
              </h2>
              <p className="text-xs text-text-muted mt-1">
                WATER KETTLE & BREW EXTRACTION TEMPERATURE READINGS
              </p>
            </div>

            <div className="inline-flex p-1 bg-panel-recessed border border-border-subtle rounded-lg space-x-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => updateSettings({ temperatureUnit: 'celsius' })}
                aria-pressed={settings.temperatureUnit === 'celsius'}
                className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.temperatureUnit === 'celsius'
                    ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-panel'
                }`}
              >
                CELSIUS (°C)
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ temperatureUnit: 'fahrenheit' })}
                aria-pressed={settings.temperatureUnit === 'fahrenheit'}
                className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.temperatureUnit === 'fahrenheit'
                    ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-panel'
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
                className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary"
              >
                DEFAULT TIMER MODE
              </h2>
              <p className="text-xs text-text-muted mt-1">
                STARTUP WORKFLOW PREFERENCE FOR THE BREW TIMER INTERFACE
              </p>
            </div>

            <div className="inline-flex p-1 bg-panel-recessed border border-border-subtle rounded-lg space-x-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => updateSettings({ defaultTimerMode: 'free_brew' })}
                aria-pressed={settings.defaultTimerMode === 'free_brew'}
                className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.defaultTimerMode === 'free_brew'
                    ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-panel'
                }`}
              >
                FREE BREW
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ defaultTimerMode: 'recipe' })}
                aria-pressed={settings.defaultTimerMode === 'recipe'}
                className={`px-4 py-2 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.defaultTimerMode === 'recipe'
                    ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-panel'
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
                className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary"
              >
                DATE FORMAT
              </h2>
              <p className="text-xs text-text-muted mt-1">
                ROAST & TASTING LOG TIMESTAMPS DISPLAY PRESENTATION
              </p>
            </div>

            <div className="inline-flex p-1 bg-panel-recessed border border-border-subtle rounded-lg space-x-1 flex-wrap sm:flex-nowrap gap-1 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => updateSettings({ dateFormat: 'locale' })}
                aria-pressed={settings.dateFormat === 'locale'}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.dateFormat === 'locale'
                    ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-panel'
                }`}
              >
                LOCALE
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ dateFormat: 'YYYY-MM-DD' })}
                aria-pressed={settings.dateFormat === 'YYYY-MM-DD'}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.dateFormat === 'YYYY-MM-DD'
                    ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-panel'
                }`}
              >
                YYYY-MM-DD
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ dateFormat: 'MM/DD/YYYY' })}
                aria-pressed={settings.dateFormat === 'MM/DD/YYYY'}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.dateFormat === 'MM/DD/YYYY'
                    ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-panel'
                }`}
              >
                MM/DD/YYYY
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ dateFormat: 'DD/MM/YYYY' })}
                aria-pressed={settings.dateFormat === 'DD/MM/YYYY'}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                  settings.dateFormat === 'DD/MM/YYYY'
                    ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-panel'
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
                <Cloud className="w-5 h-5 text-emerald-400" />
              ) : (
                <HardDrive className="w-5 h-5 text-accent" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    user ? 'bg-emerald-400 animate-pulse' : 'bg-accent'
                  }`}
                />
                <h2
                  id="sync-status-heading"
                  className={`text-xs font-mono font-bold uppercase tracking-wider ${
                    user ? 'text-emerald-400' : 'text-text-primary'
                  }`}
                >
                  {user ? 'CLOUD SYNC ACTIVE' : 'LOCAL STORAGE ONLY'}
                </h2>
              </div>
              {user?.email && (
                <div className="text-xs font-mono text-text-muted">
                  {user.email}
                </div>
              )}
              <p className="text-xs text-text-secondary">
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
            onClick={handleReset}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg border border-border-subtle hover:border-red-500/50 hover:bg-red-500/10 text-text-muted hover:text-red-400 font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET TO DEFAULTS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
