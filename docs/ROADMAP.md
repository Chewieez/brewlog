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
- 1-to-1 visual continuity with web app instrument faceplate (`TimerView.tsx`): oversized tabular monospaced clock (`MM:SS`), sleek linear progress bar, 3-column chassis metrics grid (`COFFEE DOSE`, `WATER TARGET`, `POUR TO` in accent orange), hairline dividers, and unified START BREW / PAUSE / RESUME / RESET / MUTE hardware controls.
- Integrated tactile feedback (`expo-haptics`) for 3-2-1 countdown ticks, stage transitions, brew completion, and button presses, with graceful fallback on simulators.
- Integrated audio chimes (`expo-audio`) with header mute toggle.
- Built quick-start method pills (`MethodPills`) for instant preset switching (`V60`, `Chemex`, `Aeropress`, `French Press`).
- Retained standalone ratio calculator in an accordion card (`CollapsibleCalculator`) defaulting to collapsed with live summary badge.
- Built active stage guidance card (`ActiveStageCard`) and vertical step timeline (`StageTimeline`).
- Verified 6/6 unit tests in `apps/mobile`, 14/14 test suites monorepo-wide, zero TypeScript errors, and production Metro bundling for both iOS (3,099 modules) and Android (3,244 modules).

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

### 🫘 Coffee Stash Deep-Linking (Phase 2B)
- [ ] Implement Approach B (single component route with `useParams`) for `/stash/:beanId` to explore the alternative dynamic routing pattern.
- [ ] Create dedicated bean detail view / modal route.

---

## 🚀 Upcoming Project Milestones

### Phase 3 Mobile App (Next Slices)
- [ ] **Phase 3C: Supabase Auth & Secure Storage**:
  - Implement `createBrewlogClient` with `expo-secure-store` / `LargeSecureStore` for mobile session persistence.
  - Mobile authentication sheet/modal.
- [ ] **Phase 3D: Mobile Feature Parity**:
  - Recipe studio and stash manager on native.
  - Native cupping session logging flow.

### Wearable Companions
- **Phase 4**: WearOS companion app and tile (Jetpack Compose, Wearable DataLayer).
- **Phase 5**: watchOS companion app and complications (SwiftUI, WatchConnectivity).
