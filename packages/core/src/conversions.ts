import {
  WeightUnit,
  TemperatureUnit,
  DateFormatPreference,
  UserSettings,
} from './types';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  weightUnit: 'metric',
  temperatureUnit: 'celsius',
  defaultTimerMode: 'free_brew',
  dateFormat: 'locale',
};

export function gramsToOz(grams: number): number {
  if (grams <= 0) return 0;
  return Number((grams * 0.03527396).toFixed(2));
}

export function ozToGrams(oz: number): number {
  if (oz <= 0) return 0;
  return Number((oz * 28.34952).toFixed(1));
}

export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5) / 9);
}

export function formatWeight(
  grams: number,
  unit: WeightUnit,
  precision: number = 1
): string {
  if (unit === 'imperial') {
    const oz = gramsToOz(grams);
    return `${oz.toFixed(2)} oz`;
  }
  return `${grams.toFixed(precision)} g`;
}

export function formatTemperature(
  celsius: number,
  unit: TemperatureUnit
): string {
  if (unit === 'fahrenheit') {
    return `${celsiusToFahrenheit(celsius)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

export function formatDisplayDate(
  dateInput: string | Date | undefined | null,
  format: DateFormatPreference
): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'locale':
    default:
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
  }
}
