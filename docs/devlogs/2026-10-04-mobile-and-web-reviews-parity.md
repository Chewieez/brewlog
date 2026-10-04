# 📖 Devlog: Mobile Reviews Subsystem, Web Alignment & Cupping Retirement

- **Date**: 2026-10-04
- **Milestone**: Mobile Reviews / Tasting Journal Subsystem, Web Alignment & Cupping Retirement
- **Status**: Completed & Verified ✅
- **Branch**: `feature/mobile-and-web-reviews`
- **Tech Stack**: React 19.2.8, React Native (Expo SDK 57), Expo Router, Tailwind CSS v4, TypeScript 5.7+, `@brewlog/core`, `@brewlog/supabase`, Vitest, Testing Library

---

## 🎯 Executive Summary

With the Bean Stash and Equipment subsystems successfully established across mobile and web, the application required completing the third major coffee workflow pillar: the **Reviews / Tasting Journal subsystem**. Prior to this milestone:
1. **Mobile Reviews Missing**: Mobile had a placeholder tab screen for cupping without data hydration, Supabase cloud sync, SCA sensory scoring, flavor wheels, or add/edit modals.
2. **Equipment Tracking Disconnected**: Neither mobile nor web tracked which grinder, grind setting, or brewer produced a specific brew review, losing vital context for replicating outstanding cups.
3. **Legacy "Cupping" Terminology**: The codebase and user interface used inconsistent legacy "Cupping" terminology (routes, views, folders) rather than the standard "Reviews", "Add Review", and "Tasting Journal" established in design specifications.
4. **Button & Action Inconsistencies**: Add actions lacked visual and functional consistency across catalog tabs and timer handoff screens.

This milestone delivers an offline-first Reviews subsystem on mobile (`apps/mobile`), achieves complete visual and functional parity on web (`apps/web`), tracks equipment snapshots (grinder, grind setting, brewer), and fully retires "Cupping" naming across routes, components, and user-facing text.

---

## 🏗️ Architecture & Changes Across Packages

### 1. Shared Domain & Presets (`@brewlog/core` & `@brewlog/supabase`)
- **Domain Schema Updates**:
  - `TastingLog` updated to support equipment associations: `grinderId?: string`, `brewerId?: string`, `grinderSnapshot?: string`, `brewerSnapshot?: string`, `beanId?: string`, `recipeId?: string`.
  - Added `DEFAULT_INITIAL_TASTING_LOGS` preset in `packages/core/src/presets.ts` seeded with realistic equipment snapshots (`Comandante C40 MK4`, `Hario V60 02 Ceramic`).
- **Supabase Mappers**:
  - `mapTastingLogRowToDomain` and `mapTastingLogDomainToInsert` in `packages/supabase/src/mappers/tastingLogMappers.ts` updated to persist and hydrate `grinder_id`, `brewer_id`, `grinder_snapshot`, `brewer_snapshot`, `bean_id`, and `recipe_id`.

### 2. Mobile Reviews Subsystem (`apps/mobile/src/features/reviews`)
- **`ReviewsContext` (`ReviewsContext.tsx`)**:
  - Offline-first persistence via AsyncStorage (`@brewlog/mobile:reviews_cache`, `@brewlog/mobile:reviews_pending_updates`, `@brewlog/mobile:reviews_pending_deletes`).
  - Optimistic mutations for `addReview`, `updateReview`, `deleteReview`.
  - Two-way Supabase cloud sync with defensive Postgres `22P02` UUID guards (ignoring temporary `local-log-*` IDs from remote queries).
  - In-memory `pendingBrewSession` state for timer completion handoffs.
- **Sensory & Scoring Primitives**:
  - `ReviewsSummaryBar`: Renders total reviews count and average calculated SCA cup score.
  - `ScaAttributeScoring`: Interactive 10-attribute SCA scoring sliders (7 qualitative sensory attributes + 3 cup purity/consistency attributes) with baseline (82.5 pts) and clear (0.0 pts) quick-set actions.
  - `ScaFlavorWheelSvg`: Interactive SVG-based 3-tier SCA flavor wheel with category, subcategory, and descriptor arc touch targets.
  - `FlavorTagSelector`: Segmented view toggle (`WHEEL` vs `TAG LIST`) with active tag chips and remove buttons.
  - `ReviewCard`: Industrial precision review card displaying method badge, SCA score, star rating, bean and roaster eyebrow, equipment snapshots (`Grinder @ Grind Setting • Brewer`), and flavor tags.
