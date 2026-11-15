/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import AuthSheetScreen from '../app/auth/sheet';
import * as AuthContextModule from '../src/features/auth/AuthContext';

const {
  mockDismiss,
  mockBack,
  mockReplace,
  mockCanDismiss,
  mockCanGoBack,
  mockKeyboardDismiss,
  getNavListeners,
  clearNavListeners,
} = vi.hoisted(() => {
  const listeners = new Map<string, Set<(e: any) => void>>();
  return {
    mockDismiss: vi.fn(),
    mockBack: vi.fn(),
    mockReplace: vi.fn(),
    mockCanDismiss: vi.fn(() => true),
    mockCanGoBack: vi.fn(() => true),
    mockKeyboardDismiss: vi.fn(),
    getNavListeners: () => listeners,
    clearNavListeners: () => listeners.clear(),
  };
});

vi.mock('../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: null,
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({
    dismiss: mockDismiss,
    back: mockBack,
    replace: mockReplace,
    canDismiss: mockCanDismiss,
    canGoBack: mockCanGoBack,
  }),
  useNavigation: () => ({
    addListener: (event: string, cb: (e: any) => void) => {
      const listeners = getNavListeners();
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
      return () => {
        listeners.get(event)?.delete(cb);
      };
    },
  }),
  Stack: {
    Screen: ({ options }: any) => (
      <div data-testid="stack-screen-options" data-options={JSON.stringify(options)} />
    ),
  },
}));

