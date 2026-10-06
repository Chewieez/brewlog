/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ReviewsSummaryBar } from './ReviewsSummaryBar';

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
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}));

describe('ReviewsSummaryBar', () => {
  afterEach(cleanup);

  it('renders total reviews, average SCA score, and top flavor note', () => {
    const { getByText } = render(
      <ReviewsSummaryBar
        totalReviews={12}
        averageScaScore={88.4}
        topFlavorNote="JASMINE"
      />
    );

    expect(getByText('TOTAL REVIEWS')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
    expect(getByText('AVG SCA SCORE')).toBeTruthy();
    expect(getByText('88.4')).toBeTruthy();
    expect(getByText('TOP NOTE')).toBeTruthy();
    expect(getByText('JASMINE')).toBeTruthy();
  });

  it('renders placeholder -- when no reviews exist', () => {
    const { getByText, getAllByText } = render(
      <ReviewsSummaryBar
        totalReviews={0}
        averageScaScore={0}
      />
    );

    expect(getByText('0')).toBeTruthy();
    const dashes = getAllByText('--');
    expect(dashes).toHaveLength(2);
  });

  it('renders placeholder -- when reviews exist but all are unscored (averageScaScore is 0)', () => {
    const { getByText, getAllByText } = render(
      <ReviewsSummaryBar
        totalReviews={3}
        averageScaScore={0}
      />
    );

    expect(getByText('3')).toBeTruthy();
    expect(getAllByText('--')).toHaveLength(2);
  });
});

