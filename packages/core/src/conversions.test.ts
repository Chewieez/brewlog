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

    it('handles undefined and invalid dates gracefully', () => {
      expect(formatDisplayDate(undefined, 'YYYY-MM-DD')).toBe('—');
      expect(formatDisplayDate('', 'YYYY-MM-DD')).toBe('—');
      expect(formatDisplayDate('not-a-date', 'YYYY-MM-DD')).toBe('—');
    });
  });
});
