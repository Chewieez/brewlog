# 🗺️ BrewLog Roadmap & Technical Debt

This document tracks upcoming milestones, architectural refactors, and technical debt items for BrewLog across web, mobile, and shared packages.

---

## 🧭 Active Milestones

### Phase 1: Web App Core Routing (Complete ✅)
- Declarative client-side routing via React Router v8 library mode (`BrowserRouter`, `Routes`, `Route`, `Outlet`, `NavLink`, `Link`).
- Dedicated routes for `/timer`, `/stash`, `/recipes`, `/equipment`, `/cupping`, and catch-all `*` 404 page (`NotFoundRoute`).
- Preserved root shell layout (`RootLayout`) and persistent authentication handling.

### Phase 2: Dynamic Recipe Routing & Master-Detail (Complete ✅)
- Dynamic child routes at `/recipes/:recipeId` with nested `<Outlet />`.
- Responsive master-detail layout (desktop 2-column grid; mobile catalog list to full-width detail with back link).
- Direct deep-linking and URL synchronization.
- 404 fallback for invalid recipe IDs.

### Phase 3: Mobile App (React Native Expo) — Foundation & Smoke Screen (Complete ✅)
- Initialized `apps/mobile` with Expo SDK 57, React Native 0.86, and React 19.2.8.
- Configured Metro bundler automatic monorepo workspace resolution (`metro.config.js`).
- Implemented Expo Router root stack layout (`app/_layout.tsx`) with dark status bar and safe area context.
- Built educational Smoke Screen (`app/index.tsx`) demonstrating native primitives (`ScrollView`, `View`, `Text`, `TextInput`) and `StyleSheet.create` consuming `INDUSTRIAL_PRECISION_THEME` tokens.
- Verified domain logic integration (`calculateWaterAmount`, `DEFAULT_PRESET_RECIPES`) and verified bundling on iOS and Android.

### Phase 3A: Mobile App — Bottom Tab Navigation Shell (Complete ✅)
- Implemented Expo Router `app/(tabs)/_layout.tsx` native bottom tabs navigator.
- Integrated `react-native-svg` and `lucide-react-native` for 1-to-1 visual icon parity with the web app (`Timer`, `BookOpen`, `Coffee`, `Wrench`, `Award`).
- Styled tab bar, screen headers, and panel cards strictly with `INDUSTRIAL_PRECISION_THEME.colors` (zero hardcoded hex values).
- Migrated interactive smoke features to default tab route `/` (`app/(tabs)/index.tsx`).
- Created dedicated tab screens for Recipes catalog (`app/(tabs)/recipes.tsx`), Stash (`app/(tabs)/stash.tsx`), Equipment (`app/(tabs)/equipment.tsx`), and Cupping (`app/(tabs)/cupping.tsx`).
- Verified zero errors across 21/21 `npx expo-doctor` checks, 132/132 monorepo unit tests, and production Metro bundling for both iOS (3,089 modules) and Android (3,234 modules).

