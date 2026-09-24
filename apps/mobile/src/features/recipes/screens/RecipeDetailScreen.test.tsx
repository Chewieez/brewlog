/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { Alert } from 'react-native';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { RecipeDetailScreen } from './RecipeDetailScreen';

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, numberOfLines, ...props }: any) => <span {...props}>{children}</span>,
  ScrollView: ({
    children,
    style,
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
  TextInput: ({
    defaultValue,
    value,
    onChangeText,
    onEndEditing,
    accessibilityLabel,
    keyboardType: _keyboardType,
    ...props
  }: any) => (
    <input
      defaultValue={defaultValue}
      value={value}
      aria-label={accessibilityLabel}
      onChange={(e) => onChangeText?.(e.target.value)}
      onBlur={(e) => onEndEditing?.({ nativeEvent: { text: e.target.value } })}
      {...props}
    />
  ),
  Alert: {
    alert: vi.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  Play: () => null,
  Copy: () => null,
  Edit2: () => null,
  Trash2: () => null,
  Minus: () => null,
  Plus: () => null,
  Droplets: () => null,
  BookOpen: () => null,
  Clock: () => null,
  Thermometer: () => null,
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({ id: DEFAULT_PRESET_RECIPES[0].id }),
}));

const mockSetActiveTimerRecipe = vi.fn();
const mockDeleteRecipe = vi.fn();

const mockContext = {
  recipes: [...DEFAULT_PRESET_RECIPES],
  customRecipes: [],
  presets: DEFAULT_PRESET_RECIPES,
  loading: false,
  activeTimerRecipe: DEFAULT_PRESET_RECIPES[0],
  activeTimerDose: 15,
  addRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: mockDeleteRecipe,
  setActiveTimerRecipe: mockSetActiveTimerRecipe,
  refreshRecipes: vi.fn(),
};

vi.mock('../RecipeContext', () => ({
  useRecipes: () => mockContext,
}));

describe('RecipeDetailScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContext.recipes = [...DEFAULT_PRESET_RECIPES];
  });

  afterEach(() => {
    cleanup();
  });

  it('renders recipe title, method, and action buttons', () => {
    const { getByText } = render(<RecipeDetailScreen recipeId={DEFAULT_PRESET_RECIPES[0].id} />);

    expect(getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();
    expect(getByText('BREW WITH THIS RECIPE')).toBeDefined();
    expect(getByText('DUPLICATE AS CUSTOM')).toBeDefined();
  });

  it('hands off scaled recipe to timer and navigates to tabs when Brew With This Recipe is clicked', () => {
    const { getByText } = render(<RecipeDetailScreen recipeId={DEFAULT_PRESET_RECIPES[0].id} />);

    fireEvent.click(getByText('BREW WITH THIS RECIPE'));

    expect(mockSetActiveTimerRecipe).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('navigates to builder with duplicateId parameter when Duplicate is clicked', () => {
    const { getByText } = render(<RecipeDetailScreen recipeId={DEFAULT_PRESET_RECIPES[0].id} />);

    fireEvent.click(getByText('DUPLICATE AS CUSTOM'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recipe/builder',
      params: { duplicateId: DEFAULT_PRESET_RECIPES[0].id },
    });
  });

  it('shows Edit and Delete buttons for custom recipes, and prompts confirmation before delete', async () => {
    const customRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      id: 'local-rec-999',
      isPreset: false,
      name: 'My Custom V60',
    };
    mockContext.recipes = [customRecipe, ...DEFAULT_PRESET_RECIPES];

    const alertSpy = vi.spyOn(Alert, 'alert');
    const { getByText } = render(<RecipeDetailScreen recipeId="local-rec-999" />);

    expect(getByText('EDIT RECIPE')).toBeDefined();
    const deleteBtn = getByText('DELETE RECIPE');
    expect(deleteBtn).toBeDefined();

    fireEvent.click(deleteBtn);
    expect(alertSpy).toHaveBeenCalled();

    const alertArgs = alertSpy.mock.calls[0];
    expect(alertArgs[0]).toBe('Delete Recipe?');
    const buttons = alertArgs[2] as any[];
    const deleteAction = buttons.find((b) => b.text === 'Delete');
    await deleteAction.onPress();
    expect(mockDeleteRecipe).toHaveBeenCalledWith('local-rec-999');
    expect(mockBack).toHaveBeenCalled();
  });

  it('navigates to builder with editId parameter when Edit Recipe is clicked', () => {
    const customRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      id: 'local-rec-999',
      isPreset: false,
      name: 'My Custom V60',
    };
    mockContext.recipes = [customRecipe, ...DEFAULT_PRESET_RECIPES];

    const { getByText } = render(<RecipeDetailScreen recipeId="local-rec-999" />);
    fireEvent.click(getByText('EDIT RECIPE'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recipe/builder',
      params: { editId: 'local-rec-999' },
    });
  });

  it('renders not-found state and navigates back when recipe does not exist', () => {
    const { getByText } = render(<RecipeDetailScreen recipeId="non-existent-id" />);

    expect(getByText('Recipe Not Found')).toBeDefined();
    fireEvent.click(getByText('RETURN TO CATALOG'));
    expect(mockBack).toHaveBeenCalled();
  });
});
