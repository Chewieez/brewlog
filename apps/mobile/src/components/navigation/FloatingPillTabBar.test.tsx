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
  Pressable: ({ children, onPress, onLongPress, accessibilityLabel, accessibilityRole, accessibilityState, style, android_ripple, ...props }: any) => (
    <button
      type="button"
      onClick={onPress}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.();
      }}
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

  it('emits tabPress for both active and inactive tabs', () => {
    const emit = vi.fn().mockReturnValue({ defaultPrevented: false });
    const navigate = vi.fn();
    const { getByLabelText } = render(
      <FloatingPillTabBar
        state={{ index: 0, routes }}
        navigation={{ emit, navigate }}
      />
    );

    // Active tab press
    const timerTab = getByLabelText('Timer tab');
    fireEvent.click(timerTab);
    expect(emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'index-key',
      canPreventDefault: true,
    });
    expect(navigate).not.toHaveBeenCalled();

    // Inactive tab press
    const stashTab = getByLabelText('Stash tab');
    fireEvent.click(stashTab);
    expect(emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'stash-key',
      canPreventDefault: true,
    });
    expect(navigate).toHaveBeenCalledWith('stash', undefined);
    expect(mockTriggerHapticTap).toHaveBeenCalledTimes(1);
  });

  it('prevents navigation when tabPress event is defaultPrevented', () => {
    const emit = vi.fn().mockReturnValue({ defaultPrevented: true });
    const navigate = vi.fn();
    const { getByLabelText } = render(
      <FloatingPillTabBar
        state={{ index: 0, routes }}
        navigation={{ emit, navigate }}
      />
    );

    const stashTab = getByLabelText('Stash tab');
    fireEvent.click(stashTab);

    expect(emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'stash-key',
      canPreventDefault: true,
    });
    expect(mockTriggerHapticTap).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('emits tabLongPress on long press', () => {
    const emit = vi.fn();
    const { getByLabelText } = render(
      <FloatingPillTabBar
        state={{ index: 0, routes }}
        navigation={{ emit, navigate: vi.fn() }}
      />
    );

    const stashTab = getByLabelText('Stash tab');
    fireEvent.contextMenu(stashTab);

    expect(emit).toHaveBeenCalledWith({
      type: 'tabLongPress',
      target: 'stash-key',
    });
  });

  it('emits tabPress and tabLongPress via emitter when provided', () => {
    const emit = vi.fn().mockReturnValue({ defaultPrevented: false });
    const navigateToTab = vi.fn();
    const { getByLabelText } = render(
      <FloatingPillTabBar
        state={{ index: 0, routes }}
        emitter={{ emit }}
        navigateToTab={navigateToTab}
      />
    );

    const timerTab = getByLabelText('Timer tab');
    fireEvent.click(timerTab);
    expect(emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'index-key',
      canPreventDefault: true,
    });
    expect(navigateToTab).not.toHaveBeenCalled();

    const stashTab = getByLabelText('Stash tab');
    fireEvent.click(stashTab);
    expect(emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'stash-key',
      canPreventDefault: true,
    });
    expect(navigateToTab).toHaveBeenCalledWith('stash-key');

    fireEvent.contextMenu(stashTab);
    expect(emit).toHaveBeenCalledWith({
      type: 'tabLongPress',
      target: 'stash-key',
    });
  });
});
