# Devlog: Web Corner Radius Hierarchy Standardization (Issue #82)

- **Date**: 2026-11-16
- **Issue**: [#82](https://github.com/Chewieez/brewlog/issues/82)
- **Branch**: `Chewieez/82-ui-web-standardize-corner-radius-hierarc`
- **Status**: Completed & Verified
- **Tech Stack**: React 19.3, Tailwind CSS v4, TypeScript, Vitest, Playwright

---

## Executive Summary

Corner radii across `apps/web` and `@brewlog/ui` web primitives had accumulated mixed utility classes (`rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full`) across cards, modals, nested panels, inputs, buttons, interactive filter chips, and static badges. For Issue #82, all web surfaces and shared `@brewlog/ui` web primitives were standardized onto a strict 4-tier geometric radius hierarchy so outer containers step down cleanly to nested sub-panels, controls, and static badges.

### Standardized 4-Tier Hierarchy

1. **Containers (`rounded-xl` / `12px`)**: Top-level cards, modals, detail panes, dropdown menus, alert banners, and empty states. Nested sub-panels and recessed tiles inside containers step down to `rounded-lg` (`8px`).
2. **Controls & Segmented Tracks (`rounded-lg` / `8px`)**: Buttons, form inputs, `<select>` dropdowns, `<textarea>` fields, and segmented control tracks. Active segmented thumbs inside tracks step down to `rounded-md` (`6px`).
3. **Interactive Tag Buttons & Filter Chips (`rounded-lg` / `8px`)**: Method filter pills (`All`, `V60`, `AeroPress`, etc.), category filter chips, clickable SCA flavor descriptor buttons, and removable active tag pills.
4. **Read-Only Badges & Static Tags (`rounded-md` / `6px`)**: Method badges, Preset/Custom status pills, SCA tier badges, resting status tags, static flavor note tags, header tab count badges, `<kbd>` hints, and `@brewlog/ui` `Badge`.

---

## Architecture & Cross-Package Deliverables

### 1. `@brewlog/ui` Web Primitives (`packages/ui/src/`)
- **`Badge.web.tsx`**: Standardized read-only badge radius from `rounded` to `rounded-md`.
- **`Button.web.tsx`**: Standardized interactive button radius from `rounded-md` to `rounded-lg`.
- **`Input.web.tsx`**: Standardized input wrapper radius from `rounded-md` to `rounded-lg`.
- **Existing Aligned Primitives**: Confirmed `Card.web.tsx` (`rounded-xl`) and `SegmentedControl.web.tsx` (`rounded-lg` track, `rounded-md` thumb) already matched the hierarchy.
- **Unit Regression Tests**: Added explicit corner-radius assertions in `Badge.web.test.tsx`, `Button.web.test.tsx`, `Card.web.test.tsx`, `Input.web.test.tsx`, and `SegmentedControl.web.test.tsx`.

### 2. Web Application Feature & Route Surfaces (`apps/web/src/`)
- **Shared Chrome & Fallbacks**: Updated `Header.tsx` (logo focus ring `rounded-lg`, nav count badges `rounded-md`), `SentryFeedbackFallback.tsx` (`rounded-lg` event ID box), `NotFoundRoute.tsx` (`rounded-xl` hero emblem container, `rounded-lg` CTA link), and `RecipeIndexRoute.tsx` (`rounded-xl` empty state card, `rounded-lg` nested emblem container).
- **Auth (`AuthModal.tsx`, `UserMenu.tsx`)**: Standardized modal inputs/banners/segmented track (`rounded-lg`), segmented thumbs and avatar initial badge (`rounded-md`), dropdown action rows (`rounded-lg`), and nested confirmation card and icon wells inside the `rounded-xl` modal (`rounded-lg`).
- **Timer (`TimerView.tsx`, `WebRatioTranslator.tsx`)**: Standardized brew method badge (`rounded-md`), action buttons (`rounded-lg`), Free Brew completion banner and empty split log container (`rounded-xl`), and ratio translator card container (`rounded-xl`, expanded top header `rounded-t-xl`) with `rounded-lg` numeric inputs and Apply Dose button inside. Intentional circular `rounded-full` geometry was preserved on the linear progress bar and live timeline dots.
- **Stash (`StashView.tsx`)**: Standardized bean cards, empty state, and Add/Edit Bean modal (`rounded-xl`); nested resting status box, Freezer Vault toggle row, search input, process select, and modal form fields (`rounded-lg`); and frozen badge, resting stage badge, and static flavor note tags (`rounded-md`).
- **Recipes (`RecipeCatalogList.tsx`, `RecipeDetailPane.tsx`, `RecipeBuilderModal.tsx`)**: Standardized recipe cards, detail pane, empty state, and builder modal (`rounded-xl`); method filter chips, dose preset buttons, nested spec tiles, dose slider panel, grinder settings panel, brew step rows, and modal inputs/selects (`rounded-lg`); and method/Preset/Custom/Primary badges, spec tile icon wells, and step index chips (`rounded-md`, keeping `rounded-full` step number circles in `RecipeDetailPane`).
- **Equipment (`EquipmentView.tsx`)**: Standardized equipment cards, empty states, and Add/Edit Equipment modal (`rounded-xl`); search bar, modal inputs/selects, and error banner (`rounded-lg`); and static scale/subtype badges (`rounded-md`).
- **Reviews (`ReviewsView.tsx`, `ReviewDetailPane.tsx`, `ScaFlavorWheelSvg.tsx`)**: Standardized search bar, method filter chips, active tag removal chips, descriptor tag buttons, wheel toggle button, active tags tray, and textarea (`rounded-lg`); segmented thumbs, static SCA tier/method/flavor tags, header category icons, and `<kbd>` hints (`rounded-md`).

### 3. Playwright E2E Computed-Radius Gate (`apps/web/e2e/corner-radius-hierarchy.spec.ts`)
- Added end-to-end assertions verifying all 4 computed border-radius corners (`12px` for `rounded-xl`, `8px` for `rounded-lg`, `6px` for `rounded-md`, and `12px 12px 0px 0px` for expanded accordion headers) across `/timer` (including `WebRatioTranslator`), `/stash` (plus Add Bean modal), `/recipes` (catalog + detail pane), `/equipment` (search, category chips, cards, static badges, empty state, and modal), `/reviews` (filter chips, segmented tabs, interactive flavor tag buttons), and `/settings` (Live Preview section card, nested preview tiles, and segmented thumbs), including toggling and asserting `data-theme="studio-light"`.

---

## Safeguards & Visual Inspection

- **Zero Emoji**: Audited source changes, tests, and documentation to confirm zero emoji usage.
- **Visual Inspection**: Rendered and inspected screenshots via Playwright across `/timer`, `/stash`, Add Bean modal, `/recipes` (dark/light), `/equipment`, `/reviews`, and `/settings` (light), verifying consistent step-downs between outer `12px` containers, `8px` nested panels/controls, and `6px` thumbs/badges.
- **Privacy & Security**: Purely presentational border-radius token updates, unit/E2E tests, and documentation; no auth, persistence, or telemetry data-flow changes.

---

## Automated Test & Verification Evidence

- **Typecheck (`npm run typecheck`)**: Passed across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- **Unit Tests (`npm test`)**:
  - `@brewlog/core`: 6 files, 89 tests passed
  - `@brewlog/supabase`: 4 files, 29 tests passed
  - `@brewlog/ui`: 12 files, 68 tests passed
  - `@brewlog/mobile`: 59 files, 510 tests passed
  - `@brewlog/web`: 28 files, 281 tests passed
- **Playwright E2E (`npm run test:e2e --workspace=@brewlog/web`)**: 18/18 tests passed, including all 5 tests in `e2e/corner-radius-hierarchy.spec.ts`, 6 button-sizing token tests, 6 context flow tests, and 1 smoke test.
- **Production Build (`npm run build`)**: `@brewlog/web` `tsc -b && vite build` succeeded in `1.34s`.
