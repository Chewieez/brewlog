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

#### 3. Pervasive `any` Type Assertions in Supabase Hooks
* **Files**: [`useBeans.ts`](../apps/web/src/features/stash/useBeans.ts#L28), [`useTastingLogs.ts`](../apps/web/src/features/cupping/useTastingLogs.ts#L25)
* **Issue**: Database records are cast through `(data as any[])`, bypassing TypeScript's generated database types from `@brewlog/supabase` and risking runtime errors if column names drift.
* **Fix**: Leverage the generated `Database['public']['Tables']['...']['Row']` types from `@brewlog/supabase`.

---

### Category B: Timer Engine & Audio Best Practices (P1)

#### 4. Timer Drift with `setInterval`
* **File**: [`TimerView.tsx`](../apps/web/src/features/timer/TimerView.tsx#L54-L86)
* **Issue**: The timer increments `elapsedSeconds` by `+1` inside a `setInterval(..., 1000)`. In browser environments, `setInterval` drifts significantly when tabs lose focus, the device throttles CPU, or UI renders queue up. Over a 4-minute brew, it can drift 3–6 seconds.
* **Best Practice**: Track `startTime = performance.now()` and calculate elapsed time as `Math.floor((now - startTime) / 1000)`.

#### 5. Stale Closure on Countdown Audio Ticks
* **File**: [`TimerView.tsx`](../apps/web/src/features/timer/TimerView.tsx#L69-L73)
* **Issue**: `nextStage` is captured when `isRunning` triggers the effect. Because `elapsedSeconds` is omitted from the dependency array (to prevent interval resets), `nextStage` remains frozen at Stage 2. Countdown audio ticks (3, 2, 1) never play for Stages 3, 4, etc.
* **Best Practice**: Derive the next stage dynamically inside the tick handler or via a mutable ref.

#### 6. Impure Side-Effects Inside React State Updater
* **File**: [`TimerView.tsx`](../apps/web/src/features/timer/TimerView.tsx#L55-L85)
* **Issue**: `coffeeAudio.playStageChime()`, `coffeeAudio.playTick()`, `setIsRunning(false)`, and `setIsFinished(true)` are called inside `setElapsedSeconds((prev) => { ... })`. Under React 19 Concurrent Mode and React StrictMode, state updater functions must be pure because they can run multiple times.
* **Best Practice**: Separate state mutation from side-effects (use an animation frame / tick loop or effect-driven audio cues).

#### 7. Mobile Web Audio Autoplay Policy
* **File**: [`audio.ts`](../apps/web/src/lib/audio.ts#L8-L17)
* **Issue**: `AudioContext.resume()` is called lazily during tick playback. Mobile Safari and Android Chrome block Web Audio unless resumed directly from a synchronous user gesture event (e.g. tapping "Start Brew").
* **Best Practice**: Expose an explicit `coffeeAudio.init()` or `coffeeAudio.resume()` triggered directly by the user's click handler.

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

#### 11. Equipment View Incomplete Rendering & Volatile State
* **File**: [`EquipmentView.tsx`](../apps/web/src/features/equipment/EquipmentView.tsx#L19-L20, #L120-L123)
* **Issue**:
  - The "Add Equipment" modal allows selecting "Scale" and "Kettle", but the view only filters and displays Grinders and Brewers. Any added scale or kettle disappears from view.
  - Equipment is only kept in local `useState` in `App.tsx` with no `localStorage` fallback. Refreshing wipes user gear.
* **Fix**: Add UI sections for Scales & Kettles, and add local storage / Supabase persistence.

#### 12. Supabase Client Non-Reactive to Modal Credential Changes
* **Files**: [`SupabaseModal.tsx`](../apps/web/src/features/auth/SupabaseModal.tsx#L18-L25), [`lib/supabase.ts`](../apps/web/src/lib/supabase.ts#L10-L18)
* **Issue**: Entering new Supabase credentials in the modal saves to `localStorage`, but the `supabase` client is instantiated as an exported module singleton. The new credentials have no effect until a full browser reload.
* **Fix**: Trigger `window.location.reload()` on save, or provide a reactive client provider.

---

### Category D: Specialty Coffee Domain & Math (P2)

#### 13. SCA Cupping Form Attributes Alignment
* **File**: [`calculator.ts`](../packages/core/src/calculator.ts#L36-L49), [`types.ts`](../packages/core/src/types.ts#L107-L116)
* **Issue**: The SCA 100-point cupping protocol scores 10 categories (Fragrance/Aroma, Flavor, Aftertaste, Acidity, Body, Balance, Uniformity, Clean Cup, Sweetness, Overall) from 6.00 to 10.00. Current code evaluates 8 categories (`sum / 80 * 100`), omitting "Flavor" and "Uniformity", and combining Clean Cup into "Clarity".
* **Fix**: Align attributes with the standard 10-point SCA sheet or support the modern SCA Coffee Value Assessment (CVA) standard.

#### 14. Timezone Shift in `calculateDaysOffRoast`
* **File**: [`calculator.ts`](../packages/core/src/calculator.ts#L51-L61)
* **Issue**: Parsing ISO `YYYY-MM-DD` strings with `new Date("2026-08-20")` defaults to UTC midnight, which shifts the calculated date by ±1 day depending on user local timezones.
* **Fix**: Parse year, month, and day components as local midnight or normalize to UTC midnight for comparison.

---

### Category E: UI/UX, Accessibility & Responsiveness (P2)

#### 15. Fixed Panel Heights Inducing Double Scrollbars
* **Files**: [`TimerView.tsx`](../apps/web/src/features/timer/TimerView.tsx#L165, #L273), [`CuppingView.tsx`](../apps/web/src/features/cupping/CuppingView.tsx#L62, #L112)
* **Issue**: Panels are locked to `h-[520px]` and `h-[605px]`. On smaller screens (13" laptops, tablets) or zoomed displays, this creates rigid clipping or nested scrollbars.
* **Fix**: Transition from fixed pixel heights to responsive minimum heights (`min-h-[520px] lg:h-[calc(100vh-14rem)]`) with flex-grow containers.

#### 16. Interactive SVG Flavor Wheel Accessibility & Touch UX
* **File**: [`ScaFlavorWheelSvg.tsx`](../apps/web/src/features/cupping/ScaFlavorWheelSvg.tsx#L122-L140)
* **Issue**:
  - Slices lack keyboard navigation (`tabIndex={0}`, `role="button"`, `aria-label`, `onKeyDown`). Screen reader and keyboard-only users cannot navigate the wheel.
  - Center inspection relies solely on `onMouseEnter`/`onMouseLeave`, which does not function on mobile touchscreens.
* **Fix**: Add ARIA attributes, keyboard support, and a touch/tap preview state.

#### 17. Icon Button Labels
* **Files**: [`TimerView.tsx`](../apps/web/src/features/timer/TimerView.tsx), [`Header.tsx`](../apps/web/src/components/shared/Header.tsx), [`EquipmentView.tsx`](../apps/web/src/features/equipment/EquipmentView.tsx)
* **Issue**: Icon-only buttons (Reset Timer, Mute, Close "✕") lack `aria-label` attributes.
* **Fix**: Add descriptive `aria-label` tags to all icon buttons.

---

## 📋 3. Actionable Remediation Checklist

### Milestone 1: Tooling & Build Health (P0)
- [x] Add `packages/supabase/tsconfig.json` and ensure `npm run typecheck` passes cleanly.
- [x] Add Vitest testing harness and test `@brewlog/core` math functions.
- [ ] Replace `any` casts in `useBeans.ts` and `useTastingLogs.ts` with typed Supabase schemas.

### Milestone 2: Data Flow & Feature Completeness (P1)
- [x] Implement "Save Cupping Log" in `CuppingView` and connect to `useTastingLogs`.
- [x] Connect selected bean from Stash ("Brew with this Bean") into `TimerView`.
- [x] Update Timer completion flow to route into cupping log with actual brew parameters.
- [ ] Add display support for Scales and Kettles in `EquipmentView`.
- [ ] Add `localStorage` caching fallback for Equipment and Custom Recipes.
- [ ] Reload or reconfigure Supabase client when credentials are saved in `SupabaseModal`.

### Milestone 3: Timer Precision & Audio Engine (P1)
- [ ] Refactor timer engine from `setInterval` to `performance.now()` delta calculation.
- [ ] Eliminate stale closure on countdown ticks before stage transitions.
- [ ] Move audio calls and timer stop actions out of the `setElapsedSeconds` state updater.
- [ ] Add explicit audio unlocking on user click for mobile Safari/Chrome compatibility.

### Milestone 4: a11y, Responsiveness & Specialty Domain (P2)
- [ ] Add ARIA roles, labels, and keyboard controls to `ScaFlavorWheelSvg`.
- [ ] Add mobile tap inspection to the sensory flavor wheel.
- [ ] Replace hardcoded pixel heights (`h-[520px]`, `h-[605px]`) with responsive flex/grid layouts.
- [ ] Align cupping attributes with official SCA standards.
- [ ] Fix timezone normalization in `calculateDaysOffRoast`.

