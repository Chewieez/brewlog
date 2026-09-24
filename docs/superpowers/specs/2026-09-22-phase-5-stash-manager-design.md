# Phase 5: Mobile Coffee Bean Stash & Cellar Inventory Design Spec

## 1. Overview & Objectives

Phase 5 introduces a comprehensive, offline-first **Coffee Bean Stash & Cellar Inventory subsystem** to the BrewLog mobile app (`apps/mobile`). It transitions the current static placeholder in `app/(tabs)/stash.tsx` into an interactive coffee management system that tracks origins, roast dates, resting status curves, custom roaster resting recommendations, remaining bag weights, freezer vault storage, and seamless handoff to the active Brew Timer.

### Key Goals
1. **Cellar Inventory Management**: View, search, and filter whole bean coffees across three distinct shelves: `Active Cellar`, `Freezer Vault`, and `Archived Bags`.
2. **Adaptive Resting Windows & Aging Math**: Accurately calculate calendar days off roast with visual indicators for `Needs Rest (De-gassing)`, `Peak Flavor Window`, `Good (Drink Soon)`, `Past Peak`, and `❄️ Frozen at Day X (Peak Window)`. Support optional roaster-recommended resting duration on a per-bean basis (defaulting to 5 days).
3. **Full Native Bag CRUD**: Native modal form (`app/stash/modal.tsx`) for adding and editing bags with field validation, presets (250g, 340g, 1kg), flavor notes tags, and discard guards.
4. **Dedicated Bean Detail Screen**: Dynamic stack screen (`app/stash/[id].tsx`) featuring the resting progression visualizer, remaining weight gauge, quick dose calibration steppers (`-15g`, `-18g`, `+18g`), and bag management actions.
5. **Bidirectional Timer Handoff & Auto-Deduction**: One-tap "Brew with this Coffee" CTA that pins the active bean to the Timer screen chassis. Upon brew completion, an interactive 1-tap card prompts to deduct the brewed dose from the bag's remaining weight.
6. **Offline-First Persistence & Supabase Sync**: Backed by `AsyncStorage` (`@brewlog/mobile:stash_cache`) for instant zero-flicker startup, with automated cloud synchronization to Supabase's `beans` table when authenticated.

---

## 2. Architecture & Data Flow

We implement **Approach A (Dedicated `StashContext` with Direct Timer Bridge)**:

```
┌────────────────────────────────────────────────────────┐
│                      RootLayout                        │
│   (AuthProvider -> RecipeProvider -> StashProvider)    │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│     RecipeContext     │       │     StashContext      │
│  - recipes / presets  │       │  - beans (all/active/ │
│  - activeTimerRecipe  │       │    frozen/archived)   │
│  - activeTimerDose    │       │  - activeBrewBean     │
│  - isBrewActive       │       │  - CRUD & dose deduct │
└───────────┬───────────┘       └───────────┬───────────┘
            │                               │
            └───────────────┬───────────────┘
                            ▼
               ┌─────────────────────────┐
               │       TimerScreen       │
               │  - Displays active bean │
               │  - Deducts brewed dose  │
               └─────────────────────────┘
```

### 2.1 Domain Model Updates (`@brewlog/core`)

In `packages/core/src/types.ts`, expand `Bean`:
```typescript
export interface Bean {
  id: string;
  userId?: string;
  name: string;
  roaster: string;
  originCountry?: string;
  region?: string;
  farm?: string;
  variety?: string[];
  altitudeMeters?: number;
  process?: ProcessMethod;
  roastLevel?: RoastLevel;
  roastDate?: string;          // YYYY-MM-DD
  recommendedRestDays?: number;// optional roaster suggestion, defaults to 5
  flavorNotes: string[];
  rating?: number;             // 1-5
  bagWeightGrams?: number;     // e.g. 250, 340
  bagWeightOz?: number;
  remainingOz?: number;
  remainingGrams?: number;     // remaining in bag
  price?: number;
  isFavorite?: boolean;
  isFrozen?: boolean;          // true when stored in freezer vault
  frozenDate?: string;         // YYYY-MM-DD date placed in freezer
  isArchived?: boolean;        // true when bag is finished/archived
  notes?: string;
  createdAt: string;
}
```

