import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DEFAULT_PRESET_RECIPES, BrewRecipe } from '@brewlog/core';
import { RecipeDetailPane } from './RecipeDetailPane';

describe('RecipeDetailPane', () => {
  const recipe = DEFAULT_PRESET_RECIPES[0];

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

    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(customRecipe);
  });
});
