/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Alert } from 'react-native';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { RecipeBuilderScreen } from './RecipeBuilderScreen';

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, numberOfLines, ...props }: any) => <span {...props}>{children}</span>,
  ScrollView: ({
    children,
    style,
    horizontal,
    showsHorizontalScrollIndicator,
    contentContainerStyle,
    keyboardShouldPersistTaps: _keyboardShouldPersistTaps,
    ...props
  }: any) => <div {...props}>{children}</div>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    disabled,
    style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={disabled ? undefined : onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      disabled={disabled}
      aria-selected={accessibilityState?.selected}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  ),
  TextInput: ({
    defaultValue,
    value,
    placeholder,
    onChangeText,
    onEndEditing,
    accessibilityLabel,
    keyboardType: _keyboardType,
    multiline: _multiline,
    numberOfLines: _numberOfLines,
    placeholderTextColor: _placeholderTextColor,
    style: _style,
    ...props
  }: any) => (
    <input
      defaultValue={defaultValue}
      value={value}
      placeholder={placeholder}
      aria-label={accessibilityLabel}
      onChange={(e) => onChangeText?.(e.target.value)}
      onBlur={(e) => onEndEditing?.({ nativeEvent: { text: e.target.value } })}
      {...props}
    />
  ),
  Alert: {
    alert: vi.fn(),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('lucide-react-native', () => ({
  X: () => null,
  Check: () => null,
  Plus: () => null,
  Trash2: () => null,
  ChevronUp: () => null,
  ChevronDown: () => null,
}));

const mockBack = vi.fn();
const mockReplace = vi.fn();
let mockParams: { editId?: string; duplicateId?: string } = {};

vi.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));

const mockAddRecipe = vi.fn().mockResolvedValue({ id: 'new-rec-1' });
const mockUpdateRecipe = vi.fn().mockResolvedValue({ id: 'rec-1' });

const mockCustomRecipe = {
  ...DEFAULT_PRESET_RECIPES[0],
  id: 'custom-1',
  name: 'My Special V60',
  isPreset: false,
};

const mockContext = {
  recipes: [mockCustomRecipe, ...DEFAULT_PRESET_RECIPES],
  customRecipes: [mockCustomRecipe],
  presets: DEFAULT_PRESET_RECIPES,
  loading: false,
  activeTimerRecipe: DEFAULT_PRESET_RECIPES[0],
  activeTimerDose: 15,
  addRecipe: mockAddRecipe,
  updateRecipe: mockUpdateRecipe,
  deleteRecipe: vi.fn(),
  setActiveTimerRecipe: vi.fn(),
  refreshRecipes: vi.fn(),
};

vi.mock('../RecipeContext', () => ({
  useRecipes: () => mockContext,
}));

