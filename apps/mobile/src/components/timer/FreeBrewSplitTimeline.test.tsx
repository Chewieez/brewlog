/** @vitest-environment jsdom */
import React from 'react';
import { render, fireEvent as rtlFireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BrewSplit } from '@brewlog/core';
import { FreeBrewSplitTimeline, styles } from './FreeBrewSplitTimeline';

vi.mock('react-native', () => ({
  View: ({
    children,
    style: _style,
    ...props
  }: React.PropsWithChildren<{ style?: unknown; [key: string]: unknown }>) => (
    <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
  ),
  Text: ({
    children,
    style: _style,
    numberOfLines: _numberOfLines,
    ...props
  }: React.PropsWithChildren<{
    style?: unknown;
    numberOfLines?: number;
    [key: string]: unknown;
  }>) => (
    <span {...(props as React.HTMLAttributes<HTMLSpanElement>)}>{children}</span>
  ),
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    disabled,
    style: _style,
    hitSlop: _hitSlop,
    ...props
  }: React.PropsWithChildren<{
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    disabled?: boolean;
    style?: unknown;
    hitSlop?: unknown;
    [key: string]: unknown;
  }>) => (
    <button
      type="button"
      onClick={disabled ? undefined : onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      disabled={disabled}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  ),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(stylesObj: T): T => stylesObj,
  },
}));

vi.mock('lucide-react-native', () => ({
  Trash2: () => <span data-testid="icon-trash" />,
}));

const fireEvent = {
  ...rtlFireEvent,
  press: (element: Element | Node | Document | Window) => {
    rtlFireEvent.click(element);
  },
};

describe('FreeBrewSplitTimeline', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders empty state message when splits array is empty', () => {
    const { getByText } = render(
      <FreeBrewSplitTimeline splits={[]} onRemoveSplit={vi.fn()} />
    );
    expect(getByText(/No splits recorded yet/i)).toBeTruthy();
  });

  it('renders chronological splits with tag labels and interval times', () => {
    const splits: BrewSplit[] = [
      { id: 's1', second: 45, intervalSeconds: 45, label: 'Bloom', tag: 'bloom' },
      { id: 's2', second: 95, intervalSeconds: 50, label: 'Pour 1', tag: 'pour' },
    ];
    const onRemoveSplit = vi.fn();

    const { getByText, getByLabelText } = render(
      <FreeBrewSplitTimeline splits={splits} onRemoveSplit={onRemoveSplit} />
    );

    expect(getByText('Bloom')).toBeTruthy();
    expect(getByText('00:45')).toBeTruthy();
    expect(getByText('+45s')).toBeTruthy();

    expect(getByText('Pour 1')).toBeTruthy();
    expect(getByText('01:35')).toBeTruthy();
    expect(getByText('+50s')).toBeTruthy();

    // Click delete on first split
    fireEvent.press(getByLabelText('Delete split Bloom'));
    expect(onRemoveSplit).toHaveBeenCalledWith('s1');
  });

  it('renders header with recorded splits count', () => {
    const splits: BrewSplit[] = [
      { id: 's1', second: 30, intervalSeconds: 30, label: 'Bloom', tag: 'bloom' },
    ];
    const { getByText } = render(
      <FreeBrewSplitTimeline splits={splits} onRemoveSplit={vi.fn()} />
    );
    expect(getByText('RECORDED SPLITS')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });

  it('enforces Apple HIG 44x44pt minimum touch target on delete button', () => {
    expect(styles.deleteButton.minHeight).toBeGreaterThanOrEqual(44);
    expect(styles.deleteButton.minWidth).toBeGreaterThanOrEqual(44);
    expect(styles.deleteButton.justifyContent).toBe('center');
    expect(styles.deleteButton.alignItems).toBe('center');
  });

  it('renders tag badges for drawdown and custom tags correctly', () => {
    const splits: BrewSplit[] = [
      { id: 's1', second: 120, intervalSeconds: 25, label: 'Swirl', tag: 'drawdown' },
      { id: 's2', second: 150, intervalSeconds: 30, label: 'Finish' },
    ];
    const { getByText } = render(
      <FreeBrewSplitTimeline splits={splits} onRemoveSplit={vi.fn()} />
    );

    expect(getByText('DRAWDOWN')).toBeTruthy();
    expect(getByText('CUSTOM')).toBeTruthy();
  });
});

