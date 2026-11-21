# Issue #89: Adopt `@brewlog/ui` `FilterPills` & Dynamic Active Filter Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all four mobile catalog filter bars onto `@brewlog/ui` `FilterPills` and standardize dynamic active-only filter pills (with `<= 1` hiding and auto-reset to `'all'`) across mobile catalogs and web `EquipmentView`.

**Architecture:** Keep `@brewlog/ui`'s `FilterPills` stateless and presentational. Each target screen derives `availableOptions` from its active dataset via `useMemo`, computes `effectiveFilter` synchronously (falling back to `'all'` if the selected option disappears), syncs state via `useEffect`, and renders `<FilterPills>` only when `availableOptions.length > 1` — matching the pattern already used in web `StashView`, `ReviewsView`, and `RecipeCatalogList`.

**Tech Stack:** React 19, React Native / Expo, TypeScript, `@brewlog/ui` (`FilterPills`, `FilterPillsOption`), `@brewlog/core`, Vitest + React Testing Library, Playwright E2E.

**Spec:** `docs/superpowers/specs/2026-11-20-filter-pills-adoption-design.md`

## Global Constraints
- Zero changes to `@brewlog/ui` `FilterPills` public API (`FilterPillsProps`, `FilterPillsOption`).
- Do not modify web `StashView.tsx`, `ReviewsView.tsx`, or `RecipeCatalogList.tsx` (already dynamically filtered).
- Preserve existing accessibility labels (`Filter by ...`) on mobile options via `FilterPillsOption.accessibilityLabel`.
- `FilterPills.native.tsx` provides `minHeight: 44` natively; remove per-screen bespoke chip styles and `hitSlop` workarounds.
- `MethodFilterBar` retains its horizontal padding (`paddingHorizontal: 16`, `paddingVertical: 8`) wrapper inside `RecipesCatalogScreen`.
- Zero emoji in code, tests, copy, or commit messages.

## Review Focus
1. **Mobile Stash shelf switch reset:** Selecting `Natural` on Active Cellar and switching to Archived (which only has `Honey`) must immediately show Archived beans on the same render pass (`effectiveProcess === 'all'`) and reset `selectedProcess` to `'all'`. (Pinned in Task 1)
2. **Mobile Stash anaerobic sub-process matching:** Beans with `process: 'anaerobic-natural'` or `'anaerobic-washed'` must surface the `Anaerobic` pill and match when selected. (Pinned in Task 1)
3. **Mobile Recipes `custom` pill visibility & reset:** Preset-only recipe lists must hide `CUSTOM`; adding a custom recipe (`!isPreset && !id.startsWith('preset-')`) shows `CUSTOM`; removing the last custom recipe while `custom` is selected resets `selectedFilter` to `'all'`. (Pinned in Task 2)
4. **Mobile Reviews unlisted brew methods:** Reviews with methods not in the curated label map (e.g., `kalita-wave`, `flair`) must still appear as formatted pills (`Kalita Wave`, `Flair`) and filter correctly. (Pinned in Task 4)
5. **Mobile Reviews rating bar hiding & reset:** When all reviews have `rating < 4`, the rating `FilterPills` bar must not render; when the last 5-star review is removed while `5` is selected, `selectedRating` must reset to `'all'`. (Pinned in Task 4)

---

### Task 1: Mobile `StashCatalogScreen` — adopt `FilterPills` with dynamic shelf-scoped process pills

**Files:**
- Modify: `apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx:1-50,66-143,321-357,423-455`
- Test: `apps/mobile/src/features/stash/screens/StashCatalogScreen.test.tsx`

**Interfaces:**
- Consumes: `FilterPills`, `type FilterPillsOption` from `@brewlog/ui`
- Produces: `StashCatalogScreen` rendering `<FilterPills<ProcessFilter> testID="stash-process-filters" ariaLabel="Filter by process method" ... />` only when `availableProcessOptions.length > 1`

- [ ] **Step 1: Update `ScrollView` mock and write failing tests in `StashCatalogScreen.test.tsx`**

