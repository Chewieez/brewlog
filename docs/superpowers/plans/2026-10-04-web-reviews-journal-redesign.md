# Web Reviews & Cupping Journal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the web Reviews experience into an artisan Master-Detail Cupping Journal with rich read/inspect mode, in-place editing, and comprehensive UI/typography polish.

**Architecture:** Master-detail split screen (38% left feed, 62% right single column). The left pane provides instant search, brew method filter pills, and tactile cupping cards with SCA score tiers and star ratings. The right pane operates in two in-place modes: Sensory Profile Inspector (Read Mode with hero score, highlighted flavor wheel, 10-attribute breakdown bars, brew telemetry, and notes) and Review Editor (Create/Edit Mode with synchronized single-column layout, neutral brew time, descriptors tab first, and clean typography).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Vitest, Testing Library, Chrome DevTools MCP.

**Spec:** [`docs/superpowers/specs/2026-10-04-web-reviews-journal-redesign.md`](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-10-04-web-reviews-journal-redesign.md)

## Global Constraints
- Strictly avoid `font-mono` on natural language strings (flavor tags, grinder descriptions, helper text, button controls).
- Use Outfit (`font-sans`) with `tabular-nums` for numerical scores and slider values.
- Actual brew time input must use neutral `text-zinc-100` (never orange `text-accent`).
- Score fraction badge must remain on a single horizontal row (`whitespace-nowrap`).
- Sensory panel must default to `Descriptors (Tag List)` tab first, `Wheel` tab second.
- Single-column vertical flow in right pane—no nested side-by-side columns causing height mismatches or artificial 440px scroll cutoffs.
- Follow user testing rule: do not run broad or full test suites prematurely; run only targeted tests for the component being touched.

---

### Task 1: Add Update & Delete Capabilities to Reviews Store & Context

**Files:**
- Create: `apps/web/src/features/reviews/useReviews.test.ts`
- Modify: `apps/web/src/features/reviews/useReviews.ts`
- Modify: `apps/web/src/layouts/RootLayout.tsx`
- Modify: `apps/web/src/routes/ReviewsRoute.tsx`

**Interfaces:**
- Produces:
  ```typescript
  updateReview: (id: string, updates: Partial<TastingLog>) => Promise<TastingLog | void>;
  deleteReview: (id: string) => Promise<void>;
  ```
  in `useReviews`, and `onUpdateTastingLog`, `onDeleteTastingLog` in `useRootOutletContext()`.

- [ ] **Step 1: Write unit tests for `useReviews` CRUD**
  Create `apps/web/src/features/reviews/useReviews.test.ts` testing `addReview`, `updateReview` (local fallback and state update), and `deleteReview` (local fallback removing item).

- [ ] **Step 2: Run targeted test to verify failure**
  ```bash
  npx vitest run apps/web/src/features/reviews/useReviews.test.ts
  ```

- [ ] **Step 3: Implement `updateReview` and `deleteReview` in `useReviews.ts`**
  - Add `updateTastingLog` / `updateReview` method.
  - Add `deleteTastingLog` / `deleteReview` method.
  - Export them in `UseReviewsReturn`.

- [ ] **Step 4: Propagate through `RootLayout.tsx` and `ReviewsRoute.tsx`**
  - Expose `onUpdateTastingLog` and `onDeleteTastingLog` in `RootOutletContext`.
  - Pass handlers to `<ReviewsView />` in `ReviewsRoute.tsx`.

- [ ] **Step 5: Run targeted test to confirm passing**
  ```bash
  npx vitest run apps/web/src/features/reviews/useReviews.test.ts
  ```

- [ ] **Step 6: Commit Task 1**
  ```bash
  git add apps/web/src/features/reviews/useReviews.ts apps/web/src/features/reviews/useReviews.test.ts apps/web/src/layouts/RootLayout.tsx apps/web/src/routes/ReviewsRoute.tsx
  git commit -m "feat(web): add update and delete tasting log handlers"
  ```

---

### Task 2: Create Sensory Profile Inspector (`ReviewDetailPane.tsx`)

