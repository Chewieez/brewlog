# Issue #91: Add Search Input to Recipes Catalog (Web & Mobile)

**Date:** 2026-11-21
**Size:** Small change

## Intent & Why
Add fast, consistent keyword search to the Recipes catalog on both web and mobile so users can filter recipes by name, author, description, or brew method alongside the existing brew-method filter pills—bringing Recipes to parity with Stash, Equipment, and Reviews.

## Goals
- Export a shared `matchesRecipeSearch(recipe, query)` helper from `@brewlog/core` so web and mobile search behavior is identical and directly unit-tested.
- Add a search bar with clear-search recovery to web `RecipeCatalogList` and mobile `RecipesCatalogScreen` above the existing method filter pills.
- Keep method filter options derived from the full `recipes` list so pills do not disappear while typing.
- Use `CLEAR SEARCH` (clearing `searchQuery` while preserving the active method filter) when a non-empty search returns zero matches.
- Verify unit tests (`packages/core`, `RecipeCatalogList.test.tsx`, `RecipesCatalogScreen.test.tsx`) and Playwright design-token E2E gates (`button-sizing-tokens.spec.ts`, `corner-radius-hierarchy.spec.ts`, plus a new `/recipes` search input assertion in `corner-radius-hierarchy.spec.ts`).

## Non-Goals & Anti-Goals
- Do not lift `searchQuery` into `RecipesRoute` or persist search queries across navigation.
- Do not hide `FilterPills` based on search-filtered results (only based on the full `recipes` array).
- Do not modify `StashView` (`CLEAR FILTERS`), `ReviewsCatalogScreen` (`CLEAR FILTERS`), or `ReviewsView` in this issue unless explicitly expanded; track cross-app `CLEAR SEARCH` alignment separately (or confirm before expanding scope).

## Constraints
- **Web button sizing token gate (`button-sizing-tokens.spec.ts`)**: All visible `<button>` elements on `/recipes` must measure `32px`, `40px`, or `48px` tall. Use `h-8 w-8` (`32px`) for the clear-search button and `<Button variant="secondary" size="sm" ... />` (`32px`) for the empty-state recovery button.
- **Web corner radius token gate (`corner-radius-hierarchy.spec.ts`)**: Search input and clear button use `rounded-lg` (`8px`); empty-state card uses `rounded-xl` (`12px`).
- **Mobile touch targets & keyboard ergonomics**: Search bar `minHeight: 44`, clear `Pressable` `minWidth: 44, minHeight: 44`, and `ScrollView` uses `keyboardShouldPersistTaps="handled"`. Omit iOS `clearButtonMode` on `TextInput` to avoid duplicate clear icons alongside the custom `Pressable`.
- **Existing empty-catalog tests**: Preserve existing copy (`"No recipes found for this brew method."` on web; `"No Recipes Found"` / `"No recipes match the selected brew method filter."` on mobile) when `recipes.length === 0`.

## Approaches Considered
- **Approach 1 — Screen-local state + inline predicate:** Duplicate the search check inside `RecipeCatalogList.tsx` and `RecipesCatalogScreen.tsx`. Rejected because web and mobile filtering logic (e.g., optional `author` and hyphenated `brewMethod` matching) could drift.
- **Approach 2 — Screen-local state + shared `@brewlog/core` helper (Selected):** Keep `searchQuery` state local in each catalog screen, and export `matchesRecipeSearch(recipe, query)` from `@brewlog/core`. Chosen for identical cross-platform matching and clean unit testing with minimal boilerplate.
- **Approach 3 — Lifted state in `RecipesRoute`:** Manage `searchQuery` in `RecipesRoute.tsx` and pass as props. Rejected because no sibling route component consumes the search query.

## Design Decisions
- **Shared Helper (`packages/core/src/recipeSearch.ts`, exported via `packages/core/src/index.ts`)**:
  - `matchesRecipeSearch(recipe: BrewRecipe, query: string): boolean`:
    - Trim and lowercase `query`; return `true` if empty.
    - Match case-insensitively against `recipe.name`, `recipe.author ?? ''`, `recipe.description ?? ''`, and `recipe.brewMethod ?? ''` (checking both raw slug such as `"french-press"` and space-normalized `"french press"`).
- **Web (`apps/web/src/features/recipes/RecipeCatalogList.tsx`)**:
  - Add `const [searchQuery, setSearchQuery] = useState('')`.
  - Render the search bar above `FilterPills` matching `StashView.tsx`: `Search` icon (`w-4 h-4 text-foreground-muted`), `<input type="text" aria-label="Search recipes" placeholder="Search name, author, method..." className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-panel border border-border-subtle text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent/60 transition-colors" />`, and conditional clear button (`h-8 w-8 rounded-lg`, `aria-label="Clear search"`).
  - Filter `recipes` by `effectiveMethodFilter` AND `matchesRecipeSearch(r, searchQuery)`.
  - Empty state: if `recipes.length > 0 && filteredRecipes.length === 0 && searchQuery.trim().length > 0`, show a `rounded-xl` dashed empty card with a `Search` icon, `"No recipes match your search."`, and `<Button variant="secondary" size="sm" onClick={() => setSearchQuery('')} label="CLEAR SEARCH" />`. Otherwise (when `recipes.length === 0`), keep `"No recipes found for this brew method."`.
- **Mobile (`apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx`)**:
  - Add `const [searchQuery, setSearchQuery] = useState('')` and `keyboardShouldPersistTaps="handled"` on `ScrollView`.
  - Render the search bar inside `styles.header` (with `gap: 14`) above `MethodFilterBar`, matching `EquipmentCatalogScreen.tsx`: `Search` icon (`size={18}`), `TextInput` (`accessibilityLabel="Search recipes"`, `placeholder="Search name, author, method..."`, `returnKeyType="search"`), and conditional `44x44` clear `Pressable` (`accessibilityLabel="Clear search text"`).
  - Filter `recipes` by `effectiveFilter` (`'all'`, `'custom'`, or `brewMethod`) AND `matchesRecipeSearch(r, searchQuery)`.
  - Empty state: when `recipes.length > 0 && filteredRecipes.length === 0 && searchQuery.trim().length > 0`, show an empty card with `Search` icon, `"No Recipes Found"`, `"No recipes match your search query."`, and a `CLEAR SEARCH` `Pressable` (`minHeight: 44`, `borderRadius: 8`, `accessibilityLabel="Clear search input"`) that resets `searchQuery` to `''`. When `recipes.length === 0`, keep `"No Recipes Found"` and `"No recipes match the selected brew method filter."`.
- **E2E (`apps/web/e2e/corner-radius-hierarchy.spec.ts`)**:
  - In the `Recipes:` test block, verify `page.getByLabel("Search recipes")` has `borderRadius === "8px"` (`RADIUS_LG`), and optionally verify empty-state search recovery (`CLEAR SEARCH` button conforms to `8px` radius and `32px` height).
