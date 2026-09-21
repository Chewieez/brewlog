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

import { MethodFilterBar } from './MethodFilterBar';

describe('MethodFilterBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('derives unique methods from recipes list and always includes ALL and CUSTOM', () => {
    const onSelect = vi.fn();
    const { getByText } = render(
      <MethodFilterBar
        recipes={DEFAULT_PRESET_RECIPES}
        selectedMethod="all"
        onSelectMethod={onSelect}
      />
    );

    expect(getByText('ALL')).toBeDefined();
    expect(getByText('CUSTOM')).toBeDefined();
    expect(getByText('V60')).toBeDefined();
    expect(getByText('AEROPRESS')).toBeDefined();
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
