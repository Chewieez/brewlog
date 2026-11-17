# Issue #65: Align Web Stash Bean Filters, Shelves & Summary Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align web's Stash view (`StashView.tsx`) with mobile (`StashCatalogScreen.tsx`) by replacing the filter `<select>` with a new shared `@brewlog/ui` `FilterPills` component, adding shelf organization (`Active Cellar`, `Freezer Vault`, `Archived`), adding a `CellarSummaryBar`, adding an Archive toggle in the Edit Bean modal, and achieving full keyboard parity.

**Architecture:** Add a cross-platform `FilterPills` component (`*.types.ts`, `*.web.tsx`, `*.native.tsx`) and `MetricTile` `'success'` variant to `@brewlog/ui`, upgrade `SegmentedControl.web.tsx` with roving/wrapping arrow-key focus, extract `CellarSummaryBar.tsx` in `apps/web/src/features/stash/`, and wire shelves, dynamic process filtering, empty states, and archiving into `StashView.tsx`. Leave the Add/Edit modal's `<select>` inputs (`Process Method`, `Roast Level`) untouched per user decision, and log a follow-up issue to adopt `FilterPills` in `ReviewsView.tsx` and `RecipeCatalogList.tsx`.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind CSS v4 (`@brewlog/ui` CSS tokens), Vitest + Testing Library, Playwright, Lucide React.

**Spec:** `docs/superpowers/specs/2026-11-16-issue-65-align-web-stash-filters-and-shelves-design.md`

---

## Global Constraints

- Zero emoji anywhere in UI, code, JSON, copy, comments, devlogs, or commit messages.
- All web buttons must conform to `[32px, 40px, 48px]` height (`h-8`, `h-10`, `h-12`) enforced by `apps/web/e2e/button-sizing-tokens.spec.ts`.
- Corner radius hierarchy enforced by `apps/web/e2e/corner-radius-hierarchy.spec.ts`: `rounded-xl` (12px) on outer cards/summary chassis/modals, `rounded-lg` (8px) on segmented tracks, filter pills, inputs, and action buttons, `rounded-md` (6px) on segmented thumbs and status badges.
- No one-sided colored accent borders (`border-l-4`, etc.); use full hairline borders (`border border-border-subtle`) and `@brewlog/ui` tokens only.
- Mobile-first base styles; wider screens layered with `min-width` (`sm:`, `md:`, `lg:`).
- Dynamic process filter pills are strictly capped to the 5 mobile options (`All`, `Washed`, `Natural`, `Honey`, `Anaerobic` via substring match), scoped to `currentShelfBeans`.
- Modal form `<select>` controls (`#add-bean-process`, `#add-bean-roast-level`) remain native `<select>` elements.

## Review Focus

- Switching shelves while `selectedProcess` is set to a process absent on the destination shelf must automatically reset `selectedProcess` to `'all'` rather than stranding the user on an empty filtered state.
- Shelves containing only beans with `process: undefined` or non-mobile processes (`carbonic-maceration`, `wet-hulled`, `experimental`, `other`) must hide `FilterPills` cleanly and still display those beans under `'all'`.
- `CellarSummaryBar` must compute `ACTIVE BAGS`, `AT PEAK`, and `TOTAL STASH` strictly from active beans (`!isArchived && !isFrozen`), falling back to `bagWeightGrams ?? 0` when `remainingGrams` is undefined (preserving `0g`).
- `FilterPills.web.tsx` and `SegmentedControl.web.tsx` keyboard handlers (`ArrowLeft`, `ArrowRight`, `Home`, `End`) must skip disabled options and wrap smoothly at boundaries without blocking `Tab` or `Enter`/`Space`.
- Toggling `Archive Bean` (or `Freezer Vault Storage`) in the Edit Bean modal must immediately move the bean to its target shelf and update `CellarSummaryBar` counts.

---

### Task 1: Add Shared `FilterPills` Component to `@brewlog/ui`

