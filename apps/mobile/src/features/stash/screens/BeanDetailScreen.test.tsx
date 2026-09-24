/** @vitest-environment jsdom */
import React from 'react';
import { render, fireEvent as rtlFireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

const fireEvent = {
  ...rtlFireEvent,
  press: (element: Element | Node | Document | Window) => {
    rtlFireEvent.click(element);
  },
  changeText: (element: Element | Node | Document | Window, text: string) => {
    rtlFireEvent.change(element, { target: { value: text } });
  },
};

const pushMock = vi.fn();
const backMock = vi.fn();
let mockParamsId = 'b-1';

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: pushMock,
    back: backMock,
  }),
  useLocalSearchParams: () => ({ id: mockParamsId }),
}));

vi.mock('react-native', () => ({
  View: ({
    children,
    style: _style,
    accessibilityRole,
    accessibilityLabel,
    ...props
  }: {
    children?: React.ReactNode;
    style?: unknown;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    [key: string]: unknown;
  }) => (
    <div role={accessibilityRole} aria-label={accessibilityLabel} {...props}>
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
    ...props
  }: {
    children?: React.ReactNode;
    contentContainerStyle?: unknown;
    style?: unknown;
    keyboardShouldPersistTaps?: string;
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
    ...props
  }: {
    children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityState?: { selected?: boolean };
    style?: unknown;
    disabled?: boolean;
    hitSlop?: unknown;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      onClick={onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      aria-selected={accessibilityState?.selected}
      disabled={disabled}
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
    alert: vi.fn((_title, _message, buttons) => {
      const confirmButton = buttons?.find(
        (b: { style?: string; onPress?: () => void }) =>
          b.style === 'destructive' || b.style === 'default'
      );
      if (confirmButton && confirmButton.onPress) {
        confirmButton.onPress();
      }
    }),
  },
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  Play: () => <span data-testid="play-icon" />,
  Snowflake: () => <span data-testid="snowflake-icon" />,
  Edit2: () => <span data-testid="edit-icon" />,
  Archive: () => <span data-testid="archive-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  Star: () => <span data-testid="star-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  Sparkles: () => <span data-testid="sparkles-icon" />,
  Scale: () => <span data-testid="scale-icon" />,
  Check: () => <span data-testid="check-icon" />,
}));

import { BeanDetailScreen } from './BeanDetailScreen';

describe('BeanDetailScreen', () => {
  const bean: Bean = {
    id: 'b-1',
    roaster: 'Sey',
    name: 'Worka Sakaro',
    originCountry: 'Ethiopia',
    region: 'Gedeb',
    farm: 'Worka',
    variety: ['Kurume'],
    altitudeMeters: 2100,
    process: 'washed',
    roastLevel: 'light',
    roastDate: '2026-09-12',
    recommendedRestDays: 14,
    bagWeightGrams: 250,
    remainingGrams: 210,
    flavorNotes: ['Jasmine', 'Peach'],
    notes: 'Exceptional transparency and floral brightness.',
    createdAt: '2026-09-01T00:00:00Z',
    isFrozen: false,
    isArchived: false,
    isFavorite: false,
  };

  let mockContext: StashContextValue;

  beforeEach(() => {
    vi.clearAllMocks();
    mockParamsId = 'b-1';
    mockContext = {
      beans: [bean],
      activeBeans: [bean],
      frozenBeans: [],
      archivedBeans: [],
      activeBrewBean: null,
      loading: false,
      addBean: vi.fn(),
      updateBean: vi.fn(),
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

  it('renders bean details, specs, and flavor notes', () => {
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    expect(getByText('Worka Sakaro')).toBeTruthy();
    expect(getByText('SEY')).toBeTruthy();
    expect(getByText('Ethiopia • Gedeb')).toBeTruthy();
    expect(getByText('2100m')).toBeTruthy();
    expect(getByText('Jasmine')).toBeTruthy();
    expect(getByText('Peach')).toBeTruthy();
    expect(getByText('Exceptional transparency and floral brightness.')).toBeTruthy();
  });

  it('sets active bean and navigates to Timer on BREW button press', () => {
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByText('BREW WITH THIS BEAN'));
    expect(mockContext.setActiveBrewBean).toHaveBeenCalledWith(bean);
    expect(pushMock).toHaveBeenCalledWith('/(tabs)');
  });

  it('adjusts remaining weight using quick dose steppers', () => {
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByText('-18g'));
    expect(mockContext.updateBean).toHaveBeenCalledWith('b-1', { remainingGrams: 192 });

    fireEvent.press(getByText('-15g'));
    expect(mockContext.updateBean).toHaveBeenCalledWith('b-1', { remainingGrams: 195 });

    fireEvent.press(getByText('+18g'));
    expect(mockContext.updateBean).toHaveBeenCalledWith('b-1', { remainingGrams: 228 });
  });

  it('allows manual weight calibration through Set button and input', () => {
    const { getByText, getByPlaceholderText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByText('Set...'));
    const input = getByPlaceholderText('New weight in grams');
    fireEvent.changeText(input, '175');
    fireEvent.press(getByText('SAVE'));

    expect(mockContext.updateBean).toHaveBeenCalledWith('b-1', { remainingGrams: 175 });
  });

  it('toggles favorite on star button press', () => {
    const { getByLabelText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByLabelText('Add to favorites'));
    expect(mockContext.toggleFavorite).toHaveBeenCalledWith('b-1');
  });

  it('toggles frozen status on freeze button press', () => {
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByText(/FREEZE BEAN/i));
    expect(mockContext.toggleFrozen).toHaveBeenCalledWith('b-1');
  });

  it('renders thaw button and handles thaw when coffee is frozen', () => {
    const frozenBean: Bean = { ...bean, isFrozen: true, frozenDate: '2026-09-15' };
    mockContext.beans = [frozenBean];

    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    expect(getByText(/THAW BEAN/i)).toBeTruthy();
    fireEvent.press(getByText(/THAW BEAN/i));
    expect(mockContext.toggleFrozen).toHaveBeenCalledWith('b-1');
  });

  it('navigates to edit modal on edit button press', () => {
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByText('EDIT BEAN'));
    expect(pushMock).toHaveBeenCalledWith({
      pathname: '/stash/modal',
      params: { id: 'b-1' },
    });
  });

  it('handles archive action for active coffee', () => {
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByText('ARCHIVE BEAN'));
    expect(mockContext.archiveBean).toHaveBeenCalledWith('b-1');
  });

  it('handles unarchive action for archived coffee', () => {
    const archivedBean: Bean = { ...bean, isArchived: true };
    mockContext.beans = [archivedBean];

    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    expect(getByText('UNARCHIVE BEAN')).toBeTruthy();
    fireEvent.press(getByText('UNARCHIVE BEAN'));
    expect(mockContext.unarchiveBean).toHaveBeenCalledWith('b-1');
  });

  it('handles delete coffee action with confirmation alert', async () => {
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    fireEvent.press(getByText('DELETE BEAN'));
    expect(mockContext.deleteBean).toHaveBeenCalledWith('b-1');
    await waitFor(() => {
      expect(backMock).toHaveBeenCalled();
    });
  });

  it('renders not found state when bean does not exist', () => {
    mockParamsId = 'non-existent-id';
    const { getByText } = render(
      <StashContext.Provider value={mockContext}>
        <BeanDetailScreen />
      </StashContext.Provider>
    );

    expect(getByText('Coffee Not Found')).toBeTruthy();
    fireEvent.press(getByText('RETURN TO STASH'));
    expect(backMock).toHaveBeenCalled();
  });
});
