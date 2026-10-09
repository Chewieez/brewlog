/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DEFAULT_PRESET_RECIPES, BrewRecipe, Equipment } from '@brewlog/core';
import { RecipeDetailPane } from './RecipeDetailPane';
import { useEquipment } from '../equipment/useEquipment';

vi.mock('../equipment/useEquipment', () => ({
  useEquipment: vi.fn(),
}));

const mockGrinders: Equipment[] = [
  {
    id: 'grinder-ode',
    type: 'grinder',
    brand: 'Fellow',
    model: 'Ode Gen 2',
    settingScaleType: 'stepped-numbers',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'grinder-c40',
    type: 'grinder',
    brand: 'Comandante',
    model: 'C40 MK4',
    settingScaleType: 'clicks',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('RecipeDetailPane', () => {
  const recipe = DEFAULT_PRESET_RECIPES[0];

  beforeEach(() => {
    vi.mocked(useEquipment).mockReturnValue({
      equipment: mockGrinders,
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

  it('renders recipe title, author, specs, and steps', () => {
    render(
      <MemoryRouter>
        <RecipeDetailPane
          recipe={recipe}
          onSelectRecipeForTimer={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 3, name: recipe.name })).toBeDefined();
    expect(screen.getByText(`by ${recipe.author!}`)).toBeDefined();
    expect(screen.getByText(/brew with this recipe/i)).toBeDefined();
    expect(screen.getByText('Official Preset')).toBeDefined();
    expect(screen.getByText(`1:${recipe.ratio}`)).toBeDefined();
    expect(screen.getByText('Brew Steps')).toBeDefined();
    expect(screen.getByText(recipe.stages[0].name)).toBeDefined();
  });

  it('rescales dose and calls onSelectRecipeForTimer with scaled recipe', () => {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <RecipeDetailPane
          recipe={recipe}
          onSelectRecipeForTimer={onSelect}
        />
      </MemoryRouter>
    );

    const slider = screen.getByRole('slider', { name: /coffee dose/i });
    fireEvent.change(slider, { target: { value: '30' } });

    fireEvent.click(screen.getByRole('button', { name: /brew with this recipe/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].coffeeDoseGrams).toBe(30);
  });

  it('renders mobile back link when showMobileBackButton is true', () => {
    render(
      <MemoryRouter>
        <RecipeDetailPane
          recipe={recipe}
          onSelectRecipeForTimer={vi.fn()}
          showMobileBackButton={true}
        />
      </MemoryRouter>
    );

    const backLink = screen.getByRole('link', { name: /back to recipes/i });
    expect(backLink).toBeDefined();
    expect(backLink.getAttribute('href')).toBe('/recipes');
  });

  it('does not render mobile back link when showMobileBackButton is false or omitted', () => {
    render(
      <MemoryRouter>
        <RecipeDetailPane
          recipe={recipe}
          onSelectRecipeForTimer={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /back to recipes/i })).toBeNull();
  });

  it('renders custom badge and calls onDeleteRecipe when delete button is clicked on custom recipe', () => {
    const customRecipe: BrewRecipe = {
      id: 'custom-456',
      name: 'Custom Ethiopian Pour',
      brewMethod: 'v60',
      description: 'Bright and floral',
      author: 'Greg',
      coffeeDoseGrams: 15,
      waterAmountGrams: 250,
      ratio: 16.7,
      grindSize: 'Medium-Fine',
      waterTempCelsius: 94,
      totalTimeSeconds: 180,
      stages: [
        {
          id: 'cs1',
          name: 'Bloom Phase',
          startSecond: 0,
          durationSeconds: 40,
          targetWaterWeightGrams: 50,
          instruction: 'Gently bloom grounds.',
          stageType: 'bloom',
        },
      ],
      isPreset: false,
      createdAt: '2026-01-01',
    };

    const onDelete = vi.fn();
    render(
      <MemoryRouter>
        <RecipeDetailPane
          recipe={customRecipe}
          onSelectRecipeForTimer={vi.fn()}
          onDeleteRecipe={onDelete}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Custom')).toBeDefined();
    const deleteButton = screen.getByRole('button', {
      name: `Delete custom recipe ${customRecipe.name}`,
    });
    expect(deleteButton).toBeDefined();

    // Clicking delete button opens confirmation modal without calling onDelete
    fireEvent.click(deleteButton);
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Delete Custom Recipe?')).toBeDefined();

    // Clicking cancel closes the modal without deleting
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();

    // Reopening and clicking confirm triggers onDelete
    fireEvent.click(deleteButton);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Recipe' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(customRecipe);
  });

  it('adapts slider min and max bounds dynamically for recipes outside 10-60g range', () => {
    const largeBatchRecipe: BrewRecipe = {
      ...recipe,
      id: 'batch-brew',
      name: 'Cold Brew Batch',
      coffeeDoseGrams: 85,
    };

    render(
      <MemoryRouter>
        <RecipeDetailPane
          recipe={largeBatchRecipe}
          onSelectRecipeForTimer={vi.fn()}
        />
      </MemoryRouter>
    );

    const slider = screen.getByRole('slider', { name: /coffee dose/i });
    expect(slider.getAttribute('min')).toBe('10');
    expect(slider.getAttribute('max')).toBe('85');
    expect(screen.getAllByText('85g').length).toBeGreaterThanOrEqual(2);
  });

  it('renders edit button for custom recipes and calls onEditRecipe when clicked', () => {
    const customRecipe: BrewRecipe = {
      id: 'custom-edit-1',
      name: 'Custom V60',
      brewMethod: 'v60',
      description: 'Editable custom brew',
      author: 'Greg',
      coffeeDoseGrams: 15,
      waterAmountGrams: 250,
      ratio: 16.7,
      grindSize: 'Medium-Fine',
      waterTempCelsius: 93,
      totalTimeSeconds: 150,
      stages: [],
      isPreset: false,
      createdAt: '2026-01-01',
    };

    const onEdit = vi.fn();
    render(
      <MemoryRouter>
        <RecipeDetailPane
          recipe={customRecipe}
          onSelectRecipeForTimer={vi.fn()}
          onEditRecipe={onEdit}
        />
      </MemoryRouter>
    );

    const editBtn = screen.getByRole('button', {
      name: `Edit custom recipe ${customRecipe.name}`,
    });
    expect(editBtn).toBeDefined();

    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(customRecipe);
  });

  it('does not render edit button for preset recipes', () => {
    const onEdit = vi.fn();
    render(
      <MemoryRouter>
        <RecipeDetailPane
          recipe={recipe}
          onSelectRecipeForTimer={vi.fn()}
          onEditRecipe={onEdit}
        />
      </MemoryRouter>
    );

    expect(
      screen.queryByRole('button', {
        name: `Edit custom recipe ${recipe.name}`,
      })
    ).toBeNull();
  });

  it('renders grinder brand, model, and dial setting for recipe with grinderSettings and marks primary', () => {
    const recipeWithGrinders: BrewRecipe = {
      ...recipe,
      grinderSettings: [
        { grinderId: 'grinder-ode', setting: '5.1' },
        { grinderId: 'grinder-c40', setting: '18 clicks' },
      ],
    };

    render(
      <MemoryRouter>
        <RecipeDetailPane
          recipe={recipeWithGrinders}
          onSelectRecipeForTimer={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Grinder Settings')).toBeDefined();
    expect(screen.getByText(/Fellow Ode Gen 2 — 5\.1/)).toBeDefined();
    expect(screen.getByText(/Comandante C40 MK4 — 18 clicks/)).toBeDefined();
    expect(screen.getByText('Primary')).toBeDefined();
  });

  it('filters out and hides erased grinders not present in equipment', () => {
    const recipeWithErasedGrinder: BrewRecipe = {
      ...recipe,
      grinderSettings: [
        { grinderId: 'erased-grinder-999', setting: '2.5' },
        { grinderId: 'grinder-ode', setting: '5.1' },
      ],
    };

    render(
      <MemoryRouter>
        <RecipeDetailPane
          recipe={recipeWithErasedGrinder}
          onSelectRecipeForTimer={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Fellow Ode Gen 2 — 5\.1/)).toBeDefined();
    expect(screen.queryByText(/2\.5/)).toBeNull();
    expect(screen.queryByText(/erased-grinder-999/)).toBeNull();
  });

  it('falls back to general grindSize when no valid grinder settings exist', () => {
    // Case 1: Recipe has no grinderSettings
    render(
      <MemoryRouter>
        <RecipeDetailPane
          recipe={{ ...recipe, grindSize: 'Medium-Fine', grinderSettings: [] }}
          onSelectRecipeForTimer={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Medium-Fine')).toBeDefined();
    expect(screen.queryByText('Primary')).toBeNull();

    cleanup();

    // Case 2: Recipe has only erased grinders
    render(
      <MemoryRouter>
        <RecipeDetailPane
          recipe={{
            ...recipe,
            grindSize: 'Medium-Coarse',
            grinderSettings: [{ grinderId: 'erased-grinder-999', setting: '2.5' }],
          }}
          onSelectRecipeForTimer={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Medium-Coarse')).toBeDefined();
    expect(screen.queryByText(/2\.5/)).toBeNull();
  });
});
