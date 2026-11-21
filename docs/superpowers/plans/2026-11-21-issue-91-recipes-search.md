# Issue #91: Add Search Input to Recipes Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a search input with clear-search recovery to the Recipes catalog on both web and mobile, powered by a shared recipe search matcher in `@brewlog/core`.

**Architecture:** Export a pure `matchesRecipeSearch(recipe: BrewRecipe, query: string): boolean` helper from `@brewlog/core`. Both web `RecipeCatalogList` and mobile `RecipesCatalogScreen` hold `searchQuery` in local component state, derive filter pills from the full `recipes` list, combine the active method filter with `matchesRecipeSearch`, and render a `CLEAR SEARCH` recovery action when a non-empty search matches zero recipes.

**Tech Stack:** TypeScript, React 19, React Native / Expo (SDK 58), `@brewlog/core`, `@brewlog/ui` (`Button`, `FilterPills`), `lucide-react` / `lucide-react-native`, Vitest + React Testing Library, Playwright E2E.

**Spec:** `docs/superpowers/specs/2026-11-21-issue-91-recipes-search-design.md`

## Global Constraints
- Search matches case-insensitively across `name`, `author`, `description`, and `brewMethod` (matching both raw hyphenated slugs such as `"french-press"` and space-normalized forms such as `"french press"`).
- Web button sizing token gate (`apps/web/e2e/button-sizing-tokens.spec.ts`): every visible `<button>` on `/recipes` must measure `32px`, `40px`, or `48px` tall (`h-8 w-8` for clear button, `<Button variant="secondary" size="sm" />` for `CLEAR SEARCH`).
- Web corner radius token gate (`apps/web/e2e/corner-radius-hierarchy.spec.ts`): search input and clear button use `rounded-lg` (`8px`); empty-state card uses `rounded-xl` (`12px`).
- Mobile touch targets & keyboard ergonomics: search bar `minHeight: 44`, `borderRadius: 8`, clear `Pressable` `minWidth: 44` & `minHeight: 44`, omit iOS `clearButtonMode`, and set `keyboardShouldPersistTaps="handled"` on `ScrollView`.
- Preserve existing empty-catalog messages when `recipes.length === 0` (`"No recipes found for this brew method."` on web; `"No Recipes Found"` / `"No recipes match the selected brew method filter."` on mobile).
- Do not modify `StashView`, `ReviewsCatalogScreen`, or `ReviewsView` (cross-app `CLEAR SEARCH` alignment is deferred to a follow-up ticket).
- Zero emoji in code, tests, UI copy, or commit messages.

## Review Focus
1. **Whitespace-only / padded query:** `"   "` must behave like `""` (show all recipes, no empty-search UI), while `"  hoffmann  "` must match `"James Hoffmann"`. (Pinned in Tasks 1, 2, 3)
2. **Optional `author` or empty `description`:** Custom recipes with `author: undefined` or `description: ''` must never throw and must still match on `name` or `brewMethod`. (Pinned in Task 1)
3. **Hyphenated `brewMethod` searched with spaces:** Searching `"french press"` or `"kalita wave"` must match `brewMethod: 'french-press'` / `'kalita-wave'`, alongside exact slug matches like `"french-press"`. (Pinned in Task 1)
4. **Combined method filter + search and `CLEAR SEARCH` preservation:** Filtering by `V60` and searching a query with zero V60 matches keeps `FilterPills` visible and renders `CLEAR SEARCH`; clicking `CLEAR SEARCH` resets `searchQuery` while keeping `V60` selected. (Pinned in Tasks 2, 3)
5. **Empty catalog vs zero search matches:** When `recipes` is `[]`, neither web nor mobile renders `CLEAR SEARCH`, preserving the existing empty-catalog messages. (Pinned in Tasks 2, 3)

---

### Task 1: Shared `matchesRecipeSearch` helper in `@brewlog/core`

**Files:**
- Create: `packages/core/src/recipeSearch.ts`
- Modify: `packages/core/src/index.ts:1-8`
- Test: `packages/core/src/recipeSearch.test.ts`

**Interfaces:**
- Consumes: `BrewRecipe` from `./types`
- Produces: `export function matchesRecipeSearch(recipe: BrewRecipe, query: string): boolean` re-exported from `@brewlog/core` (`packages/core/src/index.ts`)

- [ ] **Step 1: Write the failing unit tests in `packages/core/src/recipeSearch.test.ts`**