vi.mock('react-native', () => ({
  View: ({ children, style, testID, ...props }: any) => (
    <div
      data-testid={testID}
      data-has-grabber={style?.width === 36 && style?.height === 4 ? 'true' : undefined}
      {...props}
    >
      {children}
    </div>
  ),
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  TextInput: ({
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    accessibilityLabel,
    autoCapitalize,
    autoCorrect,
    spellCheck,
    keyboardType,
    textContentType,
    placeholderTextColor,
    autoComplete,
    importantForAutofill,
    style,
    ...props
  }: any) => (
    <input
      value={value}
      placeholder={placeholder}
      aria-label={accessibilityLabel}
      onChange={(e) => onChangeText?.(e.target.value)}
      {...props}
    />
  ),
  TouchableOpacity: ({
    children,
    onPress,
    accessibilityLabel,
    disabled,
    activeOpacity,
    hitSlop,
    style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={disabled ? undefined : onPress}
      aria-label={accessibilityLabel}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    disabled,
    style: _style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={disabled ? undefined : onPress}
      aria-label={accessibilityLabel}
      role={accessibilityRole}
      aria-selected={accessibilityState?.selected}
      disabled={disabled}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  ),
  ScrollView: ({
    children,
    testID,
    bounces,
    contentContainerStyle: _ccs,
    keyboardShouldPersistTaps: _kspt,
    showsVerticalScrollIndicator: _svsi,
    style: _style,
    ...props
  }: any) => (
    <div
      data-testid={testID}
      data-bounces={bounces === false ? 'false' : 'true'}
      {...props}
    >
      {children}
    </div>
  ),
  Keyboard: {
    dismiss: mockKeyboardDismiss,
  },
  ActivityIndicator: () => <div data-testid="activity-indicator" />,
  Alert: {
    alert: vi.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Platform: {
    OS: 'ios',
    select: (obj: any) => obj.ios ?? obj.default,
  },
}));

vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn().mockResolvedValue(undefined),
  notificationAsync: vi.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

vi.mock('lucide-react-native', () => ({
  LogOut: () => <span data-testid="logout-icon" />,
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
  CheckCircle2: () => <span data-testid="check-circle-icon" />,
  Lock: () => <span data-testid="lock-icon" />,
  Mail: () => <span data-testid="mail-icon" />,
  User: () => <span data-testid="user-icon" />,
  Settings: () => <span data-testid="settings-icon" />,
  ArrowLeft: () => <span data-testid="arrow-left-icon" />,
  ChevronRight: () => <span data-testid="chevron-right-icon" />,
}));

describe('AuthSheetScreen (iOS formSheet route)', () => {
  const mockSignIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    clearNavListeners();
    mockCanDismiss.mockReturnValue(true);
    mockCanGoBack.mockReturnValue(true);
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('enables sheetGrabberVisible once presentation transition starts', async () => {
    const { getByTestId } = render(<AuthSheetScreen />);

    const getOptions = () =>
      JSON.parse(getByTestId('stack-screen-options').getAttribute('data-options') || '{}');

    expect(getOptions().sheetGrabberVisible).toBe(false);

    const startListeners = getNavListeners().get('transitionStart');
    expect(startListeners?.size).toBe(1);
    startListeners?.forEach((cb) => cb({ data: { closing: false } }));

    await waitFor(() => {
      expect(getOptions().sheetGrabberVisible).toBe(true);
    });
  });

  it('ignores closing transitions and enables sheetGrabberVisible on transitionEnd', async () => {
    const { getByTestId } = render(<AuthSheetScreen />);

    const getOptions = () =>
      JSON.parse(getByTestId('stack-screen-options').getAttribute('data-options') || '{}');

    expect(getOptions().sheetGrabberVisible).toBe(false);

    act(() => {
      getNavListeners().get('transitionStart')?.forEach((cb) => cb({ data: { closing: true } }));
      getNavListeners().get('transitionEnd')?.forEach((cb) => cb({ data: { closing: true } }));
    });
    expect(getOptions().sheetGrabberVisible).toBe(false);

    act(() => {
      getNavListeners().get('transitionEnd')?.forEach((cb) => cb({ data: { closing: false } }));
    });

    await waitFor(() => {
      expect(getOptions().sheetGrabberVisible).toBe(true);
    });
  });

  it('enables sheetGrabberVisible via 150ms fallback timer if no transition event fires', () => {
    vi.useFakeTimers();
    const { getByTestId } = render(<AuthSheetScreen />);

    const getOptions = () =>
      JSON.parse(getByTestId('stack-screen-options').getAttribute('data-options') || '{}');

    expect(getOptions().sheetGrabberVisible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(149);
    });
    expect(getOptions().sheetGrabberVisible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(getOptions().sheetGrabberVisible).toBe(true);
  });

  it('renders testID="auth-sheet" ScrollView with bounces={false}, no manual grabber, and no header close X button', () => {
    const { container, getByTestId, queryByLabelText } = render(<AuthSheetScreen />);

    const scrollView = getByTestId('auth-sheet');
    expect(scrollView).toBeDefined();
    expect(scrollView.getAttribute('data-bounces')).toBe('false');
    expect(container.querySelector('[data-has-grabber="true"]')).toBeNull();
    expect(queryByLabelText('Close sheet')).toBeNull();
  });

  it('sets gestureEnabled: true initially and switches to gestureEnabled: false while submitting', async () => {
    let resolveSignIn!: (val: { error: null }) => void;
    mockSignIn.mockImplementation(
      () =>
        new Promise<{ error: null }>((resolve) => {
          resolveSignIn = resolve;
        })
    );

    const { getByTestId, getByPlaceholderText, getAllByText, getByText } = render(<AuthSheetScreen />);

    const getGestureEnabled = () =>
      JSON.parse(getByTestId('stack-screen-options').getAttribute('data-options') || '{}')
        .gestureEnabled;

    expect(getGestureEnabled()).toBe(true);

    fireEvent.change(getByPlaceholderText('you@example.com'), {
      target: { value: 'barista@brewlog.dev' },
    });
    fireEvent.change(getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });

    const signInButtons = getAllByText('SIGN IN');
    fireEvent.click(signInButtons[signInButtons.length - 1]);

    await waitFor(() => {
      expect(getGestureEnabled()).toBe(false);
    });

    fireEvent.click(getByText('Settings'));
    expect(mockDismiss).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    resolveSignIn({ error: null });

    await waitFor(() => {
      expect(getGestureEnabled()).toBe(true);
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('calls router.dismiss() on sign-in dismiss when canDismiss() is true, and falls back to router.back() when false', async () => {
    mockSignIn.mockResolvedValue({ error: null });

    const firstRender = render(<AuthSheetScreen />);
    expect(mockKeyboardDismiss).toHaveBeenCalledTimes(1);
    mockKeyboardDismiss.mockClear();

    fireEvent.change(firstRender.getByPlaceholderText('you@example.com'), {
      target: { value: 'barista@brewlog.dev' },
    });
    fireEvent.change(firstRender.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });
    const firstSignInButtons = firstRender.getAllByText('SIGN IN');
    fireEvent.click(firstSignInButtons[firstSignInButtons.length - 1]);

    await waitFor(() => {
      expect(mockKeyboardDismiss).toHaveBeenCalled();
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });
    expect(mockBack).not.toHaveBeenCalled();

    firstRender.unmount();
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
    mockCanDismiss.mockReturnValue(false);
    mockCanGoBack.mockReturnValue(true);

    const secondRender = render(<AuthSheetScreen />);
    fireEvent.change(secondRender.getByPlaceholderText('you@example.com'), {
      target: { value: 'barista@brewlog.dev' },
    });
    fireEvent.change(secondRender.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });
    const secondSignInButtons = secondRender.getAllByText('SIGN IN');
    fireEvent.click(secondSignInButtons[secondSignInButtons.length - 1]);

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it('replaces route with /settings/modal when Settings is pressed', () => {
    const { getByText } = render(<AuthSheetScreen />);

    fireEvent.click(getByText('Settings'));
    expect(mockKeyboardDismiss).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/settings/modal');
  });
});
