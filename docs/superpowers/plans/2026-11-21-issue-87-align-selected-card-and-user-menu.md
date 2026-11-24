# Issue #87: Align Selected Recipe/Review Card Styling & Account Dropdown Link Font Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify selected/unselected card styling across `RecipeCatalogList` and `ReviewCard` using a full copper hairline border without single-sided stripes, and align `UserMenu` dropdown typography to `font-sans` mixed-case items matching `Header`.

**Architecture:** Both master-detail list cards (`RecipeCatalogList.tsx` and `ReviewCard.tsx`, extracted from `ReviewsView.tsx` in PR #96) adopt an identical Tailwind token pair for selected (`bg-panel-recessed border-accent shadow-sm`) and unselected (`bg-panel border-border-subtle hover:border-border-active hover:bg-panel-recessed/40`) states while exposing selection semantically via `aria-current` / `aria-pressed`. `UserMenu.tsx` switches its open dropdown container and `Settings` / `Sign Out` items from `font-mono uppercase` to `font-sans text-xs lg:text-sm font-medium` with `h-8` height and semantic `status-error` hover tokens.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 (`@brewlog/ui` tokens), React Router, Vitest + Testing Library, Playwright.

**Spec:** [2026-11-21-issue-87-align-selected-card-and-user-menu-design.md](../specs/2026-11-21-issue-87-align-selected-card-and-user-menu-design.md)

## Global Constraints

- **No one-sided colored borders:** Remove `<div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-accent rounded-r" />` from `RecipeCatalogList.tsx` and keep `ReviewCard.tsx` free of `border-l-4` / single-sided accent bars.
- **Button sizing tokens (`button-sizing-tokens.spec.ts`):** All visible `<button>` elements must measure `32px` (`h-8`), `40px` (`h-10`), or `48px` (`h-12`); dropdown action items use `h-8`.
- **Corner radius hierarchy (`corner-radius-hierarchy.spec.ts`):** Catalog cards and dropdown panel remain `rounded-xl` (`12px`); dropdown items remain `rounded-lg` (`8px`).
- **Semantic tokens only:** Replace hardcoded `group-hover:text-red-400` in `UserMenu.tsx` with `group-hover:text-status-error`.
- **Scope boundary:** Keep the unauthenticated `SIGN IN` button in `UserMenu.tsx` unchanged. (Post-implementation polish amended scope to also align the signed-in `UserMenu` trigger font, mobile `ProfileHeaderButton` initials font, `Header` nav count badges, and Web/Mobile Settings headings & sync copy; see Spec `Scope Amendments`.)

## Review Focus

- Selected recipe card in `RecipeCatalogList` uses `bg-panel-recessed border-accent shadow-sm`, omits the left `w-1 bg-accent` bar, and sets `aria-current="page"` on its overlay `<Link>`.
- Unselected cards in both `RecipeCatalogList` and `ReviewCard` share `bg-panel border-border-subtle hover:border-border-active hover:bg-panel-recessed/40` without `border-accent` or `border-l-4`.
- Selected `ReviewCard` sets `aria-pressed` (`"true"` / `"false"`), renders `shadow-sm` without `border-l-4`, and `ReviewsView` transfers `aria-pressed="true"` when clicking another card and clears it when entering `Log New Brew Review` create mode (`mode !== 'view'`).
- Open `UserMenu` dropdown renders `Settings` (`<Link to="/settings">`) and `Sign Out` (`<button type="button">`) in `font-sans` mixed-case (`h-8`, `rounded-lg`) without `font-mono` or `uppercase`, and closes + calls `signOut()` when `Sign Out` is clicked.
- Unauthenticated `UserMenu` (`SIGN IN` button and icon-only Settings link) remains unchanged when `user` is `null`.

---

### Task 1: Unify Selected & Unselected Card Styling in `RecipeCatalogList.tsx`

**Files:**
- Modify: `apps/web/src/features/recipes/RecipeCatalogList.tsx:170-196`
- Test: `apps/web/src/features/recipes/RecipeCatalogList.test.tsx`

**Interfaces:**
- Uses existing `RecipeCatalogListProps.activeRecipeId?: string` in `apps/web/src/features/recipes/RecipeCatalogList.tsx`.

- [ ] **Step 1: Write the failing test in `apps/web/src/features/recipes/RecipeCatalogList.test.tsx`**

Add a test verifying the selected card (`activeRecipeId === DEFAULT_PRESET_RECIPES[0].id`) has `bg-panel-recessed`, `border-accent`, `shadow-sm`, no inner `.w-1.bg-accent` element, and `<Link aria-current="page">`, while the second (unselected) card has `bg-panel`, `border-border-subtle`, `hover:bg-panel-recessed/40`, and no `aria-current`:

```tsx
  it('styles the selected recipe card with a full hairline accent border and no left stripe', () => {
    const activeId = DEFAULT_PRESET_RECIPES[0].id;
    render(
      <MemoryRouter>
        <RecipeCatalogList
          recipes={DEFAULT_PRESET_RECIPES}
          activeRecipeId={activeId}
          selectedMethodFilter="all"
          onSelectMethodFilter={vi.fn()}
        />
      </MemoryRouter>
    );

    const cards = screen.getAllByTestId('recipe-catalog-card');
    const selectedCard = cards[0];
    const unselectedCard = cards[1];

    expect(selectedCard.className).toContain('bg-panel-recessed');
    expect(selectedCard.className).toContain('border-accent');
    expect(selectedCard.className).toContain('shadow-sm');
    expect(selectedCard.className).not.toContain('border-l-4');
    expect(selectedCard.querySelector('.bg-accent.w-1')).toBeNull();

    const selectedLink = within(selectedCard).getByRole('link');
    expect(selectedLink.getAttribute('aria-current')).toBe('page');

    expect(unselectedCard.className).toContain('bg-panel');
    expect(unselectedCard.className).toContain('border-border-subtle');
    expect(unselectedCard.className).toContain('hover:bg-panel-recessed/40');
    expect(unselectedCard.className).not.toContain('border-accent');

    const unselectedLink = within(unselectedCard).getByRole('link');
    expect(unselectedLink.getAttribute('aria-current')).toBeNull();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `apps/web`:
`npx vitest run src/features/recipes/RecipeCatalogList.test.tsx`
Expected: FAIL because `selectedCard.className` has `border-border-active` (not `border-accent` / `shadow-sm`), `.bg-accent.w-1` is present, and `aria-current` is `null`.

- [ ] **Step 3: Update `apps/web/src/features/recipes/RecipeCatalogList.tsx:178-195`**

- Change the selected branch of `recipe-catalog-card` from `'bg-panel-recessed border-border-active'` to `'bg-panel-recessed border-accent shadow-sm'`, keeping `'bg-panel border-border-subtle hover:border-border-active hover:bg-panel-recessed/40'` for unselected cards.
- Delete the `{isSelected && (<div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-accent rounded-r" />)}` block.
- Add `aria-current={isSelected ? 'page' : undefined}` to the overlay `<Link>`.

- [ ] **Step 4: Run the test to verify it passes**

Run from `apps/web`:
`npx vitest run src/features/recipes/RecipeCatalogList.test.tsx`
Expected: PASS (all tests in `RecipeCatalogList.test.tsx` pass).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/recipes/RecipeCatalogList.tsx apps/web/src/features/recipes/RecipeCatalogList.test.tsx
git commit -m "style(web): unify selected recipe card border and remove left accent strip"
```

---

### Task 2: Align `ReviewCard.tsx` Unselected Hover & `aria-pressed` Semantics

**Files:**
- Modify: `apps/web/src/features/reviews/ReviewCard.tsx:43-60`
- Test: `apps/web/src/features/reviews/ReviewCard.test.tsx`, `apps/web/src/features/reviews/ReviewsView.test.tsx`

**Interfaces:**
- Uses `ReviewCardProps.isSelected: boolean` in `apps/web/src/features/reviews/ReviewCard.tsx`, passed by `apps/web/src/features/reviews/ReviewsView.tsx:669-678`.

- [ ] **Step 1: Write the failing tests in `ReviewCard.test.tsx` and `ReviewsView.test.tsx`**

In `apps/web/src/features/reviews/ReviewCard.test.tsx`, assert `aria-pressed="false"` + `hover:bg-panel-recessed/40` when `isSelected={false}` and `aria-pressed="true"` + `shadow-sm` + absence of `border-l-4` / `border-l-accent` when `isSelected={true}`:

```tsx
    // In selected state test:
    expect(card.getAttribute('aria-pressed')).toBe('true');
    expect(card.className).toContain('shadow-sm');
    expect(card.className).not.toContain('border-l-4');
    expect(card.className).not.toContain('border-l-accent');

    // In unselected state test:
    const unselectedCard = screen.getByRole('button');
    expect(unselectedCard.getAttribute('aria-pressed')).toBe('false');
    expect(unselectedCard.className).toContain('hover:bg-panel-recessed/40');
    expect(unselectedCard.className).not.toContain('border-accent');
```

In `apps/web/src/features/reviews/ReviewsView.test.tsx`, add a test verifying `aria-pressed` switches when clicking another card in `master-feed` and clears when entering `LOG REVIEW` create mode:

```tsx
  it('toggles aria-pressed and selected review card styling when switching cards or entering create mode', () => {
    render(
      <ReviewsView
        logs={[sampleLog1, sampleLog2]}
        beans={INITIAL_BEANS}
        equipment={mockEquipment}
        onAddTastingLog={vi.fn()}
      />
    );

    const masterFeed = screen.getByTestId('master-feed');
    const card1 = within(masterFeed).getByText('Worka Sakaro').closest('[role="button"]')!;
    const card2 = within(masterFeed).getByText('El Paraiso').closest('[role="button"]')!;

    expect(card1.getAttribute('aria-pressed')).toBe('true');
    expect(card2.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(card2);
    expect(card1.getAttribute('aria-pressed')).toBe('false');
    expect(card2.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /LOG REVIEW/i }));
    expect(card2.getAttribute('aria-pressed')).toBe('false');
    expect(card2.className).not.toContain('border-accent');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run from `apps/web`:
`npx vitest run src/features/reviews/ReviewCard.test.tsx src/features/reviews/ReviewsView.test.tsx`
Expected: FAIL because `aria-pressed` is `null` and `hover:bg-panel-recessed/40` is missing on `ReviewCard.tsx`.

- [ ] **Step 3: Update `apps/web/src/features/reviews/ReviewCard.tsx:43-60`**

- Add `aria-pressed={isSelected}` to the `<div role="button">` element.
- Update the unselected branch from `'bg-panel border-border-subtle hover:border-border-active'` to `'bg-panel border-border-subtle hover:border-border-active hover:bg-panel-recessed/40'`, keeping `'bg-panel-recessed border-accent shadow-sm'` for selected cards.

- [ ] **Step 4: Run the tests to verify they pass**

Run from `apps/web`:
`npx vitest run src/features/reviews/ReviewCard.test.tsx src/features/reviews/ReviewsView.test.tsx`
Expected: PASS (all tests in `ReviewCard.test.tsx` and `ReviewsView.test.tsx` pass).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/reviews/ReviewCard.tsx apps/web/src/features/reviews/ReviewCard.test.tsx apps/web/src/features/reviews/ReviewsView.test.tsx
git commit -m "style(web): align ReviewCard unselected hover state and aria-pressed semantics"
```

---

### Task 3: Update Account Dropdown Typography in `UserMenu.tsx`

**Files:**
- Modify: `apps/web/src/features/auth/UserMenu.tsx:59-89`
- Create: `apps/web/src/features/auth/UserMenu.test.tsx`

**Interfaces:**
- Consumes `useAuth()` from `./AuthContext` (`user`, `signOut`) and `UserMenuProps` (`onOpenAuthModal: () => void`).

- [ ] **Step 1: Write the failing test in `apps/web/src/features/auth/UserMenu.test.tsx`**

Create `UserMenu.test.tsx` (with `@vitest-environment jsdom`, `MemoryRouter`, and mocked `./AuthContext` matching `AuthModal.test.tsx`) covering:
1. Unauthenticated state (`user: null`) renders `Settings` link (`aria-label="Settings"`) and `SIGN IN` button triggering `onOpenAuthModal`.
2. Signed-in dropdown renders `displayName` and `user.email` inside a `font-sans` container (no `font-mono` on the dropdown panel).
3. `Settings` `<Link to="/settings">` and `Sign Out` `<button type="button">` render with mixed-case text (`Settings`, `Sign Out`), `font-sans`, `text-xs lg:text-sm`, `font-medium`, `h-8`, `rounded-lg`, and without `font-mono` or `uppercase`.
4. `LogOut` icon uses `group-hover:text-status-error` (not `text-red-400`), and clicking `Sign Out` calls `signOut()` and closes the dropdown (`aria-expanded="false"`).

- [ ] **Step 2: Run the test to verify it fails**

Run from `apps/web`:
`npx vitest run src/features/auth/UserMenu.test.tsx`
Expected: FAIL because `UserMenu.tsx` renders `SETTINGS`, `SIGN OUT`, `font-mono`, `uppercase`, and `group-hover:text-red-400`.

- [ ] **Step 3: Update `apps/web/src/features/auth/UserMenu.tsx:59-89`**

- Change the dropdown panel container from `... text-xs font-mono animate-fade-in` to `... font-sans animate-fade-in`, and style `displayName` with `text-sm font-semibold text-foreground truncate` and `user.email` with `text-xs text-foreground-muted truncate`.
- Update the `Settings` `<Link>` to `className="group w-full h-8 flex items-center space-x-2 px-3 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-panel-recessed font-sans text-xs lg:text-sm font-medium cursor-pointer transition-colors"` with icon `<Settings className="w-3.5 h-3.5 text-foreground-muted group-hover:text-foreground transition-colors" />` and text `Settings`.
- Update the `Sign Out` `<button>` to include `type="button"` and `className="group w-full h-8 flex items-center space-x-2 px-3 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-panel-recessed font-sans text-xs lg:text-sm font-medium cursor-pointer transition-colors"` with icon `<LogOut className="w-3.5 h-3.5 text-foreground-muted group-hover:text-status-error transition-colors" />` and text `Sign Out`.

- [ ] **Step 4: Run the test to verify it passes**

Run from `apps/web`:
`npx vitest run src/features/auth/UserMenu.test.tsx`
Expected: PASS (all tests in `UserMenu.test.tsx` pass).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/auth/UserMenu.tsx apps/web/src/features/auth/UserMenu.test.tsx
git commit -m "style(web): align UserMenu dropdown typography with Header font-sans links"
```

---

### Task 4: Documentation Updates & Full Verification Gates

**Files:**
- Modify: `docs/ROADMAP.md` (add issue #87 entry under `## Completed Milestones` and link devlog)
- Modify: `README.md` (only if needed; confirm no new setup/feature flags added)
- Create: `docs/devlogs/2026-11-21-issue-87-selected-card-and-user-menu.md`

- [ ] **Step 1: Create the dated devlog and update `docs/ROADMAP.md`**

Create `docs/devlogs/2026-11-21-issue-87-selected-card-and-user-menu.md` documenting the problem statement, unified selected-card pattern (`bg-panel-recessed border-accent shadow-sm`), `UserMenu` `font-sans` alignment, and verification outputs, and add the completed entry under `## Completed Milestones` in `docs/ROADMAP.md`.

- [ ] **Step 2: Run full web typecheck, unit tests, and Playwright E2E design token gates**

Run from repo root / `apps/web`:
- `npm run typecheck --workspace=@brewlog/web`
- `npm run test --workspace=@brewlog/web`
- `npx playwright test e2e/button-sizing-tokens.spec.ts e2e/corner-radius-hierarchy.spec.ts` (from `apps/web`)
Expected: All typechecks, unit tests, and Playwright E2E design token tests pass with 0 failures.

- [ ] **Step 3: Record exact verification evidence in the devlog and commit**

```bash
git add docs/ROADMAP.md docs/devlogs/2026-11-21-issue-87-selected-card-and-user-menu.md docs/superpowers/specs/2026-11-21-issue-87-align-selected-card-and-user-menu-design.md docs/superpowers/plans/2026-11-21-issue-87-align-selected-card-and-user-menu.md
git commit -m "docs: add issue #87 spec, plan, roadmap entry, and devlog"
```

---

## Self-Review Check
- **Spec coverage:** Task 1 covers `RecipeCatalogList.tsx` + `aria-current` + unit test; Task 2 covers `ReviewCard.tsx` + `aria-pressed` + `ReviewCard.test.tsx` / `ReviewsView.test.tsx`; Task 3 covers `UserMenu.tsx` dropdown container, `Settings`/`Sign Out` typography/height/hover tokens + new `UserMenu.test.tsx`; Task 4 covers `AGENTS.md` documentation protocol and full unit + E2E verification.
- **No placeholders / consistent names:** All file paths, prop names (`activeRecipeId`, `isSelected`, `onOpenAuthModal`), test IDs (`recipe-catalog-card`, `master-feed`), and Tailwind token classes match the inspected files on `main` (`c7186e0`).
