/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { Alert } from 'react-native';
import { TastingLog, Bean, BrewRecipe, DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { ReviewDetailScreen } from './ReviewDetailScreen';

const mockBack = vi.fn();
const mockPush = vi.fn();
const mockReplace = vi.fn();
const canGoBackMock = vi.fn(() => true);
let mockParams: { id?: string } = { id: 'rev-1' };

vi.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: mockReplace,
    canGoBack: canGoBackMock,
  }),
  useLocalSearchParams: () => mockParams,
}));

const mockReview: TastingLog = {
  id: 'rev-1',
  beanId: 'bean-1',
  recipeId: DEFAULT_PRESET_RECIPES[0].id,
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
let mockReviews: TastingLog[] = [mockReview];
const mockDeleteReview = vi.fn();

vi.mock('../ReviewsContext', () => ({
  useReviews: () => ({
    reviews: mockReviews,
    loading: mockLoading,
    deleteReview: mockDeleteReview,
  }),
}));

const mockBean: Bean = {
  id: 'bean-1',
  name: 'Worka Sakaro Anaerobic',
  roaster: 'Sey Coffee',
  originCountry: 'Ethiopia',
  process: 'washed',
  flavorNotes: ['Jasmine'],
  createdAt: '2026-01-01T00:00:00Z',
};

const mockRecipe: BrewRecipe = {
  ...DEFAULT_PRESET_RECIPES[0],
  id: DEFAULT_PRESET_RECIPES[0].id,
  brewMethod: 'v60',
};

let mockStashValue: { beans: Bean[]; setActiveBrewBean: ReturnType<typeof vi.fn> } = {
  beans: [mockBean],
  setActiveBrewBean: vi.fn(),
};

vi.mock('../../stash/StashContext', () => ({
  useOptionalStash: () => mockStashValue,
}));

let mockRecipeValue: {
  recipes: BrewRecipe[];
  setActiveTimerRecipe: ReturnType<typeof vi.fn>;
  isBrewActive: boolean;
} = {
  recipes: [mockRecipe],
  setActiveTimerRecipe: vi.fn(),
  isBrewActive: false,
};

vi.mock('../../recipes/RecipeContext', () => ({
  useOptionalRecipes: () => mockRecipeValue,
}));

vi.mock('react-native', () => ({
  View: ({ children, style: _style, testID, accessibilityRole, accessibilityLabel, ...props }: any) => (
    <div
      data-testid={testID}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      {...props}
    >
      {children}
    </div>
  ),
  Text: ({ children, style: _style, numberOfLines: _n, testID, ...props }: any) => (
    <span data-testid={testID} {...props}>
      {children}
    </span>
  ),
  Pressable: ({
    children,
    onPress,
    testID,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    style: _style,
    hitSlop: _hitSlop,
    ...props
  }: any) => (
    <div
      data-testid={testID}
      role={accessibilityRole || 'button'}
      aria-label={accessibilityLabel}
      aria-selected={accessibilityState?.selected}
      onClick={(e) => {
        onPress?.(e);
      }}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </div>
  ),
  ScrollView: ({ children, style: _style, contentContainerStyle: _c, showsVerticalScrollIndicator: _s, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  ActivityIndicator: ({ testID }: any) => <div data-testid={testID} />,
  Alert: {
    alert: vi.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('react-native-svg', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <svg data-testid="flavor-wheel-svg" {...props}>{children}</svg>,
  G: ({ children, ...props }: any) => <g {...props}>{children}</g>,
  Circle: (props: any) => <circle {...props} />,
  Path: ({ onPress, ...props }: any) => (
    <path data-interactive={onPress ? 'true' : 'false'} onClick={() => onPress?.()} {...props} />
  ),
}));

vi.mock('lucide-react-native', () => ({
  Star: () => <span data-testid="star-icon" />,
  Edit3: () => <span data-testid="edit-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  CheckCircle2: () => <span data-testid="check-circle-icon" />,
  Play: () => <span data-testid="play-icon" />,
  Minus: () => <span data-testid="minus-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
}));

describe('ReviewDetailScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canGoBackMock.mockReturnValue(true);
    mockParams = { id: 'rev-1' };
    mockLoading = false;
    mockReviews = [mockReview];
    mockStashValue = {
      beans: [mockBean],
      setActiveBrewBean: vi.fn(),
    };
    mockRecipeValue = {
      recipes: [mockRecipe],
      setActiveTimerRecipe: vi.fn(),
      isBrewActive: false,
    };
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

  it('3. renders canonical Web-led section order with Brew Again CTA, Hero Score Banner, Sensory Profile, 10-Attribute Matrix, Specs, Notes, and Actions', () => {
    const { getByTestId, queryByText } = render(<ReviewDetailScreen />);

    const header = getByTestId('detail-header-card');
    const brewAgainBtn = getByTestId('detail-brew-again-button');
    const heroScore = getByTestId('detail-hero-score');
    const sensory = getByTestId('detail-sensory-profile');
    const matrix = getByTestId('detail-score-matrix');
    const specs = getByTestId('detail-brew-specs');
    const notes = getByTestId('detail-tasting-notes');
    const actions = getByTestId('detail-actions-footer');

    expect(header.compareDocumentPosition(brewAgainBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(brewAgainBtn.compareDocumentPosition(heroScore) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(heroScore.compareDocumentPosition(sensory) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(sensory.compareDocumentPosition(matrix) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(matrix.compareDocumentPosition(specs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(specs.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notes.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(header.textContent).toContain('V60');
    expect(header.textContent).toContain('Worka Sakaro Anaerobic');
    expect(header.textContent).toContain('Sey Coffee');
    expect(header.textContent).not.toContain('Would Brew Again');

    expect(heroScore.textContent).toContain('90.0');
    expect(heroScore.textContent).toContain('/ 100');
    expect(heroScore.textContent).toContain('Outstanding (SCA)');
    expect(heroScore.textContent).toContain('Would Brew Again');

    // Inner ScaAttributeScoring hero is hidden
    expect(queryByText('SCA SENSORY TOTAL')).toBeNull();

    expect(specs.textContent).toContain('Fellow Ode Gen 2');
    expect(specs.textContent).toContain('18 clicks');
    expect(specs.textContent).toContain('Hario V60 02');
    expect(notes.textContent).toContain('Incredible clarity and floral sweetness');
  });

  it('4. toggles Sensory Profile between Descriptors and read-only Wheel and handles empty tags', () => {
    const { getByText, getByRole, getByTestId, queryByText } = render(<ReviewDetailScreen />);

    expect(getByText('Jasmine')).toBeDefined();
    expect(getByText('Peach')).toBeDefined();

    fireEvent.click(getByRole('button', { name: /Wheel/i }));
    const wheelSvg = getByTestId('flavor-wheel-svg');
    expect(wheelSvg).toBeDefined();

    // Tapping a slice in read-only wheel should never show ADD/REMOVE
    const interactiveSlices = wheelSvg.querySelectorAll('path[data-interactive="true"]');
    fireEvent.click(interactiveSlices[0]);
    expect(queryByText('ADD')).toBeNull();
    expect(queryByText('REMOVE')).toBeNull();

    // Empty tags message
    mockReviews = [{ ...mockReview, flavorTags: [] }];
    cleanup();
    const emptyRes = render(<ReviewDetailScreen />);
    expect(emptyRes.getByText('No flavor descriptors recorded for this brew.')).toBeDefined();
  });

  it('5. triggers Brew Again handoff using bean/recipe IDs or name/method fallbacks', () => {
    const { getByTestId } = render(<ReviewDetailScreen />);
    fireEvent.click(getByTestId('detail-brew-again-button'));

    expect(mockStashValue.setActiveBrewBean).toHaveBeenCalledWith(mockBean);
    expect(mockRecipeValue.setActiveTimerRecipe).toHaveBeenCalledWith(mockRecipe, 20);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(tabs)',
      params: { mode: 'recipe' },
    });

    // Fallback when beanId/recipeId are absent or orphaned
    vi.clearAllMocks();
    mockReviews = [
      {
        ...mockReview,
        beanId: 'deleted-bean-id',
        recipeId: 'deleted-recipe-id',
      },
    ];
    cleanup();
    const fallbackRes = render(<ReviewDetailScreen />);
    fireEvent.click(fallbackRes.getByTestId('detail-brew-again-button'));

    expect(mockStashValue.setActiveBrewBean).toHaveBeenCalledWith(mockBean);
    expect(mockRecipeValue.setActiveTimerRecipe).toHaveBeenCalledWith(mockRecipe, 20);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(tabs)',
      params: { mode: 'recipe' },
    });
  });

  it('6. prompts Switch Recipe alert on Brew Again when isBrewActive is true and navigates safely without matches', () => {
    mockRecipeValue.isBrewActive = true;
    const { getByTestId } = render(<ReviewDetailScreen />);

    fireEvent.click(getByTestId('detail-brew-again-button'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Switch Recipe?',
      expect.stringContaining('currently in progress'),
      expect.any(Array)
    );
    expect(mockReplace).not.toHaveBeenCalled();

    const alertButtons = vi.mocked(Alert.alert).mock.calls[0][2];
    const confirmBtn = alertButtons?.find((b: any) => b.style === 'destructive');
    confirmBtn?.onPress?.();

    expect(mockRecipeValue.setActiveTimerRecipe).toHaveBeenCalledWith(mockRecipe, 20);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(tabs)',
      params: { mode: 'recipe' },
    });

    // Safe navigation when no bean or recipe matches (and no Switch Recipe prompt even if isBrewActive is true)
    vi.clearAllMocks();
    mockRecipeValue = { recipes: [], setActiveTimerRecipe: vi.fn(), isBrewActive: true };
    mockStashValue = { beans: [], setActiveBrewBean: vi.fn() };
    cleanup();
    const emptyMatchRes = render(<ReviewDetailScreen />);
    fireEvent.click(emptyMatchRes.getByTestId('detail-brew-again-button'));
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockStashValue.setActiveBrewBean).not.toHaveBeenCalled();
    expect(mockRecipeValue.setActiveTimerRecipe).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(tabs)',
      params: { mode: 'recipe' },
    });

    // Case-insensitive brewMethod fallback
    vi.clearAllMocks();
    mockReviews = [{ ...mockReview, recipeId: undefined, brewMethod: 'V60' as any }];
    mockRecipeValue = { recipes: [{ ...mockRecipe, brewMethod: 'v60' }], setActiveTimerRecipe: vi.fn(), isBrewActive: false };
    cleanup();
    const caseRes = render(<ReviewDetailScreen />);
    fireEvent.click(caseRes.getByTestId('detail-brew-again-button'));
    expect(mockRecipeValue.setActiveTimerRecipe).toHaveBeenCalledWith(expect.objectContaining({ id: mockRecipe.id }), 20);
  });

  it('7. navigates to /reviews/modal with id when Edit Review is pressed', () => {
    const { getByLabelText } = render(<ReviewDetailScreen />);

    const editBtn = getByLabelText('Edit Review');
    fireEvent.click(editBtn);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/reviews/modal',
      params: { id: 'rev-1' },
    });
  });

  it('8. confirms and deletes review when Delete Review is pressed', async () => {
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

  it('9. falls back to router.replace("/(tabs)/reviews") when router.canGoBack is false', () => {
    canGoBackMock.mockReturnValue(false);
    mockParams = { id: 'non-existent' };
    const { getByRole } = render(<ReviewDetailScreen />);

    const backBtn = getByRole('button', { name: 'Back to Reviews' });
    fireEvent.click(backBtn);

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/reviews');
  });
});