**Files:**
- Create: `apps/web/src/features/reviews/ReviewDetailPane.tsx`
- Create: `apps/web/src/features/reviews/ReviewDetailPane.test.tsx`

**Interfaces:**
- Consumes: `TastingLog`, `Bean`, `Equipment`, `ScaFlavorWheelSvg`
- Produces: `ReviewDetailPane: React.FC<ReviewDetailPaneProps>`
  ```typescript
  export interface ReviewDetailPaneProps {
    log: TastingLog;
    beans?: Bean[];
    equipment?: Equipment[];
    onEdit: (log: TastingLog) => void;
    onDelete: (log: TastingLog) => void;
    onBrewAgain?: (log: TastingLog) => void;
  }
  ```

- [ ] **Step 1: Write component test for `ReviewDetailPane`**
  Create `apps/web/src/features/reviews/ReviewDetailPane.test.tsx` testing:
  - Renders coffee name, roaster, date, and method badge.
  - Displays hero SCA score with classification tier badge in single row (`whitespace-nowrap`).
  - Renders 10-attribute score breakdown meter bars.
  - Renders brew telemetry (dose, water, ratio, neutral brew time, equipment).
  - Renders flavor wheel / descriptors toggle defaulting to `Descriptors` first.
  - Calls `onEdit`, `onDelete`, and `onBrewAgain` when clicked.

- [ ] **Step 2: Run targeted test to verify failure**
  ```bash
  npx vitest run apps/web/src/features/reviews/ReviewDetailPane.test.tsx
  ```

- [ ] **Step 3: Implement `ReviewDetailPane.tsx`**
  - Single-column vertical structure.
  - Clean hero cup score banner with `whitespace-nowrap`.
  - Sensory Descriptors / Flavor Wheel toggle (Descriptors tab first, Wheel tab second).
  - 10-attribute score horizontal progress bars using Outfit `tabular-nums`.
  - Inset hardware panel for brew specs (neutral brew time text `text-zinc-100`, equipment in `font-sans`).
  - Cupper notes in styled quote block.
  - Confirmation modal for delete action.

- [ ] **Step 4: Run targeted test to confirm passing**
  ```bash
  npx vitest run apps/web/src/features/reviews/ReviewDetailPane.test.tsx
  ```

- [ ] **Step 5: Commit Task 2**
  ```bash
  git add apps/web/src/features/reviews/ReviewDetailPane.tsx apps/web/src/features/reviews/ReviewDetailPane.test.tsx
  git commit -m "feat(web): create sensory profile inspector component"
  ```

---

### Task 3: Redesign `ReviewsView.tsx` into Master-Detail Cupping Journal

**Files:**
- Modify: `apps/web/src/features/reviews/ReviewsView.tsx`
- Modify: `apps/web/src/features/reviews/ScaFlavorWheelSvg.tsx`

**Interfaces:**
- Consumes: `ReviewDetailPane`, `ScaFlavorWheelSvg`, `TastingLog`, `Bean`, `Equipment`
- Produces: `ReviewsView: React.FC<ReviewsViewProps>` with updated props:
  ```typescript
  export interface ReviewsViewProps {
    logs: TastingLog[];
    beans?: Bean[];
    equipment?: Equipment[];
    pendingBrewSession?: PendingBrewSession | null;
    onClearPendingSession?: () => void;
    onAddTastingLog: (log: Omit<TastingLog, 'id' | 'createdAt'>) => Promise<any> | void;
    onUpdateTastingLog?: (id: string, updates: Partial<TastingLog>) => Promise<any> | void;
    onDeleteTastingLog?: (id: string) => Promise<any> | void;
    onBrewAgain?: (log: TastingLog) => void;
  }
  ```

- [ ] **Step 1: Update `ScaFlavorWheelSvg.tsx` typography**
  - Change lowercase instruction text `<p>` and `<kbd>` tags from `font-mono` to `font-sans`.
  - Ensure labels and micro-text use clean sans styling where appropriate.

