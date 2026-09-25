/** @vitest-environment jsdom */
import React from 'react';
import { render, fireEvent as rtlFireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TimerScreen from '../../app/(tabs)/index';
import { RecipeProvider } from '../../src/features/recipes/RecipeContext';
import { StashProvider } from '../../src/features/stash/StashContext';

// Mock router and alert
const mockPush = vi.fn();
const mockAlert = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

vi.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 0,
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
  }),
}));

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, ...props }: any) => <span {...props}>{children}</span>,
  ScrollView: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    disabled,
    hitSlop,
    style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={disabled ? undefined : onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      aria-selected={accessibilityState?.selected}
      disabled={disabled}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  ),
  TextInput: ({
    onChangeText,
    onBlur,
    onSubmitEditing,
    value,
    accessibilityLabel,
    ...props
  }: any) => (
    <input
      value={value}
      aria-label={accessibilityLabel}
      onChange={(e) => onChangeText?.(e.target.value)}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSubmitEditing?.();
      }}
      {...props}
    />
  ),
  Alert: {
    alert: (...args: any[]) => mockAlert(...args),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('../../src/lib/mobileFeedback', () => ({
  mobileFeedback: {
    triggerHapticCountdown: vi.fn(),
    triggerHapticStageTransition: vi.fn(),
    triggerHapticBrewComplete: vi.fn(),
    triggerHapticTap: vi.fn(),
    playChime: vi.fn(),
  },
}));

vi.mock('lucide-react-native', () => ({
  ChevronDown: () => null,
  ChevronUp: () => null,
  ChevronRight: () => null,
  Calculator: () => null,
  CheckCircle2: () => null,
  CircleDot: () => null,
  Circle: () => null,
  Play: () => null,
  Pause: () => null,
  RotateCcw: () => null,
  Volume2: () => null,
  VolumeX: () => null,
  Minus: () => null,
  Plus: () => null,
  Check: () => null,
  Trash2: () => null,
  Award: () => null,
}));

vi.mock('react-native-svg', () => ({
  default: () => null,
  Svg: () => null,
  Path: () => null,
}));

const fireEvent = {
  ...rtlFireEvent,
  press: (element: Element | Node | Document | Window) => {
    rtlFireEvent.click(element);
  },
};

describe('TimerScreen Free Brew Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('switches to Free Brew mode and renders stopwatch faceplate with split controls', () => {
    const { getByText } = render(
      <RecipeProvider>
        <StashProvider>
          <TimerScreen />
        </StashProvider>
      </RecipeProvider>
    );

    // Initial state: GUIDED RECIPE selected
    expect(getByText('GUIDED RECIPE')).toBeTruthy();
    expect(getByText('FREE BREW')).toBeTruthy();

    // Switch to Free Brew
    fireEvent.press(getByText('FREE BREW'));

    expect(getByText('FREE BREW · MANUAL STOPWATCH')).toBeTruthy();
    expect(getByText('+ BLOOM')).toBeTruthy();
    expect(getByText('+ POUR 1')).toBeTruthy();
    expect(getByText('+ DRAWDOWN')).toBeTruthy();
  });

  it('records splits via quick tags and finishes brew with Save as Recipe CTA', () => {
    const { getByText } = render(
      <RecipeProvider>
        <StashProvider>
          <TimerScreen />
        </StashProvider>
      </RecipeProvider>
    );

    fireEvent.press(getByText('FREE BREW'));

    // Start stopwatch
    fireEvent.press(getByText('START BREW'));

    // Tap Bloom tag chip
    fireEvent.press(getByText('+ BLOOM'));
    expect(getByText('Bloom')).toBeTruthy();

    // Tap Finish Brew
    fireEvent.press(getByText('FINISH BREW'));

    expect(getByText('BREW COMPLETE')).toBeTruthy();
    expect(getByText('SAVE AS CUSTOM RECIPE')).toBeTruthy();
    expect(getByText('LOG TO CUPPING JOURNAL')).toBeTruthy();

    // Click Save as Custom Recipe
    fireEvent.press(getByText('SAVE AS CUSTOM RECIPE'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/recipes/modal',
      })
    );
  });

  it('guards with confirmation alert when attempting to switch modes during an active brew session', () => {
    const { getByText, getByLabelText } = render(
      <RecipeProvider>
        <StashProvider>
          <TimerScreen />
        </StashProvider>
      </RecipeProvider>
    );

    // Start timer in GUIDED RECIPE mode
    const startButton = getByLabelText('Start brew timer');
    fireEvent.press(startButton);

    // Attempt to switch to FREE BREW while actively running
    fireEvent.press(getByText('FREE BREW'));

    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockAlert).toHaveBeenCalledWith(
      'Switch Timer Mode?',
      'A brew is currently in progress. Switching modes will reset your timer.',
      expect.any(Array)
    );

    const alertButtons = mockAlert.mock.calls[0][2];
    expect(alertButtons).toHaveLength(2);
    expect(alertButtons[0].text).toBe('Cancel');
    expect(alertButtons[1].text).toBe('Reset & Switch');

    // Canceling keeps GUIDED RECIPE mode
    expect(getByText(/Ultimate V60/i)).toBeDefined();

    // Confirming executes reset and switches to FREE BREW
    act(() => {
      alertButtons[1].onPress();
    });
    expect(getByText('FREE BREW · MANUAL STOPWATCH')).toBeDefined();
  });

  it('formats recorded splits into notes when logging to cupping journal', () => {
    const { getByText } = render(
      <RecipeProvider>
        <StashProvider>
          <TimerScreen />
        </StashProvider>
      </RecipeProvider>
    );

    fireEvent.press(getByText('FREE BREW'));
    fireEvent.press(getByText('START BREW'));

    // Record two splits
    fireEvent.press(getByText('+ BLOOM'));
    fireEvent.press(getByText('+ POUR 1'));

    fireEvent.press(getByText('FINISH BREW'));

    fireEvent.press(getByText('LOG TO CUPPING JOURNAL'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/cupping',
        params: expect.objectContaining({
          notes: expect.stringContaining('Free Brew Splits:'),
        }),
      })
    );
  });
});