**Files:**
- Create: `packages/ui/src/filter-pills/FilterPills.types.ts`
- Create: `packages/ui/src/filter-pills/FilterPills.web.tsx`
- Create: `packages/ui/src/filter-pills/FilterPills.native.tsx`
- Test: `packages/ui/src/filter-pills/FilterPills.web.test.tsx`
- Test: `packages/ui/src/filter-pills/FilterPills.native.test.tsx`
- Modify: `packages/ui/src/index.web.ts`
- Modify: `packages/ui/src/index.native.ts`

**Interfaces:**
- Produces:
  - `FilterPillsOption<T extends string = string>` (`{ value: T; label: string; accessibilityLabel?: string; disabled?: boolean; testID?: string }`)
  - `FilterPillsProps<T extends string = string>` (`{ options: FilterPillsOption<T>[]; value: T; onChange: (value: T) => void; size?: 'sm' | 'md'; ariaLabel?: string; testID?: string }`)
  - `FilterPills` exported from `@brewlog/ui` (both `index.web.ts` and `index.native.ts`)

- [ ] **Step 1: Write failing web unit tests in `packages/ui/src/filter-pills/FilterPills.web.test.tsx`**

Test cases to include:
- Renders all options as buttons inside `role="group"` with `aria-label`, setting `aria-pressed="true"` and `btn-tactile-primary` on selected pill and `aria-pressed="false"` + `btn-tactile-secondary` on unselected pills.
- Calls `onChange` with clicked value; does not call `onChange` when clicking a `disabled` option.
- Applies `h-8` and `rounded-lg` for default `size="sm"`, and `h-10` and `rounded-lg` for `size="md"`.
- Returns `null` when `options` is empty (`[]`).
- Keyboard navigation: `ArrowRight`, `ArrowLeft`, `Home`, `End` move DOM focus between enabled pills, wrap at first/last enabled pill, and skip `disabled` pills.

- [ ] **Step 2: Write failing native unit tests in `packages/ui/src/filter-pills/FilterPills.native.test.tsx`**

Mock `react-native` (`View`, `ScrollView`, `Pressable`, `Text`, `StyleSheet`) following `SegmentedControl.native.test.tsx`, and test:
- Renders all option labels and sets `accessibilityState={{ selected: true }}` on the active option.
- Calls `onChange` with option value on press and skips disabled options.

- [ ] **Step 3: Run targeted tests to verify they fail**

Run: `npx vitest run packages/ui/src/filter-pills/FilterPills.web.test.tsx packages/ui/src/filter-pills/FilterPills.native.test.tsx`
Expected: FAIL (module `./FilterPills.web` and `./FilterPills.native` not found).

- [ ] **Step 4: Create `FilterPills.types.ts`, `FilterPills.web.tsx`, and `FilterPills.native.tsx`, and export from `index.web.ts` / `index.native.ts`**

- `FilterPills.types.ts`: Define `FilterPillsOption<T>` and `FilterPillsProps<T>`.
- `FilterPills.web.tsx`:
  - Return `null` if `options.length === 0`.
  - Render `<div role="group" aria-label={ariaLabel} data-testid={testID} className="flex items-center gap-2 overflow-x-auto sm:flex-wrap pb-1 sm:pb-0">`.
  - Maintain `buttonRefs` mapped by index (or query enabled buttons) so `onKeyDown` moves focus on `ArrowRight`, `ArrowLeft`, `Home`, `End` across enabled options with wrap-around.
  - Size classes: `sm` -> `'h-8 px-3 text-xs'`, `md` -> `'h-10 px-4 text-xs'`.
  - Tokenized 8-state classes: `rounded-lg font-mono uppercase tracking-wider whitespace-nowrap inline-flex items-center justify-center transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-canvas active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`, plus `btn-tactile-primary font-bold` when selected and `btn-tactile-secondary font-medium text-foreground-secondary hover:text-foreground` when unselected.
- `FilterPills.native.tsx`:
  - Return `null` if `options.length === 0`.
  - Horizontal `ScrollView` with `Pressable` chips using `makeStyles((colors) => ...)` matching `StashCatalogScreen` tokens (`colors.accent`, `colors.canvas`, `colors.panel`, `colors.borderSubtle`, `colors.textSecondary`, `minHeight: 44`).
