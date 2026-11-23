/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { TastingLog, DEFAULT_USER_SETTINGS } from '@brewlog/core';
import { ReviewCard } from './ReviewCard';
import { SettingsContext } from '../../settings/SettingsContext';

vi.mock('react-native', () => ({
  View: ({
    children,
    style,
    testID,
    accessibilityRole,
    accessibilityLabel,
    ...props
  }: {
    children?: React.ReactNode;
    style?: unknown;
    testID?: string;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    [key: string]: unknown;
  }) => (
    <div data-testid={testID} role={accessibilityRole} aria-label={accessibilityLabel} {...props}>
      {children}
    </div>
  ),
  Text: ({
    children,
    style,
    numberOfLines,
    testID,
    ...props
  }: {
    children?: React.ReactNode;
    style?: unknown;
    numberOfLines?: number;
    testID?: string;
    [key: string]: unknown;
  }) => (
    <span data-testid={testID} {...props}>
      {children}
    </span>
  ),
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
  flavorTags: ['Jasmine', 'Peach', 'Bergamot', 'Honey'],
  notes: 'Floral and vibrant',
  wouldBrewAgain: true,
  createdAt: '2026-09-02T10:05:00.000Z',
};

describe('ReviewCard (mobile)', () => {
  afterEach(cleanup);

  it('renders aligned 5-part hierarchy with tier badge, 3 tags + overflow, notes, and telemetry footer', () => {
    const onPress = vi.fn();
    const { getByTestId, queryByText } = render(
      <ReviewCard review={mockReview} onPress={onPress} />
    );

    const header = getByTestId('review-card-header');
    const identity = getByTestId('review-card-identity');
    const tags = getByTestId('review-card-tags');
    const notes = getByTestId('review-card-notes');
    const footer = getByTestId('review-card-footer');

    expect(header.compareDocumentPosition(identity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(identity.compareDocumentPosition(tags) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tags.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notes.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(header.textContent).toContain('5');
    expect(header.textContent).toContain('90.0');
    expect(header.textContent).toContain('Outstanding');

    expect(identity.textContent).toContain('Worka Sakaro Anaerobic');
    expect(identity.textContent).toContain('Sey Coffee');

    expect(tags.textContent).toContain('Jasmine');
    expect(tags.textContent).toContain('Peach');
    expect(tags.textContent).toContain('Bergamot');
    expect(tags.textContent).toContain('+1');

    expect(notes.textContent).toContain('Floral and vibrant');

    expect(footer.textContent).toContain('V60');
    expect(footer.textContent).toContain('20g:300g');

    expect(queryByText(/Fellow Ode Gen 2/)).toBeNull();
    expect(queryByText(/18 clicks/)).toBeNull();
    expect(queryByText(/Hario V60 02/)).toBeNull();
  });

  it('renders 0.0 and Commercial badge for unscored reviews and omits empty notes/tags', () => {
    const unscoredReview: TastingLog = {
      ...mockReview,
      calculatedScaScore: 0,
      rating: 0,
      flavorTags: [],
      notes: '',
    };

    const { getByTestId, queryByTestId } = render(
      <ReviewCard review={unscoredReview} onPress={vi.fn()} />
    );

    const header = getByTestId('review-card-header');
    expect(header.textContent).toContain('0.0');
    expect(header.textContent).toContain('Commercial');
    expect(queryByTestId('review-card-tags')).toBeNull();
    expect(queryByTestId('review-card-notes')).toBeNull();
  });

  it('triggers onPress when pressed', () => {
    const onPress = vi.fn();
    const { getByRole } = render(
      <ReviewCard review={mockReview} onPress={onPress} />
    );

    fireEvent.click(getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(mockReview);
  });

  it('formats brewDate using formatDisplayDate and SettingsContext', () => {
    const onPress = vi.fn();
    const mockContext = {
      settings: { ...DEFAULT_USER_SETTINGS, dateFormat: 'YYYY-MM-DD' as const },
      loading: false,
      updateSettings: vi.fn(),
      resetToDefaults: vi.fn(),
    };

    const { getByTestId } = render(
      <SettingsContext.Provider value={mockContext}>
        <ReviewCard review={mockReview} onPress={onPress} />
      </SettingsContext.Provider>
    );

    expect(getByTestId('review-card-footer').textContent).toContain('2026-09-02');
  });
});
