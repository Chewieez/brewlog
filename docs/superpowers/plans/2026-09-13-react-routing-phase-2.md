# Phase 2 Dynamic Recipe Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement dynamic child routes and a responsive master-detail layout for Recipe Studio at `/recipes` and `/recipes/:recipeId` using React Router v8 nested `<Outlet />` routing.

**Architecture:** Decompose `RecipeStudioView` into focused sub-components (`RecipeCatalogList`, `RecipeDetailPane`), wire parent route `RecipesRoute` with an `<Outlet context={...} />`, create child route adapters `RecipeIndexRoute` and `RecipeDetailRoute`, and integrate child routes under `<Route path="recipes">` in `App.tsx`.

**Tech Stack:** React 19, React Router v8 (`react-router` ^8.3.1) in Library Mode, TypeScript 5.7, Tailwind CSS v4, Vitest, React Testing Library.

**Spec:** [`docs/superpowers/specs/2026-09-13-react-routing-phase-2-design.md`](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-09-13-react-routing-phase-2-design.md)

## Global Constraints

- Use React Router v8 library mode (`BrowserRouter`, `Routes`, `Route`, `Navigate`, `Outlet`, `NavLink`, `Link`, `useNavigate`, `useOutletContext`, `useParams`).
- Do not modify `@brewlog/core` domain models or `@brewlog/supabase` data hooks.
- Preserve existing Tailwind dark theme styling (stone-950, stone-900, amber-400/500 accents).
- Maintain 100% passing tests across all test suites (`npm run test`) and 0 type errors (`npm run typecheck`).
- Every task must follow strict TDD: failing test first, verify failure, implement minimal code, verify pass, commit.

---

## File Structure

- **New Files**:
  - `apps/web/src/features/recipes/RecipeCatalogList.tsx` — Left column catalog list and brew method filtering.
  - `apps/web/src/features/recipes/RecipeCatalogList.test.tsx` — Unit tests for catalog list filtering and card rendering.
  - `apps/web/src/features/recipes/RecipeDetailPane.tsx` — Right column detail pane: dose scaler, brew specs, steps, timer action.
  - `apps/web/src/features/recipes/RecipeDetailPane.test.tsx` — Unit tests for detail pane interactions and scaling.
  - `apps/web/src/routes/RecipeIndexRoute.tsx` — Child index route for `/recipes`.
  - `apps/web/src/routes/RecipeDetailRoute.tsx` — Child route for `/recipes/:recipeId` with 404 fallback.
  - `apps/web/src/routes/RecipeDetailRoute.test.tsx` — Unit tests for dynamic route parameter reading and 404 handling.
- **Modified Files**:
  - `apps/web/src/routes/RecipesRoute.tsx` — Updated to act as parent layout with `<Outlet context={recipeOutletContext} />`.
  - `apps/web/src/App.tsx` — Update route tree to nest child routes beneath `recipes`.
  - `apps/web/src/App.test.tsx` — Integration tests for `/recipes` and `/recipes/:recipeId`.

---

## Tasks

### Task 1: Create `RecipeCatalogList` Component and Tests

**Files:**
- Create: `apps/web/src/features/recipes/RecipeCatalogList.tsx`
- Create: `apps/web/src/features/recipes/RecipeCatalogList.test.tsx`

**Interfaces:**
- Consumes: `BrewRecipe` from `@brewlog/core`.
- Produces:
  ```tsx
  export interface RecipeCatalogListProps {
    recipes: BrewRecipe[];
    activeRecipeId?: string;
    selectedMethodFilter: string;
    onSelectMethodFilter: (method: string) => void;
    onSelectRecipe?: (recipe: BrewRecipe) => void;
    onDeleteRecipe?: (recipe: BrewRecipe) => void;
  }
  export const RecipeCatalogList: React.FC<RecipeCatalogListProps>;
  ```

- [ ] **Step 1: Write failing tests for `RecipeCatalogList`**

Create `apps/web/src/features/recipes/RecipeCatalogList.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { RecipeCatalogList } from './RecipeCatalogList';

describe('RecipeCatalogList', () => {
  it('renders method filter buttons and recipe cards', () => {
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

    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByText(DEFAULT_PRESET_RECIPES[0].name)).toBeInTheDocument();
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
      expect(screen.getByText(r.name)).toBeInTheDocument();
    });

    const v60Recipes = DEFAULT_PRESET_RECIPES.filter((r) => r.brewMethod === 'v60');
    v60Recipes.forEach((r) => {
      expect(screen.queryByText(r.name)).not.toBeInTheDocument();
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/features/recipes/RecipeCatalogList.test.tsx`
Expected: FAIL (`Cannot find module './RecipeCatalogList'`)

