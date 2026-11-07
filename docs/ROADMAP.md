# BrewLog Roadmap & Technical Debt

This document tracks active milestones, completed engineering deliverables, architectural refactors, and technical debt items for BrewLog across web, mobile, and shared packages.

---

## Active & Completed Milestones

### Phase 1: Web App Core Routing (Complete)
- Declarative client-side routing via React Router v8 library mode (`BrowserRouter`, `Routes`, `Route`, `Outlet`, `NavLink`, `Link`).
- Dedicated routes for `/timer`, `/stash`, `/recipes`, `/equipment`, `/reviews` (with legacy `/cupping` redirect), `/settings`, and catch-all `*` 404 page (`NotFoundRoute`).
- Preserved root shell layout (`RootLayout`) and persistent authentication handling.

### Phase 2: Dynamic Recipe Routing & Master-Detail (Complete)
- Dynamic child routes at `/recipes/:recipeId` with nested `<Outlet />`.
- Responsive master-detail layout (desktop 2-column grid; mobile catalog list to full-width detail with back link).
- Direct deep-linking and URL synchronization.
- 404 fallback for invalid recipe IDs.

### Phase 3: Mobile App (React Native Expo) — Foundation & Smoke Screen (Complete)
- Initialized `apps/mobile` with Expo SDK 57 (subsequently upgraded to Expo SDK 58, React Native 0.88, and React 19.3).
- Configured Metro bundler automatic monorepo workspace resolution (`metro.config.js`).
- Implemented Expo Router root stack layout (`app/_layout.tsx`) with status bar and safe area context.
- Built initial Smoke Screen demonstrating native primitives (`ScrollView`, `View`, `Text`, `TextInput`) and `StyleSheet.create` consuming shared design tokens.
- Verified domain logic integration (`calculateWaterAmount`, `DEFAULT_PRESET_RECIPES`) and verified bundling on iOS and Android.

### Phase 3A: Mobile App — Bottom Tab Navigation Shell (Complete)
- Implemented Expo Router `app/(tabs)/_layout.tsx` bottom tabs navigator and platform-specific `app/(tabs)/_layout.ios.tsx` (`NativeTabs`).
- Integrated `react-native-svg` and `lucide-react-native` for 1-to-1 visual icon parity with the web app (`Timer`, `BookOpen`, `Bean`, `Scale`, `Award`).
- Styled tab bar, screen headers, and panel cards strictly with shared theme tokens (zero hardcoded hex values).
- Created dedicated tab screens for Timer (`app/(tabs)/index.tsx`), Recipes catalog (`app/(tabs)/recipes.tsx`), Stash (`app/(tabs)/stash.tsx`), Equipment (`app/(tabs)/equipment.tsx`), and Reviews (`app/(tabs)/reviews.tsx`).

