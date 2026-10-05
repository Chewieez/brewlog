/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { TastingLog } from '@brewlog/core';
import { ReviewsCatalogScreen } from './ReviewsCatalogScreen';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockReviews: TastingLog[] = [
  {
    id: 'rev-1',
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
    flavorTags: ['Jasmine', 'Peach'],
    notes: 'Incredible clarity',
    wouldBrewAgain: true,
    createdAt: '2026-09-02T10:05:00.000Z',
  },
  {
    id: 'rev-2',
    beanNameSnapshot: 'Southern Weather',
    roasterSnapshot: 'Onyx Coffee Lab',
    recipeNameSnapshot: 'Espresso Double',
    brewMethod: 'espresso',
    brewDate: '2026-09-01T08:00:00.000Z',
    coffeeDoseGrams: 18,
    waterAmountGrams: 36,
    actualTimeSeconds: 28,
    grindSetting: '8 clicks',
    waterTempCelsius: 93,
    scores: {
      fragranceAroma: 8.0,
      flavor: 8.0,
      aftertaste: 8.0,
      acidity: 8.0,
      body: 8.5,
      balance: 8.0,
      uniformity: 10.0,
      cleanCup: 10.0,
      sweetness: 8.0,
      overall: 8.0,
    },
    calculatedScaScore: 84.5,
    rating: 4,
    flavorTags: ['Milk Chocolate', 'Plum'],
    notes: 'Rich crema',
    wouldBrewAgain: true,
    createdAt: '2026-09-01T08:10:00.000Z',
  },
];

let currentReviews = mockReviews;

