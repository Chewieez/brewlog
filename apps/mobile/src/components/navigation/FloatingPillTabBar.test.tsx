/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';

const mockKeyboardListeners: Record<string, () => void> = {};

vi.mock('react-native', () => ({
  View: ({ children, testID, style, accessibilityRole, onLayout, ...props }: any) => (
    <div data-testid={testID} role={accessibilityRole} {...props}>{children}</div>
  ),
  Text: ({ children, style, numberOfLines, ...props }: any) => <span {...props}>{children}</span>,
  Pressable: ({ children, onPress, accessibilityLabel, accessibilityRole, accessibilityState, style, android_ripple, ...props }: any) => (
    <button
      type="button"
      onClick={onPress}
      aria-label={accessibilityLabel}
      role={accessibilityRole}
      aria-selected={accessibilityState?.selected}
      {...props}
    >
      {children}
    </button>
  ),
  Keyboard: {
    addListener: vi.fn((event: string, callback: () => void) => {
      mockKeyboardListeners[event] = callback;
      return {
        remove: () => {
          delete mockKeyboardListeners[event];
        },
      };
    }),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Platform: {
    OS: 'android',
    select: (obj: any) => obj.android ?? obj.default,
  },
  Dimensions: {
    get: () => ({ width: 400, height: 800 }),
  },
  Animated: {
    Value: class {
      val: number;
      constructor(val: number) {
        this.val = val;
      }
      setValue(val: number) {
        this.val = val;
      }
    },
    spring: () => ({
      start: (cb?: () => void) => cb?.(),
    }),
    View: ({ children, testID, style, pointerEvents, ...props }: any) => (
      <div data-testid={testID} {...props}>{children}</div>
    ),
  },
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 16, left: 0 }),
}));

vi.mock('lucide-react-native', () => ({
  Timer: () => <span data-testid="icon-timer" />,
  BookOpen: () => <span data-testid="icon-recipes" />,
  Bean: () => <span data-testid="icon-stash" />,
  Scale: () => <span data-testid="icon-equipment" />,
  Award: () => <span data-testid="icon-reviews" />,
}));

const mockTriggerHapticTap = vi.fn();
vi.mock('../../lib/mobileFeedback', () => ({
  mobileFeedback: {
    triggerHapticTap: () => mockTriggerHapticTap(),
  },
}));

import { FloatingPillTabBar } from './FloatingPillTabBar';

describe('FloatingPillTabBar', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const routes = [
    { key: 'index-key', name: 'index' },
    { key: 'stash-key', name: 'stash' },
    { key: 'recipes-key', name: 'recipes' },
    { key: 'equipment-key', name: 'equipment' },
    { key: 'reviews-key', name: 'reviews' },
  ];

  it('renders all tabs and highlights the active route', () => {
    const { getByLabelText, getByTestId } = render(
      <FloatingPillTabBar
        state={{ index: 0, routes }}
        navigateToTab={vi.fn()}
      />
    );

    expect(getByTestId('floating-pill-tab-bar')).toBeDefined();

    const timerTab = getByLabelText('Timer tab');
    const stashTab = getByLabelText('Stash tab');
    const recipesTab = getByLabelText('Recipes tab');
    const equipmentTab = getByLabelText('Equipment tab');
    const reviewsTab = getByLabelText('Reviews tab');

    expect(timerTab.getAttribute('aria-selected')).toBe('true');
    expect(stashTab.getAttribute('aria-selected')).toBe('false');
    expect(recipesTab.getAttribute('aria-selected')).toBe('false');
    expect(equipmentTab.getAttribute('aria-selected')).toBe('false');
    expect(reviewsTab.getAttribute('aria-selected')).toBe('false');
  });

  it('navigates and triggers haptic tap when an inactive tab is pressed', () => {
    const navigateToTab = vi.fn();
    const { getByLabelText } = render(
      <FloatingPillTabBar
        state={{ index: 0, routes }}
        navigateToTab={navigateToTab}
      />
    );

    const stashTab = getByLabelText('Stash tab');
    fireEvent.click(stashTab);

    expect(mockTriggerHapticTap).toHaveBeenCalledTimes(1);
    expect(navigateToTab).toHaveBeenCalledWith('stash-key');
  });

  it('does not re-navigate or re-trigger haptics if the active tab is pressed', () => {
    const navigateToTab = vi.fn();
    const { getByLabelText } = render(
      <FloatingPillTabBar
        state={{ index: 0, routes }}
        navigateToTab={navigateToTab}
      />
    );

    const timerTab = getByLabelText('Timer tab');
    fireEvent.click(timerTab);

    expect(mockTriggerHapticTap).not.toHaveBeenCalled();
    expect(navigateToTab).not.toHaveBeenCalled();
  });
});
