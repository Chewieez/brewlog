/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';

const mockKeyboardListeners: Record<string, () => void> = {};
const mockTiming = vi.fn((_value?: any, _config?: any) => ({
  start: (cb?: () => void) => cb?.(),
}));
const mockSpring = vi.fn((_value?: any, _config?: any) => ({
  start: (cb?: () => void) => cb?.(),
}));

const flattenStyle = (style: any) => {
  if (!style) return undefined;
  const flat = Array.isArray(style)
    ? Object.assign({}, ...style.flat(Infinity).filter(Boolean))
    : { ...style };
  for (const k in flat) {
    if (flat[k] && typeof flat[k] === 'object' && 'val' in flat[k]) {
      flat[k] = flat[k].val;
    }
  }
  return flat;
};

vi.mock('react-native', () => ({
  View: ({ children, testID, style, accessibilityRole, onLayout, ...props }: any) => {
    React.useEffect(() => {
      if (onLayout) {
        onLayout({
          nativeEvent: {
            layout: { x: 10, y: 0, width: 68, height: 48 },
          },
        });
      }
    }, [onLayout]);
    return (
      <div data-testid={testID} role={accessibilityRole} style={flattenStyle(style)} {...props}>
        {children}
      </div>
    );
  },
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
    timing: (value: any, config: any) => mockTiming(value, config),
    spring: (value: any, config: any) => mockSpring(value, config),
    View: ({ children, testID, style, pointerEvents, ...props }: any) => (
      <div data-testid={testID} style={flattenStyle(style)} {...props}>{children}</div>
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
        navigation={{ navigate: vi.fn(), emit: vi.fn() }}
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
    const navigate = vi.fn();
    const { getByLabelText } = render(
      <FloatingPillTabBar
        state={{ index: 0, routes }}
        navigation={{ navigate, emit: vi.fn() }}
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
    const navigate = vi.fn();
    const { getByLabelText } = render(
      <FloatingPillTabBar
        state={{ index: 0, routes }}
        navigation={{ navigate, emit: vi.fn() }}
        navigateToTab={navigateToTab}
      />
    );

    const timerTab = getByLabelText('Timer tab');
    fireEvent.click(timerTab);

    expect(mockTriggerHapticTap).not.toHaveBeenCalled();
    expect(navigateToTab).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
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

  it('measures tab layout on mount and initializes indicator position with fade-in opacity', () => {
    const { getByTestId } = render(
      <FloatingPillTabBar
        state={{ index: 0, routes }}
        navigation={{ navigate: vi.fn(), emit: vi.fn() }}
      />
    );

    const indicator = getByTestId('sliding-pill-indicator');
    expect(indicator).toBeDefined();
    expect(mockTiming).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    );
  });

  it('animates indicator with spring on subsequent tab transitions', () => {
    const { rerender } = render(
      <FloatingPillTabBar
        state={{ index: 0, routes }}
        navigation={{ navigate: vi.fn(), emit: vi.fn() }}
      />
    );

    // Initial layout causes timing animation (fade in)
    expect(mockTiming).toHaveBeenCalled();

    // Rerender with focused tab changed to index 1
    rerender(
      <FloatingPillTabBar
        state={{ index: 1, routes }}
        navigation={{ navigate: vi.fn(), emit: vi.fn() }}
      />
    );

    expect(mockSpring).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      })
    );
  });

  it('navigates via standard navigation.navigate when navigateToTab is omitted', () => {
    const navigate = vi.fn();
    const emit = vi.fn().mockReturnValue({ defaultPrevented: false });
    const { getByLabelText } = render(
      <FloatingPillTabBar
        state={{ index: 0, routes }}
        navigation={{ navigate, emit }}
      />
    );

    const recipesTab = getByLabelText('Recipes tab');
    fireEvent.click(recipesTab);

    expect(emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'recipes-key',
      canPreventDefault: true,
    });
    expect(navigate).toHaveBeenCalledWith('recipes', undefined);
    expect(mockTriggerHapticTap).toHaveBeenCalledTimes(1);
  });
});
