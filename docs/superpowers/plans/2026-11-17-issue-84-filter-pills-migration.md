# Issue #84: Migrate ReviewsView, RecipeCatalogList, and EquipmentView Filter Pills to `@brewlog/ui` `FilterPills` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ad-hoc `<button>` filter loops in `ReviewsView.tsx`, `RecipeCatalogList.tsx`, and `EquipmentView.tsx` with `@brewlog/ui` `FilterPills`, verify keyboard parity (`Tab`, `Enter`/`Space`, `ArrowLeft`/`ArrowRight`/`Home`/`End`), and confirm unit and Playwright E2E design-token gates stay green.

**Architecture:** `ReviewsView`, `RecipeCatalogList`, and `EquipmentView` adopt `<FilterPills size="sm" ... />` directly from `@brewlog/ui` without modifying `packages/ui/src/filter-pills/`. Option arrays map existing filter values (`'all'`, `'v60'`, `'grinder'`, etc.) to `FilterPillsOption` entries (`{ value, label }`), preserving all existing filtering logic and prop signatures.

**Tech Stack:** React 19, TypeScript, `@brewlog/ui` (`FilterPills`), Vitest + `@testing-library/react`, Playwright E2E.

**Spec:** `docs/superpowers/specs/2026-11-17-issue-84-filter-pills-migration-design.md`

## Global Constraints

- Do not modify `packages/ui/src/filter-pills/` or add per-screen override props.
- Scope covers `ReviewsView.tsx`, `RecipeCatalogList.tsx`, and `EquipmentView.tsx` (`CATEGORIES`).
- All three `FilterPills` instances must use `size="sm"` (`h-8`, `32px` height) and `rounded-lg` (`8px` radius).
- Preserve existing accessible-name selectors (`"All"` exact on `/reviews` and `/equipment`, `/^all$/i` on `/recipes`, `/^AeroPress$/i` in `ReviewsView.test.tsx`).
- Zero emoji anywhere in code, tests, docs, or commits; preserve unrelated comments and docstrings.
- Keep static filter lists visible even when filtered results or source lists are empty.

## Review Focus

- `ReviewsView` `'other'` bucket and `'all'` reset: logs with `'flair'` or `'custom'` brew methods must match `'other'` when selected, and selecting `'all'` restores all logs.
- `ReviewsView` keyboard parity: `role="group"`, `aria-pressed`, `Tab`/`Enter`/`Space` not calling `preventDefault()`, and `ArrowLeft`/`ArrowRight`/`Home`/`End` wrapping across `All`..`Other`.
- `RecipeCatalogList` hyphenated slug mapping: `'french-press'` and `'kalita-wave'` expose Title Case accessible names (`French Press`, `Kalita Wave`) while invoking `onSelectMethodFilter` with the exact slug (`'french-press'`, `'kalita-wave'`).
- `RecipeCatalogList` and `EquipmentView` empty-list and keyboard parity: filter pills remain rendered when `recipes={[]}` or `equipment={[]}`, `Tab`/`Enter`/`Space` remain native, and `ArrowLeft`/`ArrowRight`/`Home`/`End` wrap across `All`..`Kalita Wave` and `All`..`Other`.
- Playwright E2E design token gates (`button-sizing-tokens.spec.ts`, `corner-radius-hierarchy.spec.ts`) and keyboard parity across `/recipes`, `/reviews`, and `/equipment` pass after final edits.

---

### Task 1: Migrate `ReviewsView.tsx` `METHOD_FILTERS` to `@brewlog/ui` `FilterPills`

**Files:**
- Modify: `apps/web/src/features/reviews/ReviewsView.tsx:1-3,105-115,142-144,609-629`
- Test: `apps/web/src/features/reviews/ReviewsView.test.tsx:459-476,849-880`

**Interfaces:**
- Consumes: `FilterPills`, `FilterPillsOption` from `@brewlog/ui` (`packages/ui/src/filter-pills/FilterPills.types.ts`)
- Produces: `ReviewsView` rendering `<FilterPills<ReviewMethodFilter> size="sm" value={selectedMethodFilter} onChange={setSelectedMethodFilter} options={METHOD_FILTER_OPTIONS} ariaLabel="Filter reviews by brew method" testID="reviews-method-filters" />`