Create `packages/core/src/recipeSearch.test.ts` testing `matchesRecipeSearch` imported from `./recipeSearch` (and verified via `./index` re-export):
1. Returns `true` for empty (`""`) or whitespace-only (`"   "`) queries.
2. Matches case-insensitively across `name`, `author`, `description`, and `brewMethod`, trimming leading/trailing whitespace (`"  hoffmann  "` matches `author: "James Hoffmann"`).
3. Matches hyphenated `brewMethod` slugs whether queried with hyphens (`"french-press"`) or spaces (`"french press"`, `"Kalita Wave"`).
4. Safely handles missing optional `author` (`undefined`) and empty `description` (`""`) without throwing, returning `false` when nothing matches.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace=@brewlog/core test -- src/recipeSearch.test.ts`
Expected: FAIL with module not found (`./recipeSearch`).

- [ ] **Step 3: Implement `matchesRecipeSearch` in `packages/core/src/recipeSearch.ts` and export from `packages/core/src/index.ts`**

Implement `matchesRecipeSearch(recipe: BrewRecipe, query: string): boolean` in `packages/core/src/recipeSearch.ts`:
- Normalize `const q = query.trim().toLowerCase()`; return `true` if `!q`.
- Normalize `const rawMethod = (recipe.brewMethod ?? "").toLowerCase()` and `const spacedMethod = rawMethod.replace(/-/g, " ")`.
- Return `true` if `q` is included in `recipe.name.toLowerCase()`, `(recipe.author ?? "").toLowerCase()`, `(recipe.description ?? "").toLowerCase()`, `rawMethod`, or `spacedMethod`.
Add `export * from "./recipeSearch";` to `packages/core/src/index.ts`.

- [ ] **Step 4: Run test and typecheck to verify pass**

Run: `npm --workspace=@brewlog/core test -- src/recipeSearch.test.ts && npm --workspace=@brewlog/core run typecheck`
Expected: PASS (all assertions green, 0 TypeScript errors).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/recipeSearch.ts packages/core/src/recipeSearch.test.ts packages/core/src/index.ts
git commit -m "feat(core): add matchesRecipeSearch helper"
```

---

### Task 2: Web `RecipeCatalogList` search bar and `CLEAR SEARCH` recovery

**Files:**
- Modify: `apps/web/src/features/recipes/RecipeCatalogList.tsx:1-115`
- Test: `apps/web/src/features/recipes/RecipeCatalogList.test.tsx`

**Interfaces:**
- Consumes: `Button`, `FilterPills`, `type FilterPillsOption` from `@brewlog/ui`; `BrewRecipe`, `matchesRecipeSearch` from `@brewlog/core`; `Search`, `X`, `Trash2`, `Pencil` from `lucide-react`
- Produces: `RecipeCatalogList` with search `<input aria-label="Search recipes">`, clear button `<button aria-label="Clear search">` (`h-8 w-8 rounded-lg`), and search empty state with `<Button variant="secondary" size="sm" label="CLEAR SEARCH" />`

- [ ] **Step 1: Write failing tests in `apps/web/src/features/recipes/RecipeCatalogList.test.tsx`**

Add tests in `RecipeCatalogList.test.tsx`:
1. `renders search input above method filters and filters by name, author, description, and brewMethod`:
   - `screen.getByLabelText('Search recipes')` is rendered.
   - Typing `"Hoffmann"` matches Hoffmann's V60 recipe and hides unrelated recipes; typing `"World Brewers Cup"` matches Kasuya via `description`; typing `"AeroPress"` matches AeroPress recipes via `brewMethod`/`name`; typing `"   "` shows all recipes.
   - `availableMethodOptions` (`recipe-method-filters`) remains visible while searching.
2. `shows and triggers the clear search button inside the input`:
   - `queryByLabelText('Clear search')` is `null` initially.
   - After typing `"Kasuya"`, `getByLabelText('Clear search')` appears; clicking it clears the input value to `""` and restores all recipes.
