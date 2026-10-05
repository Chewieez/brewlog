/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { Alert } from 'react-native';
import { TastingLog, Bean, Equipment, CuppingAttributes } from '@brewlog/core';
import { ReviewModalScreen } from './ReviewModalScreen';

const mockBack = vi.fn();
const mockPush = vi.fn();
const mockReplace = vi.fn();
let canGoBackMock = vi.fn(() => true);
let mockParams: Record<string, string | undefined> = {};

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
  id: 'rev-edit-1',
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
  notes: 'Vibrant and clean cup',
  wouldBrewAgain: true,
  createdAt: '2026-09-02T10:05:00.000Z',
};

const mockBeans: Bean[] = [
  {
    id: 'bean-101',
    name: 'Worka Sakaro Anaerobic',
    roaster: 'Sey Coffee',
    originCountry: 'Ethiopia',
    bagWeightGrams: 250,
    remainingGrams: 200,
    flavorNotes: ['Peach', 'Jasmine'],
    createdAt: '2026-08-01',
  },
];

const mockGrinders: Equipment[] = [
  {
    id: 'grinder-1',
    brand: 'Fellow',
    model: 'Ode Gen 2',
    type: 'grinder',
    createdAt: '2026-01-01',
  },
];

const mockBrewers: Equipment[] = [
  {
    id: 'brewer-1',
    brand: 'Hario',
    model: 'V60 02',
    type: 'brewer',
    createdAt: '2026-01-01',
  },
];

let mockLoading = false;
let mockReviews = [mockReview];
const mockAddReview = vi.fn();
const mockUpdateReview = vi.fn();
const mockDeleteReview = vi.fn();
let mockPendingBrewSession: any = null;
const mockSetPendingBrewSession = vi.fn();

vi.mock('../ReviewsContext', () => ({
  useReviews: () => ({
    reviews: mockReviews,
    loading: mockLoading,
    addReview: mockAddReview,
    updateReview: mockUpdateReview,
    deleteReview: mockDeleteReview,
    pendingBrewSession: mockPendingBrewSession,
    setPendingBrewSession: mockSetPendingBrewSession,
    refreshReviews: vi.fn(),
  }),
}));

vi.mock('../../stash/StashContext', () => ({
  useStash: () => ({
    beans: mockBeans,
  }),
}));

