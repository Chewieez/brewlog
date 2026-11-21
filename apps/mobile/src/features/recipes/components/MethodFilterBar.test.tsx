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
    testID,
    accessibilityLabel,
    horizontal,
    showsHorizontalScrollIndicator,
    contentContainerStyle,
    ...props
  }: any) => (
    <div data-testid={testID} aria-label={accessibilityLabel} {...props}>
      {children}
    </div>
  ),
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

import { MethodFilterBar } from './MethodFilterBar';

describe('MethodFilterBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('derives unique methods from recipes and omits CUSTOM when no custom recipes exist', () => {
    const onSelect = vi.fn();
    const { getByTestId, getByText, queryByLabelText } = render(
      <MethodFilterBar
        recipes={DEFAULT_PRESET_RECIPES}
        selectedMethod="all"
        onSelectMethod={onSelect}
      />
    );

    expect(getByTestId('recipe-method-filters')).toBeDefined();
    expect(getByText('ALL')).toBeDefined();
    expect(queryByLabelText('Filter by custom')).toBeNull();
    expect(getByText('V60')).toBeDefined();
    expect(getByText('AEROPRESS')).toBeDefined();
  });

  it('includes CUSTOM pill when custom recipes exist', () => {
    const customRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      id: 'custom-1',
      name: 'My Custom V60',
      isPreset: false,
    };
    const { getByLabelText } = render(
      <MethodFilterBar
        recipes={[...DEFAULT_PRESET_RECIPES, customRecipe]}
        selectedMethod="all"
        onSelectMethod={vi.fn()}
      />
    );

    expect(getByLabelText('Filter by custom')).toBeDefined();
  });

  it('returns null when recipes is empty', () => {
    const { container } = render(
      <MethodFilterBar
        recipes={[]}
        selectedMethod="all"
        onSelectMethod={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('resets selectedMethod to all when selected method disappears from recipes', () => {
    const onSelect = vi.fn();
    const customRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      id: 'custom-1',
      name: 'My Custom V60',
      isPreset: false,
    };
    const { rerender } = render(
      <MethodFilterBar
        recipes={[...DEFAULT_PRESET_RECIPES, customRecipe]}
        selectedMethod="custom"
        onSelectMethod={onSelect}
      />
    );

    expect(onSelect).not.toHaveBeenCalled();

    rerender(
      <MethodFilterBar
        recipes={DEFAULT_PRESET_RECIPES}
        selectedMethod="custom"
        onSelectMethod={onSelect}
      />
    );

    expect(onSelect).toHaveBeenCalledWith('all');
  });

  it('triggers onSelectMethod when pill is pressed', () => {
    const onSelect = vi.fn();
    const { getByText } = render(
      <MethodFilterBar
        recipes={DEFAULT_PRESET_RECIPES}
        selectedMethod="all"
        onSelectMethod={onSelect}
      />
    );

    fireEvent.click(getByText('V60'));
    expect(onSelect).toHaveBeenCalledWith('v60');
  });
});
