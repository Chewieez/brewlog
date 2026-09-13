import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DEFAULT_PRESET_RECIPES, BrewRecipe } from '@brewlog/core';
import { RecipeCatalogList } from './RecipeCatalogList';

describe('RecipeCatalogList', () => {
  it('renders method filter buttons and recipe cards with links', () => {
    render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={DEFAULT_PRESET_RECIPES}
          activeRecipeId={DEFAULT_PRESET_RECIPES[0].id}
          selectedMethodFilter="all"
          onSelectMethodFilter={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /^all$/i })).toBeDefined();
    expect(screen.getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();

    const link = screen.getByText(DEFAULT_PRESET_RECIPES[0].name).closest('a');
    expect(link).toBeDefined();
    expect(link?.getAttribute('href')).toBe(`/recipes/${DEFAULT_PRESET_RECIPES[0].id}`);
  });

  it('filters recipes by selected method', () => {
    render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={DEFAULT_PRESET_RECIPES}
          activeRecipeId=""
          selectedMethodFilter="aeropress"
          onSelectMethodFilter={vi.fn()}
        />
      </MemoryRouter>
    );

    // Only aeropress recipes should appear
    const aeropressRecipes = DEFAULT_PRESET_RECIPES.filter((r) => r.brewMethod === 'aeropress');
    aeropressRecipes.forEach((r) => {
      expect(screen.getByText(r.name)).toBeDefined();
    });

    const v60Recipes = DEFAULT_PRESET_RECIPES.filter((r) => r.brewMethod === 'v60');
    v60Recipes.forEach((r) => {
      expect(screen.queryByText(r.name)).toBeNull();
    });
  });

  it('calls onSelectRecipe when a recipe card is clicked', () => {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={DEFAULT_PRESET_RECIPES}
          activeRecipeId=""
          selectedMethodFilter="all"
          onSelectMethodFilter={vi.fn()}
          onSelectRecipe={onSelect}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(DEFAULT_PRESET_RECIPES[0].name));
    expect(onSelect).toHaveBeenCalledWith(DEFAULT_PRESET_RECIPES[0]);
  });

  it('calls onSelectMethodFilter when a method button is clicked', () => {
    const onSelectMethod = vi.fn();
    render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={DEFAULT_PRESET_RECIPES}
          activeRecipeId=""
          selectedMethodFilter="all"
          onSelectMethodFilter={onSelectMethod}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /^v60$/i }));
    expect(onSelectMethod).toHaveBeenCalledWith('v60');
  });

  it('shows empty message when no recipes match filter', () => {
    render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={[]}
          activeRecipeId=""
          selectedMethodFilter="v60"
          onSelectMethodFilter={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/no recipes found for this brew method/i)).toBeDefined();
  });

  it('renders custom badge and delete button for custom recipes, and calls onDeleteRecipe', () => {
    const customRecipe: BrewRecipe = {
      id: 'custom-123',
      name: 'My Special Brew',
      brewMethod: 'v60',
      description: 'A special test recipe',
      coffeeDoseGrams: 15,
      waterAmountGrams: 250,
      waterTempCelsius: 93,
      ratio: 16.7,
      grindSize: 'Medium-Fine',
      totalTimeSeconds: 180,
      stages: [],
      isPreset: false,
      createdAt: '2026-01-01',
    };

    const onDelete = vi.fn();
    render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={[customRecipe]}
          activeRecipeId=""
          selectedMethodFilter="all"
          onSelectMethodFilter={vi.fn()}
          onDeleteRecipe={onDelete}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Custom')).toBeDefined();
    const deleteBtn = screen.getByRole('button', { name: /delete custom recipe my special brew/i });
    expect(deleteBtn).toBeDefined();

    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(customRecipe);
  });
});
