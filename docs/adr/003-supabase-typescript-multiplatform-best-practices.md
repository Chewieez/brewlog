# ADR 003: Supabase, TypeScript, and Multi-Platform Architecture

## Status
Accepted

## Context
BrewLog targets four distinct client runtimes:
1. **Web**: React 19 + Tailwind CSS v4 + Vite (Desktop/Tablet)
2. **Mobile**: React Native + Expo SDK (iOS & Android phones)
3. **WearOS**: Android companion app built with Kotlin & Jetpack Compose for Wear OS
4. **watchOS**: Apple Watch companion app built with Swift & SwiftUI

We need an authoritative, enterprise-grade architecture for managing **Supabase database schemas**, **TypeScript type safety**, **Domain-Driven Design (DDD)**, and **cross-platform data synchronization**.

---

## Decisions & Best Practices

### 1. Database Schema Contract: `database.types.ts`
* **File Location**: `packages/supabase/src/database.types.ts`
* **Standard**: Matches the exact output of the official Supabase CLI (`supabase gen types typescript`).
* **Contract**:
  * Each table defines `Row`, `Insert`, `Update`, and `Relationships: []`.
  * Public schema defines `Tables`, `Views`, `Functions`, `Enums`, and `CompositeTypes`.
* **Convenience Types**:
  * `Tables<T>`: Resolves `Row` type for table `T`.
  * `TablesInsert<T>`: Resolves `Insert` payload for table `T`.
  * `TablesUpdate<T>`: Resolves `Update` payload for table `T`.
  * Specific entity aliases: `BeanRow`, `BeanInsert`, `TastingLogRow`, `TastingLogInsert`, `EquipmentRow`, `EquipmentInsert`.

### 2. Strict Boundary Between Database DTOs and Core Domain Models
* **Core Domain (`@brewlog/core`)**:
  * Owns the ubiquitous coffee language: `Bean`, `BrewRecipe`, `TastingLog`, `Equipment`.
  * Uses idiomatic TypeScript camelCase (`coffeeDoseGrams`, `originCountry`).
  * Pure TypeScript with zero database, framework, or browser dependencies.
* **Database DTOs (`@brewlog/supabase`)**:
  * Owns the PostgreSQL representation: `BeanRow`, `TastingLogRow`, etc.
  * Uses SQL snake_case (`coffee_dose_grams`, `origin_country`) and PostgreSQL constraints.
* **Shared Mappers (`@brewlog/supabase/mappers`)**:
  * Pure transformation functions (`mapBeanRow`, `mapTastingLogRow`, `mapEquipmentRow`) live in the shared `@brewlog/supabase` package.
  * **Benefit for Multi-Platform**: Both React Web (`apps/web`) and React Native / Expo (`apps/mobile`) import the exact same mappers, eliminating code duplication and drift between platforms.

### 3. Data Access Separation from React Hooks
* **Anti-Pattern**: Embedding raw SQL table names and queries directly inside UI component hooks (`useBeans.ts`).
* **Best Practice**:
  1. **DTO**: Database row (`BeanRow` in `database.types.ts`).
  2. **Domain Entity**: Domain model (`Bean` in `@brewlog/core`).
  3. **Mapper**: Pure transformer (`mapBeanRow: BeanRow -> Bean`).
  4. **Data Service**: Pure async service handling Supabase client calls and returning domain entities.
  5. **React Hook**: Manages component lifecycle, loading/error state, and local optimistic caching.

### 4. Multi-Platform Storage & Auth Strategy
* **Web**: Uses browser `localStorage` via default `@supabase/supabase-js` storage.
* **React Native (Expo)**:
  * Uses `createBrewlogClient(url, anonKey, customStorage)`.
  * Passes `LargeSecureStore` (AES-256 encryption via `expo-secure-store` combined with `@react-native-async-storage/async-storage`) to securely handle tokens larger than 2048 bytes.

### 5. Wearable Architecture (WearOS & watchOS): Phone-as-Hub Companion Model
* **Constraint**: Wear OS and Apple Watch devices are severely constrained in battery, radio power, and memory. They are primarily connected via Bluetooth LE to the user's phone.
* **Architecture**:
  * The phone app (React Native / Expo) acts as the **Authenticated Cloud Gateway**: handles Supabase Auth, PostgreSQL RLS, token refresh, and network transport.
  * The phone communicates with the watch companions over Bluetooth:
    * **Android**: Google Wearable DataLayer API (`MessageClient`, `DataClient`).
    * **iOS**: Apple WatchConnectivity framework (`WCSession`).
  * The watch receives lightweight, focused DTOs derived directly from `@brewlog/core` (e.g. `TimerStageDto: { durationSeconds, targetWeightGrams, name }`) and sends back simple completion signals.

---

## Consequences

* **Maintainability**: Changing a PostgreSQL column name only requires regenerating `database.types.ts` and updating the isolated mapper. Zero UI components break.
* **Reusability**: `@brewlog/core` and `@brewlog/supabase` are consumed identically by React Web and Expo Mobile without copying code.
* **Testability**: Mappers and calculations are pure functions testable in Node/jsdom without mounting React components or mocking Supabase network requests.