- Export `FilterPills.types`, `FilterPills` in `packages/ui/src/index.web.ts` and `packages/ui/src/index.native.ts`.

- [ ] **Step 5: Run targeted tests to verify they pass**

Run: `npx vitest run packages/ui/src/filter-pills/FilterPills.web.test.tsx packages/ui/src/filter-pills/FilterPills.native.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/filter-pills packages/ui/src/index.web.ts packages/ui/src/index.native.ts
git commit -m "feat(ui): add FilterPills component with keyboard parity"
```

---

### Task 2: Add Arrow-Key Navigation to `SegmentedControl.web.tsx` & `'success'` Variant to `MetricTile`

**Files:**
- Modify: `packages/ui/src/segmented-control/SegmentedControl.web.tsx`
- Modify: `packages/ui/src/segmented-control/SegmentedControl.web.test.tsx`
- Modify: `packages/ui/src/metric-tile/MetricTile.types.ts`
- Modify: `packages/ui/src/metric-tile/MetricTile.web.tsx`
- Modify: `packages/ui/src/metric-tile/MetricTile.native.tsx`
- Modify: `packages/ui/src/metric-tile/MetricTile.web.test.tsx`

**Interfaces:**
- Consumes: `SegmentedControl`, `MetricTile`
- Produces:
  - `SegmentedControl` web arrow-key (`ArrowLeft`, `ArrowRight`, `Home`, `End`) focus navigation
  - `MetricTileProps.variant?: 'default' | 'accent' | 'muted' | 'success'`

- [ ] **Step 1: Add failing tests in `SegmentedControl.web.test.tsx` and `MetricTile.web.test.tsx`**

- In `SegmentedControl.web.test.tsx`: test `ArrowRight` from first option focuses second option, `ArrowRight` from last wraps to first, `ArrowLeft` from first wraps to last, `Home` focuses first, `End` focuses last (with 3-option `role="tablist"` example).
- In `MetricTile.web.test.tsx`: test `variant="success"` applies `text-status-success` class.

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `npx vitest run packages/ui/src/segmented-control/SegmentedControl.web.test.tsx packages/ui/src/metric-tile/MetricTile.web.test.tsx`
Expected: FAIL on new arrow-key and `text-status-success` assertions.

- [ ] **Step 3: Implement keyboard navigation in `SegmentedControl.web.tsx` and `'success'` variant in `MetricTile`**

- `SegmentedControl.web.tsx`: add `buttonRefs = useRef<(HTMLButtonElement | null)[]>([])` and `handleKeyDown(e, index)` handling `ArrowRight`, `ArrowLeft`, `Home`, `End` with wrap-around focus. Also add `active:scale-[0.98]` or ensure `focus-visible:ring-2 focus-visible:ring-accent` has clean contrast.
- `MetricTile.types.ts`: add `'success'` to `variant` union.
- `MetricTile.web.tsx`: map `success: 'text-status-success'`.
- `MetricTile.native.tsx`: add `successValue: { color: colors.statusSuccess }` and apply when `variant === 'success'`.

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `npx vitest run packages/ui/src/segmented-control/SegmentedControl.web.test.tsx packages/ui/src/metric-tile/MetricTile.web.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/segmented-control packages/ui/src/metric-tile
git commit -m "feat(ui): add arrow-key focus to SegmentedControl and success variant to MetricTile"
```

---

### Task 3: Create Web `CellarSummaryBar` Component

**Files:**
- Create: `apps/web/src/features/stash/CellarSummaryBar.tsx`
- Test: `apps/web/src/features/stash/CellarSummaryBar.test.tsx`

**Interfaces:**
- Consumes: `MetricTile` from `@brewlog/ui`
- Produces:
  - `CellarSummaryBarProps` (`{ totalBags: number; peakBags: number; totalRemainingGrams: number }`)
  - `CellarSummaryBar: React.FC<CellarSummaryBarProps>`

- [ ] **Step 1: Write failing unit tests in `apps/web/src/features/stash/CellarSummaryBar.test.tsx`**