Update the `ScrollView` mock in `StashCatalogScreen.test.tsx` to forward `testID` -> `data-testid` and `accessibilityLabel` -> `aria-label`. Pin these exact tests (matching web `StashView.tsx`: `availableProcessOptions` is `['all', ...present]` and renders when `availableProcessOptions.length > 1`):
1. `renders only processes present on the active shelf and includes anaerobic sub-processes`: with one `washed` bean and one `anaerobic-natural` bean on active shelf, `getByTestId('stash-process-filters')` contains `All`, `Washed`, `Anaerobic` and does NOT contain `Natural` or `Honey`; pressing `Anaerobic` shows only the `anaerobic-natural` bean.
2. `hides process FilterPills when active shelf has no matching processes`: with `activeBeans: []`, `queryByTestId('stash-process-filters')` is `null`.
3. `resets selected process to all when switching to a shelf without that process`: with `washed` + `natural` on active shelf and `honey` on archived shelf, press `Natural` (only natural bean visible), then press `Archived` -> archived `Caballero` bean is immediately visible (`getByText('Caballero')`) and `Natural` pill is not rendered.

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npx vitest run apps/mobile/src/features/stash/screens/StashCatalogScreen.test.tsx` (from repo root or `apps/mobile`)
Expected: FAIL because bespoke `ScrollView` renders all 5 static chips and has no `stash-process-filters` `testID`.

- [ ] **Step 3: Migrate `StashCatalogScreen.tsx` to `@brewlog/ui` `FilterPills`**

In `apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx`:
- Import `useEffect` from `'react'` and `FilterPills`, `type FilterPillsOption` from `'@brewlog/ui'`. Remove unused `ScrollView` import.
- Add `matchesProcessFilter(bean: Bean, filter: Exclude<ProcessFilter, 'all'>): boolean` matching web `StashView.tsx` (`anaerobic` matches `proc === 'anaerobic' || proc.includes('anaerobic')`, others match exact lowercase).
- Derive `availableProcessOptions: FilterPillsOption<ProcessFilter>[]` via `useMemo` from `currentShelfBeans`, each with `accessibilityLabel: \`Filter by ${label}\``.
- Derive `effectiveProcess` via `useMemo` and sync `selectedProcess` via `useEffect`.
- Use `effectiveProcess` in `filteredBeans`.
- Replace lines 321–356 with:
  ```tsx
  {availableProcessOptions.length > 1 ? (
    <FilterPills<ProcessFilter>
      size="sm"
      value={effectiveProcess}
      onChange={setSelectedProcess}
      options={availableProcessOptions}
      ariaLabel="Filter by process method"
      testID="stash-process-filters"
    />
  ) : null}
  ```
- Remove unused styles (`processFilterScroll`, `processChip`, `processChipActive`, `processChipInactive`, `processChipText`, `processChipTextActive`, `processChipTextInactive`).

- [ ] **Step 4: Run targeted test to verify pass**

Run: `npm --workspace apps/mobile test -- src/features/stash/screens/StashCatalogScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx apps/mobile/src/features/stash/screens/StashCatalogScreen.test.tsx
git commit -m "feat(mobile): adopt FilterPills with dynamic process options on Stash"
```

---

### Task 2: Mobile `MethodFilterBar` & `RecipesCatalogScreen` — adopt `FilterPills` with dynamic `custom` + method pills

**Files:**
- Modify: `apps/mobile/src/features/recipes/components/MethodFilterBar.tsx:1-89`
- Modify: `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx:1-65`
- Test: `apps/mobile/src/features/recipes/components/MethodFilterBar.test.tsx`
- Test: `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx`

**Interfaces:**
- Consumes: `FilterPills`, `type FilterPillsOption` from `@brewlog/ui`
- Produces: `MethodFilterBar` props unchanged (`{ recipes, selectedMethod, onSelectMethod }`), rendering `<FilterPills testID="recipe-method-filters" ariaLabel="Filter recipes by brew method" ... />` inside `<View style={styles.container}>`, returning `null` when `availableOptions.length <= 1`, and calling `onSelectMethod('all')` via `useEffect` when `selectedMethod` disappears.

- [ ] **Step 1: Update mocks and write failing tests in `MethodFilterBar.test.tsx` and `RecipesCatalogScreen.test.tsx`**