vi.mock('../ReviewsContext', () => ({
  useReviews: () => ({
    reviews: currentReviews,
    loading: false,
    addReview: vi.fn(),
    updateReview: vi.fn(),
    deleteReview: vi.fn(),
    refreshReviews: vi.fn(),
  }),
}));

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
  TextInput: ({
    value,
    onChangeText,
    placeholder,
    accessibilityLabel,
    style,
    ...props
  }: {
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    accessibilityLabel?: string;
    style?: unknown;
    [key: string]: unknown;
  }) => (
    <input
      type="text"
      value={value}
      onChange={(e) => onChangeText?.(e.target.value)}
      placeholder={placeholder}
      aria-label={accessibilityLabel}
      {...props}
    />
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
      data-hitslop={JSON.stringify(hitSlop)}
      onClick={(e) => {
        onPress?.(e);
      }}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </div>
  ),
  ScrollView: ({
    children,
    style,
    ...props
  }: {
    children?: React.ReactNode;
    style?: unknown;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  FlatList: ({
    data,
    renderItem,
    keyExtractor,
    ListEmptyComponent,
    ListHeaderComponent,
    contentContainerStyle: _contentContainerStyle,
    style: _style,
    ...props
  }: {
    data?: unknown[];
    renderItem?: (info: { item: any; index: number }) => React.ReactNode;
    keyExtractor?: (item: any, index?: number) => string;
    ListEmptyComponent?: React.ReactNode | (() => React.ReactNode);
    ListHeaderComponent?: React.ReactNode | (() => React.ReactNode);
    contentContainerStyle?: unknown;
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
        data.map((item, index) => (
          <div key={keyExtractor ? keyExtractor(item, index) : String(index)}>
            {renderItem?.({ item, index })}
          </div>
        ))
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
  X: () => <span data-testid="x-icon" />,
  Star: () => <span data-testid="star-icon" />,
}));

describe('ReviewsCatalogScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentReviews = mockReviews;
  });

  afterEach(cleanup);

  it('renders title, summary bar, and review cards', () => {
    const { getByText } = render(<ReviewsCatalogScreen />);

    expect(getByText('TASTING JOURNAL')).toBeTruthy();
    expect(getByText('Brew Reviews')).toBeTruthy();
    expect(getByText('Worka Sakaro Anaerobic')).toBeTruthy();
    expect(getByText('Southern Weather')).toBeTruthy();
  });

  it('navigates to /reviews/modal via handleAddReview when ADD REVIEW is clicked', () => {
    const { getByLabelText } = render(<ReviewsCatalogScreen />);

    const addButton = getByLabelText('Add Review');
    fireEvent.click(addButton);

    expect(mockPush).toHaveBeenCalledWith('/reviews/modal');
  });

  it('navigates to /reviews/[id] when review card is clicked', () => {
    const { getByText } = render(<ReviewsCatalogScreen />);

    const card = getByText('Worka Sakaro Anaerobic');
    fireEvent.click(card);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/reviews/[id]',
      params: { id: 'rev-1' },
    });
  });

  it('filters reviews by search query', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <ReviewsCatalogScreen />
    );

    const input = getByPlaceholderText(/Search reviews/i);
    fireEvent.change(input, { target: { value: 'Sey' } });

    expect(getByText('Worka Sakaro Anaerobic')).toBeTruthy();
    expect(queryByText('Southern Weather')).toBeNull();
  });

  it('filters reviews by brew method filter chip', () => {
    const { getByText, queryByText } = render(<ReviewsCatalogScreen />);

    const espressoChip = getByText('Espresso');
    fireEvent.click(espressoChip);

    expect(getByText('Southern Weather')).toBeTruthy();
    expect(queryByText('Worka Sakaro Anaerobic')).toBeNull();
  });

  it('renders empty state when no reviews match filters with clear button', () => {
    const { getByPlaceholderText, getByText } = render(<ReviewsCatalogScreen />);

    const input = getByPlaceholderText(/Search reviews/i);
    fireEvent.change(input, { target: { value: 'Nonexistent' } });

    expect(getByText('No reviews match your filters')).toBeTruthy();
    const clearBtn = getByText('CLEAR FILTERS');
    fireEvent.click(clearBtn);

    expect(getByText('Worka Sakaro Anaerobic')).toBeTruthy();
  });

  it('renders initial empty state with ADD YOUR FIRST REVIEW CTA when reviews list is empty', () => {
    currentReviews = [];
    const { getByText } = render(<ReviewsCatalogScreen />);

    expect(getByText('No reviews logged yet')).toBeTruthy();
    const addFirst = getByText(/ADD YOUR FIRST REVIEW/);
    fireEvent.click(addFirst);

    expect(mockPush).toHaveBeenCalledWith('/reviews/modal');
  });

  it('excludes unscored reviews (score 0.0) when calculating average SCA score', () => {
    currentReviews = [
      ...mockReviews,
      {
        id: 'rev-unscored',
        beanNameSnapshot: 'Quick Brew Bean',
        roasterSnapshot: 'Quick Roaster',
        recipeNameSnapshot: 'Quick Brew',
        brewMethod: 'aeropress',
        brewDate: '2026-09-03T10:00:00.000Z',
        coffeeDoseGrams: 15,
        waterAmountGrams: 250,
        actualTimeSeconds: 120,
        grindSetting: '',
        waterTempCelsius: 92,
        scores: {
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
        },
        calculatedScaScore: 0.0,
        rating: 3,
        flavorTags: [],
        notes: '',
        wouldBrewAgain: false,
        createdAt: '2026-09-03T10:05:00.000Z',
      },
    ];

    const { getByText } = render(<ReviewsCatalogScreen />);

    // rev-1 (90.0) and rev-2 (84.5) average to 87.3 (174.5 / 2 = 87.25 -> 87.3)
    // If unscored (0.0) were included, average would be 174.5 / 3 = 58.2
    expect(getByText('87.3')).toBeTruthy();
  });

  it('provides >= 44pt touch target with hitSlop vertical padding of 6 on filter chips', () => {
    const { getByRole } = render(<ReviewsCatalogScreen />);

    const espressoChip = getByRole('button', { name: 'Filter by method Espresso' });
    const hitSlop = JSON.parse(espressoChip.getAttribute('data-hitslop') || '{}');
    expect(hitSlop.top).toBe(6);
    expect(hitSlop.bottom).toBe(6);
  });
});