- [x] **Step 1: Write failing tests in `apps/web/src/features/reviews/ReviewsView.test.tsx`**

Update/extend the method filter tests near line 459 (and add keyboard parity + `'other'` bucket coverage) so they fail against the current ad-hoc `<button>` loop:

```tsx
  it('filters cards by method filter pills including the Other bucket and updates aria-pressed', () => {
    const customLog: TastingLog = {
      ...sampleLog1,
      id: 'log-custom',
      brewMethod: 'flair',
      beanNameSnapshot: 'Flair Lever Shot',
    };

    render(
      <ReviewsView
        logs={[sampleLog1, sampleLog2, customLog]}
        beans={INITIAL_BEANS}
        equipment={mockEquipment}
        onAddTastingLog={vi.fn()}
      />
    );

    const filterGroup = screen.getByRole('group', { name: 'Filter reviews by brew method' });
    expect(filterGroup.getAttribute('data-testid')).toBe('reviews-method-filters');

    const allChip = within(filterGroup).getByRole('button', { name: 'All' });
    const aeroPressChip = within(filterGroup).getByRole('button', { name: /^AeroPress$/i });
    const otherChip = within(filterGroup).getByRole('button', { name: 'Other' });

    expect(allChip.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(aeroPressChip);
    expect(aeroPressChip.getAttribute('aria-pressed')).toBe('true');
    expect(allChip.getAttribute('aria-pressed')).toBe('false');

    const masterFeed = screen.getByTestId('master-feed');
    expect(within(masterFeed).getByText('El Paraiso')).toBeDefined();
    expect(within(masterFeed).queryByText('Worka Sakaro')).toBeNull();

    fireEvent.click(otherChip);
    expect(within(masterFeed).getByText('Flair Lever Shot')).toBeDefined();
    expect(within(masterFeed).queryByText('El Paraiso')).toBeNull();

    fireEvent.click(allChip);
    expect(within(masterFeed).getByText('Worka Sakaro')).toBeDefined();
    expect(within(masterFeed).getByText('El Paraiso')).toBeDefined();
    expect(within(masterFeed).getByText('Flair Lever Shot')).toBeDefined();
  });

  it('supports arrow-key focus wrapping and preserves Tab, Enter, and Space on method FilterPills', () => {
    render(
      <ReviewsView
        logs={[sampleLog1, sampleLog2]}
        beans={INITIAL_BEANS}
        equipment={mockEquipment}
        onAddTastingLog={vi.fn()}
      />
    );

    const filterGroup = screen.getByTestId('reviews-method-filters');
    const allChip = within(filterGroup).getByRole('button', { name: 'All' });
    const v60Chip = within(filterGroup).getByRole('button', { name: 'V60' });
    const otherChip = within(filterGroup).getByRole('button', { name: 'Other' });

    allChip.focus();
    fireEvent.keyDown(allChip, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(v60Chip);

    fireEvent.keyDown(v60Chip, { key: 'End' });
    expect(document.activeElement).toBe(otherChip);

    fireEvent.keyDown(otherChip, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(allChip);

    fireEvent.keyDown(allChip, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(otherChip);

    fireEvent.keyDown(otherChip, { key: 'Home' });
    expect(document.activeElement).toBe(allChip);

    for (const key of ['Tab', 'Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      allChip.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
  });
```

- [x] **Step 2: Run the targeted `ReviewsView.test.tsx` test to verify it fails**

Run: `npx vitest run src/features/reviews/ReviewsView.test.tsx` (from `apps/web`)
Expected: FAIL because `role="group"` with name `'Filter reviews by brew method'` does not exist yet.

- [x] **Step 3: Refactor `ReviewsView.tsx` to use `FilterPills`**

In `apps/web/src/features/reviews/ReviewsView.tsx`:
1. Import `FilterPills` and `type FilterPillsOption` from `@brewlog/ui`.
2. Replace `METHOD_FILTERS` with `METHOD_FILTER_OPTIONS: FilterPillsOption<ReviewMethodFilter>[]` (where `ReviewMethodFilter` is `'all' | 'v60' | 'aeropress' | 'chemex' | 'espresso' | 'french-press' | 'kalita-wave' | 'other'`) keeping exact labels `'All'`, `'V60'`, `'AeroPress'`, `'Chemex'`, `'Espresso'`, `'French Press'`, `'Kalita Wave'`, `'Other'`.
3. Update `selectedMethodFilter` state to `useState<ReviewMethodFilter>('all')`.
4. Replace lines 609–628 (`METHOD_FILTERS.map(...)`) with `<FilterPills<ReviewMethodFilter> size="sm" value={selectedMethodFilter} onChange={setSelectedMethodFilter} options={METHOD_FILTER_OPTIONS} ariaLabel="Filter reviews by brew method" testID="reviews-method-filters" />`.

