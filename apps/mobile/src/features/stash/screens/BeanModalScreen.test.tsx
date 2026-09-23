/** @vitest-environment jsdom */
import React from 'react';
import { render, fireEvent as rtlFireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Alert } from 'react-native';
import { BeanModalScreen } from './BeanModalScreen';
import { StashContextValue, StashContext } from '../StashContext';
import { Bean } from '@brewlog/core';

(globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

vi.mock('../../../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('react-native', () => ({
  View: ({
    children,
    style: _style,
    accessibilityRole,
    accessibilityLabel,
    testID,
    ...props
  }: {
    children?: React.ReactNode;
    style?: unknown;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    testID?: string;
    [key: string]: unknown;
  }) => (
    <div
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      data-testid={testID}
      {...props}
    >
      {children}
    </div>
  ),
  Text: ({
    children,
    style: _style,
    numberOfLines: _numberOfLines,
    ...props
  }: {
    children?: React.ReactNode;
    style?: unknown;
    numberOfLines?: number;
    [key: string]: unknown;
  }) => (
    <span {...props}>{children}</span>
  ),
  ScrollView: ({
    children,
    contentContainerStyle: _ccs,
    style: _style,
    keyboardShouldPersistTaps: _kspt,
    automaticallyAdjustKeyboardInsets: _aaki,
    horizontal: _h,
    showsHorizontalScrollIndicator: _shsi,
    ...props
  }: {
    children?: React.ReactNode;
    contentContainerStyle?: unknown;
    style?: unknown;
    keyboardShouldPersistTaps?: string;
    automaticallyAdjustKeyboardInsets?: boolean;
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    [key: string]: unknown;
  }) => (
    <div {...props}>{children}</div>
  ),
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    style: _style,
    disabled,
    hitSlop: _hitSlop,
    testID,
    ...props
  }: {
    children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityState?: { checked?: boolean; selected?: boolean };
    style?: unknown;
    disabled?: boolean;
    hitSlop?: unknown;
    testID?: string;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      onClick={onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      aria-checked={accessibilityState?.checked}
      aria-selected={accessibilityState?.selected}
      disabled={disabled}
      data-testid={testID}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  ),
  TextInput: ({
    value,
    defaultValue,
    onChangeText,
    placeholder,
    accessibilityLabel,
    placeholderTextColor: _placeholderTextColor,
    keyboardType: _keyboardType,
    multiline: _multiline,
    numberOfLines: _numberOfLines,
    style: _style,
    ...props
  }: {
    value?: string;
    defaultValue?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    accessibilityLabel?: string;
    placeholderTextColor?: string;
    keyboardType?: string;
    multiline?: boolean;
    numberOfLines?: number;
    style?: unknown;
    [key: string]: unknown;
  }) => (
    <input
      value={value ?? defaultValue}
      onChange={(e) => onChangeText?.(e.target.value)}
      placeholder={placeholder}
      aria-label={accessibilityLabel}
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

vi.mock('lucide-react-native', () => ({
  X: () => <span data-testid="x-icon" />,
  Check: () => <span data-testid="check-icon" />,
  Snowflake: () => <span data-testid="snowflake-icon" />,
}));

const fireEvent = {
  ...rtlFireEvent,
  press: (element: Element | Node | Document | Window) => {
    rtlFireEvent.click(element);
  },
  changeText: (element: Element | Node | Document | Window, text: string) => {
    rtlFireEvent.change(element, { target: { value: text } });
  },
};

const backMock = vi.fn();
let mockSearchParams: { id?: string } = {};

vi.mock('expo-router', () => ({
  useRouter: () => ({ back: backMock, push: vi.fn() }),
  useLocalSearchParams: () => mockSearchParams,
}));

describe('BeanModalScreen', () => {
  const existingBean: Bean = {
    id: 'bean-existing-1',
    name: 'Worka Sakaro',
    roaster: 'Sey',
    originCountry: 'Ethiopia',
    region: 'Gedeb',
    farm: 'Halo Beriti',
    variety: ['Heirloom', 'Dega'],
    altitudeMeters: 2000,
    process: 'washed',
    roastLevel: 'light',
    roastDate: '2026-09-01',
    flavorNotes: ['Peach', 'Jasmine'],
    recommendedRestDays: 14,
    bagWeightGrams: 250,
    remainingGrams: 200,
    isFrozen: false,
    notes: 'Exceptional clarity',
    createdAt: '2026-09-01T12:00:00Z',
  };

  let mockContext: StashContextValue;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = {};
    mockContext = {
      beans: [existingBean],
      activeBeans: [existingBean],
      frozenBeans: [],
      archivedBeans: [],
      activeBrewBean: null,
      loading: false,
      addBean: vi.fn().mockResolvedValue({ id: 'new-1' }),
      updateBean: vi.fn().mockResolvedValue({ ...existingBean, name: 'Worka Updated' }),
      deleteBean: vi.fn(),
      toggleFavorite: vi.fn(),
      toggleFrozen: vi.fn(),
      archiveBean: vi.fn(),
      unarchiveBean: vi.fn(),
      setActiveBrewBean: vi.fn(),
      deductBeanDose: vi.fn(),
      refreshBeans: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('validates required fields before submitting', async () => {
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanModalScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByText('SAVE BAG'));
    expect(getByText('Roaster is required')).toBeTruthy();
    expect(mockContext.addBean).not.toHaveBeenCalled();
  });

  it('validates coffee name when roaster is filled but name is empty', async () => {
    const { getByPlaceholderText, getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanModalScreen />
      </StashContext.Provider>
    );

    fireEvent.changeText(getByPlaceholderText('Roaster (e.g. Sey, Passenger)'), 'Sey');
    fireEvent.press(getByText('SAVE BAG'));
    expect(getByText('Coffee name is required')).toBeTruthy();
    expect(mockContext.addBean).not.toHaveBeenCalled();
  });

  it('saves new bean with custom recommendedRestDays and bag size preset', async () => {
    const { getByPlaceholderText, getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanModalScreen />
      </StashContext.Provider>
    );

    fireEvent.changeText(getByPlaceholderText('Roaster (e.g. Sey, Passenger)'), 'Sey');
    fireEvent.changeText(getByPlaceholderText('Coffee Name (e.g. Worka Sakaro)'), 'Bantu');
    fireEvent.changeText(getByPlaceholderText('5 (Standard)'), '14');

    // Select 340g bag preset
    fireEvent.press(getByText('340g'));

    fireEvent.press(getByText('SAVE BAG'));

    await waitFor(() => {
      expect(mockContext.addBean).toHaveBeenCalledWith(
        expect.objectContaining({
          roaster: 'Sey',
          name: 'Bantu',
          recommendedRestDays: 14,
          bagWeightGrams: 340,
        })
      );
      expect(backMock).toHaveBeenCalled();
    });
  });

  it('allows selecting process method and roast level chips', async () => {
    const { getByPlaceholderText, getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanModalScreen />
      </StashContext.Provider>
    );

    fireEvent.changeText(getByPlaceholderText('Roaster (e.g. Sey, Passenger)'), 'Passenger');
    fireEvent.changeText(getByPlaceholderText('Coffee Name (e.g. Worka Sakaro)'), 'Divino');

    // Select Natural process and Medium roast
    fireEvent.press(getByText('Natural'));
    fireEvent.press(getByText('Medium'));

    fireEvent.press(getByText('SAVE BAG'));

    await waitFor(() => {
      expect(mockContext.addBean).toHaveBeenCalledWith(
        expect.objectContaining({
          roaster: 'Passenger',
          name: 'Divino',
          process: 'natural',
          roastLevel: 'medium',
        })
      );
    });
  });

  it('allows toggling freezer vault', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <StashContext.Provider value={mockContext}>
        <BeanModalScreen />
      </StashContext.Provider>
    );

    fireEvent.changeText(getByPlaceholderText('Roaster (e.g. Sey, Passenger)'), 'Onyx');
    fireEvent.changeText(getByPlaceholderText('Coffee Name (e.g. Worka Sakaro)'), 'Southern Weather');

    fireEvent.press(getByTestId('freezer-vault-toggle'));
    fireEvent.press(getByText('SAVE BAG'));

    await waitFor(() => {
      expect(mockContext.addBean).toHaveBeenCalledWith(
        expect.objectContaining({
          isFrozen: true,
        })
      );
    });
  });

  it('loads existing bean in edit mode and updates it', async () => {
    mockSearchParams = { id: 'bean-existing-1' };

    const { getByDisplayValue, getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanModalScreen />
      </StashContext.Provider>
    );

    expect(getByDisplayValue('Sey')).toBeTruthy();
    expect(getByDisplayValue('Worka Sakaro')).toBeTruthy();

    fireEvent.changeText(getByDisplayValue('Worka Sakaro'), 'Worka Sakaro Special');
    fireEvent.press(getByText('SAVE BAG'));

    await waitFor(() => {
      expect(mockContext.updateBean).toHaveBeenCalledWith(
        'bean-existing-1',
        expect.objectContaining({
          name: 'Worka Sakaro Special',
        })
      );
      expect(backMock).toHaveBeenCalled();
    });
  });

  it('navigates back directly on cancel when form is clean', () => {
    const alertSpy = vi.spyOn(Alert, 'alert');

    const { getByLabelText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanModalScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByLabelText('Cancel editing'));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(backMock).toHaveBeenCalled();
  });

  it('shows discard confirmation on cancel when form is dirty', () => {
    const alertSpy = vi.spyOn(Alert, 'alert');

    const { getByPlaceholderText, getByLabelText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanModalScreen />
      </StashContext.Provider>
    );

    fireEvent.changeText(getByPlaceholderText('Roaster (e.g. Sey, Passenger)'), 'Tim Wendelboe');
    fireEvent.press(getByLabelText('Cancel editing'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Discard Changes?',
      'Any unsaved coffee details will be lost.',
      expect.any(Array)
    );
  });

  it('renders fallback when bean is not found in edit mode', () => {
    mockSearchParams = { id: 'non-existent-bean' };

    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanModalScreen />
      </StashContext.Provider>
    );

    expect(getByText('Coffee Not Found')).toBeTruthy();
    fireEvent.press(getByText('Go Back'));
    expect(backMock).toHaveBeenCalled();
  });

  it('marks selected process, roast level, and bag preset chips with accessibilityState selected', () => {
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanModalScreen />
      </StashContext.Provider>
    );

    const naturalButton = getByText('Natural').closest('button');
    expect(naturalButton?.getAttribute('aria-selected')).toBe('false');

    fireEvent.press(getByText('Natural'));
    expect(naturalButton?.getAttribute('aria-selected')).toBe('true');

    const lightButton = getByText('Light').closest('button');
    fireEvent.press(getByText('Light'));
    expect(lightButton?.getAttribute('aria-selected')).toBe('true');

    const presetButton = getByText('250g').closest('button');
    fireEvent.press(getByText('250g'));
    expect(presetButton?.getAttribute('aria-selected')).toBe('true');
  });
});
