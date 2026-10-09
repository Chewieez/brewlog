/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { RecipeBuilderModal } from './RecipeBuilderModal';
import { BrewRecipe, Equipment } from '@brewlog/core';
import { useEquipment } from '../equipment/useEquipment';

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'test-user', user_metadata: { display_name: 'Test Barista' } },
  }),
}));

vi.mock('../equipment/useEquipment', () => ({
  useEquipment: vi.fn(),
}));

describe('RecipeBuilderModal', () => {
  beforeEach(() => {
    vi.mocked(useEquipment).mockReturnValue({
      equipment: [],
      addEquipment: vi.fn(),
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      toggleFavorite: vi.fn(),
      loading: false,
      refreshEquipment: vi.fn(),
    });
  });
  afterEach(() => {
    cleanup();
  });

  const sampleRecipe: BrewRecipe = {
    id: 'sample-custom-1',
    name: 'Sample V60 Profile',
    author: 'Test Barista',
    brewMethod: 'v60',
    description: 'Smooth and clean extraction',
    notes: 'Grind slightly finer if drawdown is fast',
    coffeeDoseGrams: 18,
    waterAmountGrams: 300,
    ratio: 16.67,
    grindSize: 'Medium-Fine',
    waterTempCelsius: 92,
    totalTimeSeconds: 150,
    stages: [
      {
        id: 'stage-1',
        name: 'Bloom Phase',
        stageType: 'bloom',
        startSecond: 0,
        durationSeconds: 45,
        targetWaterWeightGrams: 50,
        instruction: 'Wet grounds completely',
      },
      {
        id: 'stage-2',
        name: 'Main Pour',
        stageType: 'pour',
        startSecond: 45,
        durationSeconds: 105,
        targetWaterWeightGrams: 300,
        instruction: 'Pour up to 300g',
      },
    ],
    isPreset: false,
    createdAt: '2026-01-01',
  };

  it('renders "Create New Custom Recipe" and "SAVE RECIPE" when initialRecipe is null', () => {
    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={null}
      />
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Create New Custom Recipe' })
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /save recipe/i })).toBeDefined();
  });

  it('pre-populates fields, shows "Edit Recipe" and "SAVE CHANGES" when initialRecipe is provided', () => {
    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={sampleRecipe}
      />
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Edit Recipe' })
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDefined();

    expect((screen.getByLabelText(/recipe name \*/i) as HTMLInputElement).value).toBe(
      'Sample V60 Profile'
    );
    expect((screen.getByLabelText(/author \/ barista tag/i) as HTMLInputElement).value).toBe(
      'Test Barista'
    );
    expect((screen.getByLabelText(/coffee dose \(g\)/i) as HTMLInputElement).value).toBe(
      '18'
    );
    expect((screen.getByLabelText(/target water \(g\)/i) as HTMLInputElement).value).toBe(
      '300'
    );
    expect(
      (screen.getByLabelText(/description \/ profile notes/i) as HTMLTextAreaElement).value
    ).toBe('Smooth and clean extraction');
  });

  it('submits updated values when saving in edit mode', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={onClose}
        onSaveRecipe={onSave}
        initialRecipe={sampleRecipe}
      />
    );

    const nameInput = screen.getByLabelText(/recipe name \*/i);
    fireEvent.change(nameInput, { target: { value: 'Modified Profile Name' } });

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Modified Profile Name',
          coffeeDoseGrams: 18,
          waterAmountGrams: 300,
          brewMethod: 'v60',
          isPreset: false,
        })
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('guards against double-invocation when submitting while save is in-flight', async () => {
    let resolveSave: () => void = () => {};
    const onSave = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
      resolveSave = resolve;
    }));
    const onClose = vi.fn();

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={onClose}
        onSaveRecipe={onSave}
        initialRecipe={sampleRecipe}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(submitBtn);

    expect(onSave).toHaveBeenCalledTimes(1);

    // Attempt second submission while in flight
    fireEvent.click(submitBtn);
    expect(onSave).toHaveBeenCalledTimes(1);

    resolveSave();
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  const sampleGrinder1: Equipment = {
    id: 'grinder-1',
    type: 'grinder',
    brand: 'Comandante',
    model: 'C40 MK4',
    settingScaleType: 'clicks',
    createdAt: '2026-01-01',
  };

  const sampleGrinder2: Equipment = {
    id: 'grinder-2',
    type: 'grinder',
    brand: 'Fellow',
    model: 'Ode Gen 2',
    settingScaleType: 'stepped-numbers',
    createdAt: '2026-01-01',
  };

  it('when user has 0 grinders in equipment, renders inline "+ Add Grinder" trigger and creation card', () => {
    vi.mocked(useEquipment).mockReturnValue({
      equipment: [],
      addEquipment: vi.fn(),
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      toggleFavorite: vi.fn(),
      loading: false,
      refreshEquipment: vi.fn(),
    });

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={null}
      />
    );

    const triggerBtn = screen.getByRole('button', { name: /add grinder/i });
    expect(triggerBtn).toBeDefined();

    // Expand creation form
    fireEvent.click(triggerBtn);

    expect(screen.getByLabelText(/grinder brand/i)).toBeDefined();
    expect(screen.getByLabelText(/grinder model/i)).toBeDefined();
    expect(screen.getByLabelText(/dial format|setting scale/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /save grinder/i })).toBeDefined();
    expect(screen.queryByLabelText(/^grinder 1$/i)).toBeNull();
  });

  it('adding first grinder inline adds it to equipment and populates the first grinder setting row', async () => {
    const mockAddEquipment = vi.fn().mockResolvedValue({
      id: 'grinder-created-1',
      type: 'grinder',
      brand: 'Timemore',
      model: 'Chestnut C2',
      settingScaleType: 'clicks',
      createdAt: '2026-01-01',
    });

    vi.mocked(useEquipment).mockReturnValue({
      equipment: [],
      addEquipment: mockAddEquipment,
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      toggleFavorite: vi.fn(),
      loading: false,
      refreshEquipment: vi.fn(),
    });

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /add grinder/i }));
    fireEvent.change(screen.getByLabelText(/grinder brand/i), { target: { value: 'Timemore' } });
    fireEvent.change(screen.getByLabelText(/grinder model/i), { target: { value: 'Chestnut C2' } });
    fireEvent.change(screen.getByLabelText(/dial format|setting scale/i), { target: { value: 'clicks' } });
    fireEvent.click(screen.getByRole('button', { name: /save grinder/i }));

    await waitFor(() => {
      expect(mockAddEquipment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'grinder',
          brand: 'Timemore',
          model: 'Chestnut C2',
          settingScaleType: 'clicks',
        })
      );
    });

    await waitFor(() => {
      const grinderSelect = screen.getByLabelText(/^grinder 1$/i) as HTMLSelectElement;
      expect(grinderSelect).toBeDefined();
      expect(grinderSelect.value).toBe('grinder-created-1');
      expect(screen.getByLabelText(/setting for grinder 1/i)).toBeDefined();
    });
    expect(screen.queryByLabelText(/grinder brand/i)).toBeNull();
  });

  it('when user already has grinders, displays grinder selector and setting input, allowing adding another grinder setting', () => {
    vi.mocked(useEquipment).mockReturnValue({
      equipment: [sampleGrinder1, sampleGrinder2],
      addEquipment: vi.fn(),
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      toggleFavorite: vi.fn(),
      loading: false,
      refreshEquipment: vi.fn(),
    });

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={null}
      />
    );

    // Should NOT offer inline creation trigger
    expect(screen.queryByRole('button', { name: /^add grinder$/i })).toBeNull();

    // Renders first grinder row selector & setting input
    const grinderSelect1 = screen.getByLabelText(/^grinder 1$/i) as HTMLSelectElement;
    expect(grinderSelect1).toBeDefined();
    expect(grinderSelect1.value).toBe('grinder-1');
    expect(screen.getByLabelText(/setting for grinder 1/i)).toBeDefined();

    // Add another grinder
    const addAnotherBtn = screen.getByRole('button', { name: /add another grinder/i });
    fireEvent.click(addAnotherBtn);

    expect(screen.getByLabelText(/^grinder 2$/i)).toBeDefined();
    expect(screen.getByLabelText(/setting for grinder 2/i)).toBeDefined();
  });

  it('displays "Primary" badge on the first grinder row', () => {
    vi.mocked(useEquipment).mockReturnValue({
      equipment: [sampleGrinder1, sampleGrinder2],
      addEquipment: vi.fn(),
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      toggleFavorite: vi.fn(),
      loading: false,
      refreshEquipment: vi.fn(),
    });

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={null}
      />
    );

    // Primary badge exists on first row
    expect(screen.getByText(/^primary$/i)).toBeDefined();

    // Add another row
    fireEvent.click(screen.getByRole('button', { name: /add another grinder/i }));

    // Only one Primary badge
    const primaryBadges = screen.getAllByText(/^primary$/i);
    expect(primaryBadges).toHaveLength(1);
  });

  it('removes a grinder row on trash click', () => {
    vi.mocked(useEquipment).mockReturnValue({
      equipment: [sampleGrinder1, sampleGrinder2],
      addEquipment: vi.fn(),
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      toggleFavorite: vi.fn(),
      loading: false,
      refreshEquipment: vi.fn(),
    });

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /add another grinder/i }));
    expect(screen.getByLabelText(/^grinder 2$/i)).toBeDefined();

    const removeBtn1 = screen.getByRole('button', { name: /remove grinder 1/i });
    fireEvent.click(removeBtn1);

    expect(screen.queryByLabelText(/^grinder 2$/i)).toBeNull();
    expect(screen.getByLabelText(/^grinder 1$/i)).toBeDefined();
  });

  it('saves recipe with grinderSettings payload', async () => {
    const onSave = vi.fn();
    vi.mocked(useEquipment).mockReturnValue({
      equipment: [sampleGrinder1, sampleGrinder2],
      addEquipment: vi.fn(),
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      toggleFavorite: vi.fn(),
      loading: false,
      refreshEquipment: vi.fn(),
    });

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={onSave}
        initialRecipe={null}
      />
    );

    fireEvent.change(screen.getByLabelText(/recipe name \*/i), {
      target: { value: 'Comandante Daily Brew' },
    });
    fireEvent.change(screen.getByLabelText(/setting for grinder 1/i), {
      target: { value: '24 clicks' },
    });

    fireEvent.click(screen.getByRole('button', { name: /add another grinder/i }));
    fireEvent.change(screen.getByLabelText(/^grinder 2$/i), {
      target: { value: 'grinder-2' },
    });
    fireEvent.change(screen.getByLabelText(/setting for grinder 2/i), {
      target: { value: '4.2' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save recipe/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Comandante Daily Brew',
          grinderSettings: [
            { grinderId: 'grinder-1', setting: '24 clicks' },
            { grinderId: 'grinder-2', setting: '4.2' },
          ],
        })
      );
    });
  });

  it('preserves user input in recipe form when adding an inline grinder (no form reset on equipment update)', async () => {
    const mockAddEquipment = vi.fn().mockResolvedValue({
      id: 'grinder-created-99',
      type: 'grinder',
      brand: '1Zpresso',
      model: 'K-Ultra',
      settingScaleType: 'clicks',
      createdAt: '2026-01-01',
    });

    vi.mocked(useEquipment).mockReturnValue({
      equipment: [],
      addEquipment: mockAddEquipment,
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      toggleFavorite: vi.fn(),
      loading: false,
      refreshEquipment: vi.fn(),
    });

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={null}
      />
    );

    // User types recipe name and modifies dose
    fireEvent.change(screen.getByLabelText(/recipe name \*/i), {
      target: { value: 'In-Progress Custom Profile' },
    });
    fireEvent.change(screen.getByLabelText(/coffee dose \(g\)/i), {
      target: { value: '22' },
    });

    // Expand inline grinder creation
    fireEvent.click(screen.getByRole('button', { name: /add grinder/i }));
    fireEvent.change(screen.getByLabelText(/grinder brand/i), { target: { value: '1Zpresso' } });
    fireEvent.change(screen.getByLabelText(/grinder model/i), { target: { value: 'K-Ultra' } });
    fireEvent.click(screen.getByRole('button', { name: /save grinder/i }));

    await waitFor(() => {
      expect(mockAddEquipment).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText(/^grinder 1$/i)).toBeDefined();
    });

    // Verify form fields were not wiped back to empty/default
    expect((screen.getByLabelText(/recipe name \*/i) as HTMLInputElement).value).toBe(
      'In-Progress Custom Profile'
    );
    expect((screen.getByLabelText(/coffee dose \(g\)/i) as HTMLInputElement).value).toBe('22');
  });

  it('filters out erased/deleted grinders from grinderSettings on initial load', () => {
    vi.mocked(useEquipment).mockReturnValue({
      equipment: [sampleGrinder1], // Only sampleGrinder1 exists in equipment
      addEquipment: vi.fn(),
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      toggleFavorite: vi.fn(),
      loading: false,
      refreshEquipment: vi.fn(),
    });

    const recipeWithErasedGrinder: BrewRecipe = {
      ...sampleRecipe,
      grinderSettings: [
        { grinderId: 'erased-grinder-id', setting: '10' },
        { grinderId: 'grinder-1', setting: '24 clicks' },
      ],
    };

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={recipeWithErasedGrinder}
      />
    );

    // Only 1 row should be rendered (for grinder-1) because erased-grinder-id was filtered out
    expect(screen.getByLabelText(/^grinder 1$/i)).toBeDefined();
    expect((screen.getByLabelText(/^grinder 1$/i) as HTMLSelectElement).value).toBe('grinder-1');
    expect((screen.getByLabelText(/setting for grinder 1/i) as HTMLInputElement).value).toBe(
      '24 clicks'
    );
    expect(screen.queryByLabelText(/^grinder 2$/i)).toBeNull();
  });

  it('does not resurrect recommendedGrinderId when user deletes all grinder settings in edit mode', async () => {
    const onSave = vi.fn();
    vi.mocked(useEquipment).mockReturnValue({
      equipment: [sampleGrinder1],
      addEquipment: vi.fn(),
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      toggleFavorite: vi.fn(),
      loading: false,
      refreshEquipment: vi.fn(),
    });

    const recipeWithGrinder: BrewRecipe = {
      ...sampleRecipe,
      recommendedGrinderId: 'grinder-1',
      grinderSettings: [{ grinderId: 'grinder-1', setting: '20 clicks' }],
    };

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={onSave}
        initialRecipe={recipeWithGrinder}
      />
    );

    // Remove the only grinder setting row
    const removeBtn = screen.getByRole('button', { name: /remove grinder 1/i });
    fireEvent.click(removeBtn);

    // Save recipe
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      const savedPayload = onSave.mock.calls[0][0];
      expect(savedPayload.grinderSettings).toEqual([]);
      expect(savedPayload.recommendedGrinderId).toBeUndefined();
    });
  });

  it('hides "ADD ANOTHER GRINDER" when all existing user grinders have been configured', () => {
    vi.mocked(useEquipment).mockReturnValue({
      equipment: [sampleGrinder1, sampleGrinder2], // 2 grinders available
      addEquipment: vi.fn(),
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      toggleFavorite: vi.fn(),
      loading: false,
      refreshEquipment: vi.fn(),
    });

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={null}
      />
    );

    // Row 1 exists by default, "ADD ANOTHER GRINDER" is visible
    const addAnotherBtn = screen.getByRole('button', { name: /add another grinder/i });
    expect(addAnotherBtn).toBeDefined();

    // Click to add row 2 (which now uses all 2 available grinders)
    fireEvent.click(addAnotherBtn);

    // Now 2 rows exist, matching total available grinders (2). "ADD ANOTHER GRINDER" must be hidden.
    expect(screen.queryByRole('button', { name: /add another grinder/i })).toBeNull();
  });

  it('allows promoting a non-primary grinder to primary with Set Primary button', () => {
    vi.mocked(useEquipment).mockReturnValue({
      equipment: [sampleGrinder1, sampleGrinder2],
      addEquipment: vi.fn(),
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      toggleFavorite: vi.fn(),
      loading: false,
      refreshEquipment: vi.fn(),
    });

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={null}
      />
    );

    // Row 1 starts with sampleGrinder1
    expect((screen.getByRole('combobox', { name: /grinder 1/i }) as HTMLSelectElement).value).toBe(sampleGrinder1.id);

    // Add another grinder (Row 2 gets sampleGrinder2)
    fireEvent.click(screen.getByRole('button', { name: /add another grinder/i }));
    expect((screen.getByRole('combobox', { name: /grinder 2/i }) as HTMLSelectElement).value).toBe(sampleGrinder2.id);

    // Row 2 has a "Set Primary" button
    const setPrimaryBtn = screen.getByRole('button', { name: /set grinder 2 as primary/i });
    expect(setPrimaryBtn).toBeDefined();

    // Click "Set Primary" on Row 2
    fireEvent.click(setPrimaryBtn);

    // Now Row 1 is sampleGrinder2, and Row 2 is sampleGrinder1
    expect((screen.getByRole('combobox', { name: /grinder 1/i }) as HTMLSelectElement).value).toBe(sampleGrinder2.id);
    expect((screen.getByRole('combobox', { name: /grinder 2/i }) as HTMLSelectElement).value).toBe(sampleGrinder1.id);
  });

  it('uses equipment passed via props directly', () => {
    const propGrinder: Equipment = {
      id: 'prop-k6',
      brand: 'Kingrinder',
      model: 'K6',
      type: 'grinder',
      settingScaleType: 'clicks',
      createdAt: '2026-01-01',
    };

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={null}
        equipment={[propGrinder]}
      />
    );

    expect(screen.getByRole('combobox', { name: /grinder 1/i })).toBeDefined();
    expect((screen.getByRole('combobox', { name: /grinder 1/i }) as HTMLSelectElement).value).toBe('prop-k6');
    expect(screen.getByText(/Kingrinder K6/)).toBeDefined();
  });

  it('calls onAddEquipment prop when creating inline grinder', async () => {
    const mockOnAddEquipment = vi.fn().mockResolvedValue({
      id: 'new-k6',
      brand: 'Kingrinder',
      model: 'K6',
      type: 'grinder',
      settingScaleType: 'clicks',
      createdAt: '2026-01-01',
    });

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={null}
        equipment={[]}
        onAddEquipment={mockOnAddEquipment}
      />
    );

    // Prompt to add grinder should be visible
    expect(screen.getByText(/no grinders found in your equipment/i)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /add grinder/i }));

    // Fill inline form
    fireEvent.change(screen.getByLabelText(/brand/i), { target: { value: 'Kingrinder' } });
    fireEvent.change(screen.getByLabelText(/model/i), { target: { value: 'K6' } });
    fireEvent.click(screen.getByRole('button', { name: /save grinder/i }));

    await waitFor(() => {
      expect(mockOnAddEquipment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'grinder',
          brand: 'Kingrinder',
          model: 'K6',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /grinder 1/i })).toBeDefined();
      expect((screen.getByRole('combobox', { name: /grinder 1/i }) as HTMLSelectElement).value).toBe('new-k6');
    });
  });
});


