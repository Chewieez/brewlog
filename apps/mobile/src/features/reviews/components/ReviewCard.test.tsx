/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { TastingLog } from '@brewlog/core';
import { ReviewCard } from './ReviewCard';

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
  }) => <span {...props}>{children}</span>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    style,
    disabled,
    hitSlop,
    ...props
  }: {
    children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
    onPress?: (e?: any) => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityState?: unknown;
    style?: unknown;
    disabled?: boolean;
    hitSlop?: unknown;
    [key: string]: unknown;
  }) => (
    <div
      role={accessibilityRole || 'button'}
      aria-label={accessibilityLabel}
      onClick={(e) => {
        onPress?.(e);
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
  Star: () => <span data-testid="star-icon" />,
}));

const mockReview: TastingLog = {
  id: 'rev-test-1',
  beanNameSnapshot: 'Worka Sakaro Anaerobic',
  roasterSnapshot: 'Sey Coffee',
  recipeNameSnapshot: 'Ultimate V60',
  brewMethod: 'v60',
  brewDate: '2026-09-02T10:00:00.000Z',
  coffeeDoseGrams: 20,
  waterAmountGrams: 300,
  actualTimeSeconds: 210,
  grindSetting: '18 clicks',
  waterTempCelsius: 94,
  grinderSnapshot: 'Fellow Ode Gen 2',
  brewerSnapshot: 'Hario V60 02',
  scores: {
    fragranceAroma: 9.0,
    flavor: 9.0,
    aftertaste: 8.5,
    acidity: 9.0,
    body: 8.0,
    balance: 8.5,
    uniformity: 10.0,
    cleanCup: 10.0,
    sweetness: 9.0,
    overall: 9.0,
  },
  calculatedScaScore: 90.0,
  rating: 5,
  flavorTags: ['Jasmine', 'Peach', 'Bergamot'],
  notes: 'Floral and vibrant',
  wouldBrewAgain: true,
  createdAt: '2026-09-02T10:05:00.000Z',
};

describe('ReviewCard', () => {
  afterEach(cleanup);

  it('renders coffee name, roaster, brew method, and rating', () => {
    const onPress = vi.fn();
    const { getByText } = render(
      <ReviewCard review={mockReview} onPress={onPress} />
    );

    expect(getByText('Worka Sakaro Anaerobic')).toBeTruthy();
    expect(getByText('SEY COFFEE')).toBeTruthy();
    expect(getByText('V60')).toBeTruthy();
    expect(getByText('90.0')).toBeTruthy();
  });

  it('renders equipment snapshot and grind setting', () => {
    const onPress = vi.fn();
    const { getByText } = render(
      <ReviewCard review={mockReview} onPress={onPress} />
    );

    expect(getByText(/Fellow Ode Gen 2/)).toBeTruthy();
    expect(getByText(/18 clicks/)).toBeTruthy();
    expect(getByText(/Hario V60 02/)).toBeTruthy();
  });

  it('renders flavor tags', () => {
    const onPress = vi.fn();
    const { getByText } = render(
      <ReviewCard review={mockReview} onPress={onPress} />
    );

    expect(getByText('Jasmine')).toBeTruthy();
    expect(getByText('Peach')).toBeTruthy();
    expect(getByText('Bergamot')).toBeTruthy();
  });

  it('triggers onPress when pressed', () => {
    const onPress = vi.fn();
    const { getByRole } = render(
      <ReviewCard review={mockReview} onPress={onPress} />
    );

    fireEvent.click(getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(mockReview);
  });
});