### 2.2 Database Schema & Mappers (`@brewlog/supabase`)

1. **Migration `003_add_bean_cellar_status.sql`**:
   ```sql
   ALTER TABLE public.beans
     ADD COLUMN IF NOT EXISTS recommended_rest_days INTEGER DEFAULT 5,
     ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
     ADD COLUMN IF NOT EXISTS frozen_date DATE,
     ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
   ```
2. **Mapper Alignment (`beanMappers.ts`)**:
   Update `mapBeanRowToDomain` and `mapBeanDomainToInsert` to map `recommended_rest_days`, `is_frozen`, `frozen_date`, and `is_archived`.

### 2.3 State Management (`StashContext.tsx`)

Located at `apps/mobile/src/features/stash/StashContext.tsx`:

```typescript
export interface StashContextValue {
  beans: Bean[];
  activeBeans: Bean[];
  frozenBeans: Bean[];
  archivedBeans: Bean[];
  activeBrewBean: Bean | null;
  loading: boolean;
  addBean: (bean: Omit<Bean, 'id' | 'createdAt'>) => Promise<Bean>;
  updateBean: (id: string, updates: Partial<Bean>) => Promise<Bean>;
  deleteBean: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleFrozen: (id: string) => Promise<void>;
  archiveBean: (id: string) => Promise<void>;
  unarchiveBean: (id: string) => Promise<void>;
  setActiveBrewBean: (bean: Bean | null) => void;
  deductBeanDose: (id: string, doseGrams: number) => Promise<void>;
  refreshBeans: () => Promise<void>;
}
```

* **Persistence Strategy**:
  * Local key: `@brewlog/mobile:stash_cache`.
  * Loads immediately synchronously during mount, rendering instantly.
  * When `useAuth()` state changes or network connects, fetches Supabase `beans` and merges without overwriting local offline additions.
  * Writes to `AsyncStorage` on every mutation.

---

## 3. Resting Math & Freezer Logic

Located in `apps/mobile/src/features/stash/utils/restingUtils.ts`:

### 3.1 Days Off Roast Calculation
* **Shelf Coffee**:
  $$\text{effectiveDays} = \text{calculateDaysOffRoast}(\text{roastDate}, \text{today})$$
* **Freezer Vault Coffee** (`isFrozen: true`):
  Uses `frozenDate` to halt the aging clock:
  $$\text{effectiveDays} = \text{calculateDaysOffRoast}(\text{roastDate}, \text{frozenDate})$$

### 3.2 Dynamic Resting Windows
Let $R = \text{recommendedRestDays} \mathbin{?} \text{recommendedRestDays} : 5$:

| Status Stage | Effective Days Condition | Label Format | Theme Color Token |
| :--- | :--- | :--- | :--- |
| **Needs Rest** | $\text{days} < R$ | `Needs Rest (Day X of R)` | Amber (`#eab308` / `colors.warning`) |
| **Peak Window** | $R \le \text{days} \le (R + 25)$ | `Peak Window • Day X` | High-contrast Emerald (`#22c55e` / `colors.success`) |
| **Good (Drink Soon)** | $(R + 25) < \text{days} \le (R + 55)$ | `Good (Drink Soon) • Day X` | Precision Accent Orange (`#f97316` / `colors.accent`) |
| **Past Peak** | $\text{days} > (R + 55)$ | `Past Peak • Day X` | Chassis Gray (`#94a3b8` / `colors.textMuted`) |

* **Frozen Vault Override**:
  When `isFrozen === true`, the badge renders as:
  $$\text{“}\❄️ \text{ Frozen at Day } X \text{ (”} + \text{stageLabel} + \text{“)”}$$
  Badge style: Ice Cyan (`#38bdf8`) border and text.

---

## 4. Screens & UI Components

### 4.1 Cellar Catalog Screen (`app/(tabs)/stash.tsx`)
* **Chassis Summary Bar**: Total active bags, bags in peak flavor window, total remaining cellar grams.
* **Filter Bar**:
  * Shelf switcher segmented pills: `Active Cellar` | `Freezer Vault` | `Archived`.
  * Process method filter chips: `All`, `Washed`, `Natural`, `Honey`, `Anaerobic`, `Experimental`.
  * Search bar with instant query matching on roaster, bean name, origin, or variety.
