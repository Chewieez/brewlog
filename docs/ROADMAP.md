# BrewLog Roadmap & Technical Debt

This document tracks upcoming milestones, active engineering work, technical debt, and completed milestones across web, mobile, and shared packages.

---

## In Progress & Upcoming Milestones

### 1. Design System Component Adoption (`@brewlog/ui`)
- [ ] **Remaining App Surface Migration**: Migrate remaining bespoke card containers, badges, and form inputs across `apps/web` and `apps/mobile` onto `@brewlog/ui` primitives (`Card`, `Badge`, `Input`, `MetricTile`).
- [ ] **AI Agent Guardrails**: Enforce `@brewlog/ui` primitive consumption across all new feature screens to prevent ad-hoc styling drift.

### 2. Android Material 3 Navigation Chrome (`apps/mobile`)
- [ ] **Material Design 3 Integration**: Expand first-class Material Design 3 navigation chrome and components via Expo UI / Jetpack Compose primitives (tonal surface elevation, surface container scrolling, and native predictive back gesture integration).

### 3. Responsive & Adaptive Layouts (`apps/mobile`)
- [ ] **Dynamic Breakpoints & Orientation**: Implement `useDeviceLayout` consuming `useWindowDimensions` and device orientation to support compact phones, landscape mode, unfolded foldables (600dp–840dp), and tablets (>840dp).
- [ ] **Landscape Brew Station Layout**: Dual-column Timer chassis (`app/(tabs)/index.tsx`) pinning the stopwatch and controls on the left with active stage guidance, timeline, and ratio translator on the right to eliminate scrolling when mounted on a brew stand.
- [ ] **Foldable & Tablet Master-Detail Grids**: Two-pane Master-Detail layouts for Stash (`app/(tabs)/stash.tsx`), Recipes (`app/(tabs)/recipes.tsx`), and Reviews (`app/(tabs)/reviews.tsx`) on tablets and unfolded foldables.
- [ ] **Tabletop / Flex Mode Posture Awareness**: Support half-folded postures (Pixel Fold, Galaxy Z Fold) placing the active timer readout on the upper half and tactile controls on the lower half.

### 4. Sentry Observability, Error Tracking & Performance Monitoring (`apps/web` & `apps/mobile`) *(Issue: [#73](https://github.com/Chewieez/brewlog/issues/73))*
- [ ] **Web Error & Performance Tracing (`@sentry/react`)**: Initialize `@sentry/react` in `apps/web/src/main.tsx` (`VITE_SENTRY_DSN`), wrap routes in a themed `Sentry.ErrorBoundary`, enable React Router v8 browser tracing, and upload source maps via `@sentry/vite-plugin`.
- [ ] **Mobile Crash & Navigation Monitoring (`@sentry/react-native`)**: Configure the `@sentry/react-native` Expo plugin in `apps/mobile/app.json` (`EXPO_PUBLIC_SENTRY_DSN`), wrap `RootLayout` (`Sentry.wrap`), track Expo Router screen transitions, and upload native debug symbols / Metro source maps during EAS Builds.
- [ ] **Offline Sync Telemetry & Privacy Guards**: Capture structured breadcrumbs and exceptions when offline-first Supabase sync operations fail (`StashContext`, `RecipeContext`, `EquipmentContext`, `ReviewsContext`, `SettingsContext`) while stripping all PII (emails, tokens) from payloads.

### 5. Database CI/CD & Schema Automation (`@brewlog/supabase`)
- [ ] **Supabase CLI Integration**: Wire `npm run db:migrate` / `supabase db push` into repository scripts.
- [ ] **Automated Migration Pipeline**: Add a GitHub Actions workflow to validate and apply pending SQL migrations from `packages/supabase/migrations/` upon merge to `main`.
- [ ] **Schema Drift Gate**: Add automated type-generation checks verifying `database.types.ts` matches the live PostgreSQL schema.

