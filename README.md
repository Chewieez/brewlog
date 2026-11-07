# BrewLog

> A specialty coffee brewing companion built to learn React, React Native, Expo, Wear OS, watchOS, and agentic AI-driven development.

Multi-platform specialty coffee tracking, custom recipe manager, interactive brew timer, and SCA tasting journal. Built with **React 19**, **Tailwind CSS v4**, **React Native (Expo SDK 58)**, **TypeScript 6**, and **Supabase (PostgreSQL)**.

---

## Architecture & Monorepo Structure

```
brewlog/
├── apps/
│   ├── web/               # React 19 + Tailwind CSS v4 + Vite + Playwright E2E
│   ├── mobile/            # React Native 0.88 (Expo SDK 58) + Expo Router + TypeScript
│   ├── wearos/            # (Planned) WearOS Companion App & Tile (Jetpack Compose)
│   └── watchos/           # (Planned) Apple watchOS Companion App & Complications (SwiftUI)
├── packages/
│   ├── core/              # Pure domain types, brew math, resting curves, unit conversions & SCA flavor wheel
│   ├── ui/                # Shared cross-platform design system primitives (.web / .native) & dynamic themes
│   └── supabase/          # Shared database schema, SQL migrations, typed client, mappers & RLS policies
└── docs/
    ├── adr/               # Architecture Decision Records
    └── devlogs/           # Milestone learning & development logs
```

---

## Key Features

