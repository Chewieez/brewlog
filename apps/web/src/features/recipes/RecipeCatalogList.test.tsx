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

  it('renders only active method FilterPills for provided recipes and maps hyphenated labels to exact slugs', () => {
    const onSelectMethod = vi.fn();
    const recipesWithHyphenated: BrewRecipe[] = [
      ...DEFAULT_PRESET_RECIPES,
      {
        ...DEFAULT_PRESET_RECIPES[0],
        id: 'custom-fp',
        name: 'Morning French Press',
        brewMethod: 'french-press',
      },
      {
        ...DEFAULT_PRESET_RECIPES[0],
        id: 'custom-kw',
        name: 'Kalita Flat Bed',
        brewMethod: 'kalita-wave',
      },
    ];

    const { rerender } = render(
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

    expect(within(filterGroup).getByRole('button', { name: 'All' })).toBeDefined();
    expect(within(filterGroup).getByRole('button', { name: 'V60' })).toBeDefined();
    expect(within(filterGroup).getByRole('button', { name: 'AeroPress' })).toBeDefined();
    expect(within(filterGroup).getByRole('button', { name: 'Flair' })).toBeDefined();
    expect(within(filterGroup).queryByRole('button', { name: 'Chemex' })).toBeNull();
    expect(within(filterGroup).queryByRole('button', { name: 'French Press' })).toBeNull();
    expect(within(filterGroup).queryByRole('button', { name: 'Kalita Wave' })).toBeNull();

    rerender(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={recipesWithHyphenated}
          activeRecipeId=""
          selectedMethodFilter="aeropress"
          onSelectMethodFilter={onSelectMethod}
        />
      </MemoryRouter>
    );

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

  it('hides FilterPills when recipes is empty and supports keyboard parity for present methods', () => {
    const onSelectMethod = vi.fn();
    const { rerender } = render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={[]}
          activeRecipeId=""
          selectedMethodFilter="v60"
          onSelectMethodFilter={onSelectMethod}
        />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('recipe-method-filters')).toBeNull();
    expect(onSelectMethod).toHaveBeenCalledWith('all');

    rerender(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={DEFAULT_PRESET_RECIPES}
          activeRecipeId=""
          selectedMethodFilter="all"
          onSelectMethodFilter={onSelectMethod}
        />
      </MemoryRouter>
    );

    const filterGroup = screen.getByTestId('recipe-method-filters');
    const allBtn = within(filterGroup).getByRole('button', { name: 'All' });
    const v60Btn = within(filterGroup).getByRole('button', { name: 'V60' });
    const flairBtn = within(filterGroup).getByRole('button', { name: 'Flair' });

    allBtn.focus();
    fireEvent.keyDown(allBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(v60Btn);

    fireEvent.keyDown(v60Btn, { key: 'End' });
    expect(document.activeElement).toBe(flairBtn);

    fireEvent.keyDown(flairBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(allBtn);

    fireEvent.keyDown(allBtn, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(flairBtn);

    fireEvent.keyDown(flairBtn, { key: 'Home' });
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
    expect(screen.queryByRole('button', { name: 'CLEAR SEARCH' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Search recipes'), { target: { value: 'v60' } });
    expect(screen.getByText(/no recipes found for this brew method/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'CLEAR SEARCH' })).toBeNull();
  });

  it('renders search input above method filters and filters by name, author, description, and brewMethod', () => {
    const { container } = render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={DEFAULT_PRESET_RECIPES}
          activeRecipeId=""
          selectedMethodFilter="all"
          onSelectMethodFilter={vi.fn()}
        />
      </MemoryRouter>
    );

    const searchInput = screen.getByLabelText('Search recipes') as HTMLInputElement;
    expect(searchInput).toBeDefined();

    const searchIcon = container.querySelector('svg[aria-hidden="true"]');
    expect(searchIcon).not.toBeNull();
    expect(searchIcon?.getAttribute('class')).toContain('pointer-events-none');

    // Filter by author
    fireEvent.change(searchInput, { target: { value: 'Hoffmann' } });
    expect(screen.getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();
    expect(screen.queryByText(DEFAULT_PRESET_RECIPES[1].name)).toBeNull();
    expect(screen.queryByText(DEFAULT_PRESET_RECIPES[2].name)).toBeNull();
    // FilterPills stay visible using all recipes
    expect(screen.getByTestId('recipe-method-filters')).toBeDefined();

    // Filter by description
    fireEvent.change(searchInput, { target: { value: 'World Brewers Cup' } });
    expect(screen.getByText(DEFAULT_PRESET_RECIPES[1].name)).toBeDefined();
    expect(screen.queryByText(DEFAULT_PRESET_RECIPES[0].name)).toBeNull();

    // Filter by brewMethod / name
    fireEvent.change(searchInput, { target: { value: 'aeropress' } });
    expect(screen.getByText(DEFAULT_PRESET_RECIPES[2].name)).toBeDefined();
    expect(screen.queryByText(DEFAULT_PRESET_RECIPES[0].name)).toBeNull();

    // Whitespace-only query shows all recipes
    fireEvent.change(searchInput, { target: { value: '   ' } });
    expect(screen.getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();
    expect(screen.getByText(DEFAULT_PRESET_RECIPES[1].name)).toBeDefined();
    expect(screen.getByText(DEFAULT_PRESET_RECIPES[2].name)).toBeDefined();
  });

  it('shows and triggers the clear search button inside the input', () => {
    render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={DEFAULT_PRESET_RECIPES}
          activeRecipeId=""
          selectedMethodFilter="all"
          onSelectMethodFilter={vi.fn()}
        />
      </MemoryRouter>
    );

    const searchInput = screen.getByLabelText('Search recipes') as HTMLInputElement;
    expect(screen.queryByLabelText('Clear search')).toBeNull();

    fireEvent.change(searchInput, { target: { value: 'Kasuya' } });
    expect(screen.queryByText(DEFAULT_PRESET_RECIPES[0].name)).toBeNull();

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    expect(searchInput.value).toBe('');
    expect(screen.getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();
    expect(screen.getByText(DEFAULT_PRESET_RECIPES[1].name)).toBeDefined();
  });

  it('combines search query with selectedMethodFilter and preserves method filter on CLEAR SEARCH', () => {
    render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={DEFAULT_PRESET_RECIPES}
          activeRecipeId=""
          selectedMethodFilter="v60"
          onSelectMethodFilter={vi.fn()}
        />
      </MemoryRouter>
    );

    const searchInput = screen.getByLabelText('Search recipes') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'AeroPress' } });

    expect(screen.getByText('No recipes match your search.')).toBeDefined();
    const filterGroup = screen.getByTestId('recipe-method-filters');
    expect(within(filterGroup).getByRole('button', { name: 'V60' }).getAttribute('aria-pressed')).toBe('true');

    const clearSearchBtn = screen.getByRole('button', { name: 'CLEAR SEARCH' });
    fireEvent.click(clearSearchBtn);

    expect(searchInput.value).toBe('');
    expect(screen.getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeDefined();
    expect(screen.queryByText(DEFAULT_PRESET_RECIPES[2].name)).toBeNull();
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
