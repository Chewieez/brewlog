# Design Spec: Align Web Stash Bean Filters, Shelves & Summary Metrics with Mobile (Issue #65)

**Date:** 2026-11-16  
**Issue:** #65 — Align web Stash bean filters and shelves with mobile  
**Status:** Draft (Pending Builder Check & User Approval)

---

## 1. Intent & Why

Mobile's Stash screen (`apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx`) gives brewers a fast, structured cellar workflow: summary metrics at the top (`Active Bags`, `At Peak`, `Total Stash`), segmented shelves separating `Active Cellar`, `Freezer Vault`, and `Archived` lots, and one-tap process filter pills (`All`, `Washed`, `Natural`, `Honey`, `Anaerobic`).

Web's Stash (`apps/web/src/features/stash/StashView.tsx`) currently renders a flat list of all beans (mixing active, frozen, and archived lots together), lacks cellar summary metrics and an archive toggle, and uses a native `<select>` dropdown for process filtering, which is slower on desktop/tablet and violates the design system's native-`<select>` ban on filter controls.

Aligning web with mobile brings feature parity across platforms, establishes a reusable `FilterPills` primitive in `@brewlog/ui`, and upgrades `@brewlog/ui` `SegmentedControl` with full keyboard arrow navigation.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- Replace the native `<select>` process filter in `StashView.tsx` with a new shared `@brewlog/ui` `FilterPills` component.
- Dynamically render only the subset of the 5 mobile process options (`All`, `Washed`, `Natural`, `Honey`, `Anaerobic`) that exist on the current shelf (using substring matching for `Anaerobic`, so `anaerobic-natural` and `anaerobic-washed` match).
- Add a 3-shelf `SegmentedControl` (`Active Cellar`, `Freezer Vault`, `Archived`) matching mobile's `StashCatalogScreen` partitioning (`!isArchived && !isFrozen`, `!isArchived && isFrozen`, `Boolean(isArchived)`).
- Add a web `CellarSummaryBar` (`ACTIVE BAGS`, `AT PEAK`, `TOTAL STASH`) built from `@brewlog/ui` `MetricTile`.
- Add an **Archive / Unarchive** toggle in the Edit Bean modal so users can move beans to/from the `Archived` shelf directly on web.
- Ensure keyboard navigation parity (`Tab`, `Enter`/`Space`, `ArrowLeft`/`ArrowRight`/`Home`/`End`) on both `SegmentedControl.web.tsx` and `FilterPills.web.tsx`.
- Adhere strictly to `@brewlog/ui` design tokens, mobile-first layout, all interactive states, zero emoji, and existing web E2E token constraints (`[32px, 40px, 48px]` button heights and `rounded-xl` / `rounded-lg` / `rounded-md` corner radius hierarchy).
- Log a follow-up GitHub issue to refactor `ReviewsView.tsx` and `RecipeCatalogList.tsx` to adopt the new shared `FilterPills` component.

### Non-Goals
- Do **not** replace the native `<select>` form inputs inside the Add/Edit Bean modal (`Process Method` and `Roast Level` in `StashView.tsx`), per user decision ("selects are fine for web" in forms).
- Do **not** refactor `ReviewsView.tsx` or `RecipeCatalogList.tsx` to use `FilterPills` in this PR (tracked in the follow-up issue).
- Do **not** add a standalone Bean Detail page on web (Edit modal continues to hold bean edits, freeze toggle, and archive toggle).

### Anti-Goals
- Do **not** show dead process filter pills that yield zero results on the active shelf.
- Do **not** use emoji anywhere in UI, empty states, comments, or tests.
- Do **not** introduce one-sided colored accent borders (`border-l-4`, etc.) on summary panels or empty-state cards.
- Do **not** violate `button-sizing-tokens.spec.ts` (`32px`, `40px`, `48px`) or `corner-radius-hierarchy.spec.ts`.

---

## 3. Taste Preflight & Visual Architecture

