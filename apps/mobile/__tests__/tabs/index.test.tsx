/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { DEFAULT_PRESET_RECIPES, DEFAULT_USER_SETTINGS } from '@brewlog/core';
import { SettingsContext, SettingsContextValue } from '../../src/features/settings/SettingsContext';

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

let mockSearchParams: { mode?: string } = { mode: 'recipe' };

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useLocalSearchParams: () => mockSearchParams,
  useScrollToTop: vi.fn(),
}));

vi.mock('../../src/features/recipes/RecipeContext', () => ({
  useRecipes: () => {
    const [activeTimerRecipe, setActiveRecipe] = React.useState(DEFAULT_PRESET_RECIPES[0]);
    const [activeTimerDose, setActiveDose] = React.useState(
      DEFAULT_PRESET_RECIPES[0].coffeeDoseGrams
    );
    return {
      recipes: DEFAULT_PRESET_RECIPES,
      customRecipes: [],
      presets: DEFAULT_PRESET_RECIPES,
      loading: false,
      activeTimerRecipe,
      activeTimerDose,
      setActiveTimerRecipe: (recipe: any, dose?: number) => {
        setActiveRecipe(recipe);
        setActiveDose(dose !== undefined && dose > 0 ? dose : recipe.coffeeDoseGrams);
      },
    };
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

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('lucide-react-native', () => ({
  ChevronDown: () => null,
  ChevronUp: () => null,
  ChevronRight: () => null,
  Calculator: () => null,
  Scale: () => null,
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
  User: () => null,
}));

vi.mock('react-native-svg', () => ({
  default: () => null,
  Svg: () => null,
  Path: () => null,
}));

import { render, fireEvent, cleanup, act } from '@testing-library/react';
import TimerScreen from '../../app/(tabs)/index';

describe('TimerScreen - Mode Switch & Active Brew Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('switches timer mode cleanly when timer is not running or started', () => {
    const { getByText } = render(<TimerScreen />);

    // Tap FREE BREW mode button while idle
    fireEvent.click(getByText('FREE BREW'));

    // Should switch without showing an alert
    expect(mockAlert).not.toHaveBeenCalled();
    expect(getByText('MANUAL STOPWATCH')).toBeDefined();
  });

  it('guards with confirmation alert when timer is actively running and switching mode', () => {
    const { getByText, getByLabelText } = render(<TimerScreen />);

    // Start timer
    const startButton = getByLabelText('Start brew timer');
    fireEvent.click(startButton);

    // Try tapping FREE BREW while running
    fireEvent.click(getByText('FREE BREW'));

    // Must present confirmation alert
    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockAlert).toHaveBeenCalledWith(
      'Switch Timer Mode?',
      'A brew is currently in progress. Switching modes will reset your timer.',
      expect.any(Array)
    );

    // Verify buttons passed to Alert
    const alertButtons = mockAlert.mock.calls[0][2];
    expect(alertButtons).toHaveLength(2);
    expect(alertButtons[0].text).toBe('Cancel');
    expect(alertButtons[1].text).toBe('Reset & Switch');

    // Confirming reset & switch executes the switch
    act(() => {
      alertButtons[1].onPress();
    });
    expect(getByText('MANUAL STOPWATCH')).toBeDefined();
  });

  it('guards with confirmation alert when timer is paused mid-brew and switching mode', () => {
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

    // Try tapping FREE BREW while paused mid-brew
    fireEvent.click(getByText('FREE BREW'));

    expect(mockAlert).toHaveBeenCalledTimes(1);
    expect(mockAlert).toHaveBeenCalledWith(
      'Switch Timer Mode?',
      'A brew is currently in progress. Switching modes will reset your timer.',
      expect.any(Array)
    );
    vi.useRealTimers();
  });

  it('does nothing when tapping the currently active mode button', () => {
    const { getByText } = render(<TimerScreen />);

    // Tap GUIDED RECIPE when it is already active
    fireEvent.click(getByText('GUIDED RECIPE'));

    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('adjusts dose via inline timer input and rescales recipe water target', () => {
    const { getByLabelText } = render(<TimerScreen />);

    // Initial V60: 30g coffee, 500g water
    const waterInput = getByLabelText('Timer water target in grams') as HTMLInputElement;
    expect(waterInput.value).toBe('500');

    // Change dose via inline input: 30g -> 20g
    const timerDoseInput = getByLabelText('Timer coffee dose in grams') as HTMLInputElement;
    expect(timerDoseInput.value).toBe('30');

    fireEvent.change(timerDoseInput, { target: { value: '20' } });
    fireEvent.blur(timerDoseInput);

    expect(timerDoseInput.value).toBe('20');
    expect(waterInput.value).toBe('333');
  });

  it('locks dose input to read-only while timer is running', () => {
    const { getByLabelText, getByText, queryByLabelText } = render(<TimerScreen />);

    const startButton = getByLabelText('Start brew timer');
    fireEvent.click(startButton);

    // Dose input is locked to read-only static text while running
    expect(queryByLabelText('Timer coffee dose in grams')).toBeNull();
    expect(getByText('30.0 g')).toBeDefined();
  });

  it('applies custom dose from CollapsibleCalculator to timer and rescales recipe', () => {
    const { getByLabelText } = render(<TimerScreen />);

    // Open calculator
    const calcToggle = getByLabelText('Toggle Ratio Calculator');
    fireEvent.click(calcToggle);

    // Change target coffee input in calculator to 20
    const doseInput = getByLabelText('Target coffee dose in grams');
    fireEvent.change(doseInput, { target: { value: '20' } });

    // Click Apply Dose
    const applyBtn = getByLabelText('Apply dose to timer');
    fireEvent.click(applyBtn);

    // TimerHero should now show 20g dose in input and 334g water target
    const heroDoseInput = getByLabelText('Timer coffee dose in grams') as HTMLInputElement;
    expect(heroDoseInput.value).toBe('20');
    const heroWaterInput = getByLabelText('Timer water target in grams') as HTMLInputElement;
    expect(heroWaterInput.value).toBe('334');
  });

  it('initializes Free Brew mode with default starting values (20g coffee, 1:16 ratio, 320g water target)', () => {
    mockSearchParams = { mode: 'free_brew' };
    const { getByLabelText, getByText } = render(<TimerScreen />);

    expect(getByText('MANUAL STOPWATCH')).toBeDefined();
    const heroDoseInput = getByLabelText('Timer coffee dose in grams') as HTMLInputElement;
    expect(heroDoseInput.value).toBe('20');
    const heroWaterInput = getByLabelText('Timer water target in grams') as HTMLInputElement;
    expect(heroWaterInput.value).toBe('320');
    const heroRatioInput = getByLabelText('Timer brew ratio') as HTMLInputElement;
    expect(heroRatioInput.value).toBe('16');
    expect(getByText('1:')).toBeDefined();
  });

  it('adjusts water target via inline timer input and rescales dose in Guided Recipe mode', () => {
    mockSearchParams = { mode: 'recipe' };
    const { getByLabelText } = render(<TimerScreen />);

    const waterInput = getByLabelText('Timer water target in grams') as HTMLInputElement;
    expect(waterInput.value).toBe('500');

    // Change water target to 300
    fireEvent.change(waterInput, { target: { value: '300' } });
    fireEvent.blur(waterInput);

    expect(waterInput.value).toBe('300');
    // calculateCoffeeDose(300, 16.67) = 18.0g
    const doseInput = getByLabelText('Timer coffee dose in grams') as HTMLInputElement;
    expect(doseInput.value).toBe('18');
  });

  it('adjusts water target via inline timer input and recalculates ratio in Free Brew mode', () => {
    mockSearchParams = { mode: 'free_brew' };
    const { getByLabelText } = render(<TimerScreen />);

    const waterInput = getByLabelText('Timer water target in grams') as HTMLInputElement;
    expect(waterInput.value).toBe('320');

    // Change water target to 300
    fireEvent.change(waterInput, { target: { value: '300' } });
    fireEvent.blur(waterInput);

    expect(waterInput.value).toBe('300');
    // calculateRatio(20, 300) = 15.0
    const ratioInput = getByLabelText('Timer brew ratio') as HTMLInputElement;
    expect(ratioInput.value).toBe('15');
    // Coffee dose remains fixed at 20
    const doseInput = getByLabelText('Timer coffee dose in grams') as HTMLInputElement;
    expect(doseInput.value).toBe('20');
  });

  it('adjusts ratio via inline timer input and changes only coffee dose in Free Brew mode', () => {
    mockSearchParams = { mode: 'free_brew' };
    const { getByLabelText } = render(<TimerScreen />);

    const ratioInput = getByLabelText('Timer brew ratio') as HTMLInputElement;
    expect(ratioInput.value).toBe('16');

    // Change ratio to 15
    fireEvent.change(ratioInput, { target: { value: '15' } });
    fireEvent.blur(ratioInput);

    expect(ratioInput.value).toBe('15');
    // Water remains fixed at 320
    const waterInput = getByLabelText('Timer water target in grams') as HTMLInputElement;
    expect(waterInput.value).toBe('320');
    // calculateCoffeeDose(320, 15) = 21.3
    const doseInput = getByLabelText('Timer coffee dose in grams') as HTMLInputElement;
    expect(doseInput.value).toBe('21.3');
  });
});

describe('TimerScreen - Cold Start Mode Hydration', () => {
  beforeEach(() => {
    mockSearchParams = {};
  });

  afterEach(() => {
    mockSearchParams = { mode: 'recipe' };
    cleanup();
  });

  it('synchronizes timerMode to user default preference once AsyncStorage hydration completes', () => {
    let contextValue: SettingsContextValue = {
      settings: DEFAULT_USER_SETTINGS, // defaultTimerMode: 'free_brew'
      loading: true,
      updateSettings: vi.fn(),
      resetToDefaults: vi.fn(),
    };

    const { getByRole, rerender } = render(
      <SettingsContext.Provider value={contextValue}>
        <TimerScreen />
      </SettingsContext.Provider>
    );

    // Initial render while loading starts in default free brew mode
    const freeBrewTab = getByRole('button', { name: /FREE BREW/i });
    expect(freeBrewTab.getAttribute('aria-selected')).toBe('true');

    // AsyncStorage completes hydration: loading becomes false, settings.defaultTimerMode is 'recipe'
    contextValue = {
      ...contextValue,
      loading: false,
      settings: {
        ...DEFAULT_USER_SETTINGS,
        defaultTimerMode: 'recipe',
      },
    };

    rerender(
      <SettingsContext.Provider value={contextValue}>
        <TimerScreen />
      </SettingsContext.Provider>
    );

    // timerMode synchronizes to 'recipe'
    const recipeTab = getByRole('button', { name: /GUIDED RECIPE/i });
    expect(recipeTab.getAttribute('aria-selected')).toBe('true');
  });

  it('does not overwrite explicit params.mode when hydration completes', () => {
    mockSearchParams = { mode: 'free_brew' };

    let contextValue: SettingsContextValue = {
      settings: DEFAULT_USER_SETTINGS,
      loading: true,
      updateSettings: vi.fn(),
      resetToDefaults: vi.fn(),
    };

    const { getByRole, rerender } = render(
      <SettingsContext.Provider value={contextValue}>
        <TimerScreen />
      </SettingsContext.Provider>
    );

    const freeBrewTab = getByRole('button', { name: /FREE BREW/i });
    expect(freeBrewTab.getAttribute('aria-selected')).toBe('true');

    // AsyncStorage finishes loading with recipe
    contextValue = {
      ...contextValue,
      loading: false,
      settings: {
        ...DEFAULT_USER_SETTINGS,
        defaultTimerMode: 'recipe',
      },
    };

    rerender(
      <SettingsContext.Provider value={contextValue}>
        <TimerScreen />
      </SettingsContext.Provider>
    );

    // Explicit free_brew param is preserved
    expect(freeBrewTab.getAttribute('aria-selected')).toBe('true');
  });
});
