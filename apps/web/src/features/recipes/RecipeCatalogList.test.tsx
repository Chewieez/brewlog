/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DEFAULT_PRESET_RECIPES, BrewRecipe } from '@brewlog/core';
import { RecipeCatalogList } from './RecipeCatalogList';

describe('RecipeCatalogList', () => {
  afterEach(() => {
    cleanup();
  });
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

    const link = screen.getByRole('link', {
      name: (content) => content.includes(DEFAULT_PRESET_RECIPES[0].name),
    });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe(`/recipes/${DEFAULT_PRESET_RECIPES[0].id}`);
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

    fireEvent.click(screen.getByRole('link', { name: DEFAULT_PRESET_RECIPES[0].name }));
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

  it('renders FilterPills group with aria-pressed and maps hyphenated method labels to exact slugs', () => {
    const onSelectMethod = vi.fn();
    render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={DEFAULT_PRESET_RECIPES}
          activeRecipeId=""
          selectedMethodFilter="aeropress"
          onSelectMethodFilter={onSelectMethod}
        />
      </MemoryRouter>
    );

    const filterGroup = screen.getByRole('group', { name: 'Filter recipes by brew method' });
    expect(filterGroup.getAttribute('data-testid')).toBe('recipe-method-filters');

    const aeroPressBtn = within(filterGroup).getByRole('button', { name: 'AeroPress' });
    const allBtn = within(filterGroup).getByRole('button', { name: 'All' });
    const frenchPressBtn = within(filterGroup).getByRole('button', { name: 'French Press' });
    const kalitaBtn = within(filterGroup).getByRole('button', { name: 'Kalita Wave' });

    expect(aeroPressBtn.getAttribute('aria-pressed')).toBe('true');
    expect(allBtn.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(frenchPressBtn);
    expect(onSelectMethod).toHaveBeenCalledWith('french-press');

    fireEvent.click(kalitaBtn);
    expect(onSelectMethod).toHaveBeenCalledWith('kalita-wave');
  });

  it('keeps FilterPills visible when recipes is empty and supports keyboard parity', () => {
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

    const filterGroup = screen.getByTestId('recipe-method-filters');
    const allBtn = within(filterGroup).getByRole('button', { name: 'All' });
    const v60Btn = within(filterGroup).getByRole('button', { name: 'V60' });
    const kalitaBtn = within(filterGroup).getByRole('button', { name: 'Kalita Wave' });

    allBtn.focus();
    fireEvent.keyDown(allBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(v60Btn);

    fireEvent.keyDown(v60Btn, { key: 'End' });
    expect(document.activeElement).toBe(kalitaBtn);

    fireEvent.keyDown(kalitaBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(allBtn);

    fireEvent.keyDown(allBtn, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(kalitaBtn);

    fireEvent.keyDown(kalitaBtn, { key: 'Home' });
    expect(document.activeElement).toBe(allBtn);

    for (const key of ['Tab', 'Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      allBtn.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
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

  it('renders custom badge and delete button for custom recipes, and prompts confirmation before deleting', () => {
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

    // Clicking delete opens confirmation modal without immediately deleting
    fireEvent.click(deleteBtn);
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Delete Custom Recipe?')).toBeDefined();

    // Clicking cancel closes the modal without deleting
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();

    // Reopening and clicking confirm triggers onDeleteRecipe
    fireEvent.click(deleteBtn);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Recipe' }));
    expect(onDelete).toHaveBeenCalledWith(customRecipe);
  });

  it('renders edit button for custom recipes and calls onEditRecipe when clicked', () => {
    const customRecipe: BrewRecipe = {
      id: 'custom-cat-1',
      name: 'Card Edit Test',
      brewMethod: 'v60',
      description: 'Card edit description',
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

    const onEdit = vi.fn();
    render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={[customRecipe]}
          activeRecipeId=""
          selectedMethodFilter="all"
          onSelectMethodFilter={vi.fn()}
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

  it('does not render edit button for preset recipes in catalog list', () => {
    const onEdit = vi.fn();
    render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={DEFAULT_PRESET_RECIPES}
          activeRecipeId=""
          selectedMethodFilter="all"
          onSelectMethodFilter={vi.fn()}
          onEditRecipe={onEdit}
        />
      </MemoryRouter>
    );

    expect(
      screen.queryByRole('button', {
        name: `Edit custom recipe ${DEFAULT_PRESET_RECIPES[0].name}`,
      })
    ).toBeNull();
  });
});
