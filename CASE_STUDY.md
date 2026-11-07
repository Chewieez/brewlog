# BrewLog: Multi-Platform Specialty Coffee Engineering Case Study

## Project Overview
BrewLog is a full-stack, cross-platform specialty coffee companion designed to streamline bean cellar inventory, custom recipe creation, multi-grinder calibration, precision brew timing, and SCA tasting evaluations across Web, Mobile, and Wearable platforms (WearOS & watchOS).

---

## Architectural Highlights

### 1. Zero-Duplication Pure Core Domain (`@brewlog/core`)
All coffee math, ratio conversions, stage rescaling, roast resting calculations, unit conversions, and sensory formulas live in an isolated, pure TypeScript package consumed identically by React Web, React Native, and backend functions. Visual theme tokens and hex color codes are strictly excluded from `@brewlog/core` so domain models remain 100% presentation-agnostic.

### 2. Relational Modeling with PostgreSQL & RLS
Unlike generic document stores, specialty coffee data relies on structured relationships between equipment, multi-grinder settings, roast profiles, user calibration preferences, and extraction parameters. Supabase PostgreSQL with strict Row Level Security (RLS) enforces multi-tenant data privacy at the database layer across `beans`, `equipment`, `recipes`, `recipe_stages`, `tasting_logs`, and `user_settings`.

### 3. Precision Web & Mobile Timing Architecture
Interactive timers use wall-clock delta calculation (`performance.now()`) combined with synthesized Web Audio API chimes on web and `expo-audio` / `expo-haptics` on mobile for drift-free stage transitions. Inline tap-to-edit faceplate metrics allow baristas to rescale Coffee Dose, Water Target, or Brew Ratio (`1:X`) directly on the instrument faceplate before extraction.

### 4. Dual Wearable Companion Ecosystem
- **WearOS (`apps/wearos`)**: Built with Jetpack Compose for Wear OS, connecting via Android Wearable DataLayer.
- **watchOS (`apps/watchos`)**: Built with SwiftUI, communicating with the iOS host via WatchConnectivity (WCSession).

### 5. Declarative Client-Side Routing & Master-Detail Architecture
`@brewlog/web` employs React Router v8 library mode for deep-linkable URLs and browser history traversal while avoiding Node runtime overhead. A persistent `<RootLayout>` shell with `<Outlet />` ensures authentication modals, user settings, and shared application state persist across route transitions, while nested routes (`/recipes/:recipeId`) and master-detail views (`/reviews`) power responsive two-pane layouts across desktop and mobile breakpoints.

### 6. Offline-First Stash Inventory & Biochemical Resting Engine
Baristas manage roasted bean cellar inventory with instant local responsiveness via `@brewlog/mobile:stash_cache` and `brewlog_beans_cache`. A pure mathematical resting engine in `@brewlog/core` calculates roast freshness curves (`resting`, `peak`, `aging`, `past-peak`) and pauses degradation during deep-freeze vault storage, while `@brewlog/ui` presentation resolvers (`resolveFreshnessColor`, `resolveFreshnessBadgeVariant`) map domain states to active theme tokens.

### 7. Bidirectional Ratio Translation & Manual Free Brew Stopwatch Engine
BrewLog bridges structured recipe execution with intuitive, unguided brewing via a unified dual-mode timing state machine (`recipe` vs `free_brew`) controlled by a cross-platform `SegmentedControl`. A pure mathematical proportional engine (`@brewlog/core`) computes bidirectional targets ($C_{target}$ from water or $W_{target}$ from coffee) with zero-division protections. Live split-interval tracking records milestone timestamps (+Bloom, +Pours, +Drawdown) and serializes unstructured extractions into structured recipe stages or SCA tasting logs across web and mobile.

