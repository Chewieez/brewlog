/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { DEFAULT_PRESET_RECIPES, type BrewRecipe } from '@brewlog/core';

vi.mock('react-native', () => ({
  View: ({ children, style, testID, ...props }: any) => (
    <div data-testid={testID} {...props}>{children}</div>
  ),
  Text: ({ children, style, numberOfLines, ...props }: any) => <span {...props}>{children}</span>,
  ScrollView: ({
    children,
    style,
    testID,
    accessibilityLabel,
    horizontal,
    showsHorizontalScrollIndicator,
    contentContainerStyle,
    keyboardShouldPersistTaps,
    ...props
  }: any) => (
    <div data-testid={testID} aria-label={accessibilityLabel} {...props}>
      {children}
    </div>
  ),
  TextInput: ({
    value,
    onChangeText,
    placeholder,
    accessibilityLabel,
    placeholderTextColor,
    returnKeyType,
    style,
    ...props
  }: any) => (
    <input
      type="text"
      value={value}
      onChange={(e) => onChangeText?.(e.target.value)}
      placeholder={placeholder}
      aria-label={accessibilityLabel}
      {...props}
    />
  ),
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    hitSlop,
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
  ActivityIndicator: ({ testID, ...props }: any) => <div data-testid={testID} {...props} />,
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('lucide-react-native', () => ({
  Plus: () => null,
  Search: () => null,
  X: () => null,
}));

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useScrollToTop: vi.fn(),
}));

const mockRecipesContext = {
  recipes: DEFAULT_PRESET_RECIPES,
  customRecipes: [] as BrewRecipe[],
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

let activeRecipesContext = mockRecipesContext;

vi.mock('../RecipeContext', () => ({
  useRecipes: () => activeRecipesContext,
}));

import { RecipesCatalogScreen } from './RecipesCatalogScreen';

describe('RecipesCatalogScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecipesContext.loading = false;
    mockRecipesContext.recipes = DEFAULT_PRESET_RECIPES;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    activeRecipesContext = mockRecipesContext;
  });

  it('renders header, filter bar, and recipe cards', () => {
    const { getByText } = render(<RecipesCatalogScreen />);

    expect(getByText('Recipes')).toBeDefined();
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

  it('displays empty state card and hides filter bar when there are no recipes', () => {
    activeRecipesContext = {
      ...mockRecipesContext,
      recipes: [],
    };
    const { getByText, queryByTestId, queryByLabelText } = render(<RecipesCatalogScreen />);

    expect(queryByTestId('recipe-method-filters')).toBeNull();
    expect(getByText('No Recipes Found')).toBeDefined();
    expect(getByText('No recipes match the selected brew method filter.')).toBeDefined();
    expect(queryByLabelText('Clear search input')).toBeNull();
  });

  it('filters recipes by search query across name, author, description, and brewMethod', () => {
    const { getByLabelText, getByText, queryByText, getByTestId } = render(<RecipesCatalogScreen />);

    const searchInput = getByLabelText('Search recipes') as HTMLInputElement;

    // Author match
    fireEvent.change(searchInput, { target: { value: 'Hoffmann' } });
    expect(getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();
    expect(queryByText(DEFAULT_PRESET_RECIPES[1].name)).toBeNull();
    expect(queryByText(DEFAULT_PRESET_RECIPES[2].name)).toBeNull();
    expect(getByTestId('recipe-method-filters')).toBeDefined();

    // Description match
    fireEvent.change(searchInput, { target: { value: 'World Brewers Cup' } });
    expect(getByText(DEFAULT_PRESET_RECIPES[1].name)).toBeDefined();
    expect(queryByText(DEFAULT_PRESET_RECIPES[0].name)).toBeNull();

    // Brew method match
    fireEvent.change(searchInput, { target: { value: 'aeropress' } });
    expect(getByText(DEFAULT_PRESET_RECIPES[2].name)).toBeDefined();
    expect(queryByText(DEFAULT_PRESET_RECIPES[0].name)).toBeNull();

    // Whitespace-only query shows all recipes
    fireEvent.change(searchInput, { target: { value: '   ' } });
    expect(getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();
    expect(getByText(DEFAULT_PRESET_RECIPES[1].name)).toBeDefined();
    expect(getByText(DEFAULT_PRESET_RECIPES[2].name)).toBeDefined();
  });

  it('clears search text via the inline clear button', () => {
    const { getByLabelText, queryByLabelText, getByText, queryByText } = render(
      <RecipesCatalogScreen />
    );

    const searchInput = getByLabelText('Search recipes') as HTMLInputElement;
    expect(queryByLabelText('Clear search text')).toBeNull();

    fireEvent.change(searchInput, { target: { value: 'Kasuya' } });
    expect(queryByText(DEFAULT_PRESET_RECIPES[0].name)).toBeNull();

    fireEvent.click(getByLabelText('Clear search text'));
    expect(searchInput.value).toBe('');
    expect(getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();
    expect(getByText(DEFAULT_PRESET_RECIPES[1].name)).toBeDefined();
  });

  it('combines method filter with search query and recovers via CLEAR SEARCH while keeping method filter', () => {
    const { getByLabelText, getByText, queryByText } = render(<RecipesCatalogScreen />);

    fireEvent.click(getByLabelText('Filter by v60'));
    const searchInput = getByLabelText('Search recipes') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'AeroPress' } });

    expect(getByText('No Recipes Found')).toBeDefined();
    expect(getByText('No recipes match your search query.')).toBeDefined();
    expect(getByText('CLEAR SEARCH')).toBeDefined();

    fireEvent.click(getByLabelText('Clear search input'));

    expect(searchInput.value).toBe('');
    expect(getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();
    expect(queryByText(DEFAULT_PRESET_RECIPES[2].name)).toBeNull();
  });

  it('filters by custom recipes when present and resets to all if custom recipes disappear', () => {
    const customRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      id: 'custom-1',
      name: 'My Custom Pour',
      isPreset: false,
    };
    activeRecipesContext = {
      ...mockRecipesContext,
      recipes: [...DEFAULT_PRESET_RECIPES, customRecipe],
      customRecipes: [customRecipe],
    };

    const { getByLabelText, getByText, queryByText, queryByLabelText, rerender } = render(
      <RecipesCatalogScreen />
    );

    fireEvent.click(getByLabelText('Filter by custom'));
    expect(getByText('My Custom Pour')).toBeDefined();
    expect(queryByText(DEFAULT_PRESET_RECIPES[0].name)).toBeNull();

    activeRecipesContext = mockRecipesContext;
    rerender(<RecipesCatalogScreen />);

    expect(queryByLabelText('Filter by custom')).toBeNull();
    expect(getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();
  });

  it('renders Recipes title and NEW RECIPE inline without an in-screen ProfileHeaderButton', () => {
    const { getByTestId, queryByLabelText } = render(<RecipesCatalogScreen />);

    const titleRow = getByTestId('tab-screen-header-title-row');
    expect(titleRow.textContent).toContain('Recipes');
    expect(titleRow.textContent).toContain('NEW RECIPE');
    expect(queryByLabelText('Account profile')).toBeNull();
  });

  it('renders ActivityIndicator loading state when recipes are hydrating', () => {
    mockRecipesContext.loading = true;
    mockRecipesContext.recipes = [];
    const { getByTestId, queryByText } = render(<RecipesCatalogScreen />);

    expect(getByTestId('recipe-catalog-loading')).toBeDefined();
    expect(queryByText('No Recipes Found')).toBeNull();
  });
});
