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
  theme: 'system',
};

export function gramsToOz(grams: number): number {
  if (grams === 0 || isNaN(grams)) return 0;
  const res = Number((grams * 0.03527396).toFixed(2));
  return res === 0 ? 0 : res;
}

export function ozToGrams(oz: number): number {
  if (oz === 0 || isNaN(oz)) return 0;
  const res = Number((oz * 28.34952).toFixed(1));
  return res === 0 ? 0 : res;
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

  // Handle date-only strings (YYYY-MM-DD) directly to prevent UTC midnight timezone shifts
  if (typeof dateInput === 'string') {
    const dateOnlyMatch = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      const numYear = Number(year);
      const numMonth = Number(month);
      const numDay = Number(day);

      if (numMonth < 1 || numMonth > 12 || numDay < 1 || numDay > 31) {
        return '—';
      }

      switch (format) {
        case 'YYYY-MM-DD':
          return `${year}-${month}-${day}`;
        case 'MM/DD/YYYY':
          return `${month}/${day}/${year}`;
        case 'DD/MM/YYYY':
          return `${day}/${month}/${year}`;
        case 'locale':
        default: {
          const d = new Date(numYear, numMonth - 1, numDay);
          return d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
      }
    }
  }

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  // Extract client local calendar date components to maintain parity with toLocaleDateString()
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

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
