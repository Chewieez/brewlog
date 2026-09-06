# ☕ BrewLog Codebase & Architecture Audit

> **Status**: Reference Document  
> **Last Updated**: September 2, 2026  
> **Scope**: Monorepo packages (`@brewlog/core`, `@brewlog/supabase`), Web Application (`apps/web`), and planned roadmap alignment.

---

## 🧭 1. Roadmap Alignment & Phased Context

Based on the project documentation ([`README.md`](../README.md), [`CASE_STUDY.md`](../CASE_STUDY.md), [`docs/adr/001-monorepo-and-shared-domain.md`](./adr/001-monorepo-and-shared-domain.md), and [`docs/architecture.html`](./architecture.html)), the project is designed around a 5-phase delivery model:

* **Phase 1: Core Domain & Data Architecture** — `@brewlog/core` math/presets and `@brewlog/supabase` PostgreSQL schema + RLS. *(Active)*
* **Phase 2: Modern Web Application** — React 19 + Tailwind CSS v4 + Vite desktop/tablet experience with Brew Assistant, Stash, Recipe Studio, Equipment, and Cupping. *(Active / Current Phase)*
* **Phase 3: Cross-Platform Mobile** — React Native with Expo SDK (`apps/mobile`) reusing shared domain packages. *(Deferred to Phase 3)*
* **Phase 4: Android WearOS Companion** — Jetpack Compose wrist timer and Tile with haptics (`apps/wearos`). *(Deferred to Phase 4)*
* **Phase 5: Apple watchOS Companion** — SwiftUI app with complications and WatchConnectivity (`apps/watchos`). *(Deferred to Phase 5)*

### Known Deferred Scope (Not Defects)
The following items are recognized as planned roadmap additions for upcoming milestones and are **not** considered implementation defects of the current code:
1. **Mobile Application Scaffolding**: `apps/mobile/` is currently an empty placeholder awaiting Phase 3 Expo SDK setup.
2. **Native Wearable Apps**: `apps/wearos` and `apps/watchos` are roadmap items for Phases 4 and 5.
3. **Full Cloud Sync for Equipment & Recipes**: Supabase sync was completed first for `beans` and `tasting_logs` (commit `7909743`); equipment and custom recipe cloud sync are the next planned backend milestones.
4. **Custom Recipe Builder Modal**: The Recipe Studio currently functions as an interactive preset explorer with live scaling; the custom recipe authoring form is slated for Phase 2 completion.

---

## 🔍 2. Audit Findings in Built Code

The findings below represent **active bugs, architectural gaps, and deviations from best practices** within the code already implemented.

---

### Category A: Tooling, Build & Type Safety (P0)

