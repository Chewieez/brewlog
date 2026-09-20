/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

const mockAlert = vi.fn();

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
    hitSlop,
    style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      aria-selected={accessibilityState?.selected}
      {...props}
    >
      {children}
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

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
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
}));

vi.mock('react-native-svg', () => ({
  default: () => null,
  Svg: () => null,
  Path: () => null,
}));

import { render, fireEvent, cleanup, act } from '@testing-library/react';
import TimerScreen from '../../app/(tabs)/index';

describe('TimerScreen - Method Pill Tap & Active Brew Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('switches recipe cleanly when timer is not running or started', () => {
    const { getByText } = render(<TimerScreen />);

    // Initially V60 is selected
    expect(getByText('V60')).toBeDefined();

    // Tap AeroPress pill while idle
    fireEvent.click(getByText('AEROPRESS'));

    // Should switch without showing an alert
    expect(mockAlert).not.toHaveBeenCalled();
    expect(getByText(/AeroPress Inverted/i)).toBeDefined();
  });

  it('guards with confirmation alert when timer is actively running', () => {
    const { getByText, getByLabelText } = render(<TimerScreen />);

    // Start timer
    const startButton = getByLabelText('Start brew timer');
    fireEvent.click(startButton);

    // Try tapping Flair pill while running
    fireEvent.click(getByText('FLAIR'));

    // Must present confirmation alert
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockAlert).toHaveBeenCalledWith(
      'Switch Brew Method?',
      'A brew is currently in progress. Switching methods will reset your timer.',
      expect.any(Array)
    );

    // Verify buttons passed to Alert
    const alertButtons = mockAlert.mock.calls[0][2];
    expect(alertButtons).toHaveLength(2);
    expect(alertButtons[0].text).toBe('Cancel');
    expect(alertButtons[1].text).toBe('Reset & Switch');

    // Canceling leaves recipe unchanged (still V60)
    expect(getByText(/Ultimate V60/i)).toBeDefined();

    // Confirming reset & switch executes the switch
    act(() => {
      alertButtons[1].onPress();
    });
    expect(getByText(/Flair 58 Lever Extraction/i)).toBeDefined();
  });

  it('guards with confirmation alert when timer is paused mid-brew', () => {
    vi.useFakeTimers();
    const { getByText, getByLabelText } = render(<TimerScreen />);

    // Start timer
    const startButton = getByLabelText('Start brew timer');
    fireEvent.click(startButton);

    // Advance 5 seconds into the brew
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Pause timer
    const pauseButton = getByLabelText('Pause timer');
    fireEvent.click(pauseButton);

    // Try tapping AeroPress pill while paused mid-brew
    fireEvent.click(getByText('AEROPRESS'));

    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockAlert).toHaveBeenCalledWith(
      'Switch Brew Method?',
      'A brew is currently in progress. Switching methods will reset your timer.',
      expect.any(Array)
    );
    vi.useRealTimers();
  });

  it('does nothing when tapping the currently active method pill', () => {
    const { getByText } = render(<TimerScreen />);

    // Tap V60 when V60 is already active
    fireEvent.click(getByText('V60'));

    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('adjusts dose via inline timer input and rescales recipe water target', () => {
    const { getByLabelText, getByText } = render(<TimerScreen />);

    // Initial V60: 30g coffee, 500g water
    expect(getByText('500g')).toBeDefined();

    // Change dose via inline input: 30g -> 20g
    const timerDoseInput = getByLabelText('Timer coffee dose in grams') as HTMLInputElement;
    expect(timerDoseInput.value).toBe('30');

    fireEvent.change(timerDoseInput, { target: { value: '20' } });
    fireEvent.blur(timerDoseInput);

    expect(timerDoseInput.value).toBe('20');
    expect(getByText('333g')).toBeDefined();
  });

  it('locks dose input to read-only while timer is running', () => {
    const { getByLabelText, getByText, queryByLabelText } = render(<TimerScreen />);

    const startButton = getByLabelText('Start brew timer');
    fireEvent.click(startButton);

    // Dose input is locked to read-only static text while running
    expect(queryByLabelText('Timer coffee dose in grams')).toBeNull();
    expect(getByText('30g')).toBeDefined();
  });

  it('applies custom dose from CollapsibleCalculator to timer and rescales recipe', () => {
    const { getByLabelText, getByText } = render(<TimerScreen />);

    // Open calculator
    const calcToggle = getByLabelText('Toggle Ratio Calculator');
    fireEvent.click(calcToggle);

    // Change dose input in calculator to 20
    const doseInput = getByLabelText('Coffee dose in grams');
    fireEvent.change(doseInput, { target: { value: '20' } });

    // Click Apply Dose
    const applyBtn = getByLabelText('Apply dose to timer');
    fireEvent.click(applyBtn);

    // TimerHero should now show 20g dose in input and 333g water target
    const heroDoseInput = getByLabelText('Timer coffee dose in grams') as HTMLInputElement;
    expect(heroDoseInput.value).toBe('20');
    expect(getByText('333g')).toBeDefined();
  });
});