Test cases:
- Renders `ACTIVE BAGS`, `AT PEAK`, and `TOTAL STASH` labels and values (`totalBags`, `peakBags`, `totalRemainingGrams` + `g` unit).
- Uses `'success'` (`text-status-success`) styling on `AT PEAK` when `peakBags > 0`, and `'default'` (`text-foreground`) when `peakBags === 0`.
- Renders full hairline border (`border border-border-subtle`, `rounded-xl`) with no one-sided colored border classes (`border-l-`, `border-r-`, `border-t-`, `border-b-`).
- Sets accessible region label (`role="region"`, `aria-label` summarizing bags, peak count, and total grams).

- [ ] **Step 2: Run targeted test to verify it fails**

Run: `npx vitest run apps/web/src/features/stash/CellarSummaryBar.test.tsx`
Expected: FAIL (`./CellarSummaryBar` not found).

- [ ] **Step 3: Implement `apps/web/src/features/stash/CellarSummaryBar.tsx`**

Render a `rounded-xl bg-panel border border-border-subtle p-4` container with `role="region"` and descriptive `aria-label`. Inside, render a `grid grid-cols-3 divide-x divide-border-subtle` layout with three centered columns wrapping `<MetricTile size="sm" ... />` for `ACTIVE BAGS`, `AT PEAK` (`variant={peakBags > 0 ? 'success' : 'default'}`), and `TOTAL STASH` (`unit="g"`).

- [ ] **Step 4: Run targeted test to verify it passes**

Run: `npx vitest run apps/web/src/features/stash/CellarSummaryBar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/stash/CellarSummaryBar.tsx apps/web/src/features/stash/CellarSummaryBar.test.tsx
git commit -m "feat(web): add CellarSummaryBar component for Stash metrics"
```

---

### Task 4: Align `StashView.tsx` with Shelves, Dynamic Process `FilterPills`, `CellarSummaryBar`, and Archive Toggle

**Files:**
- Modify: `apps/web/src/features/stash/StashView.tsx`
- Modify: `apps/web/src/features/stash/StashView.test.tsx`

**Interfaces:**
- Consumes: `SegmentedControl`, `FilterPills` from `@brewlog/ui`; `CellarSummaryBar` from `./CellarSummaryBar`
- Produces:
  - `ShelfType = 'active' | 'frozen' | 'archived'`
  - `ProcessFilter = 'all' | 'washed' | 'natural' | 'honey' | 'anaerobic'`
  - Shelf partitioning (`activeBeans`, `frozenBeans`, `archivedBeans`) + dynamic process pill filtering + modal `#add-bean-is-archived` toggle in `StashView`

- [ ] **Step 1: Update & expand `apps/web/src/features/stash/StashView.test.tsx` (red tests)**

Read the remainder of `StashView.test.tsx` (lines 450-751) before editing so all existing test coverage is preserved cleanly.
Updates to existing tests:
- Line 76 (`renders header, Add Coffee Bean button, search input, and process filter`): replace `expect(screen.getByRole('combobox')).toBeDefined()` with assertions checking `role="tablist"` shelf selector (`Active Cellar`, `Freezer Vault`, `Archived`), `CellarSummaryBar`, and process `FilterPills` (`All`, `Washed`, `Natural`, `Anaerobic`).
- Line 171 (`filters bean cards by process method`): click the `Natural` pill button instead of changing `<select>` (`combobox`), and assert `Classic House Blend` is shown while others are filtered out; also verify `Anaerobic` pill matches `anaerobic-natural`.
- Line 299 (`renders frozen badge and frozen resting status for frozen beans`): click the `Freezer Vault` shelf tab before asserting `FROZEN` and `Frozen at Day 9`.

