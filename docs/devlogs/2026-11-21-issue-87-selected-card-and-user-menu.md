# Devlog: Issue #87 — Align Selected Recipe/Review Card Styling & Account Dropdown Link Font

- **Date:** 2026-11-24
- **Issue:** [#87](https://github.com/Chewieez/brewlog/issues/87)
- **Branch:** `Chewieez/87-ui-web-align-selected-recipe-review-card`
- **Design Spec:** [`docs/superpowers/specs/2026-11-21-issue-87-align-selected-card-and-user-menu-design.md`](../superpowers/specs/2026-11-21-issue-87-align-selected-card-and-user-menu-design.md)
- **Implementation Plan:** [`docs/superpowers/plans/2026-11-21-issue-87-align-selected-card-and-user-menu.md`](../superpowers/plans/2026-11-21-issue-87-align-selected-card-and-user-menu.md)

---

## Executive Summary

During issue #84 testing on web, two visual polish inconsistencies stood out:
1. Selected recipe cards in `RecipeCatalogList.tsx` used `bg-panel-recessed border-border-active` with an inner 4px left copper strip (`w-1 bg-accent`), whereas review cards (`ReviewCard.tsx`, extracted from `ReviewsView.tsx` in PR #96) used `bg-panel-recessed border-accent shadow-sm` without a one-sided accent bar.
2. The authenticated `UserMenu.tsx` dropdown rendered `SETTINGS` and `SIGN OUT` in uppercase `font-mono` (`tracking-wider font-semibold`) instead of matching the clean `font-sans` mixed-case typography of `Header.tsx` navigation links.

This change unifies the selected/unselected card styling and active ARIA attributes across `RecipeCatalogList.tsx` and `ReviewCard.tsx`, and updates the `UserMenu.tsx` dropdown to `font-sans` mixed-case items (`Settings`, `Sign Out`) with `h-8` sizing and semantic hover tokens.

---

## Architecture & Deliverables

### 1. Unified Selected & Unselected Card Styling (`RecipeCatalogList.tsx` & `ReviewCard.tsx`)
- **`apps/web/src/features/recipes/RecipeCatalogList.tsx`:** Updated selected cards to `bg-panel-recessed border-accent shadow-sm`, removed the single-sided `<div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-accent rounded-r" />` bar (complying with `design-doctrine` against one-sided colored borders), and added `aria-current={isSelected ? 'page' : undefined}` to the card's overlay `<Link>`.
- **`apps/web/src/features/reviews/ReviewCard.tsx`:** Added `aria-pressed={isSelected}` to the `role="button"` card container and aligned the unselected hover styling to `hover:border-border-active hover:bg-panel-recessed/40` alongside the existing `bg-panel-recessed border-accent shadow-sm` selected state.

### 2. Account Trigger & Dropdown Typography (`UserMenu.tsx` & `ProfileHeaderButton.tsx`)
- **`apps/web/src/features/auth/UserMenu.tsx`:** Updated the signed-in account trigger button (`type="button"`, avatar initial, and `displayName` label) and the open dropdown container (`Settings` `<Link>` and `Sign Out` `<button type="button">`) from `font-mono` / uppercase to mixed-case `font-sans text-xs lg:text-sm font-medium` matching `Header.tsx` navigation links, with `h-8` sizing, `displayName` (`text-sm font-semibold`) + `user.email` (`text-xs text-foreground-muted`) dropdown header styling, and `group-hover:text-status-error` replacing hardcoded `group-hover:text-red-400`.
- **`apps/mobile/src/features/auth/ProfileHeaderButton.tsx`:** Updated `initialsText` from `FONTS.monoBold` (`JetBrainsMono_700Bold`) to `FONTS.sansBold` (`Outfit_700Bold`) to maintain cross-platform typography parity with Web's `UserMenu` avatar initial.

### 3. Settings Copy & Heading Polish (`SettingsRoute.tsx` & `apps/mobile/app/settings/modal.tsx`)
- **`apps/web/src/routes/SettingsRoute.tsx`:** Removed the redundant `SYSTEM // CALIBRATION` eyebrow above the page heading and simplified `APPEARANCE // THEME` to `APPEARANCE` (matching mobile).
- **Web & Mobile Settings Sync Copy:** Replaced `"Instrument preferences synced across devices."` with `"Your settings, beans, recipes, equipment, and reviews sync across web and mobile."` in both `SettingsRoute.tsx` and `apps/mobile/app/settings/modal.tsx`.

### 4. Header Navigation Link Cleanup (`Header.tsx` & `RootLayout.tsx`)
- **`apps/web/src/components/shared/Header.tsx` & `apps/web/src/layouts/RootLayout.tsx`:** Removed the count badges (`beanCount` on `Bean Stash`, `brewCount` on `Reviews`) from both desktop and mobile header navigation links along with unused `useBeans` / `useReviews` wiring in `RootLayout.tsx`.

---

## Safeguards & Accessibility

- **Semantic Selection State:** Active cards expose `aria-current="page"` (`RecipeCatalogList.tsx`) and `aria-pressed={isSelected}` (`ReviewCard.tsx`) alongside full-perimeter `border-accent`.
- **Design System Token Gates:** Dropdown actions enforce `h-8` (`32px`) height and `rounded-lg` (`8px`) corner radius inside the `rounded-xl` (`12px`) dropdown panel, keeping `button-sizing-tokens.spec.ts` and `corner-radius-hierarchy.spec.ts` green.

---

## Automated Verification Evidence

- **Monorepo Typecheck (`npm run typecheck`):** Passed with 0 errors across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- **Monorepo Unit Tests (`npm run test`):** 119 test files, **1,095/1,095 passed**:
  - `@brewlog/core`: 8 files, 102/102 passed
  - `@brewlog/supabase`: 4 files, 29/29 passed
  - `@brewlog/ui`: 14 files, 81/81 passed
  - `@brewlog/mobile`: 61 files, 559/559 passed (including `ProfileHeaderButton.test.tsx` 7/7 and `SettingsModalScreen.test.tsx` 10/10)
  - `@brewlog/web`: 32 files, 324/324 passed (including `RecipeCatalogList.test.tsx` 14/14, `ReviewCard.test.tsx` 5/5, `ReviewsView.test.tsx` 28/28, `UserMenu.test.tsx` 3/3, `Header.test.tsx` 5/5, and `SettingsRoute.test.tsx` 13/13)
- **Playwright E2E (`npm run test:e2e --workspace=@brewlog/web`):** **19/19 passed** across `button-sizing-tokens.spec.ts`, `corner-radius-hierarchy.spec.ts`, `context-features.spec.ts`, and `smoke.spec.ts`.
