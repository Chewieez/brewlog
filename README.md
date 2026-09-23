# ☕ BrewLog

> A specialty coffee brewing companion built to learn React, React Native, Expo, Wear OS, watchOS, and agentic AI-driven development.

Multi-platform specialty coffee tracking, custom recipe studio, interactive brewing assistant, and SCA cupping logbook. Built with **React 19**, **Tailwind CSS v4**, **React Native (Expo)**, **TypeScript**, and **Supabase (PostgreSQL)**.

---

## 🏗️ Architecture & Monorepo Structure

```
brewlog/
├── apps/
│   ├── web/               # React 19 + Tailwind CSS v4 + Vite
│   ├── mobile/            # React Native (Expo SDK 57) + TypeScript
│   ├── wearos/            # (Planned) WearOS Companion App & Tile (Jetpack Compose)
│   └── watchos/           # (Planned) Apple watchOS Companion App & Complications (SwiftUI)
├── packages/
│   ├── core/              # Shared types, brew math, presets & SCA flavor wheel
│   └── supabase/          # Shared database schema, client & RLS policies
└── docs/
    ├── adr/               # Architecture Decision Records
    └── devlogs/           # Milestone learning & development logs
```

---

## 🚀 Key Features

* **🫘 Coffee Stash Manager & Cellar Inventory**: Track origins, processing methods (Washed, Natural, Anaerobic), roast dates, resting/freshness windows, and remaining weight. Includes a pure mathematical resting engine with adaptive roaster curves, freezer vault preservation pause math, offline-first local caching (`@brewlog/mobile:stash_cache`), shelf partitioning (Active Cellar, Deep Freeze, Archive), and a 1-tap post-brew dose deduction bridge directly from the live brew timer.
* **⚙️ Equipment & Gear Tracking**: Log your grinders (burr type, dial settings), brewers (V60, AeroPress, Flair 58, Chemex), and gear settings.
* **📖 Interactive Recipe Studio**: Build and scale multi-stage recipes (bloom, pours, agitation, drawdown target) with real-time auto-scaling.
* **⏱️ Interactive Brew Assistant**: Live visual stage timer with target weight indicators, synthesized bell chimes (Web Audio on web, `expo-audio` on mobile), tactile haptics (`expo-haptics`), dynamic method selector, inline dose scaling, and full hardware faceplate controls across web and mobile.
* **📝 SCA Cupping Logbook & Flavor Wheel**: Score fragrance/aroma, flavor, aftertaste, acidity, body, balance, uniformity, clean cup, sweetness, and overall impression with interactive flavor tags to calculate authentic 0–100 SCA scores.
* **☁️ Cloud Sync, Multi-User & Secure Storage**: Supabase PostgreSQL backend with Row Level Security (RLS), cross-platform authentication (`AuthSheet` modal bottom sheet with sign-in/up/reset, `ProfileHeaderButton` avatar indicator), and hardware-secured session storage (`LargeSecureStore` AES-256 CTR hybrid encryption backed by `expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` keychain accessibility).
* **📱 Active Project Milestones & Roadmap**:
  - **Phase 1 (Web App Core Routing)**: Complete ✅ (Declarative client routing, 404 handler, persistent shell).
  - **Phase 2 (Dynamic Recipe Routing)**: Complete ✅ (Master-detail layout, `/recipes/:id`, URL synchronization).
  - **Phase 3 (Mobile App Foundation & Shell)**: Complete ✅ (Expo SDK 57, 5-tab shell, drift-free timer).
  - **Phase 3C (Supabase Auth & Secure Storage)**: Complete ✅ (Hardware-backed `LargeSecureStore`, `AuthContext` / `useAuth`, `ProfileHeaderButton`, and `AuthSheet` modal).
  - **Phase 4 (Mobile Recipe Studio & Catalog)**: Complete ✅ (Native stack/modal navigation, recipe builder lifecycle, bidirectional timer handoff).
  - **Phase 5 (Stash Manager & Cellar Inventory)**: Complete ✅ (Native bean cellar, roast resting status indicators, dose deduction handoff to timer, pure resting engine, and offline-first cache).
  - **Phase 6 (Free Brew Timer & Ratio Translator)**: Upcoming ⏳ (Stopwatch mode, nested ratio translator).
  - **Phase 7 (User Preferences & Settings Subsystem)**: Upcoming ⏳ (Cross-platform Supabase `user_settings`, default timer mode).
  - **Phase 8 (Native Cupping Session Logging)**: Upcoming ⏳ (SCA 10-attribute scoring protocol).
  - **Phase 9 (Platform-Adaptive Navigation)**: Upcoming ⏳ (iOS Liquid Glass & Android Material Design 3).
* **⌚ Companion Platforms & Wearables**:
  - **WearOS Companion**: Android Wear OS wrist timer with haptic pour alerts via Wearable DataLayer.
  - **watchOS Companion**: Apple Watch companion app built with SwiftUI & WatchConnectivity.

> See [docs/ROADMAP.md](docs/ROADMAP.md) for detailed technical deliverables, component refactoring tasks, and architecture decision records.

---

## 🛠️ Getting Started

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

Open [http://localhost:5173](http://localhost:5173) in your browser to view the application.

---

### 3. Running the Mobile Application (Expo SDK 57)

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
> **Metro Cache Reset**: When switching branches or after making changes to shared monorepo packages (`@brewlog/core`, `@brewlog/supabase`), start Metro with a clean cache:
> ```bash
> npm run dev:mobile -- -c
> ```

---

### 4. Quality Checks & Verification

Run project-wide validation across all workspaces from the monorepo root:

```bash
# Run TypeScript strict typechecking across all workspaces
npm run typecheck

# Run Vitest test suites across core, web, and mobile
npm test

# Build production artifacts
npm run build
```

---
 
## 📚 Documentation & Architecture Decision Records
- **Interactive Architecture Graph**: [`docs/architecture.html`](docs/architecture.html) — Vis.js interactive node graph of web and mobile application trees, state stores, and cloud backends.
- **Architecture Decision Records (ADRs)**:
  - [`ADR 001: Monorepo Architecture & Shared Domain`](docs/adr/001-monorepo-and-shared-domain.md)
  - [`ADR 002: Database Choice & Supabase RLS`](docs/adr/002-database-choice-and-supabase-rls.md)
  - [`ADR 003: Multi-Platform Supabase TypeScript Patterns`](docs/adr/003-supabase-typescript-multiplatform-best-practices.md)
  - [`ADR 004: Declarative Client Routing via React Router v8`](docs/adr/004-client-side-declarative-routing.md)
  - [`ADR 005: Offline-First Coffee Stash Management & Biochemical Resting Engine`](docs/adr/005-offline-stash-management-and-resting-engine.md)
- **Milestone Devlogs**: Comprehensive milestone deep-dives and verification logs in [`docs/devlogs/`](docs/devlogs/).

---

## 📄 License
MIT © [Greg Lawrence](https://github.com/Chewieez)