### 6. Wearable Companion Apps (`apps/wearos` & `apps/watchos`)
- [ ] **WearOS Companion (`apps/wearos`)**: Standalone Wear OS companion app and watch tile for glanceable brew timing, countdown alerts, and haptic pour cues (Jetpack Compose, Wearable DataLayer).
- [ ] **watchOS Companion (`apps/watchos`)**: Standalone Apple Watch companion app and Lock Screen / Smart Stack complications for active brew progress (SwiftUI, WatchConnectivity).

---

## Technical Debt & Refactoring Backlog

### Human-Friendly URL Slugs for Custom Recipes (`apps/web`)
- [ ] **Hybrid Slug-ID Routing (`/recipes/:slug--:id`)**: Replace raw UUID paths (`/recipes/750e6dda-...`) with readable slug-ID routes (e.g. `/recipes/my-morning-v60--750e6dda`) that extract the ID suffix for lookup without collision risk.

### Web Recipe Component Decomposition (`apps/web`)
- [ ] **`RecipeDetailPane` Split**: Extract `RecipeHeader.tsx`, `RecipeDoseSlider.tsx`, `RecipeSpecsGrid.tsx`, and `RecipeStepsTimeline.tsx` into focused single-responsibility components.
- [ ] **`RecipeCatalogList` Split**: Extract `RecipeCard.tsx` and `MethodFilterTabs.tsx`.

### Web Bean Stash Deep-Linking (`apps/web`)
- [ ] **Dynamic Bean Route (`/stash/:beanId`)**: Add deep-linkable bean detail routes on web matching mobile's `app/stash/[id].tsx` flow.

### Typography Fallback Auditing (`apps/web` & `apps/mobile`)
- [ ] **Purge Browser Serif Fallbacks**: Audit CSS font stacks to ensure every rule includes explicit `sans-serif` or `monospace` generic fallbacks (`Outfit`, `JetBrains Mono`) before web fonts finish hydrating.

### Native Mobile Date Picker (`apps/mobile`)
- [ ] **`@react-native-community/datetimepicker`**: Replace the manual `YYYY-MM-DD` text input for Roast Date in `BeanModalScreen.tsx` with a native locale-aware calendar/wheel picker.

---

## Completed Milestones

Detailed architecture notes and verification logs for completed phases live in [`docs/devlogs/`](./devlogs/) and [`docs/adr/`](./adr/):

