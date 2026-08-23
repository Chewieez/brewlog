# ☕ BrewLog: Multi-Platform Specialty Coffee Engineering Case Study

## 🎯 Project Overview
BrewLog is a full-stack, cross-platform specialty coffee companion designed to streamline bean logging, custom recipe creation, precision brew timing, and SCA cupping sensory evaluations across Web, Mobile, and Wearable platforms.

---

## 🧩 Architectural Highlights

### 1. Zero-Duplication Core Domain (`@brewlog/core`)
All coffee math, ratio conversions, stage rescaling, and sensory calculations live in an isolated, pure TypeScript package consumed identically by React Web, React Native, and backend functions.

### 2. Relational Modeling with PostgreSQL & RLS
Unlike generic document stores, coffee data relies on structured relationships between equipment, roast profiles, and extraction parameters. Supabase PostgreSQL with strict Row Level Security (RLS) ensures multi-tenant data privacy at the database layer.

### 3. Precision Web & Mobile Timing Architecture
Interactive timers leverage performance timing APIs (`requestAnimationFrame` and monotonic timestamp delta calculation) combined with synthesized Web Audio chimes for stage transitions.

---

## 📈 Learning Roadmap & Devlogs
See [`docs/adr/`](./docs/adr/) for detailed Architecture Decision Records.
