import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RecipeStudioView } from './RecipeStudioView';
import { RecipeBuilderModal } from './RecipeBuilderModal';
import { DEFAULT_PRESET_RECIPES, BrewRecipe } from '@brewlog/core';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      user_metadata: { display_name: 'Barista Bob' },
    },
  }),
}));

describe('RecipeStudioView', () => {
  const customRecipe: BrewRecipe = {
    id: 'local-rec-1',
    name: 'My Custom V60',
    brewMethod: 'v60',
    description: 'A special floral profile',
    author: 'Barista Bob',
    coffeeDoseGrams: 16,
    waterAmountGrams: 260,
    ratio: 16.25,
    grindSize: '22 clicks',
    waterTempCelsius: 94,
    totalTimeSeconds: 195,
    stages: [
      {
        id: 's1',
        name: 'Bloom',
        startSecond: 0,
        durationSeconds: 45,
        targetWaterWeightGrams: 50,
        instruction: 'Bloom pour',
        stageType: 'bloom',
      },
      {
        id: 's2',
        name: 'Main Pour',
        startSecond: 45,
        durationSeconds: 150,
        targetWaterWeightGrams: 260,
        instruction: 'Steady pour',
        stageType: 'pour',
      },
    ],
    isPreset: false,
    createdAt: new Date().toISOString(),
  };

  it('renders presets with Preset badge and custom recipes with Custom badge', () => {
    render(
      <RecipeStudioView
        recipes={[customRecipe, ...DEFAULT_PRESET_RECIPES]}
        onSelectRecipeForTimer={vi.fn()}
        onAddCustomRecipe={vi.fn()}
      />
    );

    expect(screen.getAllByText('My Custom V60').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Custom').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Preset').length).toBeGreaterThan(0);
  });

  it('filters recipes by brew method button click', () => {
    render(
      <RecipeStudioView
        recipes={[customRecipe, ...DEFAULT_PRESET_RECIPES]}
        onSelectRecipeForTimer={vi.fn()}
        onAddCustomRecipe={vi.fn()}
      />
    );

    // Custom recipe is displayed twice initially (list card + active detail view)
    expect(screen.getAllByText('My Custom V60').length).toBe(2);

    // Filter to aeropress
    const aeropressButton = screen.getByRole('button', { name: /^aeropress$/i });
    fireEvent.click(aeropressButton);

    // Custom V60 is no longer in the left column list (only remaining in active detail if previously active)
    expect(screen.getAllByText('My Custom V60').length).toBe(1);

    // Reset to all
    const allButton = screen.getByRole('button', { name: /^all$/i });
    fireEvent.click(allButton);
    expect(screen.getAllByText('My Custom V60').length).toBe(2);
  });

  it('loads recipe into timer when "Load in Timer" button is clicked', () => {
    const handleSelectRecipeForTimer = vi.fn();
    render(
      <RecipeStudioView
        recipes={[customRecipe, ...DEFAULT_PRESET_RECIPES]}
        onSelectRecipeForTimer={handleSelectRecipeForTimer}
        onAddCustomRecipe={vi.fn()}
      />
    );

    const loadButton = screen.getByRole('button', { name: /Load in Timer/i });
    fireEvent.click(loadButton);

    expect(handleSelectRecipeForTimer).toHaveBeenCalled();
  });

  it('opens delete confirmation modal and invokes onDeleteRecipe for custom recipe', async () => {
    const handleDeleteRecipe = vi.fn();
    render(
      <RecipeStudioView
        recipes={[customRecipe, ...DEFAULT_PRESET_RECIPES]}
        onSelectRecipeForTimer={vi.fn()}
        onAddCustomRecipe={vi.fn()}
        onDeleteRecipe={handleDeleteRecipe}
      />
    );

    const deleteTrigger = screen.getAllByTitle('Delete Recipe')[0];
    fireEvent.click(deleteTrigger);

    // Verify confirmation modal appears
    expect(screen.getByText('Delete Custom Recipe?')).toBeDefined();
    expect(
      screen.getByText(/Are you sure you want to delete/i)
    ).toBeDefined();

    // Confirm deletion
    const confirmDeleteBtn = screen.getByRole('button', {
      name: /^Delete Recipe$/i,
    });
    await act(async () => {
      fireEvent.click(confirmDeleteBtn);
    });

    expect(handleDeleteRecipe).toHaveBeenCalledWith('local-rec-1');
  });

  it('opens RecipeBuilderModal when "Build Custom Recipe" is clicked', () => {
    render(
      <RecipeStudioView
        recipes={[customRecipe, ...DEFAULT_PRESET_RECIPES]}
        onSelectRecipeForTimer={vi.fn()}
        onAddCustomRecipe={vi.fn()}
      />
    );

    const buildButton = screen.getByRole('button', {
      name: /Build Custom Recipe/i,
    });
    fireEvent.click(buildButton);

    expect(screen.getByText('Custom Recipe Studio')).toBeDefined();
    expect(screen.getByLabelText(/Recipe Name \*/i)).toBeDefined();
  });
});

describe('RecipeBuilderModal', () => {
  it('enforces validation if recipe name is empty', async () => {
    const handleSave = vi.fn();
    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={handleSave}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Save Recipe/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleSave).not.toHaveBeenCalled();
    expect(screen.getByText('Recipe name is required.')).toBeDefined();
  });

  it('recalculates auto-timing progression when a stage duration is modified', () => {
    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
      />
    );

    const durationInputs = screen.getAllByLabelText(/Duration \(seconds\)/i);
    // Change first stage duration from 45 to 60
    fireEvent.change(durationInputs[0], { target: { value: '60' } });

    // The second stage window should now start at 1:00 (60s)
    expect(screen.getByText(/1:00 – 1:45/i)).toBeDefined();
  });

  it('allows adding and reordering stages', () => {
    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
      />
    );

    const addStageBtn = screen.getByRole('button', { name: /Add Stage/i });
    fireEvent.click(addStageBtn);

    // Should now have 4 stages
    expect(screen.getByText(/4 stages/i)).toBeDefined();

    // Reorder stage 2 up
    const moveUpButtons = screen.getAllByTitle('Move Up');
    // Button for stage 2 is at index 1
    fireEvent.click(moveUpButtons[1]);
  });

  it('submits valid custom recipe with computed stages', async () => {
    const handleSave = vi.fn();
    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={handleSave}
      />
    );

    const nameInput = screen.getByLabelText(/Recipe Name \*/i);
    fireEvent.change(nameInput, { target: { value: 'Test Origami Recipe' } });

    const saveBtn = screen.getByRole('button', { name: /Save Recipe/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Origami Recipe',
        brewMethod: 'v60',
        coffeeDoseGrams: 15,
        waterAmountGrams: 250,
      })
    );
  });
});

