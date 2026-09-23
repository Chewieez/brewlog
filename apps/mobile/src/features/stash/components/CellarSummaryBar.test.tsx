/** @vitest-environment jsdom */
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CellarSummaryBar } from './CellarSummaryBar';

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
    <div
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      {...props}
    >
      {children}
    </div>
  ),
  Text: ({
    children,
    style,
    ...props
  }: {
    children?: React.ReactNode;
    style?: unknown;
    [key: string]: unknown;
  }) => (
    <span {...props}>{children}</span>
  ),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}));

describe('CellarSummaryBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders total bags, peak bags count, and total remaining grams', () => {
    const { getByText } = render(
      <CellarSummaryBar totalBags={5} peakBags={3} totalRemainingGrams={980} />
    );

    expect(getByText('5')).toBeDefined();
    expect(getByText('ACTIVE BAGS')).toBeDefined();
    expect(getByText('3')).toBeDefined();
    expect(getByText('AT PEAK')).toBeDefined();
    expect(getByText('980g')).toBeDefined();
    expect(getByText('TOTAL STASH')).toBeDefined();
  });

  it('renders correctly with zero values', () => {
    const { getByText, getAllByText } = render(
      <CellarSummaryBar totalBags={0} peakBags={0} totalRemainingGrams={0} />
    );

    expect(getAllByText('0')).toHaveLength(2);
    expect(getByText('ACTIVE BAGS')).toBeDefined();
    expect(getByText('AT PEAK')).toBeDefined();
    expect(getByText('0g')).toBeDefined();
    expect(getByText('TOTAL STASH')).toBeDefined();
  });
});
