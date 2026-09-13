import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet, useLocation } from 'react-router';
import { DEFAULT_PRESET_RECIPES, BrewRecipe } from '@brewlog/core';
import { RecipeDetailRoute } from './RecipeDetailRoute';
import { RecipeIndexRoute } from './RecipeIndexRoute';
import { RecipeOutletContext } from './RecipesRoute';

const mockCustomRecipe: BrewRecipe = {
  id: 'custom-pour',
  name: 'Custom Pour Over',
  brewMethod: 'v60',
  description: 'Custom recipe description',
  coffeeDoseGrams: 18,
  waterAmountGrams: 300,
  ratio: 16.7,
  grindSize: 'Medium-Fine',
  waterTempCelsius: 94,
  totalTimeSeconds: 210,
  stages: [],
  isPreset: false,
  createdAt: '2026-01-01',
};

let mockContext: RecipeOutletContext;

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderWithContext = (initialPath: string) => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationDisplay />
      <Routes>
        <Route element={<Outlet context={mockContext} />}>
          <Route path="recipes" element={<RecipeIndexRoute />} />
          <Route path="recipes/:recipeId" element={<RecipeDetailRoute />} />
          <Route path="timer" element={<div>Timer Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('RecipeDetailRoute', () => {
  beforeEach(() => {
    mockContext = {
      recipes: [mockCustomRecipe, ...DEFAULT_PRESET_RECIPES],
      onSelectRecipeForTimer: vi.fn(),
      onDeleteRecipe: vi.fn(),
    };
  });

  it('renders the recipe details for a valid recipeId', () => {
    const targetRecipe = DEFAULT_PRESET_RECIPES[0];
    renderWithContext(`/recipes/${targetRecipe.id}`);

    expect(screen.getByRole('heading', { level: 3, name: targetRecipe.name })).toBeDefined();
  });

  it('renders NotFoundRoute when recipeId does not exist', () => {
    renderWithContext('/recipes/non-existent-recipe-id');

    expect(screen.getByRole('heading', { level: 1, name: /brew spilled/i })).toBeDefined();
    expect(screen.getByText(/error 404/i)).toBeDefined();
    expect(screen.getByText(/page not found/i)).toBeDefined();
  });

  it('calls onSelectRecipeForTimer and navigates to /timer when brew button is clicked', () => {
    const targetRecipe = DEFAULT_PRESET_RECIPES[0];
    renderWithContext(`/recipes/${targetRecipe.id}`);

    const brewButton = screen.getByRole('button', { name: /brew with this recipe/i });
    fireEvent.click(brewButton);

    expect(mockContext.onSelectRecipeForTimer).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location-display').textContent).toBe('/timer');
  });

  it('prompts confirmation modal and calls onDeleteRecipe and navigates to /recipes on confirm', async () => {
    renderWithContext(`/recipes/${mockCustomRecipe.id}`);

    const deleteButton = screen.getByRole('button', {
      name: `Delete custom recipe ${mockCustomRecipe.name}`,
    });
    fireEvent.click(deleteButton);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Delete Custom Recipe?')).toBeDefined();
    expect(mockContext.onDeleteRecipe).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Recipe' }));

    await waitFor(() => {
      expect(mockContext.onDeleteRecipe).toHaveBeenCalledWith(mockCustomRecipe.id);
      expect(screen.getByTestId('location-display').textContent).toBe('/recipes');
    });
  });
});

describe('RecipeIndexRoute', () => {
  beforeEach(() => {
    mockContext = {
      recipes: DEFAULT_PRESET_RECIPES,
      onSelectRecipeForTimer: vi.fn(),
      onDeleteRecipe: vi.fn(),
    };
  });

  it('renders select recipe placeholder on /recipes', () => {
    renderWithContext('/recipes');

    expect(screen.getByRole('heading', { level: 3, name: 'Select a Recipe' })).toBeDefined();
    expect(screen.getByText(/choose a recipe from the catalog/i)).toBeDefined();
  });
});
