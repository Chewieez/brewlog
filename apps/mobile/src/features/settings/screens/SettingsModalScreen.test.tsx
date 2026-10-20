/** @vitest-environment jsdom */
import React from 'react';
import { render, fireEvent as rtlFireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Alert } from 'react-native';
import SettingsModalScreen from '../../../../app/settings/modal';
import { SettingsProvider, SettingsContext } from '../SettingsContext';
import * as AuthContextModule from '../../auth/AuthContext';
import * as Haptics from 'expo-haptics';
import { DEFAULT_USER_SETTINGS, UserSettings } from '@brewlog/core';

const mockBack = vi.fn();
const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
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

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style: _style, edges: _edges, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('react-native', () => ({
  View: ({
    children,
    style: _style,
    testID,
    accessibilityRole,
    accessibilityLabel,
    ...props
  }: any) => (
    <div
      data-testid={testID}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      {...props}
    >
      {children}
    </div>
  ),
  Text: ({ children, style: _style, ...props }: any) => (
    <span {...props}>{children}</span>
  ),
  TouchableOpacity: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState: _accessibilityState,
    disabled,
    hitSlop: _hitSlop,
    style: _style,
    activeOpacity: _activeOpacity,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={disabled ? undefined : onPress}
      aria-label={accessibilityLabel}
      role={accessibilityRole}
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
    disabled,
    hitSlop: _hitSlop,
    style: _style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={disabled ? undefined : onPress}
      aria-label={accessibilityLabel}
      role={accessibilityRole}
      disabled={disabled}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  ),
  ScrollView: ({
    children,
    style: _style,
    contentContainerStyle: _ccs,
    showsVerticalScrollIndicator: _svsi,
    ...props
  }: any) => <div {...props}>{children}</div>,
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

vi.mock('lucide-react-native', () => ({
  X: () => <span data-testid="x-icon" />,
  Sliders: () => <span data-testid="sliders-icon" />,
  Settings: () => <span data-testid="settings-icon" />,
  RotateCcw: () => <span data-testid="rotate-ccw-icon" />,
  Cloud: () => <span data-testid="cloud-icon" />,
  HardDrive: () => <span data-testid="hard-drive-icon" />,
  Check: () => <span data-testid="check-icon" />,
  Gauge: () => <span data-testid="gauge-icon" />,
  ChevronDown: () => <span data-testid="chevron-down-icon" />,
  ChevronUp: () => <span data-testid="chevron-up-icon" />,
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

const fireEvent = {
  ...rtlFireEvent,
  press: (element: Element | Node | Document | Window) => {
    rtlFireEvent.click(element);
  },
};

describe('SettingsModalScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all preference sections and dismiss button', () => {
    const { getByText, getByLabelText } = render(
      <SettingsProvider>
        <SettingsModalScreen />
      </SettingsProvider>
    );

    expect(getByText(/^SETTINGS$/i)).toBeTruthy();
    expect(getByText(/SYSTEM \/\/ CALIBRATION/i)).toBeTruthy();
    expect(getByText(/WEIGHT UNIT/i)).toBeTruthy();
    expect(getByText(/TEMPERATURE UNIT/i)).toBeTruthy();
    expect(getByText(/DEFAULT TIMER MODE/i)).toBeTruthy();
    expect(getByText(/DATE FORMAT/i)).toBeTruthy();
    expect(getByLabelText('Close settings')).toBeTruthy();
  });

  it('triggers router.back() when dismiss button is pressed', () => {
    const { getByLabelText } = render(
      <SettingsProvider>
        <SettingsModalScreen />
      </SettingsProvider>
    );

    fireEvent.press(getByLabelText('Close settings'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('renders local device indicator when user is unauthenticated', () => {
    const { getByText } = render(
      <SettingsProvider>
        <SettingsModalScreen />
      </SettingsProvider>
    );

    expect(getByText(/Saved to local device/i)).toBeTruthy();
  });

  it('renders cloud sync status when user is authenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-789',
        email: 'barista@brewlog.dev',
      } as any,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });

    const { getByText } = render(
      <SettingsProvider>
        <SettingsModalScreen />
      </SettingsProvider>
    );

    expect(getByText(/CLOUD SYNC ACTIVE/i)).toBeTruthy();
    expect(getByText('barista@brewlog.dev')).toBeTruthy();
  });

  it('updates settings and triggers haptic feedback when selecting options', () => {
    const updateSettingsMock = vi.fn().mockResolvedValue(undefined);
    const mockContextValue = {
      settings: DEFAULT_USER_SETTINGS,
      loading: false,
      updateSettings: updateSettingsMock,
      resetToDefaults: vi.fn().mockResolvedValue(undefined),
    };

    const { getByText, getByLabelText } = render(
      <SettingsContext.Provider value={mockContextValue}>
        <SettingsModalScreen />
      </SettingsContext.Provider>
    );

    // Change weight unit to Imperial (oz)
    fireEvent.press(getByText(/IMPERIAL \(oz\)/i));
    expect(updateSettingsMock).toHaveBeenCalledWith({ weightUnit: 'imperial' });
    expect(Haptics.selectionAsync).toHaveBeenCalled();

    // Change temperature unit to Fahrenheit (°F)
    fireEvent.press(getByText(/FAHRENHEIT \(°F\)/i));
    expect(updateSettingsMock).toHaveBeenCalledWith({ temperatureUnit: 'fahrenheit' });

    // Change default timer mode to Guided Recipe
    fireEvent.press(getByText(/GUIDED RECIPE/i));
    expect(updateSettingsMock).toHaveBeenCalledWith({ defaultTimerMode: 'recipe' });

    // Open date format dropdown and select YYYY-MM-DD
    fireEvent.press(getByLabelText('Select date format'));
    fireEvent.press(getByLabelText('YYYY-MM-DD date format'));
    expect(updateSettingsMock).toHaveBeenCalledWith({ dateFormat: 'YYYY-MM-DD' });
  });

  it('toggles date format dropdown accordion and renders all options with previews', () => {
    const updateSettingsMock = vi.fn().mockResolvedValue(undefined);
    const mockContextValue = {
      settings: DEFAULT_USER_SETTINGS,
      loading: false,
      updateSettings: updateSettingsMock,
      resetToDefaults: vi.fn().mockResolvedValue(undefined),
    };

    const { getByLabelText, queryByLabelText } = render(
      <SettingsContext.Provider value={mockContextValue}>
        <SettingsModalScreen />
      </SettingsContext.Provider>
    );

    // Initially collapsed
    expect(queryByLabelText('YYYY-MM-DD date format')).toBeNull();

    // Expand dropdown
    fireEvent.press(getByLabelText('Select date format'));
    expect(queryByLabelText('LOCALE date format')).toBeTruthy();
    expect(queryByLabelText('YYYY-MM-DD date format')).toBeTruthy();
    expect(queryByLabelText('MM/DD/YYYY date format')).toBeTruthy();
    expect(queryByLabelText('DD/MM/YYYY date format')).toBeTruthy();

    // Select DD/MM/YYYY
    fireEvent.press(getByLabelText('DD/MM/YYYY date format'));
    expect(updateSettingsMock).toHaveBeenCalledWith({ dateFormat: 'DD/MM/YYYY' });

    // Closes after selection
    expect(queryByLabelText('DD/MM/YYYY date format')).toBeNull();
  });

  it('prompts confirmation Alert on resetToDefaults and executes on confirmation', () => {
    const resetToDefaultsMock = vi.fn().mockResolvedValue(undefined);
    const mockContextValue = {
      settings: DEFAULT_USER_SETTINGS,
      loading: false,
      updateSettings: vi.fn().mockResolvedValue(undefined),
      resetToDefaults: resetToDefaultsMock,
    };

    const { getByText } = render(
      <SettingsContext.Provider value={mockContextValue}>
        <SettingsModalScreen />
      </SettingsContext.Provider>
    );

    fireEvent.press(getByText(/RESET TO DEFAULTS/i));
    expect(Alert.alert).toHaveBeenCalled();

    // Extract Alert buttons and trigger destructive confirmation
    const alertCall = vi.mocked(Alert.alert).mock.calls[0];
    const buttons = alertCall[2] as any[];
    const confirmButton = buttons?.find((b) => b.style === 'destructive');
    expect(confirmButton).toBeDefined();

    confirmButton.onPress();
    expect(resetToDefaultsMock).toHaveBeenCalled();
  });
});
