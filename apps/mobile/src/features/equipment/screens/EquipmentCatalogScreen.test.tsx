/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { EquipmentCatalogScreen } from './EquipmentCatalogScreen';
import { Equipment } from '@brewlog/core';

vi.mock('react-native', () => ({
  View: ({ children, style: _style, accessibilityRole, accessibilityLabel, ...props }: any) => (
    <div role={accessibilityRole} aria-label={accessibilityLabel} {...props}>
      {children}
    </div>
  ),
  Text: ({ children, style: _style, numberOfLines: _numberOfLines, ...props }: any) => <span {...props}>{children}</span>,
  TextInput: ({
    value,
    onChangeText,
    placeholder,
    placeholderTextColor: _placeholderTextColor,
    returnKeyType: _returnKeyType,
    clearButtonMode: _clearButtonMode,
    accessibilityLabel,
    style: _style,
    ...props
  }: any) => (
    <input
      type="text"
      value={value}
      onChange={(e) => onChangeText?.(e.target.value)}
      placeholder={placeholder}
      aria-label={accessibilityLabel}
      {...props}
    />
  ),
  ScrollView: ({
    children,
    style: _style,
    horizontal: _horizontal,
    showsHorizontalScrollIndicator: _showsHorizontalScrollIndicator,
    contentContainerStyle: _contentContainerStyle,
    keyboardShouldPersistTaps: _keyboardShouldPersistTaps,
    ...props
  }: any) => <div {...props}>{children}</div>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    hitSlop: _hitSlop,
    style: _style,
    ...props
  }: any) => (
    <div
      onClick={onPress}
      role={accessibilityRole || 'button'}
      aria-label={accessibilityLabel}
      aria-selected={accessibilityState?.selected}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </div>
  ),
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  Plus: () => null,
  Search: () => null,
  X: () => null,
  Sliders: () => null,
  Coffee: () => null,
  Scale: () => null,
  Flame: () => null,
  Star: () => null,
  Layers: () => null,
}));

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockItems: Equipment[] = [
  {
    id: 'eq-1',
    type: 'grinder',
    brand: 'Fellow',
    model: 'Ode Gen 2',
    subType: 'flat-burr',
    settingScaleType: 'stepped-numbers',
    isFavorite: true,
    notes: '64mm burrs',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'eq-2',
    type: 'brewer',
    brand: 'Hario',
    model: 'V60 02 Plastic',
    subType: 'pour-over',
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'eq-3',
    type: 'scale',
    brand: 'Timemore',
    model: 'Black Mirror',
    subType: 'smart-scale',
    isFavorite: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'eq-4',
    type: 'kettle',
    brand: 'Fellow',
    model: 'Stagg EKG',
    subType: 'gooseneck',
    isFavorite: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'eq-5',
    type: 'other',
    brand: 'Fellow',
    model: 'Atmos Canister',
    subType: 'container',
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const mockEquipmentContext = {
  equipment: mockItems,
  grinders: mockItems.filter((i) => i.type === 'grinder'),
  brewers: mockItems.filter((i) => i.type === 'brewer'),
  scales: mockItems.filter((i) => i.type === 'scale'),
  kettles: mockItems.filter((i) => i.type === 'kettle'),
  other: mockItems.filter((i) => i.type === 'other'),
  loading: false,
  addEquipment: vi.fn(),
  updateEquipment: vi.fn(),
  deleteEquipment: vi.fn(),
  toggleFavorite: vi.fn(),
  refreshEquipment: vi.fn(),
};

let activeEquipmentContext = mockEquipmentContext;

vi.mock('../EquipmentContext', () => ({
  useEquipment: () => activeEquipmentContext,
}));

describe('EquipmentCatalogScreen', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    activeEquipmentContext = mockEquipmentContext;
  });

  it('renders BREW GEAR eyebrow, Equipment title, and ADD EQUIPMENT button', () => {
    const { getByText, getByRole } = render(<EquipmentCatalogScreen />);

    expect(getByText('BREW GEAR')).toBeDefined();
    expect(getByText('Equipment')).toBeDefined();
    expect(getByText('Manage your grinders, brewers, scales, and kettles.')).toBeDefined();
    expect(getByRole('button', { name: 'Add new equipment' })).toBeDefined();
  });

  it('renders all 5 category sections with item counts by default', () => {
    const { getByText } = render(<EquipmentCatalogScreen />);

    expect(getByText('Grinders (1)')).toBeDefined();
    expect(getByText('Brewers & Drippers (1)')).toBeDefined();
    expect(getByText('Precision Scales (1)')).toBeDefined();
    expect(getByText('Kettles & Water Gear (1)')).toBeDefined();
    expect(getByText('Other Equipment & Accessories (1)')).toBeDefined();

    expect(getByText('Ode Gen 2')).toBeDefined();
    expect(getByText('V60 02 Plastic')).toBeDefined();
    expect(getByText('Black Mirror')).toBeDefined();
    expect(getByText('Stagg EKG')).toBeDefined();
    expect(getByText('Atmos Canister')).toBeDefined();
  });

  it('filters items when search query is entered', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <EquipmentCatalogScreen />
    );

    const searchInput = getByPlaceholderText('Search brand, model, features...');
    fireEvent.change(searchInput, { target: { value: 'Ode' } });

    expect(getByText('Ode Gen 2')).toBeDefined();
    expect(queryByText('V60 02 Plastic')).toBeNull();
    expect(queryByText('Black Mirror')).toBeNull();
  });

  it('filters by category when category filter chip is pressed', () => {
    const { getByRole, getByText, queryByText } = render(<EquipmentCatalogScreen />);

    fireEvent.click(getByRole('button', { name: 'Filter by Grinders' }));

    expect(getByText('Grinders (1)')).toBeDefined();
    expect(getByText('Ode Gen 2')).toBeDefined();
    expect(queryByText('Brewers & Drippers (1)')).toBeNull();
    expect(queryByText('V60 02 Plastic')).toBeNull();
  });

  it('filters by other category when Other filter chip is pressed', () => {
    const { getByRole, getByText, queryByText } = render(<EquipmentCatalogScreen />);

    fireEvent.click(getByRole('button', { name: 'Filter by Other' }));

    expect(getByText('Other Equipment & Accessories (1)')).toBeDefined();
    expect(getByText('Atmos Canister')).toBeDefined();
    expect(queryByText('Grinders (1)')).toBeNull();
    expect(queryByText('Brewers & Drippers (1)')).toBeNull();
  });

  it('displays other equipment without empty catalog screen when only other gear exists', () => {
    activeEquipmentContext = {
      ...mockEquipmentContext,
      equipment: [mockItems[4]],
      grinders: [],
      brewers: [],
      scales: [],
      kettles: [],
      other: [mockItems[4]],
    };
    const { getByText, queryByText } = render(<EquipmentCatalogScreen />);

    expect(getByText('Other Equipment & Accessories (1)')).toBeDefined();
    expect(getByText('Atmos Canister')).toBeDefined();
    expect(queryByText('NO EQUIPMENT FOUND')).toBeNull();
  });

  it('navigates to /equipment/modal when ADD EQUIPMENT button is tapped', () => {
    const { getByRole } = render(<EquipmentCatalogScreen />);

    fireEvent.click(getByRole('button', { name: 'Add new equipment' }));
    expect(mockPush).toHaveBeenCalledWith('/equipment/modal');
  });

  it('navigates to /equipment/modal with id param when an equipment card is tapped', () => {
    const { getByRole } = render(<EquipmentCatalogScreen />);

    fireEvent.click(getByRole('button', { name: 'Fellow Ode Gen 2' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/equipment/modal',
      params: { id: 'eq-1' },
    });
  });
});