* **Bean Stash & Cellar Inventory**: Track origins, processing methods (Washed, Natural, Anaerobic), roast dates, resting/freshness windows, and remaining weight. Includes a pure mathematical resting engine (`@brewlog/core`) with adaptive roaster curves, freezer vault preservation pause math, presentation-layer freshness resolvers (`@brewlog/ui`), offline-first local caching (`@brewlog/mobile:stash_cache` / `brewlog_beans_cache`), shelf partitioning (Active Cellar, Deep Freeze, Archive), and a 1-tap post-brew dose deduction bridge directly from the live brew timer.
* **Equipment Tracking & Multi-Grinder Calibration**: Log grinders (burr type, dial setting format: stepped numbers, clicks, stepless, microns), brewers (V60, AeroPress, Kalita Wave, Flair 58), precision scales, kettles, and accessories/other gear. Includes category filtering, favorite gear pinning, full add/edit/delete CRUD modals, offline-first local caching (`@brewlog/mobile:equipment_cache` / `brewlog_equipment_cache`), and automated Supabase cloud sync.
* **Recipes, Interactive Scaling & Multi-Grinder Settings**: Build and scale multi-stage recipes (bloom, pours, agitation, drawdown target) with real-time auto-scaling. Supports configuring multiple grinders with specific dial settings per recipe (`grinderSettings`), inline grinder creation inside the Recipe Builder when no grinders exist, automatic filtering of deleted equipment, and primary grinder pre-fill into the Brew Timer and Reviews workflows.
* **Interactive Brew Timer & Ratio Translator**: Live visual stage timer with target weight indicators, synthesized bell chimes (Web Audio on web, `expo-audio` on mobile), tactile haptics (`expo-haptics`), dynamic method selector pills, inline tap-to-edit faceplate metrics (Coffee Dose, Water Target, and `1:X` Ratio), dual-mode operation via `SegmentedControl` (`GUIDED RECIPE` + `FREE BREW` manual stopwatch with milestone split tags), and a nested bidirectional proportional Ratio Translator.
* **Reviews & SCA Tasting Journal**: Offline-first tasting logbook across mobile (`ReviewsContext`, `ReviewsCatalogScreen`, `ReviewDetailScreen`, `ReviewModalScreen`) and web (`/reviews` Master-Detail Tasting Journal with single-column Sensory Profile Inspector and in-place Review Editor). Score fragrance/aroma, flavor, aftertaste, acidity, body, balance, uniformity, clean cup, sweetness, and overall impression with an interactive 3-tier SVG SCA flavor wheel and descriptor tag selector to calculate authentic 0–100 SCA scores while snapshotting grinder, grind setting, and brewer telemetry.
* **Centralized Cross-Platform Design System (`@brewlog/ui`) & Dynamic Theming**: Shared monorepo component package with platform-split rendering layers (`.web.tsx` with Tailwind v4, `.native.tsx` with React Native StyleSheet), unified TypeScript contracts (`Button`, `Card`, `Badge`, `Input`, `MetricTile`, `SegmentedControl`), dynamic multi-theme architecture (**Tactile Dark Craft** and **Crisp Studio Light** via `ThemeProvider`, `useTheme`, and memoized `makeStyles`), semantic foreground tokens (`text-foreground`, `text-foreground-secondary`, `text-foreground-muted`), and standardized 3-tier rem-based control sizing (`sm`: 32px, `md`: 40px, `lg`: 48px) verified by automated Playwright E2E gates.
* **Cloud Sync, Multi-User & Secure Storage**: Supabase PostgreSQL backend with Row Level Security (RLS), cross-platform authentication (`AuthSheet` in-tree modal overlay with Android autofill support, sign-in/up/reset, `ProfileHeaderButton` avatar indicator), and hardware-secured session storage (`LargeSecureStore` AES-256 CTR hybrid encryption backed by `expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` keychain accessibility).
* **User Preferences & Instrument Calibration**: Pure domain conversion engines (`gramsToOz`, `celsiusToFahrenheit`) and presentation formatters (`formatWeight`, `formatTemperature`, `formatDisplayDate`) supporting dynamic unit localization (grams / ounces, Celsius / Fahrenheit), customizable date formats, default brew timer mode selection (`free_brew` stopwatch vs `recipe` stage engine), and dynamic theme selection (`system`, `tactile_dark`, `studio_light`). Delivers offline-first local hydration with automated Supabase cloud sync, dedicated mobile settings modal (`app/settings/modal.tsx`), and web settings chassis route (`/settings`).
* **Active Project Milestones & Roadmap**:
  - **Phase 1 (Web App Core Routing)**: Complete (Declarative client routing, 404 handler, persistent shell).
  - **Phase 2 (Dynamic Recipe Routing)**: Complete (Master-detail layout, `/recipes/:id`, URL synchronization).
  - **Phase 3 (Mobile App Foundation & Shell)**: Complete (Upgraded to Expo SDK 58 & React Native 0.88, 5-tab shell, drift-free timer).
  - **Phase 3C (Supabase Auth & Secure Storage)**: Complete (Hardware-backed `LargeSecureStore`, `AuthContext` / `useAuth`, `ProfileHeaderButton`, and in-tree `AuthSheet` overlay).
  - **Phase 4 (Mobile Recipe Studio & Catalog)**: Complete (Native stack/modal navigation, recipe builder lifecycle, multi-grinder dial settings, bidirectional timer handoff).
  - **Phase 5 (Stash Manager & Cellar Inventory)**: Complete (Native bean cellar, roast resting status indicators, dose deduction handoff to timer, pure resting engine, and offline-first cache).
  - **Phase 6 (Free Brew Timer & Ratio Translator)**: Complete (Stopwatch mode, manual split tags, nested ratio translator, review/recipe export, mobile & web parity).
  - **Phase 7A (Design System Primitives & Foundation)**: Complete (`@brewlog/ui` shared monorepo package with platform-split primitives [`.web` / `.native`], unified TypeScript contracts, Outfit tabular figure enforcement, and showcase fixture).
  - **Phase 7B (Design System Tokens, Sizing Standardization & Dynamic Theming)**: Complete / Active (Standardized 32px/40px/48px button & input sizing tokens, Playwright E2E sizing gate, semantic `foreground` token migration, domain freshness decoupling from `@brewlog/core` to `@brewlog/ui`, `SegmentedControl` primitive, dynamic `ThemeProvider` / `makeStyles` across all 39 mobile screens & native primitives, retirement of `INDUSTRIAL_PRECISION_THEME`, and web Timer header/faceplate alignment).
  - **Phase 7C (Web Stash Persistence & Recipe Flow Alignment)**: Complete (Supabase migrations 002/003, core resting engine promotion, Web Stash modal parity & offline sync resilience, Web Recipe Studio custom recipe editing flow).
  - **Phase 7D (Mobile Equipment & Web Parity)**: Complete (Mobile `EquipmentContext` with offline resilience and optimistic updates, `EquipmentCatalogScreen` with category chips and search filtering, `EquipmentModalScreen` add/edit flows, microns scale type support across `@brewlog/core`, web parity with 'Other' equipment section, and offline sync resilience).
  - **Phase 8 (User Preferences, Dynamic Themes & Settings Subsystem)**: Complete (Cross-platform Supabase `user_settings`, theme preference selector, default timer mode, unit conversions, offline-first state, telemetry integration).
  - **Phase 9 (Mobile & Web Reviews / Tasting Journal & Multi-Grinder Settings)**: Complete (Offline-first mobile `ReviewsContext`, `ReviewsCatalogScreen`, `ReviewDetailScreen`, `ReviewModalScreen`, 10-attribute SCA scoring sliders, 3-tier SVG flavor wheel, web Master-Detail Tasting Journal redesign at `/reviews`, equipment snapshot tracking, and multi-grinder recipe settings via migration `004`).
  - **Phase 10 (Platform-Adaptive Navigation)**: In Progress (iOS `NativeTabs` translucent blur tab bar in `_layout.ios.tsx` and custom animated `FloatingPillTabBar` implemented; Android Material 3 / Jetpack Compose integration upcoming).
  - **Phase 11 (Responsive Adaptive Layouts)**: Upcoming (Landscape brew station, foldables, tablets).