### Phase 3B: Mobile App — Interactive Brew Timer Subsystem (Complete ✅)
- Implemented drift-free precision timing hook `useMobileBrewTimer` using `performance.now()` wall-clock delta calculation and integer-second state dispatches to eliminate 60fps bridge re-renders.
- 1-to-1 visual continuity with web app instrument faceplate (`TimerView.tsx`): oversized 84pt tabular monospaced clock (`MM:SS`) with centered colon, sleek linear progress bar, 3-column chassis metrics grid (`COFFEE DOSE`, `WATER TARGET`, `POUR TO` in accent orange), hairline dividers, and unified `START BREW` / `PAUSE` / `RESUME` controls transitioning smoothly to `RESET` with `RotateCcw` upon completion.
- Direct inline tap-to-edit dose input on the faceplate (`COFFEE DOSE`) with boundary validation (1g–100g) and real-time recipe water target rescaling via `rescaleRecipeDose`, locked to read-only during active brews.
- Dynamic quick-start method selector (`MethodPills`) dynamically derived from preset recipes (`DEFAULT_PRESET_RECIPES`) with touch targets meeting/exceeding Apple HIG 44px minimum and an `Alert.alert` confirmation guard against accidental mid-brew wipes.
- Integrated tactile feedback (`expo-haptics`) for 3-2-1 countdown ticks, stage transitions, brew completion, and dose apply confirmation, with graceful fallback on simulators.
- Integrated audio chime cue playback (`expo-audio`) with bundled sound asset (`assets/sounds/chime.wav`, matching web's staggered C5 major arpeggio), respecting the faceplate mute toggle.
- Retained standalone ratio calculator in an accordion card (`CollapsibleCalculator`) defaulting to collapsed with live summary badge, decimal-pad numeric inputs with accessibility labels, and bidirectional dose synchronization with visual/tactile apply feedback.
- Unified typography across iOS and Android with Google Fonts `Outfit` (Light 300) and `JetBrains Mono` (Bold 700 / Medium 500 / Regular 400) via `expo-font`, eliminating Android font-family system fallbacks via dedicated `FONTS.monoMedium`.
- Built active stage guidance card (`ActiveStageCard`) and vertical step timeline (`StageTimeline`).
- Comprehensive unit test coverage: 7 test suites / 49 tests in `apps/mobile` (including `TimerHero`, `MethodPills`, `CollapsibleCalculator`, `ActiveStageCard`, `StageTimeline`, `useMobileBrewTimer`, and tab integration), bringing monorepo totals to 24/24 test suites passed (146 tests total), zero TypeScript errors, and clean Metro production bundles (iOS: 3,156 modules, Android: 3,278 modules).

### Phase 3C: Mobile App — Supabase Auth & Secure Storage (Complete ✅)
- Enhanced `createBrewlogClient` in `@brewlog/supabase` with `BrewlogClientOptions` supporting custom storage adapters and `detectSessionInUrl: false` override to prevent browser window/DOM crashes in native React Native runtimes.
- Implemented `LargeSecureStore` AES-256 CTR hybrid storage adapter: bypasses the Android Keystore 2048-byte value limit by generating cryptographic 256-bit AES keys stored in hardware-backed `expo-secure-store` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY` keychain accessibility) while persisting encrypted ciphertext in `@react-native-async-storage/async-storage`.
- Configured iOS App Store export compliance in `apps/mobile/app.json` (`ios.config.usesNonExemptEncryption: false`), exempting the app under US EAR ECCN 5D992.c for standard auth/storage data protection.
- Built native `AuthContext` and `useAuth` hook with real-time Supabase auth state change listener, auto-refresh lifecycle hooks on `AppState` transitions, and sanitized user-facing error messaging.
- Created `ProfileHeaderButton` navigation component positioned in the top-right header across all tab screens (`apps/mobile/app/(tabs)/_layout.tsx`), displaying Barista avatar initials badge when signed in and outline user icon when unauthenticated, with Apple HIG-compliant >= 44pt touch targets.
- Implemented `AuthSheet` with industrial precision theme styling, segmented mode switcher (Sign In, Create Account, Forgot Password), email/password validation, clear error/success banners, and tactile feedback (`expo-haptics`).
- Refactored `AuthSheet` from React Native `<Modal>` to an in-tree absolute overlay (see [ADR 006](file:///Users/greglawrence/Projects/brewlog/docs/adr/006-android-autofill-and-in-tree-modal-overlays.md)) to eliminate Android `Dialog` window isolation, enabling first-class password manager support (Bitwarden inline/manual autofill), explicit keyboard dismissal, animated keyboard padding, and hardware back button handling.
- Relocated test files outside the Expo Router `app/` hierarchy to prevent Vite/Vitest development artifacts from leaking into production bundles.
- Maintained 100% test pass rate across 33 test suites (226 tests passing monorepo-wide), 21/21 clean `expo-doctor` diagnostic checks, zero TypeScript errors, and production Metro bundling for iOS (3,222 modules, 5.3MB) and Android (3,356 modules, 5.7MB).

### Phase 4: Mobile App — Recipe Studio & Catalog Integration (Complete ✅)
- Implemented offline-first `RecipeContext` with immediate AsyncStorage hydration (`@brewlog/mobile:recipes_cache`) and automated Supabase cloud sync for authenticated users.
- Built dynamic horizontal `MethodFilterBar` and `RecipeCard` with method badges, ratio summaries, and Apple HIG-compliant >= 44pt touch targets.
- Created `RecipesCatalogScreen` and connected to `app/(tabs)/recipes.tsx` with search filtering and direct routing to the recipe builder.
- Designed comprehensive `RecipeDetailScreen` (`app/recipe/[id].tsx`) combining 4-card `SpecsGrid`, tactile `DoseRescaler` (-/+ 1g steppers and quick dose presets), ordered `StagesTimeline`, and one-tap "BREW WITH THIS RECIPE" timer parameter handoff.
- Implemented modal `RecipeBuilderScreen` (`app/recipe/builder.tsx`) supporting full CRUD lifecycle (create, edit in-place, duplicate fork), interactive stage management with automatic sequential timing recalculation (`timingUtils.ts`), stage type pills, notes, and strict validation guards.
- Protected official presets (`preset-*`) against mutation and accidental deletion.
- Integrated `TimerScreen` (`app/(tabs)/index.tsx`) with `RecipeContext` and added an active brew confirmation guard (`Alert.alert`) to prevent mid-brew state wipes.
- Maintained 100% test pass rate across 43 test suites (248 tests passing monorepo-wide), zero TypeScript errors, zero inline styles, and production Metro bundling for iOS (3,234 modules, 5.4MB) and Android (3,368 modules, 5.7MB).

### Phase 5: Mobile App — Stash Manager & Cellar Inventory (Complete ✅)
- **Core Domain & Supabase Extensions**:
  - Extended `@brewlog/core` with roast resting window utilities (`calculateRestingStatus`, `calculateRestingDays`, `getRestingBadgeConfig`, `formatRestingSummary`, `SHELF_PARTITIONS`) supporting 5 distinct resting states (`needs_rest`, `peak`, `aging`, `past_peak`, `frozen`) and dynamic partition grouping (`Active Bar`, `Sealed Vault`, `Frozen Archive`, `Depleted Cemetery`).
  - Extended `@brewlog/supabase` with `CoffeeBean` / `CoffeeBeanInsert` / `CoffeeBeanUpdate` types and bidirectional camelCase/snake_case mappers (`mapDbToCoffeeBean`, `mapCoffeeBeanToDb`, `mapCoffeeBeanToUpdateDb`) preserving offline local IDs.
- **Offline-First Persistence (`StashContext`)**:
  - Implemented `StashContext` with immediate AsyncStorage hydration (`@brewlog/mobile:stash_cache`) and automated Supabase cloud sync for authenticated users.
  - Sample bean catalog fallback for instant unauthenticated exploration.
  - Optimistic updates with zero-latency feedback for creating, updating, archiving, deleting, and freezing/unfreezing beans.
- **Cellar UI & Inventory Telemetry**:
  - Built `CellarSummaryBar` displaying total bag count, cellar volume in grams, and peak-window freshness counts.
  - Built `BeanCard` with remaining weight progress indicators, roast timeline badges, freeze state toggling, and Apple HIG-compliant touch targets (>= 44pt).
  - Built `StashCatalogScreen` (`app/(tabs)/stash.tsx`) with segmented shelf filters, search query filtering, and smooth navigation to detail and creation flows.
- **Deep Bag Management & Navigation**:
  - Built dynamic `BeanDetailScreen` (`app/stash/[id].tsx`) featuring roast resting timeline visualizer, weight gauge with quick dose steppers (-/+ 1g and 15g/18g buttons), freezer toggle, deletion confirmation guard, and one-tap "BREW WITH THIS COFFEE" handoff.
  - Built modal `BeanModalScreen` (`app/stash/modal.tsx`) supporting full bag creation and editing with roast level chips, process tags, weight inputs, resting days configuration, and keyboard-avoiding container.
- **Bidirectional Timer Handoff & Dose Deduction**:
  - Connected `TimerScreen` (`app/(tabs)/index.tsx`) to `StashContext`: displays pinned active bean badge on instrument faceplate and prompts a 1-tap dose deduction card upon brew completion (`deductDose`).
- **Comprehensive Quality Verification**:
  - 100% test pass rate across 54 test suites (363 tests passing monorepo-wide), 21/21 clean `expo-doctor` diagnostic checks, zero TypeScript errors (`tsc --noEmit`), and clean production Metro bundles (iOS: 3,244 modules, 5.5MB; Android: 3,378 modules, 5.8MB).

---

## 📋 Technical Debt & Component Refactoring (TODO)

### 🔗 Human-Friendly URL Slugs for Custom Recipes
- [ ] **Hybrid Slug-ID Routing (`/recipes/:slug--:id` or short hash)**:
  - Custom recipes currently use raw UUIDs in their URL path (e.g. `/recipes/750e6dda-1814-42a3-9a0f-f97220c202a9`).
  - Implement a hybrid slug pattern (e.g. `/recipes/my-morning-v60--750e6dda`).
  - Update route matching to extract the UUID/ID portion for recipe lookup while displaying the human-readable slug for sharing, readability, and bookmarking without database collision risks.

### 🧩 Recipe Feature Component Decomposition
Once Phase 2 routing is complete and stabilized with passing tests, decompose the recipe UI components into focused, single-responsibility units:

- [ ] **`RecipeDetailPane` Decomposition**:
  - `RecipeHeader.tsx` — Recipe title, author, brew method badge, preset/custom badges, and header action buttons ("Brew with this Recipe", delete).
  - `RecipeDoseSlider.tsx` — Coffee dose rescaling range slider, dose indicators, and scaling math.
  - `RecipeSpecsGrid.tsx` — 4-card specifications grid (Total Water, Brew Ratio, Target Time, Water Temp).
  - `RecipeStepsTimeline.tsx` — Step-by-step instruction timeline with duration, target water weights, and descriptions.
- [ ] **`RecipeCatalogList` Decomposition**:
  - `RecipeCard.tsx` — Individual recipe card with method badges, ratio summary, and selection/delete actions.
  - `MethodFilterTabs.tsx` — Reusable brew method filter buttons.

### 🫘 Coffee Stash Deep-Linking (Phase 2B - Web Only `@brewlog/web`)
> [!NOTE]
> Coffee Stash deep-linking and dedicated screens are already fully implemented on mobile (`@brewlog/mobile`) via Expo Router routes `app/stash/[id].tsx` and `app/stash/modal.tsx`. The items below represent technical debt specific to the web client (`apps/web`).

- [ ] *(Web Only)* Implement Approach B (single component route with `useParams`) for `/stash/:beanId` to explore the alternative dynamic routing pattern in `@brewlog/web`.
- [ ] *(Web Only)* Create dedicated bean detail view / modal route on web.

### 🔤 Typography & Font Auditing (Eliminate Serif Lowercase Fonts)
- [ ] **Purge Serif / Fallback Lowercase Fonts**:
  - Audit all typography across mobile (`apps/mobile`) and web (`apps/web`) to eliminate any accidental serif fonts or unstyled browser serif fallbacks (e.g. default browser Times New Roman rendering in lowercase).
  - Enforce consistent industrial sans-serif (`Outfit`, system sans) and monospaced (`JetBrains Mono`) font stacks across all headers, body text, form labels, and badge pills.
  - Ensure web font fallbacks always specify `sans-serif` or `monospace` generic font families to prevent browser default serif degradation before custom web fonts hydrate.

### 📅 Mobile Date Picker Integration
- [ ] **Native Date Picker (`@react-native-community/datetimepicker`)**:
  - Replace manual text date input for Roast Date in `BeanModalScreen.tsx` with a native calendar / date wheel modal.
  - Automatically respects user device locale (e.g. Month/Day/Year in US, Day/Month/Year in UK/EU) and eliminates manual typing and punctuation keystrokes.

---

## 🚀 Upcoming Project Milestones

### Core Platform & Mobile Milestones
- [x] **Phase 4: Mobile Recipe Studio & Catalog Integration (Complete ✅)** *(Design Spec: [docs/superpowers/specs/2026-09-20-phase-4-recipe-studio-design.md](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-09-20-phase-4-recipe-studio-design.md))*:
  - Native stack and modal navigation (`app/recipe/[id].tsx`, `app/recipe/builder.tsx`).
  - Full recipe lifecycle on mobile: create, edit, fork/duplicate, and delete.
  - Timer parameter handoff ("Brew with this Recipe" CTA from detail to active timer).
  - Dynamic method pills and offline-first cloud synchronization via Supabase.
- [x] **Phase 5: Mobile Stash Manager & Cellar Inventory (Complete ✅)** *(Design Spec: [docs/superpowers/specs/2026-09-22-phase-5-stash-manager-design.md](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-09-22-phase-5-stash-manager-design.md))*:
  - Native bean cellar and bag inventory management (`app/(tabs)/stash.tsx`).
  - Roast date age calculation with resting status indicators (`Needs Rest`, `Peak`, `Aging`, `Past Peak`, `Frozen`).
  - Quick bean selection link to active brew sessions with 1-tap dose deduction upon completion.
  - Modal bag creator/editor (`app/stash/modal.tsx`) and detail screen (`app/stash/[id].tsx`).
- [ ] **Phase 6: Free Brew (Manual Timer) & Nested Ratio Translator**:
  - **Core Domain Math (`@brewlog/core`)**: Expand `calculator.ts` with bidirectional proportional calculation helpers (`calculateRatio`, target water/coffee proportional scaling from locked ratio). Comprehensive unit tests covering decimal rounding, edge cases, and zero states.
  - **Nested Ratio Translator (`CollapsibleCalculator`)**: Nested collapsible drawer inside the existing calculator card. Enter source coffee:water values (or direct ratio) to establish a baseline, then solve for target coffee or water dynamically with one-tap dose application to the active timer.
  - **Free Brew Mode (Timer Subsystem)**: Dedicated recipe-free mode directly on the Timer screen (web and mobile). Replaces structured recipe stages and water progression with an open-ended precision stopwatch, manual split/lap markers (bloom, first pour, draw-down), and immediate ratio translator access without cluttering the mobile 5-tab bar.
- [ ] **Phase 7: User Preferences & Settings Subsystem (Cross-Platform)**:
  - **Supabase Cloud Schema (`@brewlog/supabase`)**: `user_settings` table keyed to `user_id` with Row-Level Security (RLS) policies and offline-first local cache fallback. Initial schema stores `default_timer_mode` (`'recipe'` | `'manual'`), `date_format` (`'locale'` | `'MM/DD/YYYY'` | `'DD/MM/YYYY'` | `'YYYY-MM-DD'`), `weight_unit` (`'metric'` [grams/g] | `'imperial'` [ounces/oz, pounds/lb]), and `temperature_unit` (`'celsius'` | `'fahrenheit'`), architected to scale for future preferences (haptic/audio cues, default brew method).
  - **Settings UI & Navigation**:
    - **Mobile**: Settings entry button situated in the slide-up account tray (`AuthSheet` opened via `ProfileHeaderButton`), preserving Apple HIG 5-tab ergonomics. Includes selectors for weight scale (metric/imperial), temperature units, and date format.
    - **Web**: Settings option in the account dropdown menu routing to `/settings`.
  - **Boot Lifecycle & Domain Converters**: Hydrates user settings on startup and automatically initializes the Timer, Stash bag weights, and Recipe spec displays with localized conversion helpers (`g` ↔ `oz`, `°C` ↔ `°F`) while preserving canonical metric units in core domain stores.
- [ ] **Phase 8: Native Cupping Session Logging Flow**:
  - Complete SCA 10-attribute scoring protocol form on native (`app/(tabs)/cupping.tsx`).
  - Radar chart visualization and spider graphs for sensory profiles.
  - Session history and exportable cupping sheets.
- [ ] **Phase 9: Platform-Adaptive Navigation & Native Design Systems**:
  - **iOS Liquid Glass Navigation**: Implement native translucent headers and floating tab bar materials (`headerTransparent`, `headerBlurEffect`, under-content scrolling) for iOS 26/27 while preserving solid core theme tokens for cross-platform stability.
  - **Android Material 3 Support with Expo UI**: Implement first-class Material Design 3 navigation chrome and components via Expo UI / Jetpack Compose primitives (tonal elevation, surface container scrolling, native predictive back gesture integration, and dynamic theme tokens).
- [ ] **Phase 10: Responsive Adaptive Layouts (Landscape, Foldables & Tablets)**:
  - **Dynamic Breakpoints & Orientation**: Implement `useDeviceLayout` consuming `useWindowDimensions` and device orientation to handle compact phones, landscape mode, foldables (unfolded 600dp–840dp), and large tablets (>840dp).
  - **Landscape Brew Station Layout**:
    - Dual-column chassis for the Timer view (`app/(tabs)/index.tsx`): oversized stopwatch and brew controls pinned to the left; active stage guidance, vertical timeline, and dose calculator on the right.
    - Eliminates vertical scrolling during active pour-overs when mounted or rested horizontally on a coffee bar stand.
  - **Foldable & Tablet Master-Detail Adaptation**:
    - Adaptive multi-column grid layout for Stash (`app/(tabs)/stash.tsx`) and Recipe catalog (`app/(tabs)/recipes.tsx`).
    - Two-pane Master-Detail view on tablets and unfolded foldables (catalog list on the left, full detail/editor pane on the right).
  - **Tabletop / Flex Mode Posture Awareness**: Support half-folded postures (Pixel Fold, Galaxy Z Fold) placing the active timer hero on the upper screen half and tactile controls/metrics on the bottom surface.

---

### ⌚ Companion Platforms & Wearables
- **WearOS Companion**: Standalone wearable companion app and watch tile for glanceable brew timing, countdown alerts, and pour cues (Jetpack Compose, Wearable DataLayer).
- **watchOS Companion**: Standalone Apple Watch companion app and Lock Screen / Smart Stack complications for active brew progress (SwiftUI, WatchConnectivity).
