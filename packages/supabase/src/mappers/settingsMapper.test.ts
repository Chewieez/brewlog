import { describe, it, expect } from 'vitest';
import { mapDbToUserSettings, mapUserSettingsToDb } from './settingsMapper';
import { UserSettings } from '@brewlog/core';
import { UserSettingsRow } from '../database.types';

describe('settingsMapper', () => {
  const dbRow: UserSettingsRow = {
    user_id: 'user-123',
    weight_unit: 'imperial',
    temperature_unit: 'fahrenheit',
    default_timer_mode: 'free_brew',
    date_format: 'YYYY-MM-DD',
    created_at: '2026-10-09T00:00:00Z',
    updated_at: '2026-10-09T00:00:00Z',
  };

  const domain: UserSettings = {
    weightUnit: 'imperial',
    temperatureUnit: 'fahrenheit',
    defaultTimerMode: 'free_brew',
    dateFormat: 'YYYY-MM-DD',
  };

  it('maps database row to UserSettings domain object', () => {
    expect(mapDbToUserSettings(dbRow)).toEqual(domain);
  });

  it('maps UserSettings domain object to database insert/upsert payload', () => {
    const payload = mapUserSettingsToDb(domain, 'user-123');
    expect(payload).toEqual({
      user_id: 'user-123',
      weight_unit: 'imperial',
      temperature_unit: 'fahrenheit',
      default_timer_mode: 'free_brew',
      date_format: 'YYYY-MM-DD',
    });
  });
});
