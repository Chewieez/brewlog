/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import TimerScreen from '../../app/(tabs)/index';

const mockSetActiveTimerRecipe = vi.fn();
const mockActiveTimerRecipe = {
  ...DEFAULT_PRESET_RECIPES[0],
  name: 'Active Custom V60',
  coffeeDoseGrams: 20,
};

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
    <div>
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
      <span>{value}</span>
    </div>
  ),
  Alert: {
    alert: vi.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('../../src/features/recipes/RecipeContext', () => ({
  useRecipes: () => ({
    recipes: [mockActiveTimerRecipe, ...DEFAULT_PRESET_RECIPES],
    activeTimerRecipe: mockActiveTimerRecipe,
    activeTimerDose: 20,
    setActiveTimerRecipe: mockSetActiveTimerRecipe,
  }),
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

describe('TimerScreen Recipe Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders active recipe from RecipeContext on TimerHero faceplate', () => {
    const { getByText } = render(<TimerScreen />);

    expect(getByText('Active Custom V60')).toBeDefined();
    expect(getByText('20')).toBeDefined(); // text input value
  });

  it('switches to preset method when method pill is selected', () => {
    const { getByText } = render(<TimerScreen />);

    fireEvent.click(getByText('AEROPRESS'));
    expect(mockSetActiveTimerRecipe).toHaveBeenCalled();
  });
});
