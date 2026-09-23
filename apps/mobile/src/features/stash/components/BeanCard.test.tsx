/** @vitest-environment jsdom */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BeanCard } from './BeanCard';
import { Bean } from '@brewlog/core';

vi.mock('react-native', () => ({
  View: ({
    children,
    style,
    accessibilityRole,
    accessibilityLabel,
    ...props
  }: {
    children?: React.ReactNode;
    style?: unknown;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    [key: string]: unknown;
  }) => (
    <div role={accessibilityRole} aria-label={accessibilityLabel} {...props}>
      {children}
    </div>
  ),
  Text: ({
    children,
    style,
    numberOfLines,
    ...props
  }: {
    children?: React.ReactNode;
    style?: unknown;
    numberOfLines?: number;
    [key: string]: unknown;
  }) => (
    <span {...props}>{children}</span>
  ),
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    style,
    disabled,
    hitSlop,
    ...props
  }: {
    children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    style?: unknown;
    disabled?: boolean;
    hitSlop?: unknown;
    [key: string]: unknown;
  }) => (
    <div
      role={accessibilityRole || 'button'}
      aria-label={accessibilityLabel}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          onPress?.();
        }
      }}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </div>
  ),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  Star: ({ color, fill, size }: { color?: string; fill?: string; size?: number }) => (
    <span data-testid="star-icon" data-color={color} data-fill={fill} data-size={size} />
  ),
}));

describe('BeanCard', () => {
  afterEach(() => {
    cleanup();
  });

  const bean: Bean = {
    id: 'b-1',
    roaster: 'Sey',
    name: 'Worka Sakaro',
    originCountry: 'Ethiopia',
    process: 'washed',
    roastLevel: 'light',
    roastDate: '2026-09-12',
    bagWeightGrams: 250,
    remainingGrams: 200,
    flavorNotes: ['Jasmine', 'Peach'],
    createdAt: '2026-09-01T00:00:00Z',
  };

  it('renders bean details, resting badge, and remaining weight', () => {
    const { getByText } = render(
      <BeanCard bean={bean} onPress={() => {}} onBrew={() => {}} onToggleFavorite={() => {}} />
    );

    expect(getByText('SEY')).toBeDefined();
    expect(getByText('Worka Sakaro')).toBeDefined();
    expect(getByText('Ethiopia')).toBeDefined();
    expect(getByText('washed')).toBeDefined();
    expect(getByText(/Peak Window/)).toBeDefined();
    expect(getByText(/200g \/ 250g/)).toBeDefined();
  });

  it('triggers onBrew callback when BREW button is pressed', () => {
    const onBrew = vi.fn();
    const { getByText } = render(
      <BeanCard bean={bean} onPress={() => {}} onBrew={onBrew} onToggleFavorite={() => {}} />
    );

    fireEvent.click(getByText('BREW'));
    expect(onBrew).toHaveBeenCalledWith(bean);
  });

  it('triggers onPress callback when card body is pressed', () => {
    const onPress = vi.fn();
    const { getByLabelText } = render(
      <BeanCard bean={bean} onPress={onPress} onBrew={() => {}} onToggleFavorite={() => {}} />
    );

    fireEvent.click(getByLabelText(`View bean ${bean.name}`));
    expect(onPress).toHaveBeenCalledWith(bean);
  });

  it('triggers onToggleFavorite callback when star button is pressed', () => {
    const onToggleFavorite = vi.fn();
    const { getByLabelText } = render(
      <BeanCard bean={bean} onPress={() => {}} onBrew={() => {}} onToggleFavorite={onToggleFavorite} />
    );

    fireEvent.click(getByLabelText('Add to favorites'));
    expect(onToggleFavorite).toHaveBeenCalledWith(bean);
  });

  it('renders frozen badge when bean is frozen', () => {
    const frozenBean: Bean = {
      ...bean,
      isFrozen: true,
      frozenDate: '2026-09-15',
    };
    const { getByText } = render(
      <BeanCard bean={frozenBean} onPress={() => {}} onBrew={() => {}} onToggleFavorite={() => {}} />
    );

    expect(getByText(/Frozen at Day/)).toBeDefined();
  });

  it('handles low remaining weight (< 40g)', () => {
    const lowWeightBean: Bean = {
      ...bean,
      remainingGrams: 22,
    };
    const { getByText } = render(
      <BeanCard bean={lowWeightBean} onPress={() => {}} onBrew={() => {}} onToggleFavorite={() => {}} />
    );

    expect(getByText(/22g \/ 250g/)).toBeDefined();
  });
});
