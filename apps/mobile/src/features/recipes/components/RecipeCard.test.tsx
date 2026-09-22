/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, numberOfLines, ...props }: any) => <span {...props}>{children}</span>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  ),
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

import { RecipeCard } from './RecipeCard';

describe('RecipeCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders recipe metadata, method badge, and preset indicator', () => {
    const recipe = DEFAULT_PRESET_RECIPES[0];
    const onPress = vi.fn();
    const { getByText } = render(<RecipeCard recipe={recipe} onPress={onPress} />);

    expect(getByText(recipe.name)).toBeDefined();
    expect(getByText(recipe.brewMethod.toUpperCase())).toBeDefined();
    expect(getByText('PRESET')).toBeDefined();
    expect(getByText(`${recipe.coffeeDoseGrams}g`)).toBeDefined();
    expect(getByText(`1:${recipe.ratio}`)).toBeDefined();
  });

  it('renders CUSTOM badge when recipe is user-created', () => {
    const customRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      id: 'custom-123',
      isPreset: false,
      author: 'Barista Bob',
    };
    const { getByText } = render(<RecipeCard recipe={customRecipe} onPress={vi.fn()} />);

    expect(getByText('CUSTOM')).toBeDefined();
    expect(getByText('by Barista Bob')).toBeDefined();
  });

  it('triggers onPress with the recipe when tapped', () => {
    const recipe = DEFAULT_PRESET_RECIPES[0];
    const onPress = vi.fn();
    const { getByText } = render(<RecipeCard recipe={recipe} onPress={onPress} />);

    fireEvent.click(getByText(recipe.name));
    expect(onPress).toHaveBeenCalledWith(recipe);
  });
});