### Phase 3B: Mobile App — Interactive Brew Timer Subsystem (Complete)
- Implemented drift-free precision timing hook `useMobileBrewTimer` using `performance.now()` wall-clock delta calculation and integer-second state dispatches to eliminate 60fps bridge re-renders.
- 1-to-1 visual continuity with web app instrument faceplate (`TimerView.tsx`): oversized 84pt tabular clock (`MM:SS`) with centered colon, sleek linear progress bar, 3-column chassis metrics grid (`COFFEE DOSE`, `WATER TARGET`, `POUR TO` / `RATIO`), hairline dividers, and unified `START BREW` / `PAUSE` / `RESUME` controls transitioning smoothly to `RESET` with `RotateCcw` upon completion.
- Direct inline tap-to-edit metric inputs on the faceplate (`COFFEE DOSE`, `WATER TARGET`, `RATIO`) with boundary validation and real-time recipe rescaling, locked to read-only during active brews.
- Dynamic quick-start method selector (`MethodPills`) dynamically derived from preset recipes (`DEFAULT_PRESET_RECIPES`) with touch targets meeting/exceeding Apple HIG 44pt minimum and an `Alert.alert` confirmation guard against accidental mid-brew wipes.
- Integrated tactile feedback (`expo-haptics`) for 3-2-1 countdown ticks, stage transitions, brew completion, and dose apply confirmation, with graceful fallback on simulators.
- Integrated audio chime cue playback (`expo-audio`) with bundled sound asset (`assets/sounds/chime.wav`, matching web's staggered C5 major arpeggio), respecting the faceplate mute toggle.
- Standalone ratio calculator in an accordion card (`CollapsibleCalculator`) defaulting to collapsed with live summary badge, decimal-pad numeric inputs with accessibility labels, and bidirectional dose synchronization with visual/tactile apply feedback.
- Unified typography across iOS and Android with Google Fonts `Outfit` and `JetBrains Mono` via `expo-font`.
- Built active stage guidance card (`ActiveStageCard`) and vertical step timeline (`StageTimeline`).

### Phase 3C: Mobile App — Supabase Auth & Secure Storage (Complete)
- Enhanced `createBrewlogClient` in `@brewlog/supabase` with `BrewlogClientOptions` supporting custom storage adapters and `detectSessionInUrl: false` override to prevent browser window/DOM crashes in native React Native runtimes.
- Implemented `LargeSecureStore` AES-256 CTR hybrid storage adapter: bypasses the Android Keystore 2048-byte value limit by generating cryptographic 256-bit AES keys stored in hardware-backed `expo-secure-store` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY` keychain accessibility) while persisting encrypted ciphertext in `@react-native-async-storage/async-storage`.
- Configured iOS App Store export compliance in `apps/mobile/app.json` (`ios.config.usesNonExemptEncryption: false`), exempting the app under US EAR ECCN 5D992.c for standard auth/storage data protection.
- Built native `AuthContext` and `useAuth` hook with real-time Supabase auth state change listener, auto-refresh lifecycle hooks on `AppState` transitions, and sanitized user-facing error messaging.
- Created `ProfileHeaderButton` navigation component positioned in the top-right header across all tab screens, displaying Barista avatar initials badge when signed in and outline user icon when unauthenticated, with Apple HIG-compliant >= 44pt touch targets.
- Implemented `AuthSheet` with segmented mode switcher (Sign In, Create Account, Forgot Password), email/password validation, clear error/success banners, and tactile feedback (`expo-haptics`).
- Refactored `AuthSheet` from React Native `<Modal>` to an in-tree absolute overlay (see [ADR 006](./adr/006-android-autofill-and-in-tree-modal-overlays.md)) to eliminate Android `Dialog` window isolation, enabling first-class password manager support (Bitwarden inline/manual autofill), explicit keyboard dismissal, animated keyboard padding, and hardware back button handling.
- Relocated test files outside the Expo Router `app/` hierarchy to prevent Vite/Vitest development artifacts from leaking into production bundles.

### Phase 4: Mobile App — Recipe Studio & Catalog Integration (Complete)
- Implemented offline-first `RecipeContext` with immediate AsyncStorage hydration (`@brewlog/mobile:recipes_cache`) and automated Supabase cloud sync for authenticated users.
- Built dynamic horizontal `MethodFilterBar` and `RecipeCard` with method badges, ratio summaries, and Apple HIG-compliant >= 44pt touch targets.
- Created `RecipesCatalogScreen` and connected to `app/(tabs)/recipes.tsx` with search filtering and direct routing to the recipe builder.
- Designed comprehensive `RecipeDetailScreen` (`app/recipe/[id].tsx`) combining 4-card `SpecsGrid`, tactile `DoseRescaler` (-/+ 1g steppers and quick dose presets), ordered `StagesTimeline`, and one-tap "BREW WITH THIS RECIPE" timer parameter handoff.
- Implemented modal `RecipeBuilderScreen` (`app/recipe/builder.tsx`) supporting full CRUD lifecycle (create, edit in-place, duplicate fork), interactive stage management with automatic sequential timing recalculation (`timingUtils.ts`), stage type pills, notes, and strict validation guards.
- Protected official presets (`preset-*`) against mutation and accidental deletion.
- Integrated `TimerScreen` (`app/(tabs)/index.tsx`) with `RecipeContext` and added an active brew confirmation guard (`Alert.alert`) to prevent mid-brew state wipes.

### Phase 5: Mobile App — Stash Manager & Cellar Inventory (Complete)
- **Core Domain & Supabase Extensions**:
  - Extended `@brewlog/core` with roast resting window utilities (`calculateBeanRestingInfo`, `offsetRoastDateForThaw`, `SHELF_PARTITIONS`) supporting distinct resting states (`resting`, `peak`, `aging`, `past-peak`, plus `isFrozen`) and dynamic partition grouping.
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
  - Connected `TimerScreen` (`app/(tabs)/index.tsx`) to `StashContext`: displays pinned active bean badge (`ActiveBeanPill`) on instrument faceplate and prompts a 1-tap dose deduction card upon brew completion (`deductDose`).

### Phase 6: Free Brew (Manual Timer) & Nested Ratio Translator (Complete)
- **Core Domain Math & Types (`@brewlog/core`)**:
  - Implemented bidirectional proportional calculation utilities in `calculator.ts` (`calculateRatio`, `calculateTargetWater`, `calculateTargetCoffee`, `solveProportionalScale`, `splitsToRecipeStages`).
  - Added domain types in `types.ts` (`TimerMode`, `BrewSplit`, `SplitTag`) with division-by-zero guards and sanitized fallbacks.
- **Nested Ratio Translator Drawer**:
  - Built collapsible proportional ratio converter (`CollapsibleCalculator.tsx` on mobile, `WebRatioTranslator.tsx` on web) enabling baristas to dial in baseline doses/water targets, derive implied ratios, and dynamically solve for target coffee or water with 1-tap dose application.
- **Free Brew Precision Stopwatch Subsystem**:
  - Extended timer hooks (`useMobileBrewTimer` and `useBrewTimer`) with open-ended stopwatch execution, split recording, interval delta tracking, and muting of recipe countdown ticks.
  - Built `<FreeBrewSplitTimeline>` for live split milestone tracking and post-brew review with >= 44pt touch targets.
  - Added top segmented control `[ GUIDED RECIPE ] | [ FREE BREW ]` on both mobile (`app/(tabs)/index.tsx`) and web (`TimerView.tsx`) with active brew reset confirmation protection.
- **Multi-Action Completion Flow**:
  - Direct 1-tap Stash deduction card (`deductBeanDose`) updating bean weight in real time.
  - Pre-populated Reviews journal log export containing brew method, coffee dose, total duration, and formatted split milestone notes.
  - One-tap "Save as Custom Recipe" converting recorded splits into structured recipe stages (`splitsToRecipeStages`) and routing into Recipe Builder (`/recipe/builder`).

### Phase 7A: Centralized Cross-Platform Design System Primitives (`@brewlog/ui`) (Complete)
- **Monorepo Workspace Scaffolding (`packages/ui`)**:
  - Established dedicated `@brewlog/ui` package with platform-split file resolution architecture (`.web.tsx` for web with Tailwind v4, `.native.tsx` for React Native with StyleSheet) bound by common TypeScript contracts (`Component.types.ts`), completely avoiding `react-native-web` runtime overhead.
- **Core Primitives & Apple HIG Touch Ergonomics**:
  - `Button`: Primary copper, secondary recessed, ghost, danger; icon slot support, loading spinners, and Apple HIG-compliant >= 44pt touch targets on native.
  - `Card`: Standard chassis surface, recessed panel, interactive active border highlight states, and platform-specific press handling.
  - `Badge`: `mono` uppercase technical badges (roast methods/presets) vs `default` Outfit descriptive tags, plus `accent`, `success`, `warning`, `error`, and `info` status variants.
  - `Input`: Standard text input and dedicated numeric variant with unit suffix, defensive stringification, active focus ring, and web label `htmlFor` pairing.
  - `MetricTile`: Hardware faceplate instrumentation tile with small-caps uppercase eyebrow label and prominent Outfit tabular numeric display.
  - `SegmentedControl`: Accessible cross-platform segmented control (`.web.tsx` / `.native.tsx`) with `radiogroup` / `radio` ARIA semantics and `sm` / `md` sizing tiers.
- **Strict Typography Enforcement**:
  - Strictly purged `JetBrains Mono` from numeric values, inputs, weights, timestamps, and metrics across both web and native apps.
  - Restricted `JetBrains Mono` exclusively to uppercase technical tags and chassis instrument eyebrow labels.
  - Standardized all numeric and readable UI figures on `Outfit` tabular figures.

### Phase 7B: Design System Tokens, Sizing Standardization, Domain Decoupling & Dynamic Theming (Complete / Active)
- **Standardized rem-Based Sizing Scale & Playwright Gate (Issue [#59](https://github.com/Chewieez/brewlog/issues/59) — Complete)**:
  - Standardized interactive control heights on web onto a strict 3-tier rem-based scale (`sm`: `h-8` / 32px, `md`: `h-10` / 40px, `lg`: `h-12` / 48px), eliminating ad-hoc `py-*` button padding and the 36px uncanny valley.
  - Standardized modal dialog footers (`RecipeBuilderModal`, `StashView`, `EquipmentView`, `ConfirmationModal`) to `md` (`h-10` / 40px) and view header triggers (`ADD BEAN`, `ADD EQUIPMENT`, `NEW RECIPE`, `LOG REVIEW`, `RecipeDetailPane` actions) to `sm` (`h-8` / 32px).
  - Implemented Playwright E2E regression gate (`apps/web/e2e/button-sizing-tokens.spec.ts`) verifying 100% button height compliance across all web routes and modals.
- **Semantic Foreground Typography Tokens (Issue [#59](https://github.com/Chewieez/brewlog/issues/59) — Complete)**:
  - Introduced `foreground`, `foregroundSecondary`, and `foregroundMuted` tokens (`--color-foreground*`), replacing 550+ occurrences of duplicated `text-text-*` utility classes with clean `text-foreground`, `text-foreground-secondary`, and `text-foreground-muted` utilities.
- **Domain Freshness Decoupling & Theme Migration to `@brewlog/ui` (Issue [#61](https://github.com/Chewieez/brewlog/issues/61) — Complete)**:
  - Removed all visual theme contracts and hex color codes (`badgeColor`) from `@brewlog/core` (`packages/core/src/theme.ts` deleted; `BeanRestingInfo` returns strictly pure domain values without emojis).
  - Established `@brewlog/ui` (`packages/ui/src/theme/`) as the single source of truth for themes, design tokens, and presentation-layer freshness resolvers (`resolveFreshnessColor`, `resolveFreshnessBadgeVariant`).
- **Dynamic Multi-Theme Architecture & Retirement of `INDUSTRIAL_PRECISION_THEME` (Issue [#64](https://github.com/Chewieez/brewlog/issues/64) — Complete)**:
  - Implemented `ThemeProvider`, `useTheme()`, and memoized `makeStyles()` in `@brewlog/ui` supporting **Tactile Dark Craft** (`TACTILE_DARK_THEME`), **Crisp Studio Light** (`CRISP_STUDIO_LIGHT_THEME`), and system color scheme tracking (`useColorScheme()`).
  - Migrated all 7 native `@brewlog/ui` primitives and all 39 screens/components in `apps/mobile` to dynamic theme tokens, and completely deleted `INDUSTRIAL_PRECISION_THEME`.
- **Web Timer Page Header & Faceplate Alignment (Issue [#63](https://github.com/Chewieez/brewlog/issues/63) — Complete)**:
  - Added standard `Timer` `<h1>` page header with right-aligned `SegmentedControl` mode switcher (`GUIDED RECIPE` | `FREE BREW`) in `TimerView.tsx`, matching page header hierarchy across all web routes.
  - Added inline tap-to-edit faceplate metrics for Coffee Dose, Water Target, and Ratio (`1:X`).
- **Remaining App Primitive Migration**:
  - Continue migrating remaining bespoke cards and inputs in `apps/web` and `apps/mobile` onto `@brewlog/ui` `Card`, `Badge`, `Input`, and `MetricTile` primitives where appropriate.

### Phase 7C: Web Stash Persistence, Core Resting Engine & Recipe Studio Flow Alignment (Complete)
- **Supabase Cloud Schema Alignment**:
  - Executed database migrations `002_align_sca_cupping_attributes.sql` and `003_add_bean_cellar_status.sql` against remote Supabase, resolving PostgREST `42703` errors.
- **Core Domain Promotion (`@brewlog/core`)**:
  - Promoted `calculateBeanRestingInfo` and `offsetRoastDateForThaw` into `@brewlog/core` domain (`restingUtils.ts`), providing pure calculation of resting curves, status labels, freezer pauses, and thaw offsets across web and mobile.
- **Web Stash Flow Alignment & Persistence**:
  - Expanded Add/Edit Bean modal with full origin, terroir, 9 process methods, 5 roast levels, HTML5 date picker, recommended rest days, bag presets, remaining weight, and Freezer Vault storage checkbox.
  - Real-time resting status badges (`peak`, `resting`, `aging`, `past-peak`) and frozen pause indicators (`Frozen at Day X`). Thawing beans offsets roast dates forward by duration frozen.
  - Added `updateBean` and `deleteBean` with danger-variant `ConfirmationModal` and offline resilience (`brewlog_beans_cache`).
- **Web Recipe Studio Editing Flow Alignment**:
  - `useRecipes.updateRecipe` with preset protection (`preset-*`), optimistic local updates, and atomic stage replacement with rollback on error.
  - `RecipeBuilderModal` in edit mode with pre-populated fields and double-invocation guards.

### Phase 7D: Mobile Equipment Catalog & Web Parity (Complete)
- **Core Domain & Presets (`@brewlog/core`)**:
  - Promoted `GrinderSettingScale` (`'stepped-numbers'`, `'clicks'`, `'stepless'`, `'microns'`) and `DEFAULT_INITIAL_EQUIPMENT` starter gear into `@brewlog/core`.
- **Mobile Equipment Subsystem (`apps/mobile`)**:
  - `EquipmentContext`: Offline-first caching with immediate AsyncStorage hydration (`@brewlog/mobile:equipment_cache`), optimistic local mutations, duplicate insert prevention on retry, and automated Supabase cloud sync.
  - `EquipmentCatalogScreen` (`app/(tabs)/equipment.tsx`): Category filter chips (`All`, `Grinders`, `Brewers`, `Scales`, `Kettles`, `Other`), real-time search filtering, favorite gear toggling, and direct routing to add/edit modals.
  - `EquipmentModalScreen` (`app/equipment/modal.tsx`): Full CRUD modal powered by `KeyboardAwareScrollView` with dirty-form discard alerts, confirmation deletion guard, category selector, dial setting format pills, and cold-start hydration guard.
- **Web Alignment & Sync Resilience (`apps/web`)**:
  - `useEquipment`: Preserved empty cache state and unsynced offline records (`local-eq-*`).
  - `EquipmentView`: Real-time search bar, category filter chips (including `Other`), edit modal flow with delete confirmation, and star favorite toggles.

### Phase 8: User Preferences, Dynamic Themes & Settings Subsystem (Complete)
- **Core Domain Conversion & Types (`@brewlog/core`)**:
  - Defined `UserSettings`, `WeightUnit` (`'metric'` | `'imperial'`), `TemperatureUnit` (`'celsius'` | `'fahrenheit'`), `DateFormatPreference` (`'locale'` | `'MM/DD/YYYY'` | `'DD/MM/YYYY'` | `'YYYY-MM-DD'`), and `ThemePreference` (`'system'` | `'tactile_dark'` | `'studio_light'`).
  - Established `DEFAULT_USER_SETTINGS` defaulting to `free_brew`, metric weights, Celsius temperatures, `locale` dates, and `system` theme.
  - Implemented pure conversion and formatting helpers (`gramsToOz`, `ozToGrams`, `celsiusToFahrenheit`, `fahrenheitToCelsius`, `formatWeight`, `formatTemperature`, `formatDisplayDate`) with symmetrical negative weight handling and defensive timezone-safe date parsing.
- **Supabase Cloud Schema & Mappers (`@brewlog/supabase`)**:
  - Authored migration `005_create_user_settings.sql` establishing the `user_settings` table keyed to `user_id` with `set_user_settings_updated_at` trigger and strict Row Level Security (RLS) policies.
  - Exported database definitions (`UserSettingsRow`, `UserSettingsInsert`, `UserSettingsUpdate`) and bidirectional camelCase/snake_case mappers (`mapDbToUserSettings`, `mapUserSettingsToDb`).
- **Offline-First State Management & Cloud Sync**:
  - **Mobile (`SettingsContext`)**: Immediate local hydration via AsyncStorage (`@brewlog/mobile:settings_cache`), optimistic updates, and automated cloud sync.
  - **Web (`SettingsContext`)**: Local hydration via `localStorage` (`brewlog_settings_cache`), dynamic CSS variable theme injection, optimistic updates, and real-time synchronization with Supabase.
- **Dedicated Settings UI & Navigation**:
  - **Mobile**: Built `app/settings/modal.tsx` (`SettingsModalScreen`) accessed via "App Preferences" in `AuthSheet`, featuring `SegmentedControl` selectors for Theme (`SYSTEM`, `DARK`, `LIGHT`), Weight Unit, Temperature Unit, Default Timer Mode, and an expandable Date Format dropdown.
  - **Web**: Built `/settings` route (`SettingsRoute`) accessed via `UserMenu`, featuring Live Preview calibration gauge tiles, theme switcher (`System`, `Tactile Dark`, `Studio Light`), unit selectors, and `ConfirmationModal` factory reset.
- **Telemetry & Faceplate Display Integration**:
  - Connected `TimerHero` on mobile and `TimerView` on web to user settings (`defaultTimerMode`, `formatWeight`, `formatTemperature`).
  - Wired `RecipeDetailScreen`, `RecipeDetailPane`, `BeanDetailScreen`, `ReviewCard`, `ReviewDetailScreen`, `ReviewsView`, and `ReviewDetailPane` to format weights, temperatures, and dates dynamically per user preference.

### Phase 9: Mobile & Web Reviews / Tasting Journal Subsystem & Multi-Grinder Recipe Settings (Complete)
- **Domain & Database Schema (`@brewlog/core` & `@brewlog/supabase`)**:
  - Extended `TastingLog` with equipment associations (`grinderId`, `brewerId`, `grinderSnapshot`, `brewerSnapshot`, `beanId`, `recipeId`) and added `DEFAULT_INITIAL_TASTING_LOGS` presets.
  - Authored migration `004_add_recipe_grinder_settings.sql` adding `grinder_settings JSONB` to `public.recipes` and `RecipeGrinderSetting` domain model in `@brewlog/core`, with full backward-compatible mappers (`recipeMappers.ts`, `tastingLogMappers.ts`).
- **Multi-Grinder Recipe Settings (Issue [#30](https://github.com/Chewieez/brewlog/issues/30))**:
  - Web (`RecipeBuilderModal`, `RecipeDetailPane`) and Mobile (`RecipeBuilderScreen`, `RecipeDetailScreen`) support configuring multiple grinders with specific dial settings per recipe (`Primary` badge on first entry), inline grinder creation when no grinders exist in equipment, automatic filtering of deleted grinders, and primary grinder pre-fill into Timer and Review creation flows.
- **Mobile Reviews Subsystem (`apps/mobile/src/features/reviews`)**:
  - `ReviewsContext`: Offline-first persistence via AsyncStorage (`@brewlog/mobile:reviews_cache`), optimistic CRUD (`addReview`, `updateReview`, `deleteReview`), two-way Supabase sync with UUID guards, and `pendingBrewSession` timer handoff.
  - Sensory & Scoring Components: `ReviewsSummaryBar`, 10-attribute `ScaAttributeScoring` sliders with baseline (`82.5`) and clear (`0.0`) quick-sets, interactive 3-tier SVG `ScaFlavorWheelSvg`, `FlavorTagSelector` (`WHEEL` vs `TAG LIST`), and `ReviewCard` with equipment snapshot telemetry.
  - Screens & Routes: `ReviewsCatalogScreen` (`app/(tabs)/reviews.tsx`), `ReviewDetailScreen` (`app/reviews/[id].tsx`), and full CRUD `ReviewModalScreen` (`app/reviews/modal.tsx`).
- **Web Master-Detail Tasting Journal Redesign & "Cupping" Retirement (`apps/web/src/features/reviews`)**:
  - Renamed legacy `cupping` routes and modules to `reviews` (`/reviews` route with `<Navigate to="/reviews" replace />` from `/cupping`).
  - Redesigned `ReviewsView.tsx` and `ReviewDetailPane.tsx` into a responsive **Master-Detail Tasting Journal**: searchable/filterable master feed on the left (38%) and a single-column right pane (62%) transitioning in-place between the **Sensory Profile Inspector** (Read Mode) and **Review Editor** (Create/Edit Mode).

---

## Technical Debt & Component Refactoring (TODO)

### Human-Friendly URL Slugs for Custom Recipes
- [ ] **Hybrid Slug-ID Routing (`/recipes/:slug--:id` or short hash)**:
  - Custom recipes currently use raw UUIDs in their URL path (e.g. `/recipes/750e6dda-1814-42a3-9a0f-f97220c202a9`).
  - Implement a hybrid slug pattern (e.g. `/recipes/my-morning-v60--750e6dda`).
  - Update route matching to extract the UUID/ID portion for recipe lookup while displaying the human-readable slug for sharing, readability, and bookmarking without database collision risks.

### Recipe Feature Component Decomposition
Decompose the web recipe UI components into focused, single-responsibility units:

- [ ] **`RecipeDetailPane` Decomposition**:
  - `RecipeHeader.tsx` — Recipe title, author, brew method badge, preset/custom badges, and header action buttons ("Brew with this Recipe", edit, delete).
  - `RecipeDoseSlider.tsx` — Coffee dose rescaling range slider, dose indicators, and scaling math.
  - `RecipeSpecsGrid.tsx` — 4-card specifications grid (Total Water, Brew Ratio, Target Time, Water Temp).
  - `RecipeStepsTimeline.tsx` — Step-by-step instruction timeline with duration, target water weights, and descriptions.
- [ ] **`RecipeCatalogList` Decomposition**:
  - `RecipeCard.tsx` — Individual recipe card with method badges, ratio summary, and selection/delete actions.
  - `MethodFilterTabs.tsx` — Reusable brew method filter buttons.

### Bean Stash Deep-Linking (Phase 2B - Web Only `@brewlog/web`)
> [!NOTE]
> Bean Stash deep-linking and dedicated screens are already fully implemented on mobile (`@brewlog/mobile`) via Expo Router routes `app/stash/[id].tsx` and `app/stash/modal.tsx`. The items below represent technical debt specific to the web client (`apps/web`).

- [ ] *(Web Only)* Implement Approach B (single component route with `useParams`) for `/stash/:beanId` to explore the alternative dynamic routing pattern in `@brewlog/web`.
- [ ] *(Web Only)* Create dedicated bean detail view / modal route on web.

### Typography & Font Auditing (Eliminate Serif Lowercase Fonts)
- [ ] **Purge Serif / Fallback Lowercase Fonts**:
  - Audit all typography across mobile (`apps/mobile`) and web (`apps/web`) to eliminate any accidental serif fonts or unstyled browser serif fallbacks (e.g. default browser Times New Roman rendering in lowercase).
  - Enforce consistent sans-serif (`Outfit`, system sans) and monospaced (`JetBrains Mono`) font stacks across all headers, body text, form labels, and badge pills.
  - Ensure web font fallbacks always specify `sans-serif` or `monospace` generic font families to prevent browser default serif degradation before custom web fonts hydrate.

### Mobile Date Picker Integration
- [ ] **Native Date Picker (`@react-native-community/datetimepicker`)**:
  - Replace manual text date input for Roast Date in `BeanModalScreen.tsx` with a native calendar / date wheel modal.
  - Automatically respects user device locale (e.g. Month/Day/Year in US, Day/Month/Year in UK/EU) and eliminates manual typing and punctuation keystrokes.

---

## Upcoming Project Milestones

### Infrastructure & Platform Milestones
- [ ] **Infrastructure: Automated Supabase Migrations & CI/CD Schema Pipeline**:
  - Integrate Supabase CLI into repository tooling (`npm run db:migrate` or `supabase db push`).
  - Configure GitHub Actions CI/CD workflow to validate and automatically execute pending SQL migrations from `packages/supabase/migrations/` upon PR merge to `main`.
  - Add schema validation and type-generation checks to guarantee `database.types.ts` stays in sync with live database schema.
  - Eliminate manual SQL Editor execution steps for new migrations.
- [ ] **Phase 10: Platform-Adaptive Navigation & Native Design Systems (In Progress)**:
  - [x] **Upgraded Mobile Runtime**: Upgraded `apps/mobile` to Expo SDK 58 (`~58.0.17`), React Native 0.88, React 19.3, and TypeScript 6.0.
  - [x] **iOS Native Tabs (`apps/mobile/app/(tabs)/_layout.ios.tsx`)**: Implemented `NativeTabs` from `expo-router/native-tabs` with dynamic `blurEffect` (`dark` / `systemMaterialLight`) and template icons.
  - [x] **Animated Floating Pill Tab Bar (`apps/mobile/src/components/navigation/FloatingPillTabBar.tsx`)**: Implemented custom floating pill tab bar with spring-animated sliding indicator, haptic feedback, and automatic keyboard dismissal hiding.
  - [ ] **Android Material 3 Support with Expo UI**: Expand first-class Material Design 3 navigation chrome and components via Expo UI / Jetpack Compose primitives (tonal elevation, surface container scrolling, native predictive back gesture integration).
- [ ] **Phase 11: Responsive Adaptive Layouts (Landscape, Foldables & Tablets)**:
  - **Dynamic Breakpoints & Orientation**: Implement `useDeviceLayout` consuming `useWindowDimensions` and device orientation to handle compact phones, landscape mode, foldables (unfolded 600dp–840dp), and large tablets (>840dp).
  - **Landscape Brew Station Layout**:
    - Dual-column chassis for the Timer view (`app/(tabs)/index.tsx`): oversized stopwatch and brew controls pinned to the left; active stage guidance, vertical timeline, and dose calculator on the right.
    - Eliminates vertical scrolling during active pour-overs when mounted or rested horizontally on a coffee bar stand.
  - **Foldable & Tablet Master-Detail Adaptation**:
    - Adaptive multi-column grid layout for Stash (`app/(tabs)/stash.tsx`) and Recipe catalog (`app/(tabs)/recipes.tsx`).
    - Two-pane Master-Detail view on tablets and unfolded foldables (catalog list on the left, full detail/editor pane on the right).
  - **Tabletop / Flex Mode Posture Awareness**: Support half-folded postures (Pixel Fold, Galaxy Z Fold) placing the active timer hero on the upper screen half and tactile controls/metrics on the bottom surface.

---

### Companion Platforms & Wearables
- **WearOS Companion**: Standalone wearable companion app and watch tile for glanceable brew timing, countdown alerts, and pour cues (Jetpack Compose, Wearable DataLayer).
- **watchOS Companion**: Standalone Apple Watch companion app and Lock Screen / Smart Stack complications for active brew progress (SwiftUI, WatchConnectivity).