vi.mock('../../equipment/EquipmentContext', () => ({
  useEquipment: () => ({
    equipment: [...mockGrinders, ...mockBrewers],
    grinders: mockGrinders,
    brewers: mockBrewers,
  }),
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('react-native-keyboard-controller', () => ({
  KeyboardAwareScrollView: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('react-native', () => {
  return {
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
    TextInput: ({
      value,
      onChangeText,
      placeholder,
      accessibilityLabel,
      multiline,
      style,
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
  };
});

vi.mock('react-native-svg', () => ({
  default: () => null,
  Svg: () => null,
  Path: () => null,
  G: () => null,
  Circle: () => null,
}));

vi.mock('lucide-react-native', () => ({
  X: () => <span data-testid="x-icon" />,
  Check: () => <span data-testid="check-icon" />,
  Star: () => <span data-testid="star-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  Minus: () => <span data-testid="minus-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
}));

describe('ReviewModalScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canGoBackMock.mockReturnValue(true);
    mockParams = {};
    mockLoading = false;
    mockReviews = [mockReview];
    mockPendingBrewSession = null;
  });

  afterEach(cleanup);

  it('1. renders loading indicator when id is provided and reviews are still loading', () => {
    mockParams = { id: 'rev-edit-1' };
    mockLoading = true;

    const { getByTestId } = render(<ReviewModalScreen />);
    expect(getByTestId('review-modal-loading')).toBeDefined();
  });

  it('2. renders "Add Review" header for new review', () => {
    mockParams = {};
    const { getByText } = render(<ReviewModalScreen />);

    expect(getByText('Add Review')).toBeDefined();
  });

  it('3. renders "Edit Review" header and prefills review details when editing', () => {
    mockParams = { id: 'rev-edit-1' };
    const { getByText, getByDisplayValue } = render(<ReviewModalScreen />);

    expect(getByText('Edit Review')).toBeDefined();
    expect(getByDisplayValue('Worka Sakaro Anaerobic')).toBeDefined();
    expect(getByDisplayValue('Sey Coffee')).toBeDefined();
  });

  it('4. pre-fills brew parameters from timer params when fromTimer is true', () => {
    mockParams = {
      fromTimer: 'true',
      beanId: 'bean-101',
      brewMethod: 'v60',
      dose: '18',
      water: '300',
      actualTime: '210',
      grind: '18 clicks',
      temp: '94',
      grinderId: 'grinder-1',
      brewerId: 'brewer-1',
    };

    const { getByText, getByDisplayValue } = render(<ReviewModalScreen />);

    expect(getByText('Brew session prefilled from timer')).toBeDefined();
    expect(getByDisplayValue('18')).toBeDefined();
    expect(getByDisplayValue('300')).toBeDefined();
    expect(getByDisplayValue('18 clicks')).toBeDefined();
  });

  it('5. shows discard confirmation alert when closing a dirty form', () => {
    mockParams = {};
    const { getByPlaceholderText, getByLabelText } = render(<ReviewModalScreen />);

    const coffeeInput = getByPlaceholderText(/Coffee Name/i);
    fireEvent.change(coffeeInput, { target: { value: 'Dirty Coffee' } });

    const closeBtn = getByLabelText('Close modal');
    fireEvent.click(closeBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard Changes?',
      expect.stringContaining('unsaved'),
      expect.any(Array)
    );
  });

  it('6. saves a new review when SAVE REVIEW is pressed', async () => {
    mockParams = {};
    const { getByPlaceholderText, getByLabelText } = render(<ReviewModalScreen />);

    const coffeeInput = getByPlaceholderText(/Coffee Name/i);
    fireEvent.change(coffeeInput, { target: { value: 'New Geisha' } });

    const roasterInput = getByPlaceholderText(/Roaster/i);
    fireEvent.change(roasterInput, { target: { value: 'Panama Roasters' } });

    const saveBtn = getByLabelText('Save review');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockAddReview).toHaveBeenCalledWith(
        expect.objectContaining({
          beanNameSnapshot: 'New Geisha',
          roasterSnapshot: 'Panama Roasters',
        })
      );
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('7. saves updates when editing an existing review', async () => {
    mockParams = { id: 'rev-edit-1' };
    const { getByPlaceholderText, getByLabelText } = render(<ReviewModalScreen />);

    const notesInput = getByPlaceholderText(/Impressions/i);
    fireEvent.change(notesInput, { target: { value: 'Updated impressions note' } });

    const saveBtn = getByLabelText('Save review');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateReview).toHaveBeenCalledWith(
        'rev-edit-1',
        expect.objectContaining({
          notes: 'Updated impressions note',
        })
      );
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('8. confirms and deletes review in edit mode', async () => {
    mockParams = { id: 'rev-edit-1' };
    const { getByLabelText } = render(<ReviewModalScreen />);

    const deleteBtn = getByLabelText('Delete Review');
    fireEvent.click(deleteBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Review?',
      expect.stringContaining('cannot be undone'),
      expect.any(Array)
    );

    // Trigger the destructive action from the alert
    const alertCalls = vi.mocked(Alert.alert).mock.calls;
    const buttons = alertCalls[0][2];
    const deleteAction = buttons?.find((b: any) => b.style === 'destructive');
    deleteAction?.onPress?.();

    await waitFor(() => {
      expect(mockDeleteReview).toHaveBeenCalledWith('rev-edit-1');
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('9. falls back to router.replace("/(tabs)/reviews") when router.canGoBack is false', () => {
    canGoBackMock.mockReturnValue(false);
    const { getByLabelText } = render(<ReviewModalScreen />);

    const closeBtn = getByLabelText('Close modal');
    fireEvent.click(closeBtn);

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/reviews');
  });

  it('10. prompts discard alert when SCA scores are modified', () => {
    const { getByLabelText, getByText } = render(<ReviewModalScreen />);

    // Click Clear (0) to change scores from baseline
    fireEvent.click(getByText('Clear (0)'));

    const closeBtn = getByLabelText('Close modal');
    fireEvent.click(closeBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard Changes?',
      'You have unsaved review changes that will be lost.',
      expect.any(Array)
    );
  });

  it('11. prompts discard alert when equipment is selected or changed', () => {
    const { getByLabelText } = render(<ReviewModalScreen />);

    // Select grinder
    const grinderChip = getByLabelText('Select grinder Fellow Ode Gen 2');
    fireEvent.click(grinderChip);

    const closeBtn = getByLabelText('Close modal');
    fireEvent.click(closeBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard Changes?',
      'You have unsaved review changes that will be lost.',
      expect.any(Array)
    );
  });

  it('12. allows clearing grindSetting on edit mode', async () => {
    mockParams = { id: 'rev-edit-1' };
    const { getByLabelText } = render(<ReviewModalScreen />);

    const grindInput = getByLabelText('Grind Setting');
    fireEvent.change(grindInput, { target: { value: '' } });

    const saveBtn = getByLabelText('Save review');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateReview).toHaveBeenCalledWith(
        'rev-edit-1',
        expect.objectContaining({
          grindSetting: '',
        })
      );
    });
  });

  it('13. allows deselecting equipment on edit and clears equipment snapshots', async () => {
    mockParams = { id: 'rev-edit-1' };
    const { getByLabelText } = render(<ReviewModalScreen />);

    // Deselect grinder-1 (currently active)
    const grinderChip = getByLabelText('Select grinder Fellow Ode Gen 2');
    fireEvent.click(grinderChip);

    const saveBtn = getByLabelText('Save review');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateReview).toHaveBeenCalledWith(
        'rev-edit-1',
        expect.objectContaining({
          grinderId: undefined,
          grinderSnapshot: undefined,
        })
      );
    });
  });
});
