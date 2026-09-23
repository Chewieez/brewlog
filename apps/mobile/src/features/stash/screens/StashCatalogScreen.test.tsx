/** @vitest-environment jsdom */
import React from 'react';
import { render, fireEvent as rtlFireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StashContextValue, StashContext } from '../StashContext';
import { Bean } from '@brewlog/core';

const fireEvent = {
  ...rtlFireEvent,
  press: (element: Element | Node | Document | Window) => {
    rtlFireEvent.click(element);
  },
  changeText: (element: Element | Node | Document | Window, text: string) => {
    rtlFireEvent.change(element, { target: { value: text } });
  },
};

(globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

vi.mock('../../../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('react-native', () => ({
  View: ({
    children,
    style: _style,
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
    style: _style,
    numberOfLines: _numberOfLines,
    ...props
  }: {
    children?: React.ReactNode;
    style?: unknown;
    numberOfLines?: number;
    [key: string]: unknown;
  }) => (
    <span {...props}>{children}</span>
  ),
  ScrollView: ({
    children,
    style: _style,
    horizontal: _horizontal,
    showsHorizontalScrollIndicator: _showsHorizontalScrollIndicator,
    contentContainerStyle: _contentContainerStyle,
    ...props
  }: {
    children?: React.ReactNode;
    style?: unknown;
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    contentContainerStyle?: unknown;
    [key: string]: unknown;
  }) => (
    <div {...props}>{children}</div>
  ),
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    style: _style,
    disabled,
    hitSlop: _hitSlop,
    ...props
  }: {
    children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityState?: { selected?: boolean };
    disabled?: boolean;
    hitSlop?: unknown;
    [key: string]: unknown;
  }) => (
    <div
      role={accessibilityRole || 'button'}
      aria-label={accessibilityLabel}
      aria-selected={accessibilityState?.selected}
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
  TextInput: ({
    value,
    defaultValue,
    placeholder,
    onChangeText,
    accessibilityLabel,
    placeholderTextColor: _placeholderTextColor,
    returnKeyType: _returnKeyType,
    clearButtonMode: _clearButtonMode,
    style: _style,
    ...props
  }: {
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    onChangeText?: (text: string) => void;
    accessibilityLabel?: string;
    placeholderTextColor?: string;
    returnKeyType?: string;
    clearButtonMode?: string;
    style?: unknown;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      aria-label={accessibilityLabel}
      onChange={(e) => onChangeText?.(e.target.value)}
      {...props}
    />
  ),
  FlatList: ({
    data,
    renderItem,
    ListEmptyComponent,
    ListHeaderComponent,
    keyExtractor,
    contentContainerStyle: _contentContainerStyle,
    ItemSeparatorComponent,
    keyboardShouldPersistTaps: _keyboardShouldPersistTaps,
    style: _style,
    ...props
  }: {
    data?: unknown[];
    renderItem?: (info: { item: unknown; index: number }) => React.ReactNode;
    ListEmptyComponent?: React.ReactNode | (() => React.ReactNode);
    ListHeaderComponent?: React.ReactNode | (() => React.ReactNode);
    keyExtractor?: (item: unknown, index: number) => string;
    contentContainerStyle?: unknown;
    ItemSeparatorComponent?: () => React.ReactNode;
    keyboardShouldPersistTaps?: string;
    style?: unknown;
    [key: string]: unknown;
  }) => (
    <div data-testid="flat-list" {...props}>
      {ListHeaderComponent
        ? typeof ListHeaderComponent === 'function'
          ? ListHeaderComponent()
          : ListHeaderComponent
        : null}
      {!data || data.length === 0 ? (
        typeof ListEmptyComponent === 'function'
          ? ListEmptyComponent()
          : ListEmptyComponent
      ) : (
        data.map((item: unknown, index: number) => {
          const key = keyExtractor
            ? keyExtractor(item, index)
            : (item as { id?: string })?.id || index;
          return (
            <React.Fragment key={key}>
              {index > 0 && ItemSeparatorComponent ? ItemSeparatorComponent() : null}
              {renderItem?.({ item, index })}
            </React.Fragment>
          );
        })
      )}
    </div>
  ),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  Plus: () => <span data-testid="plus-icon" />,
  Search: () => <span data-testid="search-icon" />,
  X: () => <span data-testid="clear-icon" />,
  Coffee: () => <span data-testid="coffee-icon" />,
  Archive: () => <span data-testid="archive-icon" />,
  Snowflake: () => <span data-testid="snowflake-icon" />,
  Star: () => <span data-testid="star-icon" />,
}));

import { StashCatalogScreen } from './StashCatalogScreen';

