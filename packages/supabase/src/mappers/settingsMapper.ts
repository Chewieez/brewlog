import { UserSettings } from '@brewlog/core';
import { UserSettingsRow, UserSettingsInsert } from '../database.types';

export function mapDbToUserSettings(row: UserSettingsRow): UserSettings {
  return {
    weightUnit: row.weight_unit,
    temperatureUnit: row.temperature_unit,
    defaultTimerMode: row.default_timer_mode,
    dateFormat: row.date_format,
  };
}

export function mapUserSettingsToDb(settings: UserSettings, userId: string): UserSettingsInsert {
  return {
    user_id: userId,
    weight_unit: settings.weightUnit,
    temperature_unit: settings.temperatureUnit,
    default_timer_mode: settings.defaultTimerMode,
    date_format: settings.dateFormat,
    updated_at: new Date().toISOString(),
  };
}