New unit tests to add (covering spec + Review Focus):
- `CellarSummaryBar` renders `ACTIVE BAGS`, `AT PEAK`, and `TOTAL STASH` strictly from active beans (`!isArchived && !isFrozen`), excluding frozen and archived beans and falling back to `bagWeightGrams ?? 0` (preserving `0g`).
- Shelf switching partitions beans accurately into `Active Cellar`, `Freezer Vault`, and `Archived`, and renders shelf-specific empty states (`Cellar is Empty`, `Freezer Vault is Empty`, `No Archived Coffees`, and search/filter empty state with clear action).
- Dynamic process pills only render options present on the active shelf (`Honey` hidden when no honey beans exist on that shelf); a shelf with only `carbonic-maceration` or `undefined` process hides `FilterPills` and still displays those beans under `All`.
- Switching shelves when the active `selectedProcess` is absent on the destination shelf resets `selectedProcess` to `'all'` so beans on the new shelf are not hidden.
- Arrow-key navigation works on both the shelf `SegmentedControl` and process `FilterPills`.
- Edit Bean modal displays `Archive Bean` checkbox (`#add-bean-is-archived`) only when editing an existing bean (not in Add mode), toggles `isArchived` on save, and moves the bean between shelves.

- [ ] **Step 2: Run `StashView.test.tsx` to verify new/updated assertions fail**

Run: `npx vitest run apps/web/src/features/stash/StashView.test.tsx`
Expected: FAIL on missing shelf tabs, summary bar, process pills, and archive toggle.

- [ ] **Step 3: Implement shelves, `CellarSummaryBar`, dynamic `FilterPills`, search clear, empty states, and Archive toggle in `StashView.tsx`**

Key details:
- Define `ShelfType`, `ProcessFilter`, `SHELVES`, `MOBILE_PROCESS_FILTERS`, and `matchesProcessFilter(bean, filter)` (`proc === filter || proc.includes(filter)`).
- Partition `beans` via `useMemo` into `activeBeans`, `frozenBeans`, `archivedBeans`.
- Compute `summaryMetrics` from `activeBeans` only (`totalBags`, `peakBags`, `totalRemainingGrams`).
- Compute `currentShelfBeans` from `activeShelf`.
- Derive `availableProcessOptions` from `currentShelfBeans` (`All` + matching items from `MOBILE_PROCESS_FILTERS`).
- `useEffect` (or shelf-change handler + effect when `beans` changes): if `selectedProcess !== 'all'` and `!availableProcessOptions.some((o) => o.value === selectedProcess)`, set `selectedProcess('all')`.
- Expand search filter in `StashView.tsx` to also match `farm`, `variety`, and `flavorNotes` (matching mobile parity).
- Render `<CellarSummaryBar ... />` below the header row.
- Render Search input with clear button (`h-8 w-8`, `aria-label="Clear search"` when `searchQuery.length > 0`).
- Render `<SegmentedControl<ShelfType> role="tablist" size="sm" fullWidth value={activeShelf} onChange={setActiveShelf} options={...} ariaLabel="Shelf selector" />`.
- Conditionally render `<FilterPills<ProcessFilter> size="sm" value={selectedProcess} onChange={setSelectedProcess} options={availableProcessOptions} ariaLabel="Filter by process method" />` when `availableProcessOptions.length > 1`.
- Render the 4 shelf/search empty states (Lucide icons only, zero emoji, full hairline border `border border-dashed border-border-subtle rounded-xl`).
- In the Edit Bean modal (`editingBean !== null`), render `#add-bean-is-archived` toggle row below Freezer Vault Storage and persist `isArchived` in `beanData`. Keep `#add-bean-process` and `#add-bean-roast-level` `<select>`s intact.

- [ ] **Step 4: Run `StashView.test.tsx` to verify all tests pass**

Run: `npx vitest run apps/web/src/features/stash/StashView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/stash/StashView.tsx apps/web/src/features/stash/StashView.test.tsx
git commit -m "feat(web): align StashView with mobile shelves, dynamic process pills, summary bar, and archiving"
```

---

### Task 5: Update and Expand Web Playwright E2E Tests

**Files:**
- Modify: `apps/web/e2e/corner-radius-hierarchy.spec.ts`
- Modify: `apps/web/e2e/context-features.spec.ts`

- [ ] **Step 1: Update `apps/web/e2e/corner-radius-hierarchy.spec.ts` Stash assertions**