- **Catalog Screen (`ReviewsCatalogScreen.tsx`) & Navigation**:
  - Tab route `apps/mobile/app/(tabs)/reviews.tsx` replacing `cupping.tsx`.
  - Tab layout `_layout.tsx` updated to `name="reviews"`.
  - Standardized catalog header with search filtering and `<Plus size={16} color={colors.canvas} /> ADD REVIEW` CTA button invoking `handleAddReview`.
- **Review Modal Screen (`ReviewModalScreen.tsx`)**:
  - Full CRUD modal with `KeyboardAwareScrollView` (`bottomOffset={32}`).
  - Cold-start hydration loading guard (`ActivityIndicator` testID `review-modal-loading`) preventing premature form resets on deep links.
  - Equipment tracking: grinder selector, grind setting input, and brewer selector.
  - Dirty form discard alert (`Alert.alert`) and delete confirmation modal.
  - Timer completion prefill banner (`COMPLETED BREW LOADED`) with one-click `CLEAR` button.
  - Registered route `apps/mobile/app/reviews/modal.tsx`.
- **Review Detail Screen (`ReviewDetailScreen.tsx`)**:
  - Dedicated route `apps/mobile/app/reviews/[id].tsx` with full SCA score breakdown, spider matrix attributes, equipment snapshots, and direct navigation to edit modal.
- **Timer Completion Integration (`apps/mobile/app/(tabs)/index.tsx`)**:
  - Updated completion CTA to `<Plus size={16} color={colors.canvas} /> ADD REVIEW` calling `handleAddReview`.
  - Seamless navigation to `/reviews/modal` passing bean, recipe, dose, water, elapsed time, and equipment parameters.

### 3. Web Parity & Cupping Retirement (`apps/web`)
- **Renamed Features & Routes**:
  - `apps/web/src/features/cupping` renamed to `apps/web/src/features/reviews`.
  - `CuppingView.tsx` renamed to `ReviewsView.tsx` (retaining backward-compatible export alias).
  - `useTastingLogs.ts` renamed to `useReviews.ts` (retaining `useTastingLogs` alias).
  - `CuppingRoute.tsx` renamed to `ReviewsRoute.tsx`.
- **Equipment Tracking on Web**:
  - `ReviewsView` accepts `equipment?: Equipment[]` from root outlet context.
  - Added grinder dropdown, grind setting input, and brewer dropdown in Coffee & Brew Parameters card.
  - Pre-fills grinder and brewer from `pendingBrewSession?.recipe`.
  - Renders equipment snapshot strings (`Comandante C40 MK4 @ 18 clicks • Hario V60 02 Ceramic`) in past review history cards.
- **UI Consistency & "Cupping" Retirement**:
  - Timer completion CTA in `TimerView.tsx` updated to `<Plus className="w-4 h-4" /> ADD REVIEW` via `handleAddReview`.
  - Header navigation tab updated to `id: 'reviews'`, `path: '/reviews'`, `label: 'Reviews'`.
  - `App.tsx` routes updated to mount `<Route path="reviews" element={<ReviewsRoute />} />` with backward-compatible redirect `<Route path="cupping" element={<Navigate to="/reviews" replace />} />`.

---

## 🧪 Quality Checks & Verification

- **TypeScript Typecheck**: Passed with 0 errors across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`):
  ```bash
  npm run typecheck
  ```
- **Unit & Integration Test Suites**: 518 tests passing monorepo-wide across 67 test files with 0 failures:
  - `@brewlog/mobile`: 47 test files, 363 tests passing (including 8 in `ReviewsContext.test.tsx`, 8 in `ReviewModalScreen.test.tsx`, 7 in `ReviewsCatalogScreen.test.tsx`, 6 in `ReviewDetailScreen.test.tsx`, 4 in `ReviewCard.test.tsx`, 4 in `ScaAttributeScoring.test.tsx`, 2 in `ReviewsSummaryBar.test.tsx`, and 4 in `freeBrewIntegration.test.tsx`).
  - `@brewlog/web`: 20 test files, 155 tests passing (including 6 in `ReviewsView.test.tsx`, 10 in `ScaFlavorWheelSvg.test.tsx`, 7 in `TimerView.test.tsx`, 3 in `Header.test.tsx`).
- **Design & Naming Audit**: Verified that all user-facing copy, routes, handlers, and buttons use "Reviews", "Add Review", and "Tasting Journal" consistently with standard `+` icon styling.
