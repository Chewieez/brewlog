/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { FlavorTagSelector } from './FlavorTagSelector';

let mockWindowWidth = 375;

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
    accessibilityRole,
    accessibilityLabel,
    hitSlop,
    style,
    ...props
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    hitSlop?: unknown;
    style?: unknown;
    [key: string]: unknown;
  }) => (
    <button
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      onClick={onPress}
      data-hitslop={JSON.stringify(hitSlop)}
      {...props}
    >
      {children}
    </button>
  ),
  ScrollView: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <div>{children}</div>
  ),
  useWindowDimensions: () => ({ width: mockWindowWidth, height: 812 }),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  X: () => <span data-testid="x-icon" />,
}));

vi.mock('./ScaFlavorWheelSvg', () => ({
  ScaFlavorWheelSvg: () => <div data-testid="sca-flavor-wheel-svg">Wheel SVG</div>,
}));

describe('FlavorTagSelector', () => {
  afterEach(() => {
    cleanup();
    mockWindowWidth = 375;
  });

  it('defaults to tag list mode on mobile screens (width < 600)', () => {
    mockWindowWidth = 390;
    const { getByText, queryByTestId } = render(
      <FlavorTagSelector selectedTags={[]} onToggleTag={vi.fn()} />
    );

    expect(getByText('TAG LIST')).toBeTruthy();
    expect(queryByTestId('sca-flavor-wheel-svg')).toBeNull();
  });

  it('defaults to wheel mode on tablet screens (width >= 600)', () => {
    mockWindowWidth = 768;
    const { getByTestId } = render(
      <FlavorTagSelector selectedTags={[]} onToggleTag={vi.fn()} />
    );

    expect(getByTestId('sca-flavor-wheel-svg')).toBeTruthy();
  });

  it('provides >= 44pt touch target via hitSlop vertical padding of 6 on tag chips', () => {
    mockWindowWidth = 390;
    const { getAllByRole } = render(
      <FlavorTagSelector selectedTags={[]} onToggleTag={vi.fn()} />
    );

    const buttons = getAllByRole('button');
    const chipButton = buttons.find((btn) =>
      btn.getAttribute('aria-label')?.startsWith('Toggle flavor tag')
    );
    expect(chipButton).toBeTruthy();
    const hitSlop = JSON.parse(chipButton?.getAttribute('data-hitslop') || '{}');
    expect(hitSlop.top).toBe(6);
    expect(hitSlop.bottom).toBe(6);
  });

  it('calls onToggleTag when chip is clicked', () => {
    mockWindowWidth = 390;
    const onToggleTag = vi.fn();
    const { getByRole } = render(
      <FlavorTagSelector selectedTags={['Blackberry']} onToggleTag={onToggleTag} />
    );

    fireEvent.click(getByRole('button', { name: 'Toggle flavor tag Blackberry' }));
    expect(onToggleTag).toHaveBeenCalledWith('Blackberry');

    fireEvent.click(getByRole('button', { name: 'Remove tag Blackberry' }));
    expect(onToggleTag).toHaveBeenCalledWith('Blackberry');
  });
});
