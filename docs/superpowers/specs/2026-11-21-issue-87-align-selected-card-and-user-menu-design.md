# Issue #87: Align Selected Recipe/Review Card Styling & Account Dropdown Link Font

**Date:** 2026-11-21
**Size:** Small change

## Intent & Why
Resolve two visual polish inconsistencies discovered on web during issue #84 testing so master-detail selection states across Recipes (`RecipeCatalogList.tsx`) and Reviews (`ReviewCard.tsx`, extracted from `ReviewsView.tsx` in PR #96) follow a single design-system-compliant pattern, and the authenticated account dropdown menu matches the clean `font-sans` typography of the top navigation bar.

## Goals
- Unify selected card styling between `RecipeCatalogList.tsx` and `ReviewCard.tsx` using a full hairline accent border (`bg-panel-recessed border-accent shadow-sm`).
- Update `UserMenu.tsx` dropdown typography from uppercase `font-mono` (`SETTINGS`, `SIGN OUT`) to mixed-case `font-sans` (`Settings`, `Sign Out`) aligned with `Header.tsx` navigation links.
- Add/update unit test coverage across `RecipeCatalogList.test.tsx`, `ReviewCard.test.tsx`, `ReviewsView.test.tsx`, and a new `UserMenu.test.tsx`.
- Keep all unit tests and Playwright E2E design token gates (`button-sizing-tokens.spec.ts`, `corner-radius-hierarchy.spec.ts`) green.

## Non-Goals & Anti-Goals
- Do **not** alter the unauthenticated `SIGN IN` tactile button or trigger avatar badge in `UserMenu.tsx` (scope is the open account dropdown).
- Do **not** introduce or retain any single-sided colored border (`border-l-4 border-l-accent` or an absolute left accent bar) on cards, per `design-doctrine`.
- Do **not** refactor `ReviewCard.tsx`, `ReviewsView.tsx`, or `RecipeCatalogList.tsx` card layouts beyond selection/hover consistency.

## Constraints
- **No one-sided colored borders:** Remove `<div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-accent rounded-r" />` from `RecipeCatalogList.tsx` and keep `ReviewCard.tsx` free of one-sided borders in favor of a full 4-sided `border-accent`.
- **Button sizing tokens (`button-sizing-tokens.spec.ts`):** Interactive buttons must measure `32px` (`h-8`), `40px` (`h-10`), or `48px` (`h-12`). Dropdown action items use `h-8` (`32px`).
- **Corner radius hierarchy (`corner-radius-hierarchy.spec.ts`):** Catalog cards stay `rounded-xl` (`12px`); dropdown container stays `rounded-xl`; dropdown menu items stay `rounded-lg` (`8px`).
- **Semantic tokens only:** Replace hardcoded `group-hover:text-red-400` on the Sign Out icon with `group-hover:text-status-error`.

## Approaches Considered
- **Option A — Full hairline accent border + recessed surface (`bg-panel-recessed border-accent shadow-sm`) (Selected):** Aligns `RecipeCatalogList.tsx` to the `bg-panel-recessed border-accent shadow-sm` pattern already adopted by `ReviewCard.tsx` in PR #96, removes the left-side bar from `RecipeCatalogList.tsx`, and unifies unselected hover (`bg-panel border-border-subtle hover:border-border-active hover:bg-panel-recessed/40`) and active ARIA semantics across both cards. Complies with `design-doctrine` and reads clearly in both `tactile-dark` and `studio-light`.
- **Option B — 4px left accent bar (`border-l-4 border-l-accent`) on both:** Rejected because single-sided colored borders violate the design system's card border rule (and PR #96 already removed `border-l-4` when extracting `ReviewCard.tsx`).

## Design Decisions
1. **Selected Card Pattern (`RecipeCatalogList.tsx` & `ReviewCard.tsx`)**
   - `RecipeCatalogList.tsx`: Replace `isSelected ? 'bg-panel-recessed border-border-active' : 'bg-panel border-border-subtle hover:border-border-active hover:bg-panel-recessed/40'` with `isSelected ? 'bg-panel-recessed border-accent shadow-sm' : 'bg-panel border-border-subtle hover:border-border-active hover:bg-panel-recessed/40'`, and remove the `{isSelected && <div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-accent rounded-r" />}` element.
   - `ReviewCard.tsx`: Keep `isSelected ? 'bg-panel-recessed border-accent shadow-sm'` and align the unselected state from `'bg-panel border-border-subtle hover:border-border-active'` to `'bg-panel border-border-subtle hover:border-border-active hover:bg-panel-recessed/40'`.
   - Expose active selection semantically: add `aria-current={isSelected ? 'page' : undefined}` on the recipe card `<Link>` and `aria-pressed={isSelected}` on the `ReviewCard` `role="button"` container.

2. **Account Dropdown Typography (`UserMenu.tsx`)**
   - Dropdown container: replace `text-xs font-mono` with `font-sans` so the user identity header (`displayName`, `user.email`) and menu items render in `font-sans`.
   - `Settings` `<Link>` and `Sign Out` `<button>` (`type="button"`): use `h-8 px-3 rounded-lg font-sans text-xs lg:text-sm font-medium text-foreground-secondary hover:text-foreground hover:bg-panel-recessed transition-colors` matching `Header.tsx` navigation links, with mixed-case labels `Settings` and `Sign Out`.
   - Icons inside dropdown items: `Settings` uses `w-3.5 h-3.5 text-foreground-muted group-hover:text-foreground transition-colors` (add `group` class to `Link`), and `LogOut` uses `w-3.5 h-3.5 text-foreground-muted group-hover:text-status-error transition-colors`.

3. **Verification**
   - Unit tests: update `RecipeCatalogList.test.tsx`, `ReviewCard.test.tsx`, and `ReviewsView.test.tsx` to assert unified selected/unselected styling (`bg-panel-recessed`, `border-accent`, `shadow-sm`, `hover:bg-panel-recessed/40`), active ARIA attributes (`aria-current="page"`, `aria-pressed`), and absence of single-sided accent bars (`border-l-4`, `w-1 bg-accent`); add `UserMenu.test.tsx` verifying `Settings` and `Sign Out` render with `font-sans` (no `font-mono` / `uppercase`).
   - E2E gates: run `button-sizing-tokens.spec.ts` and `corner-radius-hierarchy.spec.ts` via Playwright, plus web typecheck and unit test suite before finalizing.
