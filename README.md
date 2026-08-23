# ☕ BrewLog

> Multi-platform specialty coffee tracking, custom recipe studio, interactive brewing assistant, and SCA cupping logbook.

Built with **React 19**, **React Native (Expo)**, **TypeScript**, and **Supabase (PostgreSQL)**.

---

## 🏗️ Architecture

```
brewlog/
├── apps/
│   ├── web/               # React 19 + Vite + TypeScript
│   ├── mobile/            # React Native (Expo) + TypeScript
│   └── wearos/            # (Phase 4) Companion WearOS timer & tile
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
* **📖 Interactive Recipe Studio**: Build and scale multi-stage recipes (bloom, pours, agitation, drawdown target).
* **⏱️ Interactive Brew Assistant**: Live visual stage timer with target weight indicators, audio cues, and pause/restart controls.
* **📝 SCA Cupping Logbook & Flavor Wheel**: Rate fragrance, acidity, sweetness, body, clarity, balance, and tap interactive flavor tags to calculate authentic 0–100 SCA scores.
* **☁️ Cloud Sync & Multi-User**: Supabase PostgreSQL backend with Row Level Security (RLS).

---

## 🛠️ Getting Started

```bash
# Install dependencies
npm install

# Run web app
npm run dev:web

# Run mobile app
npm run dev:mobile
```

---

## 📄 License
MIT © [Greg Lawrence](https://github.com/Chewieez)
