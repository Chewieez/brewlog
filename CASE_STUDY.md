# ☕ BrewLog: Multi-Platform Specialty Coffee Engineering Case Study

## 🎯 Project Overview
BrewLog is a full-stack, cross-platform specialty coffee companion designed to streamline bean logging, custom recipe creation, precision brew timing, and SCA cupping sensory evaluations across Web, Mobile, and Wearable platforms (WearOS & watchOS).

---

## 🧩 Architectural Highlights

### 1. Zero-Duplication Core Domain (`@brewlog/core`)
All coffee math, ratio conversions, stage rescaling, and sensory calculations live in an isolated, pure TypeScript package consumed identically by React Web, React Native, and backend functions.

### 2. Relational Modeling with PostgreSQL & RLS
Unlike generic document stores, coffee data relies on structured relationships between equipment, roast profiles, and extraction parameters. Supabase PostgreSQL with strict Row Level Security (RLS) ensures multi-tenant data privacy at the database layer.

### 3. Precision Web & Mobile Timing Architecture
Interactive timers leverage performance timing APIs combined with synthesized Web Audio chimes for stage transitions.

### 4. Dual Wearable Companion Ecosystem
- **WearOS (`apps/wearos`)**: Built with Jetpack Compose for Wear OS, connecting via Android Wearable DataLayer.
- **watchOS (`apps/watchos`)**: Built with SwiftUI, communicating with the iOS host via WatchConnectivity (WCSession).

### 5. Declarative Client-Side Routing & Master-Detail Architecture
`@brewlog/web` employs React Router v8 library mode for deep-linkable URLs and browser history traversal while avoiding Node runtime overhead. A persistent `<RootLayout>` shell with `<Outlet />` ensures global audio chimes and authentication modals persist across route transitions, while nested child routes (`/recipes/:recipeId`) power responsive master-detail layouts across desktop and mobile breakpoints.

---

## 📈 Learning Roadmap & Architecture Decision Records
- [`docs/adr/001-monorepo-and-shared-domain.md`](./docs/adr/001-monorepo-and-shared-domain.md) — Monorepo Architecture & Shared Domain
- [`docs/adr/002-database-choice-and-supabase-rls.md`](./docs/adr/002-database-choice-and-supabase-rls.md) — Database Choice & Supabase RLS
- [`docs/adr/003-supabase-typescript-multiplatform-best-practices.md`](./docs/adr/003-supabase-typescript-multiplatform-best-practices.md) — Multi-Platform Supabase TypeScript Patterns
- [`docs/adr/004-client-side-declarative-routing.md`](./docs/adr/004-client-side-declarative-routing.md) — Declarative Routing via React Router v8
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — Macro Milestones & Technical Debt Tracker
