# ADR 001: Monorepo Architecture & Shared Domain Logic

## Status
Accepted

## Context
We are building a multi-platform coffee application that targets:
1. Web (React 19 + TypeScript + Vite)
2. Mobile (React Native + Expo SDK)
3. WearOS (Companion watch timer & sync)

Coffee calculations (dose scaling, water ratios, extraction timers, SCA cupping math, flavor wheels) and data models must be completely consistent across all three platforms.

## Decision
We chose an npm workspaces monorepo structure:
- `packages/core`: Pure TypeScript domain models, mathematical formulas, and preset recipes. Zero UI framework dependencies.
- `packages/supabase`: Shared database client, PostgreSQL schema definitions, and RLS policies.
- `apps/web`: React 19 web app consuming `@brewlog/core` and `@brewlog/supabase`.
- `apps/mobile`: React Native app consuming the exact same packages.

## Consequences
- **Positive**: 100% logic reuse for coffee calculations, unified type safety, single repository for GitHub issue tracking and CI.
- **Tradeoff**: Requires workspace resolution awareness in Metro / Vite bundlers.