* **Companion Platforms & Wearables**:
  - **WearOS Companion**: Android Wear OS wrist timer with haptic pour alerts via Wearable DataLayer.
  - **watchOS Companion**: Apple Watch companion app built with SwiftUI & WatchConnectivity.

> See [docs/ROADMAP.md](docs/ROADMAP.md) for detailed technical deliverables, component refactoring tasks, and architecture decision records.

---

## Getting Started

### Prerequisites

* **Node.js**: `v20.x` or later (LTS recommended)
* **npm**: `v10.x` or later (supports npm workspaces)
* **Mobile Tooling** (Optional, for mobile testing):
  * **Physical Device**: [Expo Go](https://expo.dev/go) installed from the iOS App Store or Google Play Store (device must be on the same local Wi-Fi network).
  * **iOS Simulator** (macOS only): Xcode with Command Line Tools (`xcode-select --install`).
  * **Android Emulator**: Android Studio with an Android Virtual Device (AVD) configured and running.

---

### 1. Installation & Environment Setup

```bash
# Clone repository
git clone https://github.com/Chewieez/brewlog.git
cd brewlog

# Install monorepo dependencies across all workspaces
npm install
```

#### Environment Variables (Optional for Offline / Demo Mode)

Both the web and mobile applications run out-of-the-box in local offline mode with mock fallbacks. To connect to a live Supabase backend for user authentication, cloud sync, and custom recipe persistence:

```bash
# Web application environment
cp apps/web/.env.example apps/web/.env

# Mobile application environment
cp apps/mobile/.env.example apps/mobile/.env
```

Open each `.env` file and provide your project URL and public anon key:
* `apps/web/.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
* `apps/mobile/.env`: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

### 2. Running the Web Application

```bash
# Start Vite development server
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

### 3. Running the Mobile Application (Expo SDK 58)

```bash
# Start interactive Metro bundler on port 8081
npm run dev:mobile
```

Once Metro is running in your terminal, choose your testing target:

* **Physical Device (Expo Go)**:
  * **iOS**: Open the native Camera app and scan the QR code displayed in the terminal.
  * **Android**: Open the Expo Go app and tap "Scan QR code".
* **iOS Simulator**: Press <kbd>i</kbd> in the terminal (or run `npm run ios --workspace=@brewlog/mobile`).
* **Android Emulator**: Press <kbd>a</kbd> in the terminal (or run `npm run android --workspace=@brewlog/mobile`).
* **Mobile Web Preview**: Press <kbd>w</kbd> in the terminal (or run `npm run web --workspace=@brewlog/mobile`).

> [!TIP]
> **Metro Cache Reset**: When switching branches or after making changes to shared monorepo packages (`@brewlog/core`, `@brewlog/ui`, `@brewlog/supabase`), start Metro with a clean cache:
> ```bash
> npm run dev:mobile -- -c
> ```

---

### 4. Quality Checks & Verification

Run project-wide validation across all workspaces from the monorepo root:

```bash
# Run TypeScript strict typechecking across all workspaces
npm run typecheck

# Run Vitest unit & integration test suites across core, supabase, ui, web, and mobile
npm test

# Run Playwright E2E verification suites (web)
npm run test:e2e --workspace=@brewlog/web

# Build production artifacts
npm run build
```

---

## Documentation & Architecture Decision Records
- **Interactive Architecture Graph**: [`docs/architecture.html`](docs/architecture.html) — Vis.js interactive node graph of web and mobile application trees, state stores, design system tokens, and cloud backends.
- **Architecture Decision Records (ADRs)**:
  - [`ADR 001: Monorepo Architecture & Shared Domain`](docs/adr/001-monorepo-and-shared-domain.md)
  - [`ADR 002: Database Choice & Supabase RLS`](docs/adr/002-database-choice-and-supabase-rls.md)
  - [`ADR 003: Multi-Platform Supabase TypeScript Patterns`](docs/adr/003-supabase-typescript-multiplatform-best-practices.md)
  - [`ADR 004: Declarative Client Routing via React Router v8`](docs/adr/004-client-side-declarative-routing.md)
  - [`ADR 005: Offline-First Coffee Stash Management & Biochemical Resting Engine`](docs/adr/005-offline-stash-management-and-resting-engine.md)
  - [`ADR 006: Android Autofill & In-Tree Modal Overlays`](docs/adr/006-android-autofill-and-in-tree-modal-overlays.md)
- **Milestone Devlogs**: Comprehensive milestone deep-dives and verification logs in [`docs/devlogs/`](docs/devlogs/).

---

## License
MIT © [Greg Lawrence](https://github.com/Chewieez)
