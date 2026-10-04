/** @vitest-environment jsdom */
import React from 'react';
import { render, fireEvent as rtlFireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Alert } from 'react-native';
import { EquipmentModalScreen } from './EquipmentModalScreen';
import { EquipmentContext, EquipmentContextValue } from '../EquipmentContext';
import { Equipment } from '@brewlog/core';

(globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('react-native-keyboard-controller', () => ({
  KeyboardAwareScrollView: React.forwardRef(({
    children,
    contentContainerStyle: _contentContainerStyle,
    bottomOffset: _bottomOffset,
    keyboardShouldPersistTaps: _keyboardShouldPersistTaps,
    ...props
  }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      scrollToEnd: vi.fn(),
      scrollTo: vi.fn(),
    }));
    return <div {...props}>{children}</div>;
  }),
  KeyboardProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('react-native', () => ({
  View: ({
    children,
    style: _style,
    accessibilityRole,
    accessibilityLabel,
    testID,
    ...props
  }: any) => (
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
  }: any) => <span {...props}>{children}</span>,
  TextInput: ({
    value,
    onChangeText,
    placeholder,
    style: _style,
    placeholderTextColor: _placeholderTextColor,
    numberOfLines: _numberOfLines,
    multiline: _multiline,
    accessibilityLabel,
    ...props
  }: any) => (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChangeText?.(e.target.value)}
      placeholder={placeholder}
      aria-label={accessibilityLabel}
      {...props}
    />
  ),
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    hitSlop: _hitSlop,
    style: _style,
    ...props
  }: any) => (
    <div
      onClick={onPress}
      role={accessibilityRole || 'button'}
      aria-label={accessibilityLabel}
      aria-selected={accessibilityState?.selected}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </div>
  ),
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Alert: {
    alert: vi.fn(),
  },
}));

vi.mock('lucide-react-native', () => ({
  X: () => null,
  Check: () => null,
  Star: () => null,
  Trash2: () => null,
}));

const mockPush = vi.fn();
const mockBack = vi.fn();
let mockParams: { id?: string } = {};

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

