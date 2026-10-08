/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Alert } from 'react-native';
import { DEFAULT_PRESET_RECIPES, Equipment } from '@brewlog/core';
import { RecipeBuilderScreen } from './RecipeBuilderScreen';

const sampleGrinder1: Equipment = {
  id: 'grinder-1',
  type: 'grinder',
  brand: 'Fellow',
  model: 'Ode Gen 2',
  settingScaleType: 'stepped-numbers',
  createdAt: '2026-01-01',
};

const sampleGrinder2: Equipment = {
  id: 'grinder-2',
  type: 'grinder',
  brand: 'Comandante',
  model: 'C40 MK4',
  settingScaleType: 'clicks',
  createdAt: '2026-01-01',
};

let activeEquipmentContext = {
  equipment: [] as Equipment[],
  grinders: [] as Equipment[],
  brewers: [] as Equipment[],
  scales: [] as Equipment[],
  kettles: [] as Equipment[],
  other: [] as Equipment[],
  loading: false,
  addEquipment: vi.fn(),
  updateEquipment: vi.fn(),
  deleteEquipment: vi.fn(),
  toggleFavorite: vi.fn(),
  refreshEquipment: vi.fn(),
};

vi.mock('../../equipment/EquipmentContext', () => ({
  useEquipment: () => activeEquipmentContext,
  useOptionalEquipment: () => activeEquipmentContext,
  EquipmentContext: React.createContext(null),
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('react-native-keyboard-controller', () => ({
  KeyboardAwareScrollView: React.forwardRef(({ children, ...props }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      scrollToEnd: vi.fn(),
      scrollTo: vi.fn(),
    }));
    return <div {...props}>{children}</div>;
  }),
  KeyboardProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('react-native', () => ({
  View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style, numberOfLines, ...props }: any) => <span {...props}>{children}</span>,
  ScrollView: ({
    children,
    style,
    horizontal,
    showsHorizontalScrollIndicator: _showsHorizontalScrollIndicator,
    showsVerticalScrollIndicator: _showsVerticalScrollIndicator,
    contentContainerStyle,
    keyboardShouldPersistTaps: _keyboardShouldPersistTaps,
    nestedScrollEnabled: _nestedScrollEnabled,
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
let mockParams: {
  editId?: string;
  duplicateId?: string;
  stages?: string;
  initialDose?: string;
  initialWater?: string;
  initialMethod?: string;
} = {};

const canGoBackMock = vi.fn(() => true);

vi.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: canGoBackMock }),
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
    canGoBackMock.mockReturnValue(true);
    mockParams = {};
    mockAddRecipe.mockResolvedValue({ id: 'new-rec-1' });
    mockUpdateRecipe.mockResolvedValue({ id: 'custom-1' });
    mockContext.recipes = [mockCustomRecipe, ...DEFAULT_PRESET_RECIPES];
    activeEquipmentContext = {
      equipment: [],
      grinders: [],
      brewers: [],
      scales: [],
      kettles: [],
      other: [],
      loading: false,
      addEquipment: vi.fn().mockImplementation((item) =>
        Promise.resolve({
          id: 'grinder-created-1',
          createdAt: '2026-01-01',
          ...item,
        })
      ),
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      toggleFavorite: vi.fn(),
      refreshEquipment: vi.fn(),
    };
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
    fireEvent.click(getByText('SAVE'));

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
    fireEvent.click(getByText('SAVE'));

    expect(mockAddRecipe).not.toHaveBeenCalled();
    expect(getByText('Coffee dose must be between 1g and 100g.')).toBeDefined();

    // Dose = 105
    fireEvent.change(doseInput, { target: { value: '105' } });
    fireEvent.click(getByText('SAVE'));
    expect(getByText('Coffee dose must be between 1g and 100g.')).toBeDefined();
  });

  it('validates ratio bounds (< 1:1 or > 1:30) on save', async () => {
    const { getByText, getByPlaceholderText } = render(<RecipeBuilderScreen />);

    const nameInput = getByPlaceholderText('e.g. My Morning V60');
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });

    // Ratio = 0.5
    const ratioInput = document.querySelector('input[value="16.67"]') as HTMLInputElement;
    fireEvent.change(ratioInput, { target: { value: '0.5' } });
    fireEvent.click(getByText('SAVE'));

    expect(mockAddRecipe).not.toHaveBeenCalled();
    expect(getByText('Brew ratio must be between 1:1 and 1:30.')).toBeDefined();

    // Ratio = 35
    fireEvent.change(ratioInput, { target: { value: '35' } });
    fireEvent.click(getByText('SAVE'));
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

    fireEvent.click(getByText('SAVE'));

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

    fireEvent.click(getByText('ADD STAGE'));
    fireEvent.click(getByText('SAVE'));

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

    fireEvent.click(getByText('SAVE'));

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

    fireEvent.click(getByText('SAVE'));

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

    fireEvent.click(getByText('SAVE'));

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

  it('initializes form state from free brew route params (stages, initialDose, initialWater, initialMethod)', () => {
    mockParams = {
      stages: JSON.stringify([
        {
          id: 'stage-1',
          name: 'Bloom',
          startSecond: 0,
          durationSeconds: 45,
          targetWaterWeightGrams: 60,
          instruction: 'Execute bloom phase.',
          stageType: 'bloom',
        },
        {
          id: 'stage-2',
          name: 'Main Pour',
          startSecond: 45,
          durationSeconds: 90,
          targetWaterWeightGrams: 300,
          instruction: 'Execute main pour phase.',
          stageType: 'pour',
        },
      ]),
      initialDose: '18.5',
      initialWater: '300',
      initialMethod: 'aeropress',
    };

    const { getByLabelText, getByDisplayValue } = render(<RecipeBuilderScreen />);

    // Method should be initialized to aeropress
    const aeropressPill = getByLabelText('Select brew method AeroPress');
    expect(aeropressPill.getAttribute('aria-selected')).toBe('true');

    // Dose should be initialized to 18.5
    expect(getByDisplayValue('18.5')).toBeDefined();

    // Ratio should be calculated from 300 / 18.5 = 16.2
    expect(getByDisplayValue('16.2')).toBeDefined();

    // Custom stages should be rendered
    expect(getByDisplayValue('Bloom')).toBeDefined();
    expect(getByDisplayValue('Main Pour')).toBeDefined();
  });

  it('falls back to router.replace("/(tabs)/recipes") when router.canGoBack is false', () => {
    canGoBackMock.mockReturnValue(false);
    const alertSpy = vi.spyOn(Alert, 'alert');
    const { getByLabelText } = render(<RecipeBuilderScreen />);

    const cancelBtn = getByLabelText('Cancel editing');
    fireEvent.click(cancelBtn);

    const alertCalls = alertSpy.mock.calls;
    const buttons = alertCalls[0][2];
    const discardAction = buttons?.find((b: any) => b.text === 'Discard');
    discardAction?.onPress?.();

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/recipes');
  });

  it('renders inline "ADD GRINDER" prompt when user has 0 grinders in equipment', () => {
    activeEquipmentContext.grinders = [];
    const { getByText, queryByText } = render(<RecipeBuilderScreen />);

    expect(getByText(/no grinders added to equipment yet/i)).toBeDefined();
    expect(getByText('ADD GRINDER')).toBeDefined();
    expect(queryByText(/add grinder setting/i)).toBeNull();
  });

  it('adds first grinder inline, updates equipment, and creates first grinder setting row', async () => {
    activeEquipmentContext.grinders = [];
    const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(<RecipeBuilderScreen />);

    // Click "ADD GRINDER" to expand form
    fireEvent.click(getByText('ADD GRINDER'));

    const brandInput = getByPlaceholderText('e.g. Fellow, Comandante');
    const modelInput = getByPlaceholderText('e.g. Ode Gen 2, C40 MK4');
    expect(brandInput).toBeDefined();
    expect(modelInput).toBeDefined();

    fireEvent.change(brandInput, { target: { value: 'Timemore' } });
    fireEvent.change(modelInput, { target: { value: 'Chestnut C2' } });

    // Select scale format 'Clicks'
    fireEvent.click(getByText('Clicks'));

    // Save inline grinder
    fireEvent.click(getByText('Save Grinder'));

    await waitFor(() => {
      expect(activeEquipmentContext.addEquipment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'grinder',
          brand: 'Timemore',
          model: 'Chestnut C2',
          settingScaleType: 'clicks',
        })
      );
    });

    // Form collapsed
    expect(queryByPlaceholderText('e.g. Fellow, Comandante')).toBeNull();

    // Grinder setting row 1 created with Primary badge
    expect(getByText('Timemore Chestnut C2')).toBeDefined();
    expect(getByText(/primary/i)).toBeDefined();
    expect(document.querySelector('input[aria-label="Setting for Grinder 1"]')).toBeDefined();
  });

  it('preserves user input in recipe form when adding an inline grinder (no form reset on equipment update)', async () => {
    activeEquipmentContext.grinders = [];
    const { getByText, getByPlaceholderText } = render(<RecipeBuilderScreen />);

    const nameInput = getByPlaceholderText('e.g. My Morning V60') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'My Ethiopian Pour Over' } });

    const doseInput = document.querySelector('input[value="15"]') as HTMLInputElement;
    fireEvent.change(doseInput, { target: { value: '18' } });

    fireEvent.click(getByText('ADD GRINDER'));
    fireEvent.change(getByPlaceholderText('e.g. Fellow, Comandante'), { target: { value: 'Comandante' } });
    fireEvent.change(getByPlaceholderText('e.g. Ode Gen 2, C40 MK4'), { target: { value: 'C40 MK4' } });
    fireEvent.click(getByText('Save Grinder'));

    await waitFor(() => {
      expect(getByText('Comandante C40 MK4')).toBeDefined();
    });

    expect(nameInput.value).toBe('My Ethiopian Pour Over');
    expect(doseInput.value).toBe('18');
  });

  it('displays grinder selector, setting input, and allows adding another grinder setting when grinders exist', () => {
    activeEquipmentContext.grinders = [sampleGrinder1, sampleGrinder2];
    const { getByText, queryByText } = render(<RecipeBuilderScreen />);

    // Inline "ADD GRINDER" button should NOT be rendered when user already has grinders
    expect(queryByText('ADD GRINDER')).toBeNull();

    // "ADD" button should be available
    const addSettingBtn = getByText('ADD');
    fireEvent.click(addSettingBtn);

    // Row 1 created with first available grinder
    expect(getByText('Fellow Ode Gen 2')).toBeDefined();
    const settingInput1 = document.querySelector('input[aria-label="Setting for Grinder 1"]') as HTMLInputElement;
    expect(settingInput1).toBeDefined();

    // Add another row
    fireEvent.click(getByText('ADD'));

    // Row 2 created with second grinder
    expect(getByText('Comandante C40 MK4')).toBeDefined();
    const settingInput2 = document.querySelector('input[aria-label="Setting for Grinder 2"]') as HTMLInputElement;
    expect(settingInput2).toBeDefined();

    // All available grinders are now configured, so "ADD" is hidden
    expect(queryByText('ADD')).toBeNull();
  });

  it('displays "Primary" badge on the first grinder row only', () => {
    activeEquipmentContext.grinders = [sampleGrinder1, sampleGrinder2];
    const { getByText, getAllByText } = render(<RecipeBuilderScreen />);

    fireEvent.click(getByText('ADD'));
    fireEvent.click(getByText('ADD'));

    const primaryBadges = getAllByText(/primary/i);
    expect(primaryBadges).toHaveLength(1);
  });

  it('removes a grinder row on delete button click', () => {
    activeEquipmentContext.grinders = [sampleGrinder1, sampleGrinder2];
    const { getByText, getByLabelText, queryByText } = render(<RecipeBuilderScreen />);

    fireEvent.click(getByText('ADD'));
    fireEvent.click(getByText('ADD'));

    expect(getByText('Fellow Ode Gen 2')).toBeDefined();
    expect(getByText('Comandante C40 MK4')).toBeDefined();

    // Remove row 1 (Fellow)
    fireEvent.click(getByLabelText('Remove grinder 1'));

    // Row 1 is removed; Comandante becomes the first row and is badged Primary
    expect(queryByText('Fellow Ode Gen 2')).toBeNull();
    expect(getByText('Comandante C40 MK4')).toBeDefined();
    expect(getByText(/primary/i)).toBeDefined();

    // Since only 1 of 2 is configured now, "ADD" reappears
    expect(getByText('ADD')).toBeDefined();
  });

  it('saves recipe with grinderSettings array and syncs recommendedGrinderId to primary grinder', async () => {
    activeEquipmentContext.grinders = [sampleGrinder1, sampleGrinder2];
    const { getByText, getByPlaceholderText } = render(<RecipeBuilderScreen />);

    const nameInput = getByPlaceholderText('e.g. My Morning V60');
    fireEvent.change(nameInput, { target: { value: 'Dual Grinder Profile' } });

    fireEvent.click(getByText('ADD'));
    const settingInput1 = document.querySelector('input[aria-label="Setting for Grinder 1"]') as HTMLInputElement;
    fireEvent.change(settingInput1, { target: { value: '5.1' } });

    fireEvent.click(getByText('ADD'));
    const settingInput2 = document.querySelector('input[aria-label="Setting for Grinder 2"]') as HTMLInputElement;
    fireEvent.change(settingInput2, { target: { value: '22 clicks' } });

    fireEvent.click(getByText('SAVE'));

    await waitFor(() => {
      expect(mockAddRecipe).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Dual Grinder Profile',
          grinderSettings: [
            { grinderId: 'grinder-1', setting: '5.1' },
            { grinderId: 'grinder-2', setting: '22 clicks' },
          ],
          recommendedGrinderId: 'grinder-1',
        })
      );
    });
  });

  it('filters erased grinders from sourceRecipe.grinderSettings on initialization', () => {
    const recipeWithErasedGrinder = {
      ...DEFAULT_PRESET_RECIPES[0],
      id: 'erased-test-recipe',
      name: 'Recipe with Erased Grinder',
      grinderSettings: [
        { grinderId: 'grinder-1', setting: '5.1' },
        { grinderId: 'deleted-grinder-id', setting: '10' },
      ],
    };
    mockContext.recipes = [recipeWithErasedGrinder, ...DEFAULT_PRESET_RECIPES];
    mockParams = { editId: 'erased-test-recipe' };
    activeEquipmentContext.grinders = [sampleGrinder1]; // deleted-grinder-id is not in active equipment

    const { getByText, queryByText } = render(<RecipeBuilderScreen />);

    expect(getByText('Fellow Ode Gen 2')).toBeDefined();
    expect(queryByText('deleted-grinder-id')).toBeNull();
    // Only 1 row is present
    expect(document.querySelector('input[aria-label="Setting for Grinder 2"]')).toBeNull();
  });

  it('falls back to recommendedGrinderId if sourceRecipe has no grinderSettings', () => {
    const legacyRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      id: 'legacy-recipe',
      name: 'Legacy Recipe',
      recommendedGrinderId: 'grinder-1',
      grindSize: 'Medium-Fine',
      grinderSettings: undefined,
    };
    mockContext.recipes = [legacyRecipe, ...DEFAULT_PRESET_RECIPES];
    mockParams = { editId: 'legacy-recipe' };
    activeEquipmentContext.grinders = [sampleGrinder1];

    const { getByText } = render(<RecipeBuilderScreen />);

    expect(getByText('Fellow Ode Gen 2')).toBeDefined();
    const settingInput = document.querySelector('input[aria-label="Setting for Grinder 1"]') as HTMLInputElement;
    expect(settingInput.value).toBe('Medium-Fine');
  });

  it('allows changing grinder via picker overlay', () => {
    activeEquipmentContext.grinders = [sampleGrinder1, sampleGrinder2];
    const { getByText, getByLabelText, queryByText } = render(<RecipeBuilderScreen />);

    fireEvent.click(getByText('ADD'));
    expect(getByText('Fellow Ode Gen 2')).toBeDefined();

    // Click grinder trigger to open picker overlay
    fireEvent.click(getByLabelText('Grinder 1'));
    expect(getByText('SELECT GRINDER')).toBeDefined();

    // Select second grinder from overlay
    fireEvent.click(getByLabelText('Select Comandante C40 MK4'));

    // Overlay closes and row displays new grinder
    expect(queryByText('SELECT GRINDER')).toBeNull();
    expect(getByText('Comandante C40 MK4')).toBeDefined();
  });

  it('renders grinder options inside scrollable picker overlay', () => {
    activeEquipmentContext.grinders = [sampleGrinder1, sampleGrinder2];
    const { getByText, getByLabelText } = render(<RecipeBuilderScreen />);

    fireEvent.click(getByText('ADD'));
    fireEvent.click(getByLabelText('Grinder 1'));

    expect(getByText('SELECT GRINDER')).toBeDefined();
    expect(getByLabelText('Select Fellow Ode Gen 2')).toBeDefined();
    expect(getByLabelText('Select Comandante C40 MK4')).toBeDefined();
  });
});