describe('StashCatalogScreen', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockBeans: Bean[] = [
    {
      id: 'b-1',
      roaster: 'Sey',
      name: 'Worka',
      originCountry: 'Ethiopia',
      process: 'washed',
      roastDate: '2026-09-12',
      bagWeightGrams: 250,
      remainingGrams: 200,
      flavorNotes: ['Peach', 'Floral'],
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'b-2',
      roaster: 'Passenger',
      name: 'Heza',
      originCountry: 'Burundi',
      process: 'natural',
      isFrozen: true,
      frozenDate: '2026-09-15',
      bagWeightGrams: 250,
      remainingGrams: 250,
      flavorNotes: ['Berry'],
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'b-3',
      roaster: 'Tim Wendelboe',
      name: 'Caballero',
      originCountry: 'Honduras',
      process: 'honey',
      isArchived: true,
      bagWeightGrams: 250,
      remainingGrams: 0,
      flavorNotes: ['Caramel'],
      createdAt: '2026-08-01T00:00:00Z',
    },
  ];

  const mockValue: StashContextValue = {
    beans: mockBeans,
    activeBeans: [mockBeans[0]],
    frozenBeans: [mockBeans[1]],
    archivedBeans: [mockBeans[2]],
    activeBrewBean: null,
    loading: false,
    addBean: vi.fn(),
    updateBean: vi.fn(),
    deleteBean: vi.fn(),
    toggleFavorite: vi.fn(),
    toggleFrozen: vi.fn(),
    archiveBean: vi.fn(),
    unarchiveBean: vi.fn(),
    setActiveBrewBean: vi.fn(),
    deductBeanDose: vi.fn(),
    refreshBeans: vi.fn(),
  };

  it('renders active cellar beans by default and switches to freezer vault', () => {
    const { getByText, queryByText } = render(
      <StashContext.Provider value={mockValue}>
        <StashCatalogScreen />
      </StashContext.Provider>
    );

    expect(getByText('Worka')).toBeTruthy();
    expect(queryByText('Heza')).toBeNull();

    // Switch to Freezer Vault
    fireEvent.press(getByText('Freezer Vault'));
    expect(getByText('Heza')).toBeTruthy();
    expect(queryByText('Worka')).toBeNull();
  });

  it('filters beans by search input', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <StashContext.Provider value={mockValue}>
        <StashCatalogScreen />
      </StashContext.Provider>
    );

    const searchInput = getByPlaceholderText('Search roaster, origin, name...');
    fireEvent.changeText(searchInput, 'Sey');
    expect(getByText('Worka')).toBeTruthy();

    fireEvent.changeText(searchInput, 'NonExistent');
    expect(queryByText('Worka')).toBeNull();
    expect(getByText('No coffees found')).toBeTruthy();
  });

  it('switches to archived shelf and shows archived beans', () => {
    const { getByText, queryByText } = render(
      <StashContext.Provider value={mockValue}>
        <StashCatalogScreen />
      </StashContext.Provider>
    );

    expect(getByText('Worka')).toBeTruthy();
    expect(queryByText('Caballero')).toBeNull();

    // Switch to Archived
    fireEvent.press(getByText('Archived'));
    expect(getByText('Caballero')).toBeTruthy();
    expect(queryByText('Worka')).toBeNull();
  });

  it('filters beans by process chip', () => {
    const naturalActiveBean: Bean = {
      id: 'b-4',
      roaster: 'Onyx',
      name: 'Southern Weather',
      originCountry: 'Colombia',
      process: 'natural',
      bagWeightGrams: 300,
      remainingGrams: 150,
      flavorNotes: [],
      createdAt: '2026-09-02T00:00:00Z',
    };

    const extendedValue: StashContextValue = {
      ...mockValue,
      activeBeans: [mockBeans[0], naturalActiveBean],
    };

    const { getByText, queryByText } = render(
      <StashContext.Provider value={extendedValue}>
        <StashCatalogScreen />
      </StashContext.Provider>
    );

    expect(getByText('Worka')).toBeTruthy();
    expect(getByText('Southern Weather')).toBeTruthy();

    // Filter by Natural
    fireEvent.press(getByText('Natural'));
    expect(getByText('Southern Weather')).toBeTruthy();
    expect(queryByText('Worka')).toBeNull();

    // Return to All
    fireEvent.press(getByText('All'));
    expect(getByText('Worka')).toBeTruthy();
    expect(getByText('Southern Weather')).toBeTruthy();
  });

  it('navigates to /stash/modal when ADD BAG button is pressed', () => {
    const { getByLabelText } = render(
      <StashContext.Provider value={mockValue}>
        <StashCatalogScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByLabelText('Add new bag to stash'));
    expect(mockPush).toHaveBeenCalledWith('/stash/modal');
  });

  it('navigates to /stash/[id] when bean card is pressed', () => {
    const { getByLabelText } = render(
      <StashContext.Provider value={mockValue}>
        <StashCatalogScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByLabelText('View bean Worka'));
    expect(mockPush).toHaveBeenCalledWith('/stash/b-1');
  });

  it('handles BREW action by setting activeBrewBean and navigating to timer tab', () => {
    const { getByLabelText } = render(
      <StashContext.Provider value={mockValue}>
        <StashCatalogScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByLabelText('Brew with Worka'));
    expect(mockValue.setActiveBrewBean).toHaveBeenCalledWith(mockBeans[0]);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)');
  });

  it('calls toggleFavorite when favorite star is pressed', () => {
    const { getByLabelText } = render(
      <StashContext.Provider value={mockValue}>
        <StashCatalogScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByLabelText('Add to favorites'));
    expect(mockValue.toggleFavorite).toHaveBeenCalledWith('b-1');
  });

  it('displays empty state when a shelf has no coffees', () => {
    const emptyValue: StashContextValue = {
      ...mockValue,
      activeBeans: [],
    };

    const { getByText } = render(
      <StashContext.Provider value={emptyValue}>
        <StashCatalogScreen />
      </StashContext.Provider>
    );

    expect(getByText('Cellar is Empty')).toBeTruthy();
  });

  it('renders CellarSummaryBar with active cellar counts', () => {
    const { getByRole } = render(
      <StashContext.Provider value={mockValue}>
        <StashCatalogScreen />
      </StashContext.Provider>
    );

    expect(getByRole('summary')).toBeTruthy();
  });
});
