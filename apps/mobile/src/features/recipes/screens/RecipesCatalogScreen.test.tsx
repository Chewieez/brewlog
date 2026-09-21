/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, numberOfLines, ...props }: any) => <span {...props}>{children}</span>,
  ScrollView: ({
    children,
    style,
    horizontal,
    showsHorizontalScrollIndicator,
    contentContainerStyle,
    ...props
  }: any) => <div {...props}>{children}</div>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      aria-selected={accessibilityState?.selected}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  ),
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  Plus: () => null,
}));

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockRecipesContext = {
  recipes: DEFAULT_PRESET_RECIPES,
  customRecipes: [],
  presets: DEFAULT_PRESET_RECIPES,
  loading: false,
  activeTimerRecipe: DEFAULT_PRESET_RECIPES[0],
  activeTimerDose: 15,
  addRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
  setActiveTimerRecipe: vi.fn(),
  refreshRecipes: vi.fn(),
};

vi.mock('../RecipeContext', () => ({
  useRecipes: () => mockRecipesContext,
}));

import { RecipesCatalogScreen } from './RecipesCatalogScreen';

describe('RecipesCatalogScreen', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders header, filter bar, and recipe cards', () => {
    const { getByText } = render(<RecipesCatalogScreen />);

    expect(getByText('RECIPE CATALOG')).toBeDefined();
    expect(getByText('Curated Brew Profiles')).toBeDefined();
    expect(getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();
  });

  it('navigates to /recipe/[id] when a recipe card is pressed', () => {
    const { getByText } = render(<RecipesCatalogScreen />);
    fireEvent.click(getByText(DEFAULT_PRESET_RECIPES[0].name));

    expect(mockPush).toHaveBeenCalledWith(`/recipe/${DEFAULT_PRESET_RECIPES[0].id}`);
  });

  it('navigates to /recipe/builder when New Recipe button is pressed', () => {
    const { getByLabelText } = render(<RecipesCatalogScreen />);
    fireEvent.click(getByLabelText('Create new custom recipe'));

    expect(mockPush).toHaveBeenCalledWith('/recipe/builder');
  });

  it('filters recipes by method when filter pill is selected', () => {
    const { getByLabelText, getByText, queryByText } = render(<RecipesCatalogScreen />);
    fireEvent.click(getByLabelText('Filter by aeropress'));

    expect(getByText(DEFAULT_PRESET_RECIPES[2].name)).toBeDefined();
    expect(queryByText(DEFAULT_PRESET_RECIPES[0].name)).toBeNull();
  });

  it('displays empty state card when filter matches no recipes', () => {
    const { getByLabelText, getByText } = render(<RecipesCatalogScreen />);
    // Filter by custom recipes when there are none
    fireEvent.click(getByLabelText('Filter by custom'));

    expect(getByText('No Recipes Found')).toBeDefined();
    expect(getByText('No recipes match the selected brew method filter.')).toBeDefined();
  });
});
