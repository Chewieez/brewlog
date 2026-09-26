/** @vitest-environment jsdom */
import React from 'react';
import { render, fireEvent as rtlFireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TimerScreen from '../../app/(tabs)/index';
import { StashContextValue, StashContext } from '../../src/features/stash/StashContext';
import { RecipeContextValue, RecipeContext } from '../../src/features/recipes/RecipeContext';
import { Bean, DEFAULT_PRESET_RECIPES } from '@brewlog/core';

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
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('react-native', () => ({
  View: ({ children, style: _s, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  Text: ({ children, style: _s, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <span {...props}>{children}</span>
  ),
  ScrollView: ({ children, style: _s, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState: _as,
    hitSlop: _hs,
    style: _s,
    ...props
  }: {
    children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityState?: { selected?: boolean };
    hitSlop?: unknown;
    style?: unknown;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      onClick={onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
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
  }: {
    onChangeText?: (text: string) => void;
    onBlur?: () => void;
    onSubmitEditing?: () => void;
    value?: string;
    accessibilityLabel?: string;
    [key: string]: unknown;
  }) => (
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
    alert: vi.fn(),
  },
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
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
}));

vi.mock('react-native-svg', () => ({
  default: () => null,
  Svg: () => null,
  Path: () => null,
}));

vi.mock('../../src/hooks/useMobileBrewTimer', () => ({
  useMobileBrewTimer: () => ({
    elapsedSeconds: 180,
    isRunning: false,
    isFinished: true, // completed brew
    isMuted: false,
    currentStageIndex: 0,
    currentStage: null,
    totalProgress: 1,
    toggleTimer: vi.fn(),
    reset: vi.fn(),
    toggleMute: vi.fn(),
  }),
}));

const fireEvent = {
  ...rtlFireEvent,
  press: (element: Element | Node | Document | Window) => {
    rtlFireEvent.click(element);
  },
};

describe('Timer & Stash Integration', () => {
  const activeBean: Bean = {
    id: 'bean-1',
    roaster: 'Sey',
    name: 'Worka Sakaro',
    remainingGrams: 200,
    flavorNotes: [],
    createdAt: '2026-09-01T00:00:00Z',
  };

  const mockStash: StashContextValue = {
    beans: [activeBean],
    activeBeans: [activeBean],
    frozenBeans: [],
    archivedBeans: [],
    activeBrewBean: { ...activeBean },
    loading: false,
    addBean: vi.fn(),
    updateBean: vi.fn(),
    deleteBean: vi.fn(),
    toggleFavorite: vi.fn(),
    toggleFrozen: vi.fn(),
    archiveBean: vi.fn(),
    unarchiveBean: vi.fn(),
    setActiveBrewBean: vi.fn(),
    deductBeanDose: vi.fn().mockImplementation(async (id: string, dose: number) => {
      if (mockStash.activeBrewBean && mockStash.activeBrewBean.id === id) {
        mockStash.activeBrewBean = {
          ...mockStash.activeBrewBean,
          remainingGrams: Math.max(0, (mockStash.activeBrewBean.remainingGrams ?? 0) - dose),
        };
      }
    }),
    refreshBeans: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStash.activeBrewBean = { ...activeBean };
  });

  afterEach(() => {
    cleanup();
  });

  const mockRecipes: RecipeContextValue = {
    recipes: DEFAULT_PRESET_RECIPES,
    customRecipes: [],
    presets: DEFAULT_PRESET_RECIPES,
    loading: false,
    activeTimerRecipe: DEFAULT_PRESET_RECIPES[0],
    activeTimerDose: 15,
    addRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    setActiveTimerRecipe: vi.fn(),
    refreshRecipes: vi.fn(),
  };

  it('renders active bean pill in timer chassis and deducts dose upon completion', async () => {
    const { getByText } = render(
      <StashContext.Provider value={mockStash}>
        <RecipeContext.Provider value={mockRecipes}>
          <TimerScreen />
        </RecipeContext.Provider>
      </StashContext.Provider>
    );

    expect(getByText(/SEY • Worka Sakaro/)).toBeTruthy();
    expect(getByText(/200g left/)).toBeTruthy();

    // Deduct button in finished banner
    const deductBtn = getByText('DEDUCT 15g FROM STASH');
    fireEvent.press(deductBtn);

    await waitFor(() => {
      expect(mockStash.deductBeanDose).toHaveBeenCalledWith('bean-1', 15);
    });
  });

  it('detaches active bean when detach button is pressed', () => {
    const { getByLabelText } = render(
      <StashContext.Provider value={mockStash}>
        <RecipeContext.Provider value={mockRecipes}>
          <TimerScreen />
        </RecipeContext.Provider>
      </StashContext.Provider>
    );

    const detachBtn = getByLabelText('Detach active bean');
    fireEvent.press(detachBtn);

    expect(mockStash.setActiveBrewBean).toHaveBeenCalledWith(null);
  });

  it('does not render active bean pill or deduct button when activeBrewBean is null', () => {
    const emptyStash: StashContextValue = { ...mockStash, activeBrewBean: null };
    const { queryByText, queryByLabelText } = render(
      <StashContext.Provider value={emptyStash}>
        <RecipeContext.Provider value={mockRecipes}>
          <TimerScreen />
        </RecipeContext.Provider>
      </StashContext.Provider>
    );

    expect(queryByText(/Worka Sakaro/)).toBeNull();
    expect(queryByLabelText('Detach active bean')).toBeNull();
    expect(queryByText(/DEDUCT .* FROM STASH/)).toBeNull();
  });

  it('shows updated remaining weight confirmation banner after deduction', async () => {
    const { getByText } = render(
      <StashContext.Provider value={mockStash}>
        <RecipeContext.Provider value={mockRecipes}>
          <TimerScreen />
        </RecipeContext.Provider>
      </StashContext.Provider>
    );

    const deductBtn = getByText('DEDUCT 15g FROM STASH');
    fireEvent.press(deductBtn);

    await waitFor(() => {
      expect(getByText(/Updated: 185g left/)).toBeTruthy();
    });
  });
});