Update `ScrollView` mock in both test files to forward `testID` -> `data-testid` and `accessibilityLabel` -> `aria-label`.
In `MethodFilterBar.test.tsx`:
1. Update first test: `derives unique methods from recipes and omits Custom when no custom recipes exist` — with `DEFAULT_PRESET_RECIPES`, asserts `getByTestId('recipe-method-filters')`, `All`, `V60`, `AeroPress` (case-insensitive label text, since `FilterPills` uppercases via style), and `queryByLabelText('Filter by custom')` is `null`.
2. Add test: `includes Custom pill when custom recipes exist` — with a non-preset recipe (`isPreset: false, id: 'custom-1'`), `getByLabelText('Filter by custom')` is defined.
3. Add test: `returns null when recipes is empty` — `recipes={[]}` renders `null` (`container.firstChild` is `null`).
4. Add test: `resets selectedMethod to all when selected method disappears from recipes` — render with `selectedMethod="custom"` and a custom recipe, rerender with preset-only recipes -> `onSelectMethod` called with `'all'`.

In `RecipesCatalogScreen.test.tsx`:
1. Update the `'displays empty state card when filter matches no recipes'` test (which previously clicked `'Filter by custom'` on preset-only data): test empty state with `recipes: []` (shows `'No Recipes Found'` and hides `recipe-method-filters`), and add a test confirming that with a custom recipe present, `'Filter by custom'` filters to only the custom recipe and removing that custom recipe resets back to `'all'`.

- [ ] **Step 2: Run targeted tests to verify failure**

Run: `npm --workspace apps/mobile test -- src/features/recipes/components/MethodFilterBar.test.tsx src/features/recipes/screens/RecipesCatalogScreen.test.tsx`
Expected: FAIL on `recipe-method-filters` testID and `custom` omission assertions.

- [ ] **Step 3: Refactor `MethodFilterBar.tsx` and `RecipesCatalogScreen.tsx`**

In `apps/mobile/src/features/recipes/components/MethodFilterBar.tsx`:
- Import `useEffect`, `useMemo` from `'react'`, `View` from `'react-native'`, and `FilterPills`, `type FilterPillsOption` from `'@brewlog/ui'`. Remove unused `ScrollView`, `Pressable`, `Text`, `FONTS`.
- Helper `isCustomRecipe(r: BrewRecipe): boolean` (`!r.isPreset && !r.id.startsWith('preset-')`).
- Derive `options: FilterPillsOption<string>[]` via `useMemo`:
  - Unique lowercase `brewMethod` values from `recipes` (excluding `'custom'` if handled via custom pill, or keeping `'custom'` once if `hasCustom || methods.includes('custom')`). Specifically: include `{ value: 'custom', label: 'Custom', accessibilityLabel: 'Filter by custom' }` only if `recipes.some(isCustomRecipe)`.
  - Map remaining methods to `{ value: method, label: method.replace(/-/g, ' '), accessibilityLabel: \`Filter by ${method}\` }` (note: `FilterPills.native.tsx` applies `textTransform: 'uppercase'`; using `method.replace(/-/g, ' ')` or formatted labels like `'V60'`/`'AeroPress'` — keep clean uppercase/title labels that match `getByText(/v60/i)` or `getByText('V60')`: using `method.toUpperCase().replace(/-/g, ' ')` preserves exact existing text `'ALL'`, `'CUSTOM'`, `'V60'`, `'AEROPRESS'` for any `getByText('V60')` queries!).
- Compute `effectiveMethod = options.some((opt) => opt.value === normalizedSelected) ? normalizedSelected : 'all'`.
- `useEffect`: if `normalizedSelected !== effectiveMethod`, call `onSelectMethod(effectiveMethod)`.
- Return `null` when `options.length <= 1`.
- Render `<View style={styles.container}><FilterPills size="sm" value={effectiveMethod} onChange={onSelectMethod} options={options} ariaLabel="Filter recipes by brew method" testID="recipe-method-filters" /></View>`.
- In `RecipesCatalogScreen.tsx`: compute `effectiveFilter` (falling back to `'all'` if `selectedFilter === 'custom'` with no custom recipes, or if `selectedFilter !== 'all'` and no recipe matches `brewMethod`) so `filteredRecipes` never flashes empty for a frame before `MethodFilterBar`'s `useEffect` fires.