```
Domain:           consumer craft / specialty coffee tool
Audience & tone:  detail-oriented home brewers, calm & tactile
Mood:             precise, grounded, industrial-craft
Motion depth:     subtle feedback (100-150ms hover/press transitions, no layout shifts)
Layout family:    header + action -> 3-column summary chassis -> search + shelf tabs + filter pills -> responsive 1/2/3-col bean card grid
Reference anchor: BrewLog Industrial Precision ("Tactile Dark Craft" / "Crisp Studio Light" via @brewlog/ui tokens)
```

### Text Sketch (Web `/stash`)

```
+-------------------------------------------------------------------------+
| Coffee Bean Stash                                         [ + ADD BEAN ]|
| Track origins, roast dates, and peak resting windows...                 |
+-------------------------------------------------------------------------+
| [ ACTIVE BAGS: 4 ]   |   [ AT PEAK: 2 (green) ]   |   [ TOTAL STASH: 890g ] |
+-------------------------------------------------------------------------+
| [ Search by coffee name, roaster, country, notes...              (X) ]  |
+-------------------------------------------------------------------------+
| [ ACTIVE CELLAR | FREEZER VAULT | ARCHIVED ]   <- SegmentedControl      |
| [ All ] [ Washed ] [ Natural ] [ Anaerobic ]   <- FilterPills (dynamic) |
+-------------------------------------------------------------------------+
| [ Bean Card ]          [ Bean Card ]          [ Bean Card ]             |
+-------------------------------------------------------------------------+
```

---

## 4. Approaches Considered

- **Approach A (Modular Stash subcomponents + keyboard-upgraded `SegmentedControl.web.tsx`)**: Extract `CellarSummaryBar` and `StashFilterBar` inside `apps/web/src/features/stash/` without adding a filter primitive to `@brewlog/ui`. Keeps `@brewlog/ui` minimal, but leaves filter pills duplicated across web features.
- **Approach B (Selected — Shared `@brewlog/ui` `FilterPills` + keyboard-upgraded `SegmentedControl.web.tsx` + modular `CellarSummaryBar`)**: Build `FilterPills` as a reusable `@brewlog/ui` component (web + native + tests), upgrade `SegmentedControl.web.tsx` with arrow-key navigation, extract `CellarSummaryBar.tsx` in `apps/web/src/features/stash/` using `MetricTile`, update `StashView.tsx`, and log a follow-up issue to migrate `ReviewsView` and `RecipeCatalogList`. Chosen for cross-app consistency and future reuse.
- **Approach C (All inline in `StashView.tsx`, no `@brewlog/ui` changes)**: Lowest file count, but bloats the 906-line `StashView.tsx` and leaves `SegmentedControl.web.tsx` lacking `role="tablist"` keyboard parity.

---

## 5. Detailed Design

### 5.1 `@brewlog/ui` — New `FilterPills` Component

Create `packages/ui/src/filter-pills/`:
- `FilterPills.types.ts`
- `FilterPills.web.tsx`
- `FilterPills.native.tsx`
- `FilterPills.web.test.tsx`
- `FilterPills.native.test.tsx`

Export `FilterPills`, `FilterPillsProps`, and `FilterPillsOption` from both `packages/ui/src/index.web.ts` and `packages/ui/src/index.native.ts`.

#### Interface (`FilterPills.types.ts`)
```ts
export interface FilterPillsOption<T extends string = string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  testID?: string;
}

export interface FilterPillsProps<T extends string = string> {
  options: FilterPillsOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  ariaLabel?: string;
  testID?: string;
}
```

#### Web Behavior & Accessibility (`FilterPills.web.tsx`)
- Container: `<div role="group" aria-label={ariaLabel} data-testid={testID} className="flex items-center gap-2 overflow-x-auto sm:flex-wrap pb-1 sm:pb-0">` (mobile-first horizontal scroll, wraps cleanly on wider viewports).
- Each pill is a `<button type="button" aria-pressed={isSelected} disabled={option.disabled} aria-label={option.accessibilityLabel || option.label} data-testid={option.testID}>`.
- **Keyboard parity**:
  - Standard `Tab` moves focus across enabled pills; `Enter` / `Space` selects the focused pill (native button behavior).
  - `onKeyDown` on the container/buttons handles `ArrowRight`, `ArrowLeft`, `Home`, and `End` across **non-disabled** pills (wrapping at ends) and moves DOM focus to the target button.
