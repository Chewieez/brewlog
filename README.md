# ☕ BrewLog

> Multi-platform specialty coffee tracking, custom recipe studio, interactive brewing assistant, and SCA cupping logbook.

Built with **React 19**, **Tailwind CSS v4**, **React Native (Expo)**, **TypeScript**, and **Supabase (PostgreSQL)**.

---

## 🏗️ Architecture & Monorepo Structure

```
brewlog/
├── apps/
│   ├── web/               # React 19 + Tailwind CSS v4 + Vite
│   ├── mobile/            # React Native (Expo SDK) + TypeScript
│   ├── wearos/            # (Phase 4) WearOS Companion App & Tile (Jetpack Compose)
│   └── watchos/           # (Phase 5) Apple watchOS Companion App & Complications (SwiftUI)
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
* **⏱️ Interactive Brew Assistant**: Live visual stage timer with target weight indicators, synthesized Web Audio bell chimes, and pause/restart controls.
* **📝 SCA Cupping Logbook & Flavor Wheel**: Rate fragrance, acidity, sweetness, body, clarity, balance, and tap interactive flavor tags to calculate authentic 0–100 SCA scores.
* **☁️ Cloud Sync & Multi-User**: Supabase PostgreSQL backend with Row Level Security (RLS).
* **⌚ Wearable Companion Roadmap**:
  - **Phase 4 (WearOS)**: Android Wear OS wrist timer with haptic pour alerts via Wearable DataLayer.
  - **Phase 5 (watchOS)**: Apple Watch companion app built with SwiftUI & WatchConnectivity.

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