- [ ] **Step 2: Restructure `ReviewsView.tsx` Layout**
  - Implement top page header with `Reviews & Cupping Journal` title and prominent `+ LOG REVIEW` button.
  - Setup 2-column desktop grid: Left feed (38%), Right detail/editor (62%).
  - Left Feed:
    - Search input (bean name, roaster, flavor tags, notes).
    - Brew method filter pills (`All`, `V60`, `AeroPress`, `Chemex`, `Espresso`, `French Press`, `Kalita Wave`, `Other`).
    - Review cards with star rating, SCA score badge with tier coloring, coffee name in Outfit, flavor tags in `font-sans text-xs`, and active indicator.
    - Empty state when no reviews match filters.
  - Right Pane Mode Management (`mode: 'view' | 'create' | 'edit'`):
    - `'view'`: Renders `ReviewDetailPane` for `selectedLogId` (or friendly empty state if no logs exist).
    - `'create'`: Renders single-column Review Editor with `Save Review` and `Cancel`. Automatically active if `pendingBrewSession` exists.
    - `'edit'`: Renders single-column Review Editor with `Save Changes` and `Cancel`, pre-populated with the active review's parameters.
  - Review Editor Polish:
    - Actual brew time input: `text-zinc-100` (neutral, no orange `text-accent`).
    - Score badge in editor header: `whitespace-nowrap flex items-center`.
    - Clear button: Renamed to `Clear` (no `(0)`).
    - Sensory panel: Segmented toggle with **Descriptors (Tag List)** first, **Wheel** second. Full natural height (no `max-h-[440px]` scroll traps).
    - Monospace removed from descriptor tags, grinder names, and slider numbers (use Outfit `tabular-nums`).

- [ ] **Step 3: Wire Timer Integration (`onBrewAgain`)**
  - Connect `onBrewAgain` to transfer recipe and bean to `TimerView` via root context.

- [ ] **Step 4: Commit Task 3**
  ```bash
  git add apps/web/src/features/reviews/ReviewsView.tsx apps/web/src/features/reviews/ScaFlavorWheelSvg.tsx
  git commit -m "feat(web): implement master-detail cupping journal layout"
  ```

---

### Task 4: Update & Expand `ReviewsView.test.tsx`

**Files:**
- Modify: `apps/web/src/features/reviews/ReviewsView.test.tsx`

- [ ] **Step 1: Update existing tests to match Master-Detail layout**
  - Update tests to account for master cards and detail inspector.
  - Verify `+ LOG REVIEW` toggles editor into create mode.
  - Verify selecting a card from master feed updates the detail pane.
  - Verify editing a review pre-populates the editor and triggers `onUpdateTastingLog`.
  - Verify deleting a review triggers `onDeleteTastingLog`.
  - Verify search query filters the card list.
  - Verify method filter buttons filter the card list.
  - Verify typography assertions (no `font-mono` on flavor tags or equipment text, `Clear` button text).
  - Verify actual brew time input has neutral styling.

- [ ] **Step 2: Run targeted test to confirm passing**
  ```bash
  npx vitest run apps/web/src/features/reviews/ReviewsView.test.tsx
  ```

- [ ] **Step 3: Commit Task 4**
  ```bash
  git add apps/web/src/features/reviews/ReviewsView.test.tsx
  git commit -m "test(web): update reviews view tests for master-detail journal"
  ```

---

### Task 5: Browser Verification via Chrome DevTools MCP

- [ ] **Step 1: Inspect `http://localhost:3000/reviews` in Chrome**
  - Use `take_screenshot` via `chrome-devtools-mcp` to capture the desktop Master-Detail layout.
  - Verify card styling, active state, score tier colors, and typography.
  - Click `+ LOG REVIEW` and verify in-place transition to single-column editor.
  - Verify Descriptors tab is active by default.
  - Verify neutral text color on brew time and clean "Clear" button.
  - Click a card and verify transition back to Sensory Profile Inspector.
  - Click `Edit Review` and verify data pre-population.

- [ ] **Step 2: Final commit & summary**
  - Ensure working tree is clean.
