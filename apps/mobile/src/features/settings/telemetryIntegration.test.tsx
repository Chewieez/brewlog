/** @vitest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TimerHero } from '../../components/timer/TimerHero';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { SpecsGrid } from '../recipes/components/SpecsGrid';
import { RecipeDetailScreen } from '../recipes/screens/RecipeDetailScreen';
import { SettingsContext } from './SettingsContext';

vi.mock('expo-router', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useLocalSearchParams: () => ({}),
}));

vi.mock('../recipes/RecipeContext', () => ({
  useRecipes: () => ({
    recipes: DEFAULT_PRESET_RECIPES,
    activeTimerRecipe: DEFAULT_PRESET_RECIPES[0],
    activeTimerDose: 30,
    setActiveTimerRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
  }),
}));

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span {...props}>{children}</span>,
  ScrollView: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  TextInput: ({ value, defaultValue, ...props }: any) => (
    <input defaultValue={defaultValue} value={value} {...props} />
  ),
  Pressable: ({ children, onPress, style, hitSlop, ...props }: any) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  Play: () => null,
  Pause: () => null,
  RotateCcw: () => null,
  Volume2: () => null,
  VolumeX: () => null,
  Droplets: () => null,
  BookOpen: () => null,
  Clock: () => null,
  Thermometer: () => null,
  Minus: () => null,
  Plus: () => null,
  Copy: () => null,
  Edit2: () => null,
  Trash2: () => null,
}));

describe('TimerHero Settings Unit Display', () => {
  it('renders imperial units when weightUnit is imperial', () => {
    const recipe = DEFAULT_PRESET_RECIPES[0];
    const { getAllByText, getByText } = render(
      <TimerHero
        recipe={recipe}
        elapsedSeconds={0}
        totalDurationSeconds={180}
        isRunning={false}
        isFinished={false}
        weightUnit="imperial"
      />
    );

    expect(getAllByText(/oz/i).length).toBeGreaterThan(0);
    expect(getByText('1.06 oz')).toBeTruthy();
    expect(getByText('17.64 oz')).toBeTruthy();
  });

  it('renders metric units when weightUnit is metric', () => {
    const recipe = DEFAULT_PRESET_RECIPES[0];
    const { getByText } = render(
      <TimerHero
        recipe={recipe}
        elapsedSeconds={0}
        totalDurationSeconds={180}
        isRunning={false}
        isFinished={false}
        weightUnit="metric"
      />
    );

    expect(getByText(/500\.0 g/i)).toBeTruthy();
  });
});

describe('SpecsGrid Settings Unit Display', () => {
  it('formats water and temperature with provided units', () => {
    const { getByText } = render(
      <SpecsGrid
        totalWater={250}
        ratio={16.67}
        totalTimeSeconds={180}
        waterTempCelsius={94}
        weightUnit="imperial"
        temperatureUnit="fahrenheit"
      />
    );

    expect(getByText(/8\.82 oz/i)).toBeTruthy();
    expect(getByText('201°F')).toBeTruthy();
  });
});

describe('RecipeDetailScreen Settings Unit Display', () => {
  it('renders imperial and fahrenheit units from SettingsContext', () => {
    const mockContextValue = {
      settings: {
        weightUnit: 'imperial' as const,
        temperatureUnit: 'fahrenheit' as const,
        defaultTimerMode: 'free_brew' as const,
        dateFormat: 'locale' as const,
      },
      loading: false,
      updateSettings: vi.fn(),
      resetToDefaults: vi.fn(),
    };

    const { getByText, getAllByText } = render(
      <SettingsContext.Provider value={mockContextValue}>
        <RecipeDetailScreen recipeId={DEFAULT_PRESET_RECIPES[0].id} />
      </SettingsContext.Provider>
    );

    // V60 default water is 500g -> 17.64 oz, default temp is 98°C -> 208°F
    expect(getAllByText('17.64 oz').length).toBeGreaterThan(0);
    expect(getByText('208°F')).toBeDefined();
  });
});