- [x] **Step 4: Run `ReviewsView.test.tsx` to verify it passes**

Run: `npx vitest run src/features/reviews/ReviewsView.test.tsx` (from `apps/web`)
Expected: PASS (all `ReviewsView` tests pass).

- [x] **Step 5: Commit Task 1**

```bash
git add apps/web/src/features/reviews/ReviewsView.tsx apps/web/src/features/reviews/ReviewsView.test.tsx
git commit -m "refactor(reviews): migrate ReviewsView method filters to FilterPills"
```

---

### Task 2: Migrate `RecipeCatalogList.tsx` `METHODS` to `@brewlog/ui` `FilterPills`

**Files:**
- Modify: `apps/web/src/features/recipes/RecipeCatalogList.tsx:1-59`
- Test: `apps/web/src/features/recipes/RecipeCatalogList.test.tsx:12-33,76-107`

**Interfaces:**
- Consumes: `FilterPills`, `FilterPillsOption` from `@brewlog/ui`
- Preserves: `RecipeCatalogListProps` (`selectedMethodFilter: string`, `onSelectMethodFilter: (method: string) => void`)
- Produces: `RecipeCatalogList` rendering `<FilterPills size="sm" value={selectedMethodFilter} onChange={onSelectMethodFilter} options={METHOD_FILTER_OPTIONS} ariaLabel="Filter recipes by brew method" testID="recipe-method-filters" />`

- [x] **Step 1: Write failing tests in `apps/web/src/features/recipes/RecipeCatalogList.test.tsx`**

Add tests verifying `role="group"`, `aria-pressed`, Title Case accessible names mapping to exact method slugs (`'french-press'`, `'kalita-wave'`), empty-list visibility, and keyboard navigation parity (`Tab`, `Enter`, `Space`, `ArrowLeft`, `ArrowRight`, `Home`, `End`):

```tsx
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
```

(Remember to import `within` from `@testing-library/react` in `RecipeCatalogList.test.tsx`.)

- [x] **Step 2: Run the targeted `RecipeCatalogList.test.tsx` test to verify it fails**

Run: `npx vitest run src/features/recipes/RecipeCatalogList.test.tsx` (from `apps/web`)
Expected: FAIL because `role="group"` with name `'Filter recipes by brew method'` does not exist yet.

- [x] **Step 3: Refactor `RecipeCatalogList.tsx` to use `FilterPills`**

In `apps/web/src/features/recipes/RecipeCatalogList.tsx`:
1. Import `FilterPills` and `type FilterPillsOption` from `@brewlog/ui`.
2. Replace `METHODS` with `METHOD_FILTER_OPTIONS: FilterPillsOption<string>[]`:
   `all` -> `'All'`, `v60` -> `'V60'`, `aeropress` -> `'AeroPress'`, `flair` -> `'Flair'`, `chemex` -> `'Chemex'`, `french-press` -> `'French Press'`, `kalita-wave` -> `'Kalita Wave'`.
3. Replace lines 39–58 (`METHODS.map(...)`) with `<FilterPills size="sm" value={selectedMethodFilter} onChange={onSelectMethodFilter} options={METHOD_FILTER_OPTIONS} ariaLabel="Filter recipes by brew method" testID="recipe-method-filters" />`.

- [x] **Step 4: Run `RecipeCatalogList.test.tsx` to verify it passes**

Run: `npx vitest run src/features/recipes/RecipeCatalogList.test.tsx` (from `apps/web`)
Expected: PASS (all `RecipeCatalogList` tests pass).

- [x] **Step 5: Commit Task 2**

```bash
git add apps/web/src/features/recipes/RecipeCatalogList.tsx apps/web/src/features/recipes/RecipeCatalogList.test.tsx
git commit -m "refactor(recipes): migrate RecipeCatalogList method filters to FilterPills"
```