- **Sizing & Corner Radius**:
  - `size === 'sm'` (default): `h-8 px-3 text-xs rounded-lg` (32px height, 8px radius — conforms to `button-sizing-tokens.spec.ts` and `corner-radius-hierarchy.spec.ts`).
  - `size === 'md'`: `h-10 px-4 text-xs rounded-lg` (40px height, 8px radius).
- **8 Interactive States (tokenized)**:
  - Selected: `btn-tactile-primary font-bold` (`--btn-primary-bg`, `--btn-primary-text`, `--btn-primary-shadow`), hover brightness lift, active `scale-[0.98]`, `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-canvas`.
  - Unselected (default): `btn-tactile-secondary text-foreground-secondary hover:text-foreground` with crisp focus ring and active `scale-[0.98]`.
  - Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`.

#### Native Implementation (`FilterPills.native.tsx`)
- Horizontal `ScrollView` (`showsHorizontalScrollIndicator={false}`) rendering `Pressable` chips using `makeStyles((colors) => ...)` (`colors.accent`, `colors.canvas`, `colors.panel`, `colors.borderSubtle`, `colors.textSecondary`), `accessibilityRole="button"`, `accessibilityState={{ selected: isSelected, disabled: Boolean(option.disabled) }}`, `minHeight: 44`.

---

### 5.2 `@brewlog/ui` — `SegmentedControl.web.tsx` Keyboard Parity

Update `packages/ui/src/segmented-control/SegmentedControl.web.tsx`:
- Add `buttonRefs` array (or container `querySelectorAll('button:not(:disabled)')`) and `onKeyDown` handler supporting:
  - `ArrowRight`: moves focus to next option (wrapping to index 0).
  - `ArrowLeft`: moves focus to previous option (wrapping to last index).
  - `Home`: moves focus to first option.
  - `End`: moves focus to last option.
- Preserve existing `role` (`'group' | 'tablist' | 'radiogroup'`), `aria-pressed`, `aria-selected`, `rounded-lg` track, `rounded-md` thumbs, and `h-8` (`sm`) / `h-10` (`md`) heights.
- Add keyboard navigation unit tests in `packages/ui/src/segmented-control/SegmentedControl.web.test.tsx`.

---

### 5.3 `@brewlog/ui` — `MetricTile` `'success'` Variant

Update `packages/ui/src/metric-tile/MetricTile.types.ts`, `MetricTile.web.tsx`, and `MetricTile.native.tsx`:
- Extend `variant?: 'default' | 'accent' | 'muted' | 'success'`.
- Web maps `'success'` to `'text-status-success'`; native maps `'success'` to `colors.statusSuccess`.

---

### 5.4 Web `CellarSummaryBar` (`apps/web/src/features/stash/CellarSummaryBar.tsx`)

- Props: `{ totalBags: number; peakBags: number; totalRemainingGrams: number }`.
- Metrics are computed in `StashView.tsx` from **`activeBeans` only** (`!b.isArchived && !b.isFrozen`), matching mobile `StashCatalogScreen.tsx`:
  - `totalBags = activeBeans.length`
  - `peakBags = activeBeans.filter((b) => calculateBeanRestingInfo(b).status === 'peak').length`
  - `totalRemainingGrams = activeBeans.reduce((sum, b) => sum + (b.remainingGrams ?? b.bagWeightGrams ?? 0), 0)`
- Renders a `rounded-xl bg-panel border border-border-subtle p-4` container (`role="region"` / `aria-label="Cellar summary"`) with a 3-column grid (`grid grid-cols-3 divide-x divide-border-subtle`) containing three centered `MetricTile` (`size="sm"`) items:
  1. `ACTIVE BAGS` (`variant="default"`)
  2. `AT PEAK` (`variant={peakBags > 0 ? 'success' : 'default'}`)
  3. `TOTAL STASH` (`unit="g"`, `variant="default"`)

---

### 5.5 Shelf Organization & Dynamic Process Filtering (`StashView.tsx`)

#### Shelf Partitioning
Using the exact rules from `apps/mobile/src/features/stash/StashContext.tsx`:
- `activeBeans`: `beans.filter((b) => !b.isArchived && !b.isFrozen)`
- `frozenBeans`: `beans.filter((b) => !b.isArchived && Boolean(b.isFrozen))`
- `archivedBeans`: `beans.filter((b) => Boolean(b.isArchived))`

State:
- `activeShelf: ShelfType` (`'active' | 'frozen' | 'archived'`), default `'active'`.
- Rendered with `<SegmentedControl<ShelfType> role="tablist" size="sm" fullWidth value={activeShelf} onChange={setActiveShelf} ariaLabel="Shelf selector" ... />` with labels:
  - `'active'` -> `'Active Cellar'`
  - `'frozen'` -> `'Freezer Vault'`
  - `'archived'` -> `'Archived'`

#### Dynamic Process Filter Pills
Base mobile process filters (strictly capped to the 5 mobile categories per user decision; `carbonic-maceration`, `wet-hulled`, `experimental`, and `other` intentionally do not get separate pills and remain visible under `All`):
```ts
export type ProcessFilter = 'all' | 'washed' | 'natural' | 'honey' | 'anaerobic';

