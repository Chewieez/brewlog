/** @vitest-environment jsdom */
import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EquipmentCard } from './EquipmentCard';
import { Equipment } from '@brewlog/core';

vi.mock('react-native', () => ({
  View: ({
    children,
    accessibilityRole,
    accessibilityLabel,
    ...props
  }: {
    children?: React.ReactNode;
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
    numberOfLines,
    ...props
  }: {
    children?: React.ReactNode;
    numberOfLines?: number;
    [key: string]: unknown;
  }) => <span {...props}>{children}</span>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    hitSlop,
    ...props
  }: {
    children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
    onPress?: (e?: any) => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
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
  Star: ({ color, fill }: { color?: string; fill?: string }) => (
    <span data-testid="star-icon" data-color={color} data-fill={fill} />
  ),
}));

const mockEquipment: Equipment = {
  id: 'eq-test-1',
  type: 'grinder',
  brand: 'Fellow',
  model: 'Ode Gen 2',
  subType: 'flat-burr',
  settingScaleType: 'stepped-numbers',
  isFavorite: true,
  notes: '64mm burrs calibrated at 1 chirp',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('EquipmentCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders brand, model, badges, and notes', () => {
    const { getByText } = render(
      <EquipmentCard equipment={mockEquipment} onPress={vi.fn()} />
    );

    expect(getByText('Fellow')).toBeDefined();
    expect(getByText('Ode Gen 2')).toBeDefined();
    expect(getByText('flat-burr')).toBeDefined();
    expect(getByText('stepped-numbers')).toBeDefined();
    expect(getByText('64mm burrs calibrated at 1 chirp')).toBeDefined();
  });

  it('renders filled star when isFavorite is true and outlined when false', () => {
    const { getByTestId, rerender } = render(
      <EquipmentCard
        equipment={mockEquipment}
        onPress={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    );

    const star = getByTestId('star-icon');
    expect(star.getAttribute('data-fill')).not.toBe('none');

    rerender(
      <EquipmentCard
        equipment={{ ...mockEquipment, isFavorite: false }}
        onPress={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    );
    expect(getByTestId('star-icon').getAttribute('data-fill')).toBe('none');
  });

  it('calls onPress when card is pressed', () => {
    const onPress = vi.fn();
    const { getByRole } = render(
      <EquipmentCard equipment={mockEquipment} onPress={onPress} />
    );

    fireEvent.click(getByRole('button', { name: 'Fellow Ode Gen 2' }));
    expect(onPress).toHaveBeenCalledWith(mockEquipment);
  });

  it('calls onToggleFavorite when star button is pressed without triggering card onPress', () => {
    const onPress = vi.fn();
    const onToggleFavorite = vi.fn();
    const { getByRole } = render(
      <EquipmentCard
        equipment={mockEquipment}
        onPress={onPress}
        onToggleFavorite={onToggleFavorite}
      />
    );

    const starBtn = getByRole('button', { name: 'Unfavorite equipment' });
    fireEvent.click(starBtn);

    expect(onToggleFavorite).toHaveBeenCalledWith(mockEquipment);
    expect(onPress).not.toHaveBeenCalled();
  });
});
