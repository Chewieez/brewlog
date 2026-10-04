# 📖 Devlog: Mobile Equipment Catalog, Add/Edit Flow & Web Parity

- **Date**: 2026-10-03
- **Milestone**: Issue #34 & PR #36 — Mobile Equipment Subsystem & Web Parity
- **Status**: Completed & Verified ✅
- **Branch**: `feature/mobile-equipment-and-web-parity` (PR #36)
- **Tech Stack**: React 19.2.8, React Native (Expo SDK 57), Expo Router, Tailwind CSS v4, TypeScript 5.7+, `@brewlog/core`, `@brewlog/supabase`, Vitest, Testing Library

---

## 🎯 Executive Summary

Following the mobile Stash (Phase 5) and Free Brew (Phase 6) milestones, the mobile app lacked an equipment catalog and CRUD lifecycle, while the web equipment view lacked category filtering, search, favorite toggling, and offline sync resilience:
1. **Mobile Equipment Missing**: Mobile had a placeholder tab screen for equipment without local storage hydration, Supabase cloud sync, category browsing, or add/edit modals.
2. **Dial Setting Scale Incomplete**: Grinder settings previously only supported stepped numbers, clicks, and stepless formats, lacking microns (`microns`) used by precision flat-burr grinders.
3. **Web Parity & Sync Vulnerabilities**: Web's `useEquipment` hook had critical sync bugs:
   - When users deleted all starter gear, `loadLocalEquipment` treated empty arrays (`[]`) as falsy and resurrected default initial equipment upon page reload.
   - If offline gear (`local-eq-*`) failed to sync with Supabase, remote fetch replaced local storage entirely, dropping unsynced gear permanently.
   - Web lacked search filtering, category filter chips, and 'Other' gear grouping.

This milestone introduces a fully offline-first equipment subsystem on mobile, exports shared presets and types in `@brewlog/core`, and achieves full cross-platform parity and synchronization resilience across web and mobile.

---

## 🏗️ Architecture & Changes Across Packages

### 1. Shared Domain & Presets (`@brewlog/core`)
- Promoted `DEFAULT_INITIAL_EQUIPMENT` (7 starter items: Fellow Ode Gen 2, Comandante C40, Hario V60, Kalita Wave, Acaia Lunar, Fellow Stagg EKG, Normcore WDT) and `DEFAULT_EQUIPMENT` into `packages/core/src/presets.ts`.
- Added `'microns'` to `GrinderSettingScale` in `packages/core/src/types.ts`.
- Unit tests in `presets.test.ts` verifying all starter equipment have valid types, IDs, and timestamps.

### 2. Mobile Equipment Subsystem (`apps/mobile/src/features/equipment`)
- **`EquipmentContext`**:
  - Offline-first caching with immediate AsyncStorage hydration (`@brewlog/mobile:equipment_cache`).
  - Optimistic mutations for `addEquipment`, `updateEquipment`, `deleteEquipment`, and `toggleFavorite`.
  - Queueing for offline changes with `EQUIPMENT_PENDING_UPDATES_KEY` and `EQUIPMENT_PENDING_DELETES_KEY`.
  - **Immediate ID Swap**: In Step 2 of `syncWithRemote`, once `query.select().single()` succeeds, the local `local-eq-*` ID is immediately swapped with the server UUID in `equipmentRef.current` and persisted to AsyncStorage. This prevents duplicate remote insertions on subsequent sync retries if Step 4 (fetching remote items) fails due to a network drop.
- **`EquipmentCatalogScreen` (`app/(tabs)/equipment.tsx`)**:
  - Industrial precision header with category filter chips (`All`, `Grinders`, `Brewers`, `Scales`, `Kettles`, `Other`).
  - Real-time search query filtering over brand, model, and subtype.
  - Sectional grouping with item counters and empty state handling.
  - Custom clear button (`X`) on the search bar with iOS redundant native clear button removed.
- **`EquipmentCard`**:
  - Displays mono accent brand eyebrow, model title, subtype badge, setting scale format (including microns), and star favorite toggle.
  - Apple HIG-compliant $\ge 44\text{pt}$ touch targets for card tap (routes to edit modal) and favorite toggle.
- **`EquipmentModalScreen` (`app/equipment/modal.tsx`)**:
  - Full CRUD modal powered by `KeyboardAwareScrollView` (`bottomOffset={32}`) to prevent keyboard occlusion on Android and iOS.
  - Gated by a cold-start / deep-link hydration guard: displays `ActivityIndicator` (`testID="equipment-modal-loading"`) until context finishes hydrating, preventing edit deep-links from defaulting to a blank "NEW EQUIPMENT" form.
  - Form state isolated in `EquipmentModalForm` and keyed by item ID to guarantee fresh mount upon hydration.
  - Dirty form discard alert (`Alert.alert`) and destructive action confirmation for deleting equipment.

### 3. Web Parity & Sync Hardening (`apps/web/src/features/equipment`)
- **`useEquipment` Bugfixes**:
  - **Empty Cache Retention**: Fixed `loadLocalEquipment` so `Array.isArray(parsed)` is respected even when empty, preventing deleted starter equipment from being re-seeded on reload.
  - **Offline Sync Resilience**: Added `syncedIds` tracking during remote sync; any offline item (`local-eq-*`) that fails remote insertion is preserved in local storage and React state alongside remote rows.
- **`EquipmentView` Parity**:
  - Added real-time search filtering and category filter chips (`All`, `Grinders`, `Brewers`, `Scales`, `Kettles`, `Other`).
  - Added "Other Equipment & Accessories" section with `Layers` icon for WDT tools, canisters, and unclassified gear.
  - Added edit modal flow with confirmation modal before deletion.
  - Aligned brewer model placeholders (`e.g. V60 02, Aeropress, Kalita Wave`) and added dedicated placeholders for `type === "other"`.

---

## 🧪 Quality Checks & Verification

- **TypeScript Typecheck**: Passed with 0 errors across all 5 workspaces (`npm run typecheck`).
- **Unit & Integration Tests**: 544 unit tests passing monorepo-wide across 64 test files:
  - `@brewlog/core`: 4 test files, 67 tests passing.
  - `@brewlog/mobile`: 40 test files, 323 tests passing (including 14 tests in `EquipmentContext.test.tsx`, 11 in `EquipmentModalScreen.test.tsx`, 8 in `EquipmentCatalogScreen.test.tsx`, and 4 in `EquipmentCard.test.tsx`).
  - `@brewlog/web`: 20 test files, 154 tests passing (including 11 in `EquipmentView.test.tsx` and 9 in `useEquipment.test.ts`).
- **Cross-Platform Parity**: Verified that deleting, adding, editing, and syncing equipment behaves identically on web and mobile with zero data loss or duplicate records.