const MOBILE_PROCESS_FILTERS: { id: Exclude<ProcessFilter, 'all'>; label: string }[] = [
  { id: 'washed', label: 'Washed' },
  { id: 'natural', label: 'Natural' },
  { id: 'honey', label: 'Honey' },
  { id: 'anaerobic', label: 'Anaerobic' },
];
```
Matching rule (same as mobile):
```ts
function matchesProcessFilter(bean: Bean, filter: Exclude<ProcessFilter, 'all'>): boolean {
  const proc = bean.process?.toLowerCase() ?? '';
  return proc === filter || proc.includes(filter);
}
```
- Compute `availableProcessOptions` from `currentShelfBeans`:
  - Include `{ value: 'all', label: 'All' }` plus each item in `MOBILE_PROCESS_FILTERS` for which `currentShelfBeans.some((b) => matchesProcessFilter(b, item.id))` is true.
  - Render `<FilterPills<ProcessFilter> ... />` only when `availableProcessOptions.length > 1` (i.e., at least one of the 4 process options exists on the active shelf; avoids rendering a redundant lone `All` pill).
  - If `selectedProcess !== 'all'` and `selectedProcess` is no longer present in `availableProcessOptions` (e.g., user switched to a shelf without that process, or edited/deleted the last matching bean), automatically reset `selectedProcess` to `'all'` (either in `useEffect` or derived/handler so the user is never stuck on an empty phantom filter).

#### Search Query & Clear Button
- Keep the search input (`Search by coffee name, roaster, country...`) and also match `farm`, `variety`, and `flavorNotes` (matching mobile parity, while preserving existing search behavior).
- Add a clear button (`h-8 w-8`, `aria-label="Clear search"`, `X` icon) inside the search input when `searchQuery.trim().length > 0` (or `searchQuery.length > 0`).

#### Shelf-Specific Empty States
Match mobile's 4 empty states in `StashView.tsx` (using Lucide icons `Search`, `Snowflake`, `Archive`, `Coffee`/`Plus` — zero emoji):
1. **Active search / filter yields 0 results** (`searchQuery.trim().length > 0 || selectedProcess !== 'all'`):
   - Message: `"No coffee beans found matching your search."` (preserves existing test text match) + a secondary `CLEAR FILTERS` / `CLEAR SEARCH` button (`h-8`).
2. **`frozen` shelf empty**:
   - Title: `"Freezer Vault is Empty"`, subtitle explaining freezing coffees at peak pauses oxidation.
3. **`archived` shelf empty**:
   - Title: `"No Archived Coffees"`, subtitle explaining archived/finished bags live here for reference.
4. **`active` shelf empty**:
   - Title: `"Cellar is Empty"`, subtitle + `ADD YOUR FIRST BEAN` primary button (`h-10` or `h-8`) opening the Add Bean modal.

---

### 5.6 Archive / Unarchive Toggle in Edit Bean Modal (`StashView.tsx`)

- Add `isArchived` boolean state in `StashView.tsx` form state:
  - `resetForm()` sets `setIsArchived(false)`.
  - `handleOpenEditModal(bean)` sets `setIsArchived(Boolean(bean.isArchived))`.
  - `handleSubmitBean()` persists `isArchived` in `beanData`.
- In the **Inventory & Cellar** section of the modal, when `editingBean` is truthy, render an Archive toggle checkbox row (`#add-bean-is-archived`) styled identically to the Freezer Vault Storage row (with `Archive` Lucide icon):
  - Label: `Archive Bean`
  - Subtext: `Move finished or past coffees out of the active cellar into the Archived shelf.`