* **`BeanCard` Component**:
  * Roaster name (uppercase eyebrow), coffee title, favorite star button.
  * Badges: Origin country, process method, roast level.
  * Resting status badge (with custom rest target indicator or frozen label).
  * Remaining weight bar (% bar + `XXXg / YYYg left`), warning color when $< 40$g.
  * Direct action buttons: `"BREW"` (one-tap timer handoff) and card tap (navigates to detail).

### 4.2 Dedicated Bean Detail Screen (`app/stash/[id].tsx`)
* **Header & Origin Specs Card**: Roaster, name, country, region, farm, variety, altitude.
* **Resting Progression Timeline**: 4-stage visual progress curve with marked current day indicator and target rest date.
* **Inventory & Quick Stepper Card**:
  * Large remaining weight display.
  * Quick dose calibration steppers (`-15g`, `-18g`, `+18g`) and manual edit input.
* **Sensory Profile Card**: Interactive flavor notes tag chips and tasting notes.
* **Action Toolbar**:
  * Primary: `"BREW WITH THIS COFFEE"` (sets `activeBrewBean` and navigates to `/(tabs)`).
  * Secondary: `Freeze / Thaw` toggle, `Edit` button (opens modal), `Archive / Delete` with confirmation guard.

### 4.3 Bean Modal Form (`app/stash/modal.tsx`)
* Supports Create (`/stash/modal`) and Edit (`/stash/modal?id=...`).
* Full validation: `roaster` and `name` required.
* Inputs for origin, process (chips), roast level (chips), roast date (date picker / ISO text), `recommendedRestDays` (numeric, placeholder 5).
* Bag size presets (250g, 340g, 1kg) with initial remaining weight sync.
* Storage toggle: "Store in Freezer Vault".
* Discard confirmation dialog when canceling with dirty input state.

### 4.4 Timer Screen Bridge (`apps/mobile/app/(tabs)/index.tsx`)
* Above `TimerHero`, when `activeBrewBean` is set:
  * Sleek chassis pill: `🫘 [Roaster] • [Name] (XXXg left)` with a quick `×` button to detach.
* When timer completes (`isFinished === true`):
  * Displays 1-tap card: `"DEDUCT [dose]g FROM STASH"`.
  * Tapping deducts dose from bag in `StashContext` with haptic feedback and displays confirmation banner (`Updated: XXXg left`).

---

## 5. Navigation & Route Registration

In `apps/mobile/app/_layout.tsx`, register new stack and modal screens:
```typescript
<Stack.Screen
  name="stash/[id]"
  options={{
    headerShown: true,
    title: 'Bean Details',
    headerStyle: { backgroundColor: colors.canvas },
    headerTintColor: colors.textPrimary,
  }}
/>
<Stack.Screen
  name="stash/modal"
  options={{
    presentation: 'modal',
    headerShown: false,
  }}
/>
```

---

## 6. Verification & Testing Plan

### Automated Test Suites
1. **Domain & Utils**: `restingUtils.test.ts` (100% branch coverage on resting windows, custom rest days, freezer freezing, and edge cases).
2. **Context & Storage**: `StashContext.test.tsx` (offline hydration, CRUD, favorite/freeze/archive toggles, dose deduction, Supabase cloud sync).
3. **Components**:
   * `BeanCard.test.tsx` (badges, remaining weight gauge, brew CTA).
   * `StashCatalogScreen.test.tsx` (shelf tabs, process filters, search query).
   * `BeanDetailScreen.test.tsx` (resting curve, quick steppers, handoff button).
   * `BeanModalScreen.test.tsx` (validation, presets, cancel confirmation).
   * `timerStashIntegration.test.tsx` (active bean badge, detach, brew completion dose deduction).

### Static Analysis & Platform Verification
* `npm test`: Monorepo-wide test pass (core, supabase, web, mobile).
* `npx tsc --noEmit`: Strict TypeScript pass with 0 errors.
* `npx expo-doctor`: 21/21 clean diagnostic checks.
* `npx expo export --platform ios && npx expo export --platform android`: Clean production Metro bundles.