#### 1. Broken Workspace Typecheck in `@brewlog/supabase` *(Resolved)*
* **File**: [`packages/supabase/package.json`](../packages/supabase/package.json#L7)
* **Status**: ✅ **Fixed** (Added `packages/supabase/tsconfig.json` extending `tsconfig.base.json`)
* **Impact**: `npm run typecheck` now executes cleanly with exit code 0 across all workspaces.

#### 2. Absence of Automated Test Infrastructure *(Resolved)*
* **Files**: [`packages/core/src/__tests__/calculator.test.ts`](../packages/core/src/__tests__/calculator.test.ts), [`packages/core/src/__tests__/presets.test.ts`](../packages/core/src/__tests__/presets.test.ts)
* **Status**: ✅ **Fixed** (Installed Vitest, configured monorepo `npm test`, created 32 unit tests across calculator math and presets, and resolved a latent `NaN` bug in `calculateDaysOffRoast`)
* **Impact**: 32 unit tests passing in ~110ms with zero-regression protection for all brew formulas.

#### 3. Pervasive `any` Type Assertions in Supabase Hooks *(Resolved)*
* **Files**: [`useBeans.ts`](../apps/web/src/features/stash/useBeans.ts), [`useTastingLogs.ts`](../apps/web/src/features/cupping/useTastingLogs.ts), [`useEquipment.ts`](../apps/web/src/features/equipment/useEquipment.ts)
* **Status**: ✅ **Fixed** (Adopted official `database.types.ts` schema with full `Row`, `Insert`, `Update`, and `Relationships: []` types; extracted pure `beanMappers.ts`, `tastingLogMappers.ts`, and `equipmentMappers.ts` modules to isolate DTO mapping from React hooks; eliminated all `as any` casts)
* **Impact**: Strict compile-time type safety across database queries and inserts; schema changes immediately catch type drift in TypeScript.

---

### Category B: Timer Engine & Audio Best Practices (P1)

#### 4. Timer Drift with `setInterval` *(Resolved)*
* **File**: [`TimerView.tsx`](../apps/web/src/features/timer/TimerView.tsx), [`useBrewTimer.ts`](../apps/web/src/features/timer/useBrewTimer.ts)
* **Status**: ✅ **Fixed** (Extracted timer into a dedicated `useBrewTimer` hook that tracks elapsed time using `performance.now()` delta math with timestamp checkpoints, preventing drift when browser tabs are throttled or backgrounded)
* **Impact**: Millisecond-accurate timer precision across long multi-stage pour-overs without time loss or drift.

#### 5. Stale Closure on Countdown Audio Ticks *(Resolved)*
* **File**: [`TimerView.tsx`](../apps/web/src/features/timer/TimerView.tsx), [`useBrewTimer.ts`](../apps/web/src/features/timer/useBrewTimer.ts)
* **Status**: ✅ **Fixed** (Stages and next stage transitions are dynamically evaluated against the latest recipe and current elapsed seconds on every tick loop iteration with `lastTickedSecondRef` deduplication)
* **Impact**: Audio countdown ticks (3, 2, 1) play reliably before every single stage transition.

#### 6. Impure Side-Effects Inside React State Updater *(Resolved)*
* **File**: [`TimerView.tsx`](../apps/web/src/features/timer/TimerView.tsx), [`useBrewTimer.ts`](../apps/web/src/features/timer/useBrewTimer.ts)
* **Status**: ✅ **Fixed** (Moved `coffeeAudio.playStageChime()`, `coffeeAudio.playTick()`, and `playCompletionFanfare()` completely outside React state setters into a dedicated tick loop with ref tracking)
* **Impact**: Fully compliant with React 19 Concurrent Mode and StrictMode; zero duplicate audio chime artifacts.

#### 7. Mobile Web Audio Autoplay Policy *(Resolved)*
* **File**: [`audio.ts`](../apps/web/src/lib/audio.ts#L30-L48), [`useBrewTimer.ts`](../apps/web/src/features/timer/useBrewTimer.ts)
* **Status**: ✅ **Fixed** (Implemented `coffeeAudio.unlock()` which plays a 1-frame silent buffer synchronously during the user's direct "Start Brew" click gesture, transitioning `AudioContext` from `suspended` to `running`)
* **Impact**: Reliable audio cues on iOS Safari, Android Chrome, and mobile PWA installations.

---

### Category C: Feature Integration & Data Flow (P1)

#### 8. Cupping View Cannot Save Logs *(Resolved)*
* **File**: [`CuppingView.tsx`](../apps/web/src/features/cupping/CuppingView.tsx)
* **Status**: ✅ **Fixed** (Added bean selector, brew parameters, notes textarea, 1–5 star rating, "Would brew again" toggle, and "Save Tasting Log to Book" action connected to `onAddTastingLog`)
* **Impact**: Users can now evaluate and save both standalone cuppings and completed timer brews.

#### 9. Timer Brew Logging Uses Hardcoded Mock Scores & Default Bean *(Resolved)*
* **File**: [`App.tsx`](../apps/web/src/App.tsx#L54-L87), [`TimerView.tsx`](../apps/web/src/features/timer/TimerView.tsx)
* **Status**: ✅ **Fixed** (Timer completion now hands off actual brew parameters—active bean, recipe, dose, water, elapsed seconds—to `CuppingView`, allowing the barista to evaluate their cup)
* **Impact**: Eliminates fake hardcoded scores (`8.5`, `8.8`, `87.2`) and ensures the actual brewed coffee bean snapshot is used.

#### 10. "Brew with this Bean" Stash Action Drops Selected Bean *(Resolved)*
* **File**: [`App.tsx`](../apps/web/src/App.tsx#L45-L47), [`TimerView.tsx`](../apps/web/src/features/timer/TimerView.tsx)
* **Status**: ✅ **Fixed** (Wired `selectedBean` in `App.tsx` and added coffee bean indicator/dropdown in `TimerView`'s top banner)
* **Impact**: Selecting a bean in the Stash immediately reflects in the Timer and carries through into the Cupping log.

#### 11. Equipment View Incomplete Rendering & Volatile State *(Resolved)*
* **File**: [`EquipmentView.tsx`](../apps/web/src/features/equipment/EquipmentView.tsx), [`useEquipment.ts`](../apps/web/src/features/equipment/useEquipment.ts)
* **Status**: ✅ **Fixed** (Added complete UI sections for Precision Scales and Kettles, created `useEquipment` hook with Supabase persistence, localStorage offline cache, and offline-to-online auto-sync on sign-in)
* **Impact**: All four gear categories (Grinders, Brewers, Scales, Kettles) render, persist across page reloads, and automatically sync to Supabase when the user logs in.

#### 12. Supabase Client Non-Reactive to Modal Credential Changes *(Resolved)*
* **Files**: [`lib/supabase.ts`](../apps/web/src/lib/supabase.ts)
* **Status**: ✅ **Fixed** (Removed temporary BYOD `SupabaseModal` and direct `localStorage` credential overrides; transitioned to standard production `.env` configuration via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)
* **Impact**: Aligns client architecture with standard production React/Angular deployments and eliminates confusing database config modals from end-user UI.

---

### Category D: Specialty Coffee Domain & Math (P2)

#### 13. SCA Cupping Form Attributes Alignment
* **File**: [`calculator.ts`](../packages/core/src/calculator.ts#L36-L49), [`types.ts`](../packages/core/src/types.ts#L107-L116)
* **Issue**: The SCA 100-point cupping protocol scores 10 categories (Fragrance/Aroma, Flavor, Aftertaste, Acidity, Body, Balance, Uniformity, Clean Cup, Sweetness, Overall) from 6.00 to 10.00. Current code evaluates 8 categories (`sum / 80 * 100`), omitting "Flavor" and "Uniformity", and combining Clean Cup into "Clarity".
* **Fix**: Align attributes with the standard 10-point SCA sheet or support the modern SCA Coffee Value Assessment (CVA) standard.

##### 14. Timezone Shift in `calculateDaysOffRoast` *(Resolved)*
* **File**: [`calculator.ts`](../packages/core/src/calculator.ts#L51-L89)
* **Status**: ✅ **Fixed** (Normalized date parsing to calendar year/month/day UTC midnights against reference date midnight; eliminated UTC vs local midnight time-of-day offsets and verified with deterministic Vitest tests across leap years and month boundaries)
* **Impact**: Guaranteed calendar-day resting status calculation without ±1 day drift across global timezones.

---

### Category E: UI/UX, Accessibility & Responsiveness (P2)

#### 15. Fixed Panel Heights Inducing Double Scrollbars *(Resolved)*
* **Files**: [`TimerView.tsx`](../apps/web/src/features/timer/TimerView.tsx), [`CuppingView.tsx`](../apps/web/src/features/cupping/CuppingView.tsx)
* **Status**: ✅ **Fixed** (Replaced rigid `h-[520px]` and `lg:h-[530px]` panel locks with responsive `min-h-[520px] lg:min-h-[560px]` flex containers and fluid scroll containers)
* **Impact**: Eliminates rigid clipping on 13" laptops, tablets, and high-DPI zoom configurations.

#### 16. Interactive SVG Flavor Wheel Accessibility & Touch UX *(Resolved)*
* **File**: [`ScaFlavorWheelSvg.tsx`](../apps/web/src/features/cupping/ScaFlavorWheelSvg.tsx)
* **Status**: ✅ **Fixed** (Added SVG region semantics, `<title>`/`<desc>`, `aria-live` announcements, `role="checkbox"`, roving tabindex with Arrow key/Home/End navigation, Enter/Space toggling, inner category tap inspection, and center hub touch controls)
* **Impact**: Full compliance with WAI-ARIA standards; eliminates 80+ tab keyboard traps while enabling screen-reader and mobile touch inspection.

#### 17. Icon Button Labels *(Resolved)*
* **Files**: [`TimerView.tsx`](../apps/web/src/features/timer/TimerView.tsx), [`Header.tsx`](../apps/web/src/components/shared/Header.tsx), [`EquipmentView.tsx`](../apps/web/src/features/equipment/EquipmentView.tsx), [`StashView.tsx`](../apps/web/src/features/stash/StashView.tsx), [`AuthModal.tsx`](../apps/web/src/features/auth/AuthModal.tsx), [`CuppingView.tsx`](../apps/web/src/features/cupping/CuppingView.tsx)
* **Status**: ✅ **Fixed** (Added descriptive `aria-label` tags to mute audio cues, gear item delete buttons, modal close "✕" buttons, header logo home button, and upgraded flavor tag badges to accessible button controls)
* **Impact**: Zero unlabelled icon controls for screen readers across the entire application.

---

## 📋 3. Actionable Remediation Checklist

### Milestone 1: Tooling & Build Health (P0)
- [x] Add `packages/supabase/tsconfig.json` and ensure `npm run typecheck` passes cleanly.
- [x] Add Vitest testing harness and test `@brewlog/core` math functions.
- [x] Replace `any` casts in `useBeans.ts`, `useTastingLogs.ts`, and `useEquipment.ts` with typed Supabase schemas.

### Milestone 2: Data Flow & Feature Completeness (P1)
- [x] Implement "Save Cupping Log" in `CuppingView` and connect to `useTastingLogs`.
- [x] Connect selected bean from Stash ("Brew with this Bean") into `TimerView`.
- [x] Update Timer completion flow to route into cupping log with actual brew parameters.
- [x] Add display support for Scales and Kettles in `EquipmentView`.
- [x] Add `localStorage` caching fallback and Supabase persistence for Equipment.
- [x] Removed temporary SupabaseModal in favor of standard production .env configuration.

### Milestone 3: Timer Precision & Audio Engine (P1)
- [x] Refactor timer engine from `setInterval` to `performance.now()` delta calculation.
- [x] Eliminate stale closure on countdown ticks before stage transitions.
- [x] Move audio calls and timer stop actions out of the `setElapsedSeconds` state updater.
- [x] Add explicit audio unlocking on user click for mobile Safari/Chrome compatibility.

### Milestone 4: a11y, Responsiveness & Specialty Domain (P2)
- [x] Add ARIA roles, labels, and keyboard controls to `ScaFlavorWheelSvg`.
- [x] Add mobile tap inspection to the sensory flavor wheel.
- [x] Replace hardcoded pixel heights (`h-[520px]`, `h-[605px]`) with responsive flex/grid layouts.
- [x] Fix timezone normalization in `calculateDaysOffRoast`.
- [x] Add descriptive `aria-label` tags and keyboard accessibility to all icon buttons and tag badges.
- [ ] Align cupping attributes with official SCA standards.