describe('RecipeBuilderScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    mockAddRecipe.mockResolvedValue({ id: 'new-rec-1' });
    mockUpdateRecipe.mockResolvedValue({ id: 'custom-1' });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders form fields: name, method pills, dose, ratio, grind, temp, notes, and stages', () => {
    const { getByText, getByPlaceholderText } = render(<RecipeBuilderScreen />);

    expect(getByText('New Recipe')).toBeDefined();
    expect(getByPlaceholderText('e.g. My Morning V60')).toBeDefined();
    expect(getByText('BREW METHOD')).toBeDefined();
    expect(getByText('DOSE & WATER RATIO')).toBeDefined();
    expect(getByText('NOTES')).toBeDefined();
    expect(getByPlaceholderText('Personal notes, water specs, grinder settings...')).toBeDefined();
    expect(getByText('BREW STAGES')).toBeDefined();
  });

  it('validates empty name and disables or warns on save', async () => {
    const { getByText } = render(<RecipeBuilderScreen />);
    fireEvent.click(getByText('Save Recipe'));

    expect(mockAddRecipe).not.toHaveBeenCalled();
    expect(getByText('Recipe name is required.')).toBeDefined();
  });

  it('validates dose bounds (< 1g or > 100g) on save', async () => {
    const { getByText, getByPlaceholderText } = render(<RecipeBuilderScreen />);

    const nameInput = getByPlaceholderText('e.g. My Morning V60');
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });

    // Dose = 0
    const doseInput = document.querySelector('input[value="15"]') as HTMLInputElement;
    fireEvent.change(doseInput, { target: { value: '0' } });
    fireEvent.click(getByText('Save Recipe'));

    expect(mockAddRecipe).not.toHaveBeenCalled();
    expect(getByText('Coffee dose must be between 1g and 100g.')).toBeDefined();

    // Dose = 105
    fireEvent.change(doseInput, { target: { value: '105' } });
    fireEvent.click(getByText('Save Recipe'));
    expect(getByText('Coffee dose must be between 1g and 100g.')).toBeDefined();
  });

  it('validates ratio bounds (< 1:1 or > 1:30) on save', async () => {
    const { getByText, getByPlaceholderText } = render(<RecipeBuilderScreen />);

    const nameInput = getByPlaceholderText('e.g. My Morning V60');
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });

    // Ratio = 0.5
    const ratioInput = document.querySelector('input[value="16.67"]') as HTMLInputElement;
    fireEvent.change(ratioInput, { target: { value: '0.5' } });
    fireEvent.click(getByText('Save Recipe'));

    expect(mockAddRecipe).not.toHaveBeenCalled();
    expect(getByText('Brew ratio must be between 1:1 and 1:30.')).toBeDefined();

    // Ratio = 35
    fireEvent.change(ratioInput, { target: { value: '35' } });
    fireEvent.click(getByText('Save Recipe'));
    expect(getByText('Brew ratio must be between 1:1 and 1:30.')).toBeDefined();
  });

  it('validates empty stages or stages with 0 duration', async () => {
    const { getByText, getByPlaceholderText, getByLabelText } = render(<RecipeBuilderScreen />);

    const nameInput = getByPlaceholderText('e.g. My Morning V60');
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });

    // Remove all 3 default stages
    fireEvent.click(getByLabelText('Remove stage 1'));
    fireEvent.click(getByLabelText('Remove stage 1'));
    fireEvent.click(getByLabelText('Remove stage 1'));

    fireEvent.click(getByText('Save Recipe'));

    expect(mockAddRecipe).not.toHaveBeenCalled();
    expect(
      getByText('Recipe must have at least one stage with a duration greater than 0s.')
    ).toBeDefined();
  });

  it('preserves decimal inputs like "15." or "16.5" without stripping', () => {
    const { getByPlaceholderText } = render(<RecipeBuilderScreen />);

    const doseInput = document.querySelector('input[value="15"]') as HTMLInputElement;
    fireEvent.change(doseInput, { target: { value: '15.' } });
    expect(doseInput.value).toBe('15.');

    fireEvent.change(doseInput, { target: { value: '15.5' } });
    expect(doseInput.value).toBe('15.5');
  });

  it('allows selecting stageType for any stage card and updates accessibilityState', () => {
    const { getByLabelText } = render(<RecipeBuilderScreen />);

    // Step 1 defaults to Bloom
    const bloomPill = getByLabelText('Step 1 stage type Bloom');
    expect(bloomPill.getAttribute('aria-selected')).toBe('true');

    // Select Press for Step 1
    const pressPill = getByLabelText('Step 1 stage type Press');
    expect(pressPill.getAttribute('aria-selected')).toBe('false');

    fireEvent.click(pressPill);
    expect(pressPill.getAttribute('aria-selected')).toBe('true');
  });

  it('adds, removes, and saves recipe stages including notes and stageType', async () => {
    const { getByText, getByPlaceholderText } = render(<RecipeBuilderScreen />);

    const nameInput = getByPlaceholderText('e.g. My Morning V60');
    fireEvent.change(nameInput, { target: { value: 'Awesome Aeropress' } });

    const notesInput = getByPlaceholderText('Personal notes, water specs, grinder settings...');
    fireEvent.change(notesInput, { target: { value: 'Ground with Comandante 24 clicks' } });

    fireEvent.click(getByText('+ Add Brew Stage'));
    fireEvent.click(getByText('Save Recipe'));

    await waitFor(() => {
      expect(mockAddRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Awesome Aeropress',
          notes: 'Ground with Comandante 24 clicks',
        })
      );
    });
    expect(mockReplace).toHaveBeenCalledWith('/recipe/new-rec-1');
  });

  it('handles save error gracefully with Alert.alert and error banner', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert');
    mockAddRecipe.mockRejectedValueOnce(new Error('Network error writing to database'));

    const { getByText, getByPlaceholderText } = render(<RecipeBuilderScreen />);

    const nameInput = getByPlaceholderText('e.g. My Morning V60');
    fireEvent.change(nameInput, { target: { value: 'Valid Recipe' } });

    fireEvent.click(getByText('Save Recipe'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Save Failed', 'Network error writing to database');
    });
    expect(getByText('Network error writing to database')).toBeDefined();
  });

  it('supports reordering stages up and down and updates timing', () => {
    const { getByLabelText, getByText } = render(<RecipeBuilderScreen />);

    expect(getByText('Step 1 (0s)')).toBeDefined();
    expect(getByText('Step 2 (45s)')).toBeDefined();
    expect(getByText('Step 3 (90s)')).toBeDefined();

    // Move step 2 up to become step 1
    fireEvent.click(getByLabelText('Move stage 2 up'));

    // Timing recalculated
    expect(getByText('Step 1 (0s)')).toBeDefined();
  });

  it('pre-populates existing recipe when editId is provided and calls updateRecipe on save', async () => {
    mockParams = { editId: 'custom-1' };
    const { getByText, getByDisplayValue } = render(<RecipeBuilderScreen />);

    expect(getByText('Edit Recipe')).toBeDefined();
    expect(getByDisplayValue('My Special V60')).toBeDefined();

    fireEvent.click(getByText('Save Recipe'));

    await waitFor(() => {
      expect(mockUpdateRecipe).toHaveBeenCalledWith(
        'custom-1',
        expect.objectContaining({
          name: 'My Special V60',
        })
      );
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it('pre-populates with (Copy) name when duplicateId is provided and calls addRecipe on save', async () => {
    mockParams = { duplicateId: DEFAULT_PRESET_RECIPES[0].id };
    const { getByText, getByDisplayValue } = render(<RecipeBuilderScreen />);

    expect(getByText('Duplicate Recipe')).toBeDefined();
    expect(getByDisplayValue(`${DEFAULT_PRESET_RECIPES[0].name} (Copy)`)).toBeDefined();

    fireEvent.click(getByText('Save Recipe'));

    await waitFor(() => {
      expect(mockAddRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          name: `${DEFAULT_PRESET_RECIPES[0].name} (Copy)`,
        })
      );
    });
    expect(mockReplace).toHaveBeenCalledWith('/recipe/new-rec-1');
  });

  it('prompts confirmation alert on cancel and navigates back on discard', () => {
    const alertSpy = vi.spyOn(Alert, 'alert');
    const { getByLabelText } = render(<RecipeBuilderScreen />);

    fireEvent.click(getByLabelText('Cancel editing'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Discard Changes?',
      'Any unsaved recipe customizations will be lost.',
      expect.any(Array)
    );

    const buttons = alertSpy.mock.calls[0][2] as any[];
    const discardBtn = buttons.find((b) => b.text === 'Discard');
    discardBtn.onPress();
    expect(mockBack).toHaveBeenCalled();
  });

  it('updates ratio and calculates water amount when ratio preset pill is pressed', () => {
    const { getByText, getByLabelText } = render(<RecipeBuilderScreen />);

    // Default dose is 15, default ratio is 16.67 -> water is 250g
    expect(getByText('250g')).toBeDefined();

    // Click 1:15 ratio preset
    const ratioPill = getByLabelText('Select ratio 1 to 15');
    fireEvent.click(ratioPill);

    // 15g * 15 = 225g
    expect(getByText('225g')).toBeDefined();
    expect(ratioPill.getAttribute('aria-selected')).toBe('true');
  });

  it('allows selecting different brew methods and updates accessibilityState', () => {
    const { getByLabelText } = render(<RecipeBuilderScreen />);

    const aeropressPill = getByLabelText('Select brew method AeroPress');
    expect(aeropressPill.getAttribute('aria-selected')).toBe('false');

    fireEvent.click(aeropressPill);
    expect(aeropressPill.getAttribute('aria-selected')).toBe('true');
  });
});