- Note: Existing `Add` modal test (`StashView.test.tsx` line 275) uses `screen.getByRole('checkbox')` during Add mode. Rendering the Archive checkbox **only when `editingBean` is non-null** (matching mobile, where you only archive existing beans) ensures Add mode still has exactly one checkbox (`Freezer Vault Storage`).

---

### 5.7 Follow-up Issue Creation

Create a GitHub issue via `gh issue create` (or capture the exact title/body if CLI auth is unavailable in sandbox) to refactor:
- `apps/web/src/features/reviews/ReviewsView.tsx` (`METHOD_FILTERS`)
- `apps/web/src/features/recipes/RecipeCatalogList.tsx` (`METHODS`)
to adopt `@brewlog/ui` `FilterPills`.

---

## 6. Verification & Testing Plan

1. **Unit Tests (`@brewlog/ui`)**:
   - `FilterPills.web.test.tsx`: renders options, `aria-pressed`, selected styling, click handler, disabled state, `ArrowLeft`/`ArrowRight`/`Home`/`End` focus movement with wrapping, `sm`/`md` sizing classes.
   - `FilterPills.native.test.tsx`: renders pills, `accessibilityState.selected`, press handler.
   - `SegmentedControl.web.test.tsx`: add tests for `ArrowLeft`/`ArrowRight`/`Home`/`End` focus movement.
2. **Unit Tests (`apps/web`)**:
   - Update `StashView.test.tsx`:
     - Replace `getByRole('combobox')` assertions with `FilterPills` + `SegmentedControl` (`role="tablist"`) shelf assertions.
     - Update the frozen bean card test to switch to the `Freezer Vault` shelf (since `Active Cellar` is default).
     - Add tests covering:
       - `CellarSummaryBar` totals (`ACTIVE BAGS`, `AT PEAK`, `TOTAL STASH` computed strictly from active non-frozen, non-archived beans).
       - Shelf switching (`Active Cellar`, `Freezer Vault`, `Archived`) and shelf-specific empty states.
       - Dynamic process pill visibility (only processes present on the current shelf appear; `Anaerobic` matches `anaerobic-natural` / `anaerobic-washed`; switching shelves resets incompatible filter to `All`).
       - Keyboard navigation across shelf tabs and process pills.
       - Archiving and unarchiving a bean via Edit modal.
3. **E2E Tests (`apps/web/e2e`)**:
   - Update `corner-radius-hierarchy.spec.ts` Stash test (replace `getByRole('combobox')` with `SegmentedControl` track/thumbs and `FilterPills` pill radius checks).
   - Update `context-features.spec.ts` to test Stash shelf switching and process pill filtering.
   - Run `button-sizing-tokens.spec.ts` to ensure all new buttons on `/stash` conform to `[32px, 40px, 48px]`.
4. **Build, Typecheck & Verification Gates**:
   - `npm run typecheck` and package/app unit tests (`packages/ui`, `apps/web`).
   - Playwright E2E suite on `apps/web`.
   - Design doctrine verification: `check_no_emoji.py`, `lint_hardcodes.py`, and visual inspection / Playwright screenshots across `tactile-dark` and `studio-light` themes.