- [ ] **Step 3: Implement `RecipeCatalogList`**

Create `apps/web/src/features/recipes/RecipeCatalogList.tsx`:
```tsx
import React from 'react';
import { Link } from 'react-router';
import { BrewRecipe } from '@brewlog/core';
import { Trash2 } from 'lucide-react';

export interface RecipeCatalogListProps {
  recipes: BrewRecipe[];
  activeRecipeId?: string;
  selectedMethodFilter: string;
  onSelectMethodFilter: (method: string) => void;
  onSelectRecipe?: (recipe: BrewRecipe) => void;
  onDeleteRecipe?: (recipe: BrewRecipe) => void;
}

const METHODS = ['all', 'v60', 'aeropress', 'flair', 'chemex', 'french-press', 'kalita-wave'] as const;

export const RecipeCatalogList: React.FC<RecipeCatalogListProps> = ({
  recipes,
  activeRecipeId,
  selectedMethodFilter,
  onSelectMethodFilter,
  onSelectRecipe,
  onDeleteRecipe,
}) => {
  const filteredRecipes = recipes.filter((r) => {
    return selectedMethodFilter === 'all' || r.brewMethod === selectedMethodFilter;
  });

  const isCustomRecipe = (recipe: BrewRecipe) =>
    !recipe.isPreset && !recipe.id.startsWith('preset-');

  return (
    <div className="space-y-4">
      {/* Method Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {METHODS.map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => onSelectMethodFilter(method)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              selectedMethodFilter === method
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            {method.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Recipe Cards List */}
      <div className="space-y-3">
        {filteredRecipes.length === 0 ? (
          <div className="p-8 rounded-2xl bg-stone-900/40 border border-dashed border-stone-800 text-center text-xs text-stone-500">
            No recipes found for this brew method.
          </div>
        ) : (
          filteredRecipes.map((r) => {
            const isSelected = r.id === activeRecipeId;
            const isCustom = isCustomRecipe(r);

            return (
              <Link
                key={r.id}
                to={`/recipes/${r.id}`}
                onClick={() => onSelectRecipe?.(r)}
                className={`block p-4 rounded-2xl border transition-all duration-200 relative group cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'bg-stone-900/60 border-stone-800/80 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-800 text-amber-400 border border-amber-500/20">
                      {r.brewMethod}
                    </span>
                    {isCustom ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Custom
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Preset
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {r.author && (
                      <span className="text-xs text-stone-400 truncate max-w-[120px]">
                        {r.author}
                      </span>
                    )}
                    {isCustom && onDeleteRecipe && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteRecipe(r);
                        }}
                        className="p-1 rounded text-stone-500 hover:text-red-400 hover:bg-stone-800/80 transition-colors cursor-pointer"
                        title="Delete Recipe"
                        aria-label={`Delete custom recipe ${r.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-stone-100 mt-2">{r.name}</h3>
                <p className="text-xs text-stone-400 mt-1 line-clamp-2">
                  {r.description || 'No description provided.'}
                </p>

                <div className="mt-3 flex items-center space-x-4 text-xs font-mono text-stone-300">
                  <span>1:{r.ratio}</span>
                  <span>•</span>
                  <span>
                    {r.coffeeDoseGrams}g : {r.waterAmountGrams}g
                  </span>
                  <span>•</span>
                  <span>
                    {Math.floor(r.totalTimeSeconds / 60)}m {r.totalTimeSeconds % 60}s
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run tests and typecheck to verify they pass**

Run: `npm run test -- apps/web/src/features/recipes/RecipeCatalogList.test.tsx`
Expected: PASS (all tests pass)

Run: `npm run typecheck --workspace=@brewlog/web`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/recipes/RecipeCatalogList.tsx apps/web/src/features/recipes/RecipeCatalogList.test.tsx
git commit -m "feat(web): add RecipeCatalogList component and tests"
```

---

### Task 2: Create `RecipeDetailPane` Component and Tests

**Files:**
- Create: `apps/web/src/features/recipes/RecipeDetailPane.tsx`
- Create: `apps/web/src/features/recipes/RecipeDetailPane.test.tsx`

**Interfaces:**
- Consumes: `BrewRecipe`, `rescaleRecipeDose` from `@brewlog/core`.
- Produces:
  ```tsx
  export interface RecipeDetailPaneProps {
    recipe: BrewRecipe;
    onSelectRecipeForTimer: (recipe: BrewRecipe) => void;
    onDeleteRecipe?: (recipe: BrewRecipe) => void;
    showMobileBackButton?: boolean;
  }
  export const RecipeDetailPane: React.FC<RecipeDetailPaneProps>;
  ```

- [ ] **Step 1: Write failing tests for `RecipeDetailPane`**

Create `apps/web/src/features/recipes/RecipeDetailPane.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
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

    expect(screen.getByRole('heading', { level: 3, name: recipe.name })).toBeInTheDocument();
    expect(screen.getByText(recipe.author!)).toBeInTheDocument();
    expect(screen.getByText(/brew with this recipe/i)).toBeInTheDocument();
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
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/recipes');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/features/recipes/RecipeDetailPane.test.tsx`
Expected: FAIL (`Cannot find module './RecipeDetailPane'`)

- [ ] **Step 3: Implement `RecipeDetailPane`**

Create `apps/web/src/features/recipes/RecipeDetailPane.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { BrewRecipe, rescaleRecipeDose } from '@brewlog/core';
import {
  Play,
  BookOpen,
  Clock,
  Droplets,
  Thermometer,
  Trash2,
  ArrowLeft,
} from 'lucide-react';

export interface RecipeDetailPaneProps {
  recipe: BrewRecipe;
  onSelectRecipeForTimer: (recipe: BrewRecipe) => void;
  onDeleteRecipe?: (recipe: BrewRecipe) => void;
  showMobileBackButton?: boolean;
}

export const RecipeDetailPane: React.FC<RecipeDetailPaneProps> = ({
  recipe,
  onSelectRecipeForTimer,
  onDeleteRecipe,
  showMobileBackButton = false,
}) => {
  const [customDose, setCustomDose] = useState<number>(recipe.coffeeDoseGrams);

  // Sync dose when recipe changes
  useEffect(() => {
    setCustomDose(recipe.coffeeDoseGrams);
  }, [recipe.id, recipe.coffeeDoseGrams]);

  const scaledRecipe = rescaleRecipeDose(recipe, customDose);
  const isCustom = !recipe.isPreset && !recipe.id.startsWith('preset-');

  return (
    <div className="p-6 rounded-3xl bg-stone-900/60 border border-stone-800/80 backdrop-blur-xl shadow-xl space-y-6">
      {/* Mobile Back Button */}
      {showMobileBackButton && (
        <div className="lg:hidden pb-2 border-b border-stone-800/60">
          <Link
            to="/recipes"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Recipes</span>
          </Link>
        </div>
      )}

      {/* Detail Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {recipe.brewMethod}
            </span>
            {isCustom ? (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Custom
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Official Preset
              </span>
            )}
            {recipe.author && (
              <span className="text-xs text-stone-400">by {recipe.author}</span>
            )}
          </div>

          <h3 className="text-2xl font-bold text-stone-100 mt-2">{recipe.name}</h3>
          <p className="text-sm text-stone-400 mt-1 max-w-xl">
            {recipe.description || 'No description provided.'}
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {isCustom && onDeleteRecipe && (
            <button
              type="button"
              onClick={() => onDeleteRecipe(recipe)}
              className="p-2 rounded-xl text-stone-500 hover:text-red-400 hover:bg-stone-800/80 border border-transparent hover:border-red-500/30 transition-colors cursor-pointer"
              title="Delete Recipe"
              aria-label={`Delete custom recipe ${recipe.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectRecipeForTimer(scaledRecipe)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer text-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Brew with this Recipe</span>
          </button>
        </div>
      </div>

      {/* Dose Rescaler Slider */}
      <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-400 font-medium">Coffee Dose</span>
          <span className="text-amber-400 font-mono font-bold text-sm">
            {customDose}g
          </span>
        </div>
        <input
          type="range"
          aria-label="Coffee Dose"
          min={10}
          max={60}
          step={0.5}
          value={customDose}
          onChange={(e) => setCustomDose(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <div className="flex justify-between text-[10px] text-stone-600 font-mono">
          <span>10g</span>
          <span>Single cup (15-18g)</span>
          <span>Server (30g)</span>
          <span>60g</span>
        </div>
      </div>

      {/* Specifications Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-stone-950/40 border border-stone-800/60 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-stone-900 text-amber-400 border border-stone-800">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-stone-400 uppercase font-medium">Total Water</div>
            <div className="text-sm font-bold font-mono text-stone-100">
              {scaledRecipe.waterAmountGrams}g
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-stone-950/40 border border-stone-800/60 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-stone-900 text-amber-400 border border-stone-800">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-stone-400 uppercase font-medium">Brew Ratio</div>
            <div className="text-sm font-bold font-mono text-stone-100">
              1:{recipe.ratio}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-stone-950/40 border border-stone-800/60 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-stone-900 text-amber-400 border border-stone-800">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-stone-400 uppercase font-medium">Target Time</div>
            <div className="text-sm font-bold font-mono text-stone-100">
              {Math.floor(recipe.totalTimeSeconds / 60)}m {recipe.totalTimeSeconds % 60}s
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-stone-950/40 border border-stone-800/60 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-stone-900 text-amber-400 border border-stone-800">
            <Thermometer className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-stone-400 uppercase font-medium">Water Temp</div>
            <div className="text-sm font-bold font-mono text-stone-100">
              {recipe.targetTempC ? `${recipe.targetTempC}°C` : '93-96°C'}
            </div>
          </div>
        </div>
      </div>

      {/* Steps Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-stone-200">Brew Steps</h4>
        <div className="space-y-2.5">
          {scaledRecipe.steps.map((step, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-stone-950/50 border border-stone-800/60 flex items-start space-x-3"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-stone-900 text-amber-400 text-xs font-mono font-bold shrink-0 border border-stone-800">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-200">{step.title}</span>
                  <div className="flex items-center space-x-2 text-xs font-mono text-stone-400 shrink-0">
                    {step.targetWeightGrams !== undefined && (
                      <span className="text-amber-400/90 font-bold">
                        {step.targetWeightGrams}g
                      </span>
                    )}
                    <span>{step.durationSeconds}s</span>
                  </div>
                </div>
                {step.description && (
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run tests and typecheck to verify they pass**

Run: `npm run test -- apps/web/src/features/recipes/RecipeDetailPane.test.tsx`
Expected: PASS (all tests pass)

Run: `npm run typecheck --workspace=@brewlog/web`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/recipes/RecipeDetailPane.tsx apps/web/src/features/recipes/RecipeDetailPane.test.tsx
git commit -m "feat(web): add RecipeDetailPane component and tests"
```

---

### Task 3: Create `RecipeIndexRoute` and `RecipeDetailRoute` Route Adapters

**Files:**
- Create: `apps/web/src/routes/RecipeIndexRoute.tsx`
- Create: `apps/web/src/routes/RecipeDetailRoute.tsx`
- Create: `apps/web/src/routes/RecipeDetailRoute.test.tsx`

**Interfaces:**
- Consumes: `useParams`, `useNavigate`, `useOutletContext` from `react-router`.
- Produces:
  ```tsx
  export const RecipeIndexRoute: React.FC;
  export const RecipeDetailRoute: React.FC;
  ```

- [ ] **Step 1: Write failing tests for `RecipeDetailRoute` and `RecipeIndexRoute`**

Create `apps/web/src/routes/RecipeDetailRoute.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router';
import { DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { RecipeDetailRoute } from './RecipeDetailRoute';
import { RecipeIndexRoute } from './RecipeIndexRoute';
import { RecipeOutletContext } from './RecipesRoute';

const mockContext: RecipeOutletContext = {
  recipes: DEFAULT_PRESET_RECIPES,
  onSelectRecipeForTimer: vi.fn(),
  onDeleteRecipe: vi.fn(),
};

const renderWithContext = (initialPath: string) => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<Outlet context={mockContext} />}>
          <Route path="recipes" element={<RecipeIndexRoute />} />
          <Route path="recipes/:recipeId" element={<RecipeDetailRoute />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('RecipeDetailRoute', () => {
  it('renders the recipe details for a valid recipeId', () => {
    const targetRecipe = DEFAULT_PRESET_RECIPES[0];
    renderWithContext(`/recipes/${targetRecipe.id}`);

    expect(screen.getByRole('heading', { level: 3, name: targetRecipe.name })).toBeInTheDocument();
  });

  it('renders NotFoundRoute when recipeId does not exist', () => {
    renderWithContext('/recipes/non-existent-recipe-id');

    expect(screen.getByRole('heading', { level: 1, name: /404/i })).toBeInTheDocument();
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- apps/web/src/routes/RecipeDetailRoute.test.tsx`
Expected: FAIL (`Cannot find module './RecipeDetailRoute'`)

- [ ] **Step 3: Implement `RecipeIndexRoute` and `RecipeDetailRoute`**

Create `apps/web/src/routes/RecipeIndexRoute.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router';
import { useRecipeOutletContext } from './RecipesRoute';

export const RecipeIndexRoute: React.FC = () => {
  const { recipes } = useRecipeOutletContext();
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(min-width: 1024px)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (isDesktop && recipes.length > 0) {
    const defaultRecipeId = recipes[0]?.id || 'preset-v60-hoffmann';
    return <Navigate replace to={`/recipes/${defaultRecipeId}`} />;
  }

  return null;
};
```

Create `apps/web/src/routes/RecipeDetailRoute.tsx`:
```tsx
import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { BrewRecipe } from '@brewlog/core';
import { useRecipeOutletContext } from './RecipesRoute';
import { RecipeDetailPane } from '../features/recipes/RecipeDetailPane';
import { NotFoundRoute } from './NotFoundRoute';

export const RecipeDetailRoute: React.FC = () => {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const { recipes, onSelectRecipeForTimer, onDeleteRecipe } = useRecipeOutletContext();

  const recipe = recipes.find((r) => r.id === recipeId);

  const handleSelectRecipeForTimer = useCallback(
    (selectedRecipe: BrewRecipe) => {
      onSelectRecipeForTimer(selectedRecipe);
      navigate('/timer');
    },
    [onSelectRecipeForTimer, navigate]
  );

  const handleDeleteRecipe = useCallback(
    async (recipeToDelete: BrewRecipe) => {
      if (onDeleteRecipe) {
        await onDeleteRecipe(recipeToDelete.id);
      }
      navigate('/recipes');
    },
    [onDeleteRecipe, navigate]
  );

  if (!recipe) {
    return <NotFoundRoute />;
  }

  return (
    <RecipeDetailPane
      recipe={recipe}
      onSelectRecipeForTimer={handleSelectRecipeForTimer}
      onDeleteRecipe={handleDeleteRecipe}
      showMobileBackButton={true}
    />
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- apps/web/src/routes/RecipeDetailRoute.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/RecipeIndexRoute.tsx apps/web/src/routes/RecipeDetailRoute.tsx apps/web/src/routes/RecipeDetailRoute.test.tsx
git commit -m "feat(web): add RecipeIndexRoute and RecipeDetailRoute adapters"
```

---

### Task 4: Refactor `RecipesRoute` and Wire Nested Routes in `App.tsx`

**Files:**
- Modify: `apps/web/src/routes/RecipesRoute.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `useRootOutletContext` from `RootLayout.tsx`.
- Produces: `RecipeOutletContext` and `useRecipeOutletContext` hook consumed by child routes.

- [ ] **Step 1: Update `RecipesRoute.tsx`**

Modify `apps/web/src/routes/RecipesRoute.tsx`:
```tsx
import React, { useState, useMemo, useCallback } from 'react';
import { Outlet, useOutletContext, useParams, useNavigate } from 'react-router';
import { BrewRecipe } from '@brewlog/core';
import { Sparkles, Plus } from 'lucide-react';
import { useRootOutletContext } from '../layouts/RootLayout';
import { RecipeCatalogList } from '../features/recipes/RecipeCatalogList';
import { RecipeBuilderModal } from '../features/recipes/RecipeBuilderModal';

export interface RecipeOutletContext {
  recipes: BrewRecipe[];
  onSelectRecipeForTimer: (recipe: BrewRecipe) => void;
  onDeleteRecipe?: (id: string) => Promise<void> | void;
}

export const useRecipeOutletContext = () => useOutletContext<RecipeOutletContext>();

export const RecipesRoute: React.FC = () => {
  const { recipes, onAddRecipe, onDeleteRecipe, setSelectedRecipe } = useRootOutletContext();
  const { recipeId } = useParams<{ recipeId?: string }>();
  const navigate = useNavigate();

  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('all');
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);

  const handleSelectRecipeForTimer = useCallback(
    (recipe: BrewRecipe) => {
      setSelectedRecipe(recipe);
    },
    [setSelectedRecipe]
  );

  const handleSaveRecipe = useCallback(
    async (newRecipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => {
      const created = await onAddRecipe(newRecipe);
      if (created && (created as BrewRecipe).id) {
        navigate(`/recipes/${(created as BrewRecipe).id}`);
      }
    },
    [onAddRecipe, navigate]
  );

  const recipeOutletContextValue = useMemo<RecipeOutletContext>(
    () => ({
      recipes,
      onSelectRecipeForTimer: handleSelectRecipeForTimer,
      onDeleteRecipe,
    }),
    [recipes, handleSelectRecipeForTimer, onDeleteRecipe]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-2xl font-bold tracking-tight text-stone-100">
              Recipe Studio
            </h2>
          </div>
          <p className="text-sm text-stone-400 mt-1">
            World Champion & Expert brew profiles alongside your custom dialed-in recipes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsBuilderModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-500/20 cursor-pointer transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Build Custom Recipe</span>
          </button>
        </div>
      </div>

      {/* Master-Detail Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Catalog List */}
        <div
          className={`${
            recipeId ? 'hidden lg:block' : 'block'
          } lg:col-span-5`}
        >
          <RecipeCatalogList
            recipes={recipes}
            activeRecipeId={recipeId}
            selectedMethodFilter={selectedMethodFilter}
            onSelectMethodFilter={setSelectedMethodFilter}
          />
        </div>

        {/* Right Column: Child Route Outlet */}
        <div
          className={`${
            recipeId ? 'block' : 'hidden lg:block'
          } col-span-1 lg:col-span-7`}
        >
          <Outlet context={recipeOutletContextValue} />
        </div>
      </div>

      <RecipeBuilderModal
        isOpen={isBuilderModalOpen}
        onClose={() => setIsBuilderModalOpen(false)}
        onSave={handleSaveRecipe}
      />
    </div>
  );
};
```

- [ ] **Step 2: Update `App.tsx` route tree**

Modify `apps/web/src/App.tsx`:
```tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { RootLayout } from './layouts/RootLayout';
import { TimerRoute } from './routes/TimerRoute';
import { StashRoute } from './routes/StashRoute';
import { RecipesRoute } from './routes/RecipesRoute';
import { RecipeIndexRoute } from './routes/RecipeIndexRoute';
import { RecipeDetailRoute } from './routes/RecipeDetailRoute';
import { EquipmentRoute } from './routes/EquipmentRoute';
import { CuppingRoute } from './routes/CuppingRoute';
import { NotFoundRoute } from './routes/NotFoundRoute';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<Navigate to="/timer" replace />} />
          <Route path="timer" element={<TimerRoute />} />
          <Route path="stash" element={<StashRoute />} />
          <Route path="recipes" element={<RecipesRoute />}>
            <Route index element={<RecipeIndexRoute />} />
            <Route path=":recipeId" element={<RecipeDetailRoute />} />
          </Route>
          <Route path="equipment" element={<EquipmentRoute />} />
          <Route path="cupping" element={<CuppingRoute />} />
          <Route path="*" element={<NotFoundRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
```

- [ ] **Step 3: Run typecheck and existing tests**

Run: `npm run typecheck --workspace=@brewlog/web`
Expected: 0 errors

Run: `npm run test --workspace=@brewlog/web`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/RecipesRoute.tsx apps/web/src/App.tsx
git commit -m "feat(web): wire nested recipe routes in RecipesRoute and App"
```

---

### Task 5: Router Integration Tests and Monorepo Verification

**Files:**
- Modify: `apps/web/src/App.test.tsx`

- [ ] **Step 1: Add dynamic recipe route tests in `App.test.tsx`**

Modify `apps/web/src/App.test.tsx` to add integration tests for `/recipes/:recipeId`:
```tsx
  it('renders a specific recipe detail when deep-linked to /recipes/:recipeId', async () => {
    window.history.pushState({}, 'Test', '/recipes/preset-v60-hoffmann');
    render(<App />);

    expect(await screen.findByRole('heading', { level: 3, name: /hoffmann.*v60/i })).toBeInTheDocument();
  });

  it('renders 404 NotFoundRoute when navigating to an unknown recipe ID', async () => {
    window.history.pushState({}, 'Test', '/recipes/unknown-recipe-999');
    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: /404/i })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run all tests in `@brewlog/web`**

Run: `npm run test --workspace=@brewlog/web`
Expected: PASS (all tests pass)

- [ ] **Step 3: Full monorepo verification**

Run: `npm run typecheck`
Expected: 0 errors across all workspaces

Run: `npm run test`
Expected: 100% tests pass monorepo-wide

Run: `npm run build --workspace=@brewlog/web`
Expected: Vite build succeeds cleanly

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.test.tsx
git commit -m "test(web): add dynamic recipe routing integration tests in App.test"
```