### 8. Centralized Cross-Platform Design System (`@brewlog/ui`) & Dynamic Theming
To eliminate styling drift across web (React 19 + Tailwind CSS v4) and mobile (Expo SDK 58 + React Native 0.88 StyleSheet), `@brewlog/ui` provides platform-split primitives (`.web.tsx` and `.native.tsx`) bound by shared TypeScript contracts (`Button`, `Card`, `Badge`, `Input`, `MetricTile`, `SegmentedControl`):
- **Dynamic Multi-Theme Engine**: `@brewlog/ui` serves as the single source of truth for **Tactile Dark Craft** (`TACTILE_DARK_THEME`) and **Crisp Studio Light** (`CRISP_STUDIO_LIGHT_THEME`). On mobile, `ThemeProvider`, `useTheme()`, and memoized `makeStyles()` dynamically re-theme all 39 screens, navigation bars, and native primitives without static stylesheet lock-in; on web, semantic CSS variables (`--color-foreground`, `--color-panel`, `--color-accent`) update reactively at the document root.
- **Standardized Sizing Scale & Automated E2E Gates**: Interactive controls on web follow a strict 3-tier rem-based height scale (`sm`: `2rem` / 32px, `md`: `2.5rem` / 40px, `lg`: `3rem` / 48px), eliminating arbitrary padding and verified continuously by Playwright E2E regression tests (`button-sizing-tokens.spec.ts`).
- **Typography Discipline**: Restricts `JetBrains Mono` strictly to uppercase technical tags and chassis instrument eyebrows while standardizing all numeric metrics, timers, and inputs on `Outfit` tabular figures (`tabular-nums`).

### 9. User Preferences, Cloud Synchronization & Localized Instrument Telemetry
BrewLog maintains canonical data representations in metric units ($g$, $ml$, $^{\circ}\text{C}$) across its core database and calculation engine, while delivering offline-first preference management across Web and Mobile:
- **Pure Domain Conversion Engine (`@brewlog/core`)**: Bi-directional mathematical converters (`gramsToOz`, `ozToGrams`, `celsiusToFahrenheit`, `fahrenheitToCelsius`) and localized formatters (`formatWeight`, `formatTemperature`, `formatDisplayDate`) isolate presentation formatting from underlying domain models.
- **Offline-First Synchronization Architecture**: Mobile (`@brewlog/mobile:settings_cache`) and Web (`brewlog_settings_cache`) contexts guarantee zero-latency boot hydration, optimistic local updates, and automatic bi-directional synchronization with `public.user_settings` upon authentication.
- **Dynamic Faceplate Telemetry & Personalization**: The brew timer, stage guidance timelines, dose rescalers, and recipe specification cards dynamically adapt to user-selected weight ($g$ vs $oz$), temperature ($^{\circ}\text{C}$ vs $^{\circ}\text{F}$), date format, default timer mode (`free_brew` vs `recipe`), and visual theme (`system`, `tactile_dark`, `studio_light`).

### 10. Offline-First Reviews, Sensory Tasting Journal & Multi-Grinder Calibration
- **Master-Detail Tasting Journal & Native Reviews**: Mobile (`ReviewsContext`, `ReviewsCatalogScreen`, `ReviewDetailScreen`, `ReviewModalScreen`) and Web (`ReviewsView`, `ReviewDetailPane` at `/reviews`) provide full offline-first CRUD for SCA sensory evaluations, combining a 10-attribute scoring matrix with an interactive 3-tier polar SVG SCA Flavor Wheel and descriptor tag list.
- **Multi-Grinder Recipe Settings & Equipment Snapshots**: Recipes store ordered multi-grinder dial settings (`grinderSettings` JSONB), supporting inline grinder creation inside the Recipe Builder, automatic filtering of deleted equipment, primary grinder pre-fill into the Brew Timer and Review forms, and historical equipment snapshots (`grinderSnapshot`, `brewerSnapshot`) on every logged review.

---

## Learning Roadmap & Architecture Decision Records
- [`docs/adr/001-monorepo-and-shared-domain.md`](./docs/adr/001-monorepo-and-shared-domain.md) — Monorepo Architecture & Shared Domain
- [`docs/adr/002-database-choice-and-supabase-rls.md`](./docs/adr/002-database-choice-and-supabase-rls.md) — Database Choice & Supabase RLS
- [`docs/adr/003-supabase-typescript-multiplatform-best-practices.md`](./docs/adr/003-supabase-typescript-multiplatform-best-practices.md) — Multi-Platform Supabase TypeScript Patterns
- [`docs/adr/004-client-side-declarative-routing.md`](./docs/adr/004-client-side-declarative-routing.md) — Declarative Routing via React Router v8
- [`docs/adr/005-offline-stash-management-and-resting-engine.md`](./docs/adr/005-offline-stash-management-and-resting-engine.md) — Offline-First Stash Management & Resting Engine
- [`docs/adr/006-android-autofill-and-in-tree-modal-overlays.md`](./docs/adr/006-android-autofill-and-in-tree-modal-overlays.md) — Android Autofill & In-Tree Modal Overlays
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — Macro Milestones & Technical Debt Tracker