3. `combines search query with selectedMethodFilter and preserves method filter on CLEAR SEARCH`:
   - Render with `selectedMethodFilter="v60"`, type `"AeroPress"` (or `"nonexistent"`).
   - Assert `"No recipes match your search."` and `getByRole('button', { name: 'CLEAR SEARCH' })` appear, while `recipe-method-filters` remains visible with `V60` pressed.
   - Click `CLEAR SEARCH` -> input clears to `""`, V60 recipes reappear, and non-V60 recipes remain filtered out.
   - Confirm existing test with `recipes={[]}` still displays `"No recipes found for this brew method."` and does NOT render `CLEAR SEARCH`.

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npm --workspace=@brewlog/web test -- src/features/recipes/RecipeCatalogList.test.tsx`
Expected: FAIL because `Search recipes` input does not exist yet.

- [ ] **Step 3: Update `apps/web/src/features/recipes/RecipeCatalogList.tsx`**

In `apps/web/src/features/recipes/RecipeCatalogList.tsx`:
- Import `Button` from `@brewlog/ui`, `matchesRecipeSearch` from `@brewlog/core`, and `Search`, `X` from `lucide-react`.
- Add `const [searchQuery, setSearchQuery] = useState('');`.
- Update `filteredRecipes` (`useMemo`) to filter `recipes` by `(effectiveMethodFilter === 'all' || r.brewMethod === effectiveMethodFilter) && matchesRecipeSearch(r, searchQuery)`.
- Above `FilterPills`, render the search container matching `StashView.tsx` (`rounded-lg`, `h-8 w-8 rounded-lg` clear button):
  ```tsx
  <div className="relative">
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
    <input
      type="text"
      placeholder="Search name, author, method..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      aria-label="Search recipes"
      className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-panel border border-border-subtle text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent/60 transition-colors"
    />
    {searchQuery.length > 0 && (
      <button
        type="button"
        onClick={() => setSearchQuery('')}
        aria-label="Clear search"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-panel-recessed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
  ```
- In the `filteredRecipes.length === 0` branch:
  - If `recipes.length > 0 && searchQuery.trim().length > 0`, render `<div className="p-8 rounded-xl bg-panel border border-dashed border-border-subtle text-center flex flex-col items-center gap-3">` with a `Search` icon circle, `<p className="text-xs text-foreground-muted">No recipes match your search.</p>`, and `<Button variant="secondary" size="sm" onClick={() => setSearchQuery('')} label="CLEAR SEARCH" />`.
  - Otherwise keep `<div className="p-8 rounded-xl bg-panel border border-dashed border-border-subtle text-center text-xs text-foreground-muted">No recipes found for this brew method.</div>`.

- [ ] **Step 4: Run test and typecheck to verify pass**

Run: `npm --workspace=@brewlog/web test -- src/features/recipes/RecipeCatalogList.test.tsx && npm --workspace=@brewlog/web run typecheck`
Expected: PASS (all tests in `RecipeCatalogList.test.tsx` green, 0 TypeScript errors).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/recipes/RecipeCatalogList.tsx apps/web/src/features/recipes/RecipeCatalogList.test.tsx
git commit -m "feat(web): add search input and clear recovery to RecipeCatalogList"
```

---

### Task 3: Mobile `RecipesCatalogScreen` search bar and `CLEAR SEARCH` recovery

**Files:**
- Modify: `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx:1-145`
- Test: `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx`

**Interfaces:**
- Consumes: `matchesRecipeSearch` from `@brewlog/core`; `Search`, `X` from `lucide-react-native`; `TextInput`, `Pressable` from `react-native`
- Produces: `RecipesCatalogScreen` with `<TextInput accessibilityLabel="Search recipes" ... />`, clear `<Pressable accessibilityLabel="Clear search text" ... />` (`minWidth: 44`, `minHeight: 44`), and empty-state `CLEAR SEARCH` `<Pressable accessibilityLabel="Clear search input" ... />`

- [ ] **Step 1: Update mocks and write failing tests in `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx`**

In `RecipesCatalogScreen.test.tsx`:
- Add `TextInput` to the `react-native` mock (mapping `value`, `onChangeText` -> `onChange`, `placeholder`, `accessibilityLabel` -> `aria-label`, matching `StashCatalogScreen.test.tsx`) and add `Search`, `X` to the `lucide-react-native` mock.
- Add tests:
  1. `filters recipes by search query across name, author, description, and brewMethod`:
     - Change `getByLabelText('Search recipes')` to `"Hoffmann"`, `"World Brewers Cup"`, `"aeropress"`, and `"   "`, verifying expected cards appear/hide and `recipe-method-filters` stays rendered.
  2. `clears search text via the inline clear button`:
     - `queryByLabelText('Clear search text')` is `null` when empty; appears after entering text; pressing it clears input and restores recipes.
  3. `combines method filter with search query and recovers via CLEAR SEARCH while keeping method filter`:
     - Press `Filter by v60`, enter `"AeroPress"` in `Search recipes` -> renders `"No Recipes Found"`, `"No recipes match your search query."`, and `"CLEAR SEARCH"` (`getByLabelText('Clear search input')`).
     - Press `CLEAR SEARCH` -> clears query, keeps V60 filtered (V60 recipes visible, AeroPress recipes still hidden).
     - Confirm existing test with `recipes={[]}` still renders `"No Recipes Found"` and `"No recipes match the selected brew method filter."` without `"CLEAR SEARCH"`.

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npm --workspace=@brewlog/mobile test -- src/features/recipes/screens/RecipesCatalogScreen.test.tsx`
Expected: FAIL because `Search recipes` input does not exist yet.

- [ ] **Step 3: Implement search bar and `CLEAR SEARCH` empty state in `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx`**

In `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx`:
- Import `TextInput`, `Pressable` from `'react-native'`, `Search`, `X` from `'lucide-react-native'`, `matchesRecipeSearch` from `'@brewlog/core'`.
- Add `const [searchQuery, setSearchQuery] = useState<string>('');` and `const handleClearSearch = () => setSearchQuery('');`.
- Update `filteredRecipes` (`useMemo`) to combine `effectiveFilter` (`'all'`, `'custom'`, or `brewMethod`) with `matchesRecipeSearch(r, searchQuery)`.
- Add `keyboardShouldPersistTaps="handled"` to `ScrollView`.
- Inside `styles.header` (with `gap: 14`), below `<TabScreenHeader ... />` and above `<MethodFilterBar ... />`, render the `styles.searchBar` matching `EquipmentCatalogScreen.tsx` (`minHeight: 44`, `borderRadius: 8`, `TextInput` with `accessibilityLabel="Search recipes"`, `placeholder="Search name, author, method..."`, `returnKeyType="search"`, no `clearButtonMode`, and conditional `44x44` clear `Pressable` with `accessibilityLabel="Clear search text"`).
- In the `filteredRecipes.length === 0` branch:
  - If `recipes.length > 0 && searchQuery.trim().length > 0`, render `styles.emptyCard` with `<Search size={24} color={colors.textMuted} />`, `"No Recipes Found"`, `"No recipes match your search query."`, and a `CLEAR SEARCH` `<Pressable>` (`minHeight: 44`, `borderRadius: 8`, `backgroundColor: colors.accent`, `accessibilityRole="button"`, `accessibilityLabel="Clear search input"`).
  - Otherwise preserve `"No Recipes Found"` and `"No recipes match the selected brew method filter."`.

- [ ] **Step 4: Run test and typecheck to verify pass**

Run: `npm --workspace=@brewlog/mobile test -- src/features/recipes/screens/RecipesCatalogScreen.test.tsx && npm --workspace=@brewlog/mobile run typecheck`
Expected: PASS (all tests in `RecipesCatalogScreen.test.tsx` green, 0 TypeScript errors).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx
git commit -m "feat(mobile): add search input and clear recovery to RecipesCatalogScreen"
```

---

### Task 4: Playwright E2E design token coverage & final verification

**Files:**
- Modify: `apps/web/e2e/corner-radius-hierarchy.spec.ts:106-127`
- Verify: `apps/web/e2e/button-sizing-tokens.spec.ts`

**Interfaces:**
- Consumes: `/recipes` route rendered by `@brewlog/web` with `aria-label="Search recipes"` and `CLEAR SEARCH` recovery button

- [ ] **Step 1: Add `/recipes` search input and `CLEAR SEARCH` corner-radius checks to `apps/web/e2e/corner-radius-hierarchy.spec.ts`**

In the `Recipes:` test (`apps/web/e2e/corner-radius-hierarchy.spec.ts:106-127`):
- Assert `await expectBorderRadius(page.getByLabel("Search recipes"), RADIUS_LG, "Recipes search input");`.
- Fill `"__no_matching_recipe__"` in `Search recipes`, assert `expectBorderRadius(page.getByRole("button", { name: "CLEAR SEARCH" }), RADIUS_LG, "Recipes CLEAR SEARCH button")`, then click `CLEAR SEARCH` to restore the catalog before clicking the first recipe card.

- [ ] **Step 2: Run Playwright design-token specs (`button-sizing-tokens.spec.ts` and `corner-radius-hierarchy.spec.ts`) and full workspace checks**

Run:
```bash
npm run typecheck && npm test && npm run test:e2e -- e2e/button-sizing-tokens.spec.ts e2e/corner-radius-hierarchy.spec.ts
```
Expected: All workspace typechecks, Vitest suites, and both Playwright design-token E2E specs PASS.

- [ ] **Step 3: Documentation & PR Completion Protocol (`AGENTS.md`)**

Before finalizing/opening PR:
- Update `README.md` (if applicable for Recipes search parity) and `docs/ROADMAP.md` (if issue #91 is listed).
- Create dated devlog `docs/devlogs/YYYY-MM-DD-issue-91-recipes-search.md` documenting summary, cross-package deliverables, and observed verification results.
- Commit docs updates and re-verify `git status` is clean.