- **Web Declarative Routing & Master-Detail Recipes (Phases 1–2)**: React Router v8 declarative client routing (`/timer`, `/stash`, `/recipes/:recipeId`, `/equipment`, `/reviews`, `/settings`, 404 fallback) and persistent `RootLayout` shell. See [ADR 004](./adr/004-client-side-declarative-routing.md).
- **Mobile Foundation, Tab Shell & Interactive Brew Timer (Phases 3–3B)**: Expo Router mobile foundation (upgraded to Expo SDK 58 & React Native 0.88), iOS `NativeTabs` (`_layout.ios.tsx`), animated `FloatingPillTabBar` (`_layout.tsx`), drift-free `useMobileBrewTimer`, synthesized chimes (`expo-audio`), and tactile haptics (`expo-haptics`). See [Phase 3 Devlog](./devlogs/2026-09-18-phase-3-react-native-foundation.md), [Phase 3A Devlog](./devlogs/2026-09-19-phase-3a-mobile-bottom-tabs.md), and [Timer Devlog](./devlogs/2026-09-19-mobile-interactive-timer.md).
- **Supabase Auth, AES-256 Secure Store & In-Tree Auth Overlay (Phase 3C)**: `LargeSecureStore` hybrid AES-256 CTR encryption (`expo-secure-store` + `AsyncStorage`), `AuthContext`, `ProfileHeaderButton`, and in-tree `AuthSheet` overlay supporting Android password autofill. See [Auth Devlog](./devlogs/2026-09-20-mobile-supabase-auth-secure-store.md), [Autofill Devlog](./devlogs/2026-09-23-mobile-auth-sheet-android-autofill.md), and [ADR 006](./adr/006-android-autofill-and-in-tree-modal-overlays.md).
- **Mobile & Web Recipe Studio & Multi-Grinder Settings (Phases 4 & 7C, Issue #30)**: Offline-first `RecipeContext`, full CRUD recipe builder, sequential stage timing recalculation, preset mutation guards, and multi-grinder dial settings (`004_add_recipe_grinder_settings.sql`, inline grinder creation, primary grinder timer/review pre-fill). See [Phase 4 Devlog](./devlogs/2026-09-21-phase-4-mobile-recipe-studio.md) and [Web Alignment Devlog](./devlogs/2026-10-01-web-stash-persistence-and-recipe-flow-alignment.md).
- **Bean Stash Manager & Biochemical Resting Engine (Phases 5 & 7C)**: Offline-first `StashContext` & `useBeans`, pure roast resting curve and freezer pause math in `@brewlog/core` (`restingUtils.ts`), shelf partitioning, and 1-tap post-brew dose deduction from the timer. See [Phase 5 Devlog](./devlogs/2026-09-22-phase-5-mobile-stash-cellar-inventory.md) and [ADR 005](./adr/005-offline-stash-management-and-resting-engine.md).
- **Free Brew Stopwatch & Nested Ratio Translator (Phase 6)**: Dual-mode timer (`GUIDED RECIPE` | `FREE BREW`), live split milestone tracking (`FreeBrewSplitTimeline`), bidirectional proportional ratio calculator (`@brewlog/core`), and 1-tap export of free-brew splits to custom recipes or reviews. See [Phase 6 Devlog](./devlogs/2026-09-25-phase-6-free-brew-and-ratio-translator.md).
- **Cross-Platform Design System, Sizing Tokens & Dynamic Theming (Phases 7A–7B, Issues #59, #61, #63, #64)**: `@brewlog/ui` platform-split primitives (`Button`, `Card`, `Badge`, `Input`, `MetricTile`, `SegmentedControl`), presentation freshness resolvers, semantic `text-foreground*` tokens, standardized `32px` / `40px` / `48px` sizing scale with Playwright E2E gate (`button-sizing-tokens.spec.ts`), dynamic `ThemeProvider` / `useTheme` / `makeStyles` (**Tactile Dark Craft** & **Crisp Studio Light**), retirement of `INDUSTRIAL_PRECISION_THEME`, and standardized `<h1>` route headers. See [Phase 7A Devlog](./devlogs/2026-09-26-phase-7-design-system.md) and [Phase 7B & Dynamic Theming Devlog](./devlogs/2026-11-07-design-system-tokens-dynamic-theming-and-timer-alignment.md).
- **Equipment Catalog & Web/Mobile Parity (Phase 7D)**: Offline-first `EquipmentContext` and `useEquipment`, category filter chips (`Grinders`, `Brewers`, `Scales`, `Kettles`, `Other`), dial setting scales (`clicks`, `stepped-numbers`, `stepless`, `microns`), and favorite gear pinning. See [Equipment Devlog](./devlogs/2026-10-03-mobile-equipment-and-web-parity.md).
- **User Preferences, Unit Localization & Cloud Settings (Phase 8)**: Pure unit converters and formatters (`formatWeight`, `formatTemperature`, `formatDisplayDate`), `005_create_user_settings.sql` with RLS, offline-first `SettingsContext`, theme preference selector (`system`, `tactile_dark`, `studio_light`), and localized faceplate telemetry. See [Phase 8 Devlog](./devlogs/2026-10-09-phase-8-user-preferences-and-settings.md).
- **Mobile & Web Reviews / Tasting Journal Subsystem (Phase 9)**: Offline-first mobile `ReviewsContext` (`ReviewsCatalogScreen`, `ReviewDetailScreen`, `ReviewModalScreen`), Web Master-Detail Tasting Journal (`/reviews` with Sensory Profile Inspector and in-place Review Editor), 10-attribute SCA scoring sliders, 3-tier SVG flavor wheel, equipment snapshot telemetry, and retirement of legacy "Cupping" naming. See [Reviews Parity Devlog](./devlogs/2026-10-04-mobile-and-web-reviews-parity.md).