const mockSampleEquipment: Equipment[] = [
  {
    id: 'eq-edit-1',
    type: 'grinder',
    brand: 'Fellow',
    model: 'Ode Gen 2',
    subType: 'flat-burr',
    settingScaleType: 'stepped-numbers',
    isFavorite: true,
    notes: '64mm burrs calibrated',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

const createMockContext = (overrides?: Partial<EquipmentContextValue>): EquipmentContextValue => ({
  equipment: mockSampleEquipment,
  grinders: mockSampleEquipment,
  brewers: [],
  scales: [],
  kettles: [],
  loading: false,
  addEquipment: vi.fn().mockResolvedValue(mockSampleEquipment[0]),
  updateEquipment: vi.fn().mockResolvedValue(mockSampleEquipment[0]),
  deleteEquipment: vi.fn().mockResolvedValue(undefined),
  toggleFavorite: vi.fn().mockResolvedValue(undefined),
  refreshEquipment: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('EquipmentModalScreen', () => {
  beforeEach(() => {
    mockParams = {};
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders NEW EQUIPMENT when no id param is provided', () => {
    const mockContext = createMockContext();
    const { getByText } = render(
      <EquipmentContext.Provider value={mockContext}>
        <EquipmentModalScreen />
      </EquipmentContext.Provider>
    );

    expect(getByText('NEW EQUIPMENT')).toBeDefined();
    expect(getByText('BRAND NAME *')).toBeDefined();
    expect(getByText('MODEL NAME *')).toBeDefined();
  });

  it('renders EDIT EQUIPMENT and pre-fills form when id param matches existing equipment', () => {
    mockParams = { id: 'eq-edit-1' };
    const mockContext = createMockContext();
    const { getByText, getByDisplayValue } = render(
      <EquipmentContext.Provider value={mockContext}>
        <EquipmentModalScreen />
      </EquipmentContext.Provider>
    );

    expect(getByText('EDIT EQUIPMENT')).toBeDefined();
    expect(getByDisplayValue('Fellow')).toBeDefined();
    expect(getByDisplayValue('Ode Gen 2')).toBeDefined();
    expect(getByDisplayValue('flat-burr')).toBeDefined();
    expect(getByDisplayValue('64mm burrs calibrated')).toBeDefined();
    expect(getByText('DELETE EQUIPMENT')).toBeDefined();
  });

  it('shows error banner when saving with empty brand or model', async () => {
    const mockContext = createMockContext();
    const { getByRole, getByText } = render(
      <EquipmentContext.Provider value={mockContext}>
        <EquipmentModalScreen />
      </EquipmentContext.Provider>
    );

    // Save with empty inputs
    rtlFireEvent.click(getByRole('button', { name: 'Save Equipment' }));

    await waitFor(() => {
      expect(getByText('Brand name is required')).toBeDefined();
    });
    expect(mockContext.addEquipment).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('creates new equipment on valid save and navigates back', async () => {
    const mockContext = createMockContext();
    const { getByRole, getByLabelText } = render(
      <EquipmentContext.Provider value={mockContext}>
        <EquipmentModalScreen />
      </EquipmentContext.Provider>
    );

    rtlFireEvent.change(getByLabelText('Brand Name'), { target: { value: 'Comandante' } });
    rtlFireEvent.change(getByLabelText('Model Name'), { target: { value: 'C40 MK4' } });

    rtlFireEvent.click(getByRole('button', { name: 'Save Equipment' }));

    await waitFor(() => {
      expect(mockContext.addEquipment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'grinder',
          brand: 'Comandante',
          model: 'C40 MK4',
        })
      );
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('updates existing equipment in edit mode and navigates back', async () => {
    mockParams = { id: 'eq-edit-1' };
    const mockContext = createMockContext();
    const { getByRole, getByDisplayValue } = render(
      <EquipmentContext.Provider value={mockContext}>
        <EquipmentModalScreen />
      </EquipmentContext.Provider>
    );

    const modelInput = getByDisplayValue('Ode Gen 2');
    rtlFireEvent.change(modelInput, { target: { value: 'Ode Gen 2 with SSP Burrs' } });

    rtlFireEvent.click(getByRole('button', { name: 'Save Equipment' }));

    await waitFor(() => {
      expect(mockContext.updateEquipment).toHaveBeenCalledWith(
        'eq-edit-1',
        expect.objectContaining({
          model: 'Ode Gen 2 with SSP Burrs',
        })
      );
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('shows discard alert when cancelling dirty form', () => {
    const mockContext = createMockContext();
    const { getByRole, getByLabelText } = render(
      <EquipmentContext.Provider value={mockContext}>
        <EquipmentModalScreen />
      </EquipmentContext.Provider>
    );

    rtlFireEvent.change(getByLabelText('Brand Name'), { target: { value: 'Hario' } });
    rtlFireEvent.click(getByRole('button', { name: 'Cancel editing' }));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Discard Changes?',
      'Any unsaved equipment details will be lost.',
      expect.any(Array)
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('navigates back directly when cancelling clean form', () => {
    const mockContext = createMockContext();
    const { getByRole } = render(
      <EquipmentContext.Provider value={mockContext}>
        <EquipmentModalScreen />
      </EquipmentContext.Provider>
    );

    rtlFireEvent.click(getByRole('button', { name: 'Cancel editing' }));
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it('confirms and deletes equipment in edit mode', async () => {
    mockParams = { id: 'eq-edit-1' };
    const mockContext = createMockContext();
    const { getByRole } = render(
      <EquipmentContext.Provider value={mockContext}>
        <EquipmentModalScreen />
      </EquipmentContext.Provider>
    );

    rtlFireEvent.click(getByRole('button', { name: 'Delete Equipment' }));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Equipment',
      expect.stringContaining('Fellow Ode Gen 2'),
      expect.any(Array)
    );

    // Trigger the destructive action from Alert buttons
    const alertButtons = (Alert.alert as any).mock.calls[0][2];
    const deleteAction = alertButtons.find((b: any) => b.text === 'Delete');
    await deleteAction.onPress();

    expect(mockContext.deleteEquipment).toHaveBeenCalledWith('eq-edit-1');
    expect(mockBack).toHaveBeenCalled();
  });
});