Replace `page.getByRole("combobox")` in the Stash test with checks for:
- Shelf `SegmentedControl` track (`RADIUS_LG` = `8px`) and thumb (`RADIUS_MD` = `6px`)
- Process `FilterPills` pill button (`RADIUS_LG` = `8px`)
- `CellarSummaryBar` container (`RADIUS_XL` = `12px`)

- [ ] **Step 2: Expand `apps/web/e2e/context-features.spec.ts` Stash coverage**

Add E2E steps verifying:
- `CellarSummaryBar` displays active metrics (`ACTIVE BAGS`, `AT PEAK`, `TOTAL STASH`).
- Process filter pills filter the active bean list (e.g., adding a `Washed` bean shows `All`, `Washed`, `Anaerobic` pills and filters accurately).
- Switching to `Freezer Vault` and `Archived` shelves displays shelf-specific empty states, and archiving a bean via Edit modal moves it to the `Archived` shelf.

- [ ] **Step 3: Run targeted E2E specs to verify they pass**

Run: `npm run test:e2e --workspace=@brewlog/web -- e2e/corner-radius-hierarchy.spec.ts e2e/button-sizing-tokens.spec.ts e2e/context-features.spec.ts`
Expected: PASS (all buttons on `/stash` in `[32, 40, 48]px`, corner radii valid, shelf/filter/archive flows green).

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/corner-radius-hierarchy.spec.ts apps/web/e2e/context-features.spec.ts
git commit -m "test(e2e): update Stash design token and shelf/filter E2E coverage"
```

---

### Task 6: Documentation Protocol, Follow-up Issue Creation & Full Verification Gates

**Files:**
- Modify: `README.md`
- Modify: `docs/ROADMAP.md`
- Create: `docs/devlogs/2026-11-16-issue-65-web-stash-filters-and-shelves.md`

- [ ] **Step 1: Create follow-up GitHub issue for refactoring existing web pill bars to `FilterPills`**

Run `gh issue create` (with `BypassSandbox: true` if network requires it) to file an issue titled `"Refactor ReviewsView and RecipeCatalogList filter pills to use @brewlog/ui FilterPills"`, referencing `apps/web/src/features/reviews/ReviewsView.tsx` and `apps/web/src/features/recipes/RecipeCatalogList.tsx` and linking back to issue #65. (If `gh` is unauthenticated/unavailable, report the exact blocker and provide the ready-to-run command/body.)

- [ ] **Step 2: Update `README.md`, `docs/ROADMAP.md`, and write `docs/devlogs/2026-11-16-issue-65-web-stash-filters-and-shelves.md`**

Per repository `AGENTS.md`:
- Update `README.md` Key Features to mention web Stash shelves, summary metrics, archiving, and `@brewlog/ui` `FilterPills`.
- Update `docs/ROADMAP.md` if any Stash parity items apply, referencing issue #65 and the new devlog.
- Write `docs/devlogs/2026-11-16-issue-65-web-stash-filters-and-shelves.md` (zero emoji) covering summary, deliverables (`FilterPills`, `SegmentedControl` keyboard parity, `CellarSummaryBar`, `StashView`), accessibility/design-doctrine safeguards, and verification output.

- [ ] **Step 3: Run full verification gates (ready to commit & push)**

Run:
1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. `npm run test:e2e`
5. Design doctrine checks (`check_no_emoji.py`, `lint_hardcodes.py`) on changed `packages/ui/src/filter-pills`, `packages/ui/src/segmented-control`, `packages/ui/src/metric-tile`, and `apps/web/src/features/stash`.
6. Visual verification via Playwright screenshots on `/stash` in both `tactile-dark` and `studio-light` themes across desktop and mobile viewports (confirming clicking shelf tabs and process pills visually updates state with no overflow or contrast glitches).

- [ ] **Step 4: Commit documentation & final verification**

```bash
git add README.md docs/ROADMAP.md docs/devlogs/2026-11-16-issue-65-web-stash-filters-and-shelves.md
git commit -m "docs: document issue #65 web Stash filters, shelves, and devlog"
```
