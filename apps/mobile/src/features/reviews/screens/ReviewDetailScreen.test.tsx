/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { Alert } from 'react-native';
import { TastingLog } from '@brewlog/core';
import { ReviewDetailScreen } from './ReviewDetailScreen';

const mockBack = vi.fn();
const mockPush = vi.fn();
let mockParams: { id?: string } = { id: 'rev-1' };

vi.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
  useLocalSearchParams: () => mockParams,
}));

const mockReview: TastingLog = {
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
  grinderId: 'grinder-1',
  brewerId: 'brewer-1',
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
  notes: 'Incredible clarity and floral sweetness',
  wouldBrewAgain: true,
  createdAt: '2026-09-02T10:05:00.000Z',
};

let mockLoading = false;
let mockReviews = [mockReview];
const mockDeleteReview = vi.fn();

vi.mock('../ReviewsContext', () => ({
  useReviews: () => ({
    reviews: mockReviews,
    loading: mockLoading,
    deleteReview: mockDeleteReview,
  }),
}));

vi.mock('react-native', () => ({
  View: ({ children, style, testID, accessibilityRole, accessibilityLabel, ...props }: any) => (
    <div
      data-testid={testID}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      {...props}
    >
      {children}
    </div>
  ),
  Text: ({ children, style, numberOfLines, ...props }: any) => <span {...props}>{children}</span>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    style,
    ...props
  }: any) => (
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
  ScrollView: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  ActivityIndicator: ({ testID }: any) => <div data-testid={testID} />,
  Alert: {
    alert: vi.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));


vi.mock('lucide-react-native', () => ({
  Star: () => <span data-testid="star-icon" />,
  Edit3: () => <span data-testid="edit-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  Check: () => <span data-testid="check-icon" />,
  ChevronLeft: () => <span data-testid="back-icon" />,
  Minus: () => <span data-testid="minus-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
}));

describe('ReviewDetailScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'rev-1' };
    mockLoading = false;
    mockReviews = [mockReview];
  });

  afterEach(cleanup);

  it('1. renders loading indicator while reviews are hydrating', () => {
    mockLoading = true;
    const { getByTestId } = render(<ReviewDetailScreen />);
    expect(getByTestId('review-detail-loading')).toBeDefined();
  });

  it('2. renders "Review not found" if review does not exist after loading', () => {
    mockParams = { id: 'nonexistent-id' };
    const { getByText } = render(<ReviewDetailScreen />);
    expect(getByText('Review not found')).toBeDefined();
  });

  it('3. renders complete review hero and brew parameters', () => {
    const { getByText } = render(<ReviewDetailScreen />);

    expect(getByText('Worka Sakaro Anaerobic')).toBeDefined();
    expect(getByText('SEY COFFEE')).toBeDefined();
    expect(getByText('V60')).toBeDefined();
    expect(getByText(/Fellow Ode Gen 2/)).toBeDefined();
    expect(getByText(/18 clicks/)).toBeDefined();
    expect(getByText(/Hario V60 02/)).toBeDefined();
  });

  it('4. renders SCA score, classification, and sensory attributes', () => {
    const { getByText } = render(<ReviewDetailScreen />);

    expect(getByText('90.0')).toBeDefined();
    expect(getByText('Outstanding (Specialty)')).toBeDefined();
    expect(getByText('Fragrance / Aroma')).toBeDefined();
    expect(getByText('Flavor')).toBeDefined();
    expect(getByText('Clean Cup')).toBeDefined();
  });

  it('5. renders flavor tags and cupper impressions notes', () => {
    const { getByText } = render(<ReviewDetailScreen />);

    expect(getByText('Jasmine')).toBeDefined();
    expect(getByText('Peach')).toBeDefined();
    expect(getByText('Incredible clarity and floral sweetness')).toBeDefined();
  });

  it('6. navigates to /reviews/modal with id when Edit Review is pressed', () => {
    const { getByLabelText } = render(<ReviewDetailScreen />);

    const editBtn = getByLabelText('Edit Review');
    fireEvent.click(editBtn);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/reviews/modal',
      params: { id: 'rev-1' },
    });
  });

  it('7. confirms and deletes review when Delete Review is pressed', async () => {
    const { getByLabelText } = render(<ReviewDetailScreen />);

    const deleteBtn = getByLabelText('Delete Review');
    fireEvent.click(deleteBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Review?',
      expect.stringContaining('cannot be undone'),
      expect.any(Array)
    );

    const alertCalls = vi.mocked(Alert.alert).mock.calls;
    const buttons = alertCalls[0][2];
    const deleteAction = buttons?.find((b: any) => b.style === 'destructive');
    deleteAction?.onPress?.();

    await waitFor(() => {
      expect(mockDeleteReview).toHaveBeenCalledWith('rev-1');
      expect(mockBack).toHaveBeenCalled();
    });
  });
});