- [ ] **Step 4: Run targeted tests to verify pass**

Run: `npm --workspace apps/mobile test -- src/features/recipes/components/MethodFilterBar.test.tsx src/features/recipes/screens/RecipesCatalogScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/recipes/components/MethodFilterBar.tsx apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx apps/mobile/src/features/recipes/components/MethodFilterBar.test.tsx apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx
git commit -m "feat(mobile): adopt FilterPills in MethodFilterBar with dynamic recipe filters"
```

---

### Task 3: Mobile `EquipmentCatalogScreen` — adopt `FilterPills` with dynamic category pills

**Files:**
- Modify: `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx:1-45,62-107,210-246,374-406`
- Test: `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.test.tsx`

**Interfaces:**
- Consumes: `FilterPills`, `type FilterPillsOption` from `@brewlog/ui`
- Produces: `EquipmentCatalogScreen` rendering `<FilterPills<CategoryFilter> testID="equipment-category-filters" ariaLabel="Filter equipment by category" ... />` only when `availableCategoryOptions.length > 1`

- [ ] **Step 1: Update `ScrollView` mock and write failing tests in `EquipmentCatalogScreen.test.tsx`**

Update `ScrollView` mock in `EquipmentCatalogScreen.test.tsx` to forward `testID` -> `data-testid` and `accessibilityLabel` -> `aria-label`.
Add tests:
1. `renders only category pills present in equipment`: with only `grinders` and `other` populated, `getByTestId('equipment-category-filters')` renders `All`, `Grinders`, `Other`, and does NOT render `Brewers`, `Scales`, or `Kettles`.
2. `hides category FilterPills when equipment list is empty`: with `equipment: []`, `queryByTestId('equipment-category-filters')` is `null`.
3. `resets selected category to all when its last item is removed`: select `Grinders`, rerender with only `brewers` in context -> `Brewers & Drippers (1)` is immediately visible and `Grinders` pill is absent.

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npm --workspace apps/mobile test -- src/features/equipment/screens/EquipmentCatalogScreen.test.tsx`
Expected: FAIL because static `CATEGORIES` renders all 6 chips even when empty.

- [ ] **Step 3: Migrate `EquipmentCatalogScreen.tsx` to `@brewlog/ui` `FilterPills`**

In `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx`:
- Import `useEffect` from `'react'` and `FilterPills`, `type FilterPillsOption` from `'@brewlog/ui'`.
- Derive `availableCategoryOptions: FilterPillsOption<CategoryFilter>[]` via `useMemo` from `equipment` (`CATEGORIES` filtered to `id === 'all'` or `equipment.some((e) => e.type === id)`), each with `accessibilityLabel: \`Filter by ${cat.label}\``.
- Derive `effectiveCategory` via `useMemo` and sync `selectedCategory` via `useEffect`.
- Replace `selectedCategory` references in `totalFilteredCount` and section visibility checks with `effectiveCategory`.
- Replace lines 210–245 with conditional `<FilterPills<CategoryFilter> size="sm" value={effectiveCategory} onChange={setSelectedCategory} options={availableCategoryOptions} ariaLabel="Filter equipment by category" testID="equipment-category-filters" />` when `availableCategoryOptions.length > 1`.
- Remove unused styles (`categoryFilterScroll`, `categoryChip`, `categoryChipActive`, `categoryChipInactive`, `categoryChipText`, `categoryChipTextActive`, `categoryChipTextInactive`).

- [ ] **Step 4: Run targeted test to verify pass**

Run: `npm --workspace apps/mobile test -- src/features/equipment/screens/EquipmentCatalogScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.test.tsx
git commit -m "feat(mobile): adopt FilterPills with dynamic category options on Equipment"
```

---

### Task 4: Mobile `ReviewsCatalogScreen` — adopt `FilterPills` for Method and Rating rows with dynamic filtering

**Files:**
- Modify: `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx:1-60,118-148,189-245,346-381`
- Test: `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.test.tsx`