---

### Task 3: Migrate `EquipmentView.tsx` `CATEGORIES` to `@brewlog/ui` `FilterPills`

**Files:**
- Modify: `apps/web/src/features/equipment/EquipmentView.tsx:1-25,240-275`
- Test: `apps/web/src/features/equipment/EquipmentView.test.tsx:1-5,165-235`

**Interfaces:**
- Consumes: `FilterPills`, `FilterPillsOption` from `@brewlog/ui`
- Produces: `EquipmentView` rendering `<FilterPills<CategoryFilter> size="sm" value={selectedCategory} onChange={setSelectedCategory} options={CATEGORY_FILTER_OPTIONS} ariaLabel="Filter equipment by category" testID="equipment-category-filters" />`

- [x] **Step 1: Add category pill, `aria-pressed`, empty-list, and keyboard parity tests in `apps/web/src/features/equipment/EquipmentView.test.tsx`**
- [x] **Step 2: Refactor `EquipmentView.tsx` `CATEGORIES` to `CATEGORY_FILTER_OPTIONS` and `<FilterPills>`**
- [x] **Step 3: Run `EquipmentView.test.tsx` (`11/11` passed)**

---

### Task 4: End-to-End Verification, Documentation Protocol & Final Checks

**Files:**
- Modify: `apps/web/e2e/context-features.spec.ts` (E2E keyboard arrow/Enter/Space/Tab parity + DOM filtering checks on `/recipes`, `/reviews`, and `/equipment`)
- Modify: `README.md` (document unified `FilterPills` across `EquipmentView`, `RecipeCatalogList`, and `ReviewsView`)
- Modify: `docs/ROADMAP.md` (remove completed filter pill items from Remaining App Surface Migration and add #84 completion entry with PR #86)
- Create: `docs/devlogs/2026-11-17-issue-84-filter-pills-migration.md`

- [x] **Step 1: Add E2E keyboard parity verification in `apps/web/e2e/context-features.spec.ts`**

Add a test `"Recipes, Reviews & Equipment: FilterPills support keyboard navigation and activation"` verifying on `/recipes` (`getByTestId("recipe-method-filters")`), `/reviews` (`getByTestId("reviews-method-filters")`), and `/equipment` (`getByTestId("equipment-category-filters")`):
- Focusing `"All"` and pressing `ArrowRight` moves focus to `"V60"` / `"Grinders"`, `End` jumps to the last pill (`"Kalita Wave"` on `/recipes`, `"Other"` on `/reviews` and `/equipment`), `ArrowRight` wraps back to `"All"`, `ArrowLeft` wraps to the last pill, and `Home` returns to `"All"`.
- Pressing `Enter` or `Space` on a focused pill updates `aria-pressed="true"` on that pill and filters the rendered cards/sections (seed-independent on `/reviews` by creating an `AeroPress` review in-session), and `Tab` moves focus onward out of the pill bar.

- [x] **Step 2: Run full typecheck, unit tests, and Playwright E2E gates**

Run:
```bash
npm run typecheck
npm test
npm run test:e2e --workspace=@brewlog/web -- e2e/button-sizing-tokens.spec.ts e2e/corner-radius-hierarchy.spec.ts e2e/context-features.spec.ts
```
Expected: All typechecks, unit tests, and Playwright specs (`button-sizing-tokens.spec.ts`, `corner-radius-hierarchy.spec.ts`, `context-features.spec.ts`) exit 0 with zero failures.

- [x] **Step 3: Complete Documentation & PR Completion Protocol**

1. Check `README.md` and `docs/ROADMAP.md` for references to Issue #84 (`Remaining App Surface Migration`), update checkboxes/completed milestones, and link PR #86 and the devlog.
2. Create `docs/devlogs/2026-11-17-issue-84-filter-pills-migration.md` covering executive summary, changes in `ReviewsView.tsx`, `RecipeCatalogList.tsx`, and `EquipmentView.tsx`, accessibility/keyboard parity, and recorded verification evidence (typecheck, unit tests, Playwright E2E results).

- [x] **Step 4: Re-run verification after doc/test edits and commit**

Run:
```bash
npm run typecheck && npm test
npm run test:e2e --workspace=@brewlog/web
```
Expected: All suites pass cleanly. Commit the E2E + docs updates.
