import { describe, it, expect } from 'vitest';
import {
  gramsToOz,
  ozToGrams,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatWeight,
  formatTemperature,
  formatDisplayDate,
  DEFAULT_USER_SETTINGS,
} from './conversions';

describe('conversions', () => {
  describe('DEFAULT_USER_SETTINGS', () => {
    it('defaults to free_brew timer mode and metric units', () => {
      expect(DEFAULT_USER_SETTINGS).toEqual({
        weightUnit: 'metric',
        temperatureUnit: 'celsius',
        defaultTimerMode: 'free_brew',
        dateFormat: 'locale',
      });
    });
  });

  describe('weight conversions', () => {
    it('converts grams to ounces rounded to 2 decimal places', () => {
      expect(gramsToOz(0)).toBe(0);
      expect(gramsToOz(18)).toBe(0.63);
      expect(gramsToOz(300)).toBe(10.58);
    });

    it('converts ounces to grams rounded to 1 decimal place', () => {
      expect(ozToGrams(0)).toBe(0);
      expect(ozToGrams(0.63)).toBe(17.9);
      expect(ozToGrams(10.58)).toBe(299.9);
    });

    it('formats weight according to WeightUnit', () => {
      expect(formatWeight(18, 'metric')).toBe('18.0 g');
      expect(formatWeight(18.5, 'metric')).toBe('18.5 g');
      expect(formatWeight(18, 'imperial')).toBe('0.63 oz');
      expect(formatWeight(300, 'imperial')).toBe('10.58 oz');
    });
  });

  describe('temperature conversions', () => {
    it('converts celsius to whole integer fahrenheit', () => {
      expect(celsiusToFahrenheit(0)).toBe(32);
      expect(celsiusToFahrenheit(94)).toBe(201);
      expect(celsiusToFahrenheit(100)).toBe(212);
    });

    it('converts fahrenheit to whole integer celsius', () => {
      expect(fahrenheitToCelsius(32)).toBe(0);
      expect(fahrenheitToCelsius(201)).toBe(94);
      expect(fahrenheitToCelsius(212)).toBe(100);
    });

    it('formats temperature according to TemperatureUnit', () => {
      expect(formatTemperature(94, 'celsius')).toBe('94°C');
      expect(formatTemperature(94, 'fahrenheit')).toBe('201°F');
    });
  });

  describe('date formatting', () => {
    const isoDate = '2026-10-09T14:30:00.000Z';

    it('formats ISO dates into YYYY-MM-DD', () => {
      expect(formatDisplayDate(isoDate, 'YYYY-MM-DD')).toBe('2026-10-09');
    });

    it('formats ISO dates into MM/DD/YYYY', () => {
      expect(formatDisplayDate(isoDate, 'MM/DD/YYYY')).toBe('10/09/2026');
    });

    it('formats ISO dates into DD/MM/YYYY', () => {
      expect(formatDisplayDate(isoDate, 'DD/MM/YYYY')).toBe('09/10/2026');
    });

    it('formats date-only strings consistently across all format options without timezone shift', () => {
      const dateOnly = '2026-10-18';
      expect(formatDisplayDate(dateOnly, 'YYYY-MM-DD')).toBe('2026-10-18');
      expect(formatDisplayDate(dateOnly, 'MM/DD/YYYY')).toBe('10/18/2026');
      expect(formatDisplayDate(dateOnly, 'DD/MM/YYYY')).toBe('18/10/2026');

      const localeFormatted = formatDisplayDate(dateOnly, 'locale');
      expect(localeFormatted).toContain('Oct');
      expect(localeFormatted).toContain('18');
      expect(localeFormatted).toContain('2026');
    });

    it('formats Date instances consistently across all format options in local time', () => {
      // October 18, 2026 local time
      const localDate = new Date(2026, 9, 18, 20, 45, 0);
      expect(formatDisplayDate(localDate, 'YYYY-MM-DD')).toBe('2026-10-18');
      expect(formatDisplayDate(localDate, 'MM/DD/YYYY')).toBe('10/18/2026');
      expect(formatDisplayDate(localDate, 'DD/MM/YYYY')).toBe('18/10/2026');

      const localeFormatted = formatDisplayDate(localDate, 'locale');
      expect(localeFormatted).toContain('Oct');
      expect(localeFormatted).toContain('18');
      expect(localeFormatted).toContain('2026');
    });

    it('handles undefined, invalid, and out-of-range dates gracefully', () => {
      expect(formatDisplayDate(undefined, 'YYYY-MM-DD')).toBe('—');
      expect(formatDisplayDate('', 'YYYY-MM-DD')).toBe('—');
      expect(formatDisplayDate('not-a-date', 'YYYY-MM-DD')).toBe('—');
      expect(formatDisplayDate('2026-13-40', 'YYYY-MM-DD')).toBe('—');
      expect(formatDisplayDate('2026-00-10', 'YYYY-MM-DD')).toBe('—');
      expect(formatDisplayDate('2026-10-00', 'YYYY-MM-DD')).toBe('—');
    });
  });
});