**Interfaces:**
- Consumes: `FilterPills`, `type FilterPillsOption` from `@brewlog/ui`
- Produces: `ReviewsCatalogScreen` rendering:
  - `<FilterPills<string> testID="reviews-method-filters" ariaLabel="Filter reviews by brew method" ... />` when `availableMethodOptions.length > 1`
  - `<FilterPills<RatingFilter> testID="reviews-rating-filters" ariaLabel="Filter reviews by rating" ... />` when `availableRatingOptions.length > 1`

- [ ] **Step 1: Update mocks and write failing tests in `ReviewsCatalogScreen.test.tsx`**

Update `ScrollView` mock to forward `testID` -> `data-testid` and `accessibilityLabel` -> `aria-label`, and update `Pressable` mock to forward `accessibilityState?.selected` -> `aria-selected` and `data-style={JSON.stringify(typeof style === 'function' ? style({ pressed: false }) : style)}`.
1. Update the `hitSlop` test (line 374): verify that `FilterPills` renders chips with native `minHeight: 44` (`JSON.stringify` of `data-style` contains `"minHeight":44`) rather than `hitSlop` workaround.
2. Add test: `shows only brew methods present in reviews and formats unlisted methods`: with `v60`, `espresso`, and `kalita-wave` reviews, `reviews-method-filters` shows `All Methods`, `V60`, `Espresso`, `Kalita Wave`, and omits `Chemex`, `AeroPress`, `Cold Brew`.
3. Add test: `hides method and rating FilterPills when reviews list is empty or no ratings >= 4 exist`: with `reviews: []`, both `reviews-method-filters` and `reviews-rating-filters` are `null`; with only a 3-star `v60` review, `reviews-rating-filters` is `null`.
4. Add test: `resets method and rating filters to all when selected options disappear`: select `Espresso` and `5 Stars` (or test each separately), rerender without matching reviews -> remaining review is immediately visible and filter resets to `'all'`.

- [ ] **Step 2: Run targeted test to verify failure**

Run: `npm --workspace apps/mobile test -- src/features/reviews/screens/ReviewsCatalogScreen.test.tsx`
Expected: FAIL because static `METHOD_OPTIONS` / `RATING_OPTIONS` render all chips with bespoke `Pressable`s.

- [ ] **Step 3: Migrate `ReviewsCatalogScreen.tsx` to `@brewlog/ui` `FilterPills`**

In `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx`:
- Import `useEffect` from `'react'` and `FilterPills`, `type FilterPillsOption` from `'@brewlog/ui'`. Remove unused `ScrollView` import.
- Widen `MethodFilter` to `string` (keep `export type MethodFilter = string;` for backwards compatibility) and keep curated `KNOWN_METHOD_OPTIONS` (`v60`, `espresso`, `aeropress`, `french-press`, `chemex`, `kalita-wave`, `pour-over`, `cold-brew`, `flair`, `custom`) plus `formatFallbackMethodLabel(method: string)` for any other `brewMethod`.
- Derive `availableMethodOptions: FilterPillsOption<string>[]` via `useMemo` from `reviews` (`All Methods` + present known methods in order + any extra present methods formatted), each with `accessibilityLabel: \`Filter by method ${label}\``.
- Derive `availableRatingOptions: FilterPillsOption<RatingFilter>[]` via `useMemo` from `reviews` (`All Ratings` + `5 Stars` if `reviews.some((r) => r.rating >= 5)` + `4+ Stars` if `reviews.some((r) => r.rating >= 4)`), each with `accessibilityLabel: \`Filter by rating ${label}\``.
- Compute `effectiveMethod` and `effectiveRating` via `useMemo`, sync via `useEffect`, and use them in `filteredReviews`.
- Replace lines 189–243 with conditional `<FilterPills>` blocks for `reviews-method-filters` and `reviews-rating-filters`.
- Remove unused styles (`filterChipsRow`, `ratingChipsRow`, `filterChip`, `filterChipActive`, `filterChipText`, `filterChipTextActive`).

- [ ] **Step 4: Run targeted test to verify pass**

Run: `npm --workspace apps/mobile test -- src/features/reviews/screens/ReviewsCatalogScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.test.tsx
git commit -m "feat(mobile): adopt FilterPills with dynamic method and rating filters on Reviews"
```

---

### Task 5: Web `EquipmentView` — dynamic category pills, hiding when `<= 1`, auto-reset, and test updates

