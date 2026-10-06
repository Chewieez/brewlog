/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { CuppingAttributes } from '@brewlog/core';
import { ScaAttributeScoring } from './ScaAttributeScoring';

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
    ...props
  }: {
    children?: React.ReactNode;
    style?: unknown;
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
  Minus: () => <span data-testid="minus-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
}));

const defaultScores: CuppingAttributes = {
  fragranceAroma: 8.0,
  flavor: 8.0,
  aftertaste: 8.0,
  acidity: 8.0,
  body: 8.0,
  balance: 8.0,
  uniformity: 10.0,
  cleanCup: 10.0,
  sweetness: 8.0,
  overall: 8.0,
};

describe('ScaAttributeScoring', () => {
  afterEach(cleanup);

  it('renders all 10 SCA attribute titles and live calculated score', () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <ScaAttributeScoring scores={defaultScores} onChange={onChange} />
    );

    expect(getByText('Fragrance / Aroma')).toBeTruthy();
    expect(getByText('Flavor')).toBeTruthy();
    expect(getByText('Aftertaste')).toBeTruthy();
    expect(getByText('Acidity')).toBeTruthy();
    expect(getByText('Body')).toBeTruthy();
    expect(getByText('Balance')).toBeTruthy();
    expect(getByText('Uniformity')).toBeTruthy();
    expect(getByText('Clean Cup')).toBeTruthy();
    expect(getByText('Sweetness')).toBeTruthy();
    expect(getByText('Overall')).toBeTruthy();
    expect(getByText('84.0')).toBeTruthy();
  });

  it('increments and decrements attribute values', () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <ScaAttributeScoring scores={defaultScores} onChange={onChange} />
    );

    const incrementAroma = getByLabelText('Increase Fragrance / Aroma');
    fireEvent.click(incrementAroma);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fragranceAroma: 8.25,
      })
    );

    const decrementFlavor = getByLabelText('Decrease Flavor');
    fireEvent.click(decrementFlavor);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        flavor: 7.75,
      })
    );
  });

  it('handles Baseline (82.5) preset', () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <ScaAttributeScoring scores={defaultScores} onChange={onChange} />
    );

    const baselineBtn = getByText('Baseline (82.5)');
    fireEvent.click(baselineBtn);

    expect(onChange).toHaveBeenCalledWith({
      fragranceAroma: 7.5,
      flavor: 7.5,
      aftertaste: 7.5,
      acidity: 7.5,
      body: 7.5,
      balance: 7.5,
      uniformity: 10.0,
      cleanCup: 10.0,
      sweetness: 10.0,
      overall: 7.5,
    });
  });

  it('handles Clear (0) preset', () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <ScaAttributeScoring scores={defaultScores} onChange={onChange} />
    );

    const clearBtn = getByText('Clear (0)');
    fireEvent.click(clearBtn);

    expect(onChange).toHaveBeenCalledWith({
      fragranceAroma: 0,
      flavor: 0,
      aftertaste: 0,
      acidity: 0,
      body: 0,
      balance: 0,
      uniformity: 0,
      cleanCup: 0,
      sweetness: 0,
      overall: 0,
    });
  });
});
