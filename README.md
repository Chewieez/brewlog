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
│   ├── wearos/            # WearOS Companion App & Tile (Jetpack Compose)
│   └── watchos/           # Apple watchOS Companion App & Complications (SwiftUI)
├── packages/
│   ├── core/              # Shared types, brew math, presets & SCA flavor wheel
│   └── supabase/          # Shared database schema, client & RLS policies
└── docs/
    ├── adr/               # Architecture Decision Records
    └── devlogs/           # Milestone learning & development logs
```

---

## 🚀 Key Features

* **🫘 Coffee Stash Manager**: Track origins, processing methods (Washed, Natural, Anaerobic), roast dates, resting/freshness windows, and remaining weight.
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
  - **Phase 4 (Mobile Recipe Studio & Catalog)**: In Progress ⏳ (Native stack/modal navigation, recipe builder lifecycle, bidirectional timer handoff).
  - **Phase 5 (Stash Manager & Inventory)**: Upcoming ⏳ (Native bean cellar, roast resting status indicators).
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

```bash
# Install dependencies
npm install

# Run web app (React 19 + Tailwind v4)
npm run dev:web

# Run mobile app (Expo)
npm run dev:mobile
```

---

## 📄 License
MIT © [Greg Lawrence](https://github.com/Chewieez)