**Files:**
- Modify: `apps/web/src/features/equipment/EquipmentView.tsx:1-17,92-110,263-383`
- Test: `apps/web/src/features/equipment/EquipmentView.test.tsx`
- Test: `apps/web/e2e/context-features.spec.ts:424-437`

**Interfaces:**
- Consumes: `FilterPills`, `type FilterPillsOption` from `@brewlog/ui` (already imported)
- Produces: `EquipmentView` rendering `<FilterPills<CategoryFilter> testID="equipment-category-filters" ... />` only when `availableCategoryOptions.length > 1`

- [ ] **Step 1: Update unit tests in `EquipmentView.test.tsx`**

1. Update the test at line 205 (`keeps category FilterPills visible when equipment is empty and supports keyboard parity`): split/update into:
   - `supports keyboard parity on category FilterPills` (using `equipment={MOCK_EQUIPMENT}` so all pills are present and testing `ArrowRight`, `End`, `ArrowLeft`, `Home`, `Tab`, `Enter`, `Space`).
   - `hides category FilterPills when equipment is empty and shows only present categories` (asserts `queryByTestId("equipment-category-filters")` is `null` when `equipment={[]}`, and when only `grinder` + `brewer` exist, shows `All`, `Grinders`, `Brewers` and omits `Scales`, `Kettles`, `Other`).
   - `resets active category filter to all when selected category disappears` (select `Brewers`, rerender with only `grinder` -> `Grinders (1)` is visible and `Brewers` pill is absent).

- [ ] **Step 2: Run targeted unit test to verify failure**

Run: `npm --workspace apps/web test -- src/features/equipment/EquipmentView.test.tsx`
Expected: FAIL because `EquipmentView` renders static `CATEGORY_FILTER_OPTIONS` even when `equipment={[]}`.

- [ ] **Step 3: Implement dynamic category filtering in `EquipmentView.tsx` and update `context-features.spec.ts`**

In `apps/web/src/features/equipment/EquipmentView.tsx`:
- Import `useMemo` from `"react"`.
- Derive `availableCategoryOptions` via `useMemo` from `equipment`:
  `[CATEGORY_FILTER_OPTIONS[0], ...CATEGORY_FILTER_OPTIONS.filter((opt) => opt.value !== "all" && equipment.some((item) => item.type === opt.value))]`.
- Compute `effectiveCategory` via `useMemo` and reset `selectedCategory` via `useEffect`.
- Conditionally render the `FilterPills` container only when `availableCategoryOptions.length > 1`, passing `value={effectiveCategory}` and `options={availableCategoryOptions}`.
- Replace `selectedCategory` in the 5 section visibility guards (lines 276–360) with `effectiveCategory`.

In `apps/web/e2e/context-features.spec.ts` (lines 425–436):
- Navigate to `/equipment`, inspect the last visible pill in `equipment-category-filters` (just like `/reviews` does on lines 397–399) and pass it to `verifyFilterBar("/equipment", "equipment-category-filters", "Grinders", lastEquipmentPillLabel, true)`, and assert that an unused category (if `"Other"` is not seeded) is not visible.

- [ ] **Step 4: Run targeted unit test to verify pass**

Run: `npm --workspace apps/web test -- src/features/equipment/EquipmentView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/equipment/EquipmentView.tsx apps/web/src/features/equipment/EquipmentView.test.tsx apps/web/e2e/context-features.spec.ts
git commit -m "feat(web): filter EquipmentView category pills dynamically"
```

---

### Task 6: Final Verification & Documentation Updates (per repo `AGENTS.md`)

**Files:**
- Modify: `docs/ROADMAP.md` (if issue #89 or FilterPills adoption is listed)
- Create: `docs/devlogs/2026-11-20-filter-pills-adoption.md`

- [ ] **Step 1: Run full typechecks, mobile unit tests, web unit tests, and Playwright E2E tests**

Run in a single verification sequence before finalizing:
```bash
npm run typecheck && npm --workspace apps/mobile test && npm --workspace apps/web test && npm run test:e2e
```
Expected: All suites exit 0 with zero failures.

- [ ] **Step 2: Update devlog (and `README.md` / `docs/ROADMAP.md` if applicable) and commit**
