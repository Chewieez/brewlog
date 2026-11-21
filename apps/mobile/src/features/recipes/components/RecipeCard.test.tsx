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
    onPressIn,
    onPressOut,
    pressRetentionOffset,
    accessibilityLabel,
    accessibilityRole,
    style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={onPress}
      onMouseDown={onPressIn}
      onMouseUp={onPressOut}
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

const flattenStyle = (style: any): Record<string, any> => {
  if (!style) return {};
  return Array.isArray(style)
    ? Object.assign({}, ...style.flat(Infinity).filter(Boolean))
    : { ...style };
};

let mockReducedMotion = false;

vi.mock('react-native-reanimated', () => ({
  default: {
    View: ({ children, style, testID, ...props }: any) => {
      const flat = flattenStyle(style);
      return (
        <div
          data-testid={testID}
          data-bg={flat.backgroundColor}
          data-border={flat.borderColor}
          data-scale={flat.transform?.[0]?.scale}
          data-transition={Array.isArray(flat.transitionProperty) ? flat.transitionProperty.join(',') : flat.transitionProperty}
          {...props}
        >
          {children}
        </div>
      );
    },
  },
  cubicBezier: () => 'cubic-bezier(0.23, 1, 0.32, 1)',
  useReducedMotion: () => mockReducedMotion,
}));

import { RecipeCard } from './RecipeCard';

describe('RecipeCard', () => {
  afterEach(() => {
    mockReducedMotion = false;
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

  it('applies pressed background, border, and 0.99 scale transition on press-in and respects reduced motion', () => {
    const recipe = DEFAULT_PRESET_RECIPES[0];
    const { getByRole, getByTestId, rerender } = render(
      <RecipeCard recipe={recipe} onPress={vi.fn()} />
    );

    const cardSurface = getByTestId('recipe-card-surface');
    expect(cardSurface.getAttribute('data-transition')).toBe(
      'backgroundColor,borderColor,transform'
    );
    expect(cardSurface.getAttribute('data-scale')).toBe('1');
    const restingBg = cardSurface.getAttribute('data-bg');
    const restingBorder = cardSurface.getAttribute('data-border');

    const button = getByRole('button', { name: `View recipe ${recipe.name}` });
    fireEvent.mouseDown(button);
    expect(cardSurface.getAttribute('data-bg')).not.toBe(restingBg);
    expect(cardSurface.getAttribute('data-border')).not.toBe(restingBorder);
    expect(cardSurface.getAttribute('data-border')).not.toBe('#d97736');
    expect(cardSurface.getAttribute('data-scale')).toBe('0.99');

    fireEvent.mouseUp(button);
    expect(cardSurface.getAttribute('data-bg')).toBe(restingBg);
    expect(cardSurface.getAttribute('data-border')).toBe(restingBorder);
    expect(cardSurface.getAttribute('data-scale')).toBe('1');

    mockReducedMotion = true;
    rerender(<RecipeCard recipe={recipe} onPress={vi.fn()} />);
    fireEvent.mouseDown(button);
    expect(cardSurface.getAttribute('data-bg')).not.toBe(restingBg);
    expect(cardSurface.getAttribute('data-scale')).toBe('1');
  });
});
