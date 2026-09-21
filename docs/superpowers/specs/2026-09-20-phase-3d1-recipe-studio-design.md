# Mobile Recipe Studio & Catalog Design Spec

**Date:** 2026-09-20  
**Status:** Approved  
**Topic:** Phase 3D.1 — Mobile Recipe Studio, Catalog & Timer Integration (`apps/mobile`)  

---

## 1. Overview & Context

In Phase 3B and Phase 3C, BrewLog Mobile implemented its interactive brew timer subsystem and enterprise Supabase authentication with hybrid hardware-backed secure storage. However, the recipes tab (`apps/mobile/app/(tabs)/recipes.tsx`) currently displays a static list of default presets with no detail view, custom creation, cloud synchronization, or timer handoff.

Per the [ROADMAP.md](file:///Users/greglawrence/Projects/brewlog/docs/ROADMAP.md), **Phase 3D (Mobile Feature Parity)** encompasses three major subsystems:
1. **Phase 3D.1**: Recipe Studio, Catalog & Timer Integration (this specification)
2. **Phase 3D.2**: Stash Manager (Coffee bean cellar & inventory)
3. **Phase 3D.3**: Cupping Session Logging Flow (SCA 10-attribute scoring form)

This design specification details **Phase 3D.1: Recipe Studio & Catalog**. It establishes reactive recipe state management, offline-first persistence with Supabase cloud synchronization, native stack/modal navigation, a full-lifecycle recipe builder (create, edit, duplicate), and bidirectional parameter handoff with the brew timer.

---

## 2. Key Requirements & User Decisions

1. **Navigation Architecture (Native Stack & Modal)**:
   - **Catalog Screen** (`app/(tabs)/recipes.tsx`): Resides inside bottom tabs. Displays filterable list with dynamic method pills and header action to launch the builder.
   - **Detail Screen** (`app/recipe/[id].tsx`): Pushed to the root stack with native transition, dark theme styling, header back button, and actions.
   - **Builder Modal** (`app/recipe/builder.tsx`): Presented as a native modal sheet (`presentation: 'modal'`) with full vertical scrolling for multi-stage editing without gesture collisions.

2. **Full Recipe Lifecycle**:
   - **Create**: Build a custom recipe from scratch or starter template.
   - **Edit**: Edit user custom recipes in-place (updates parameters and stages).
   - **Duplicate/Fork**: Duplicate any recipe (presets or custom) to seed the builder with an existing profile for rapid tweaking.
   - **Delete**: Remove custom recipes with confirmation guard (presets are immutable).

3. **Timer Integration & Dual-Access Pattern**:
   - **"Brew with this Recipe" CTA**: Rescales the recipe to the user's selected dose in Recipe Detail, passes it to the active timer via `RecipeContext`, and navigates to the Timer tab.
   - **Timer Screen Picker**: Extends the horizontal `MethodPills` bar on `app/(tabs)/index.tsx` with a "Custom Recipes" selector opening a quick bottom sheet (`CustomRecipePickerSheet`), allowing baristas to switch between custom brews without leaving the Timer tab.
   - **Active Brew Interruption Guard**: Prompts an `Alert.alert` before resetting an in-progress brew.

4. **Dynamic Method Filter Bar**:
   - Filter pills dynamically derive from the currently available recipes (`['all', 'custom', ...dynamicMethodsPresent]`), ensuring users never hit empty dead-end screens.

5. **Industrial Precision Styling & Ergonomics**:
   - **STRICT RULE: Zero Inline Styles**. All styles are declared in `StyleSheet.create` using `INDUSTRIAL_PRECISION_THEME` tokens and `FONTS` constants.
   - Apple HIG minimum touch target (>= 44pt) across all interactive elements.

---

## 3. Architecture & State Management (`RecipeContext`)

A central `RecipeContext` in `apps/mobile/src/features/recipes/RecipeContext.tsx` wraps the application root inside `apps/mobile/app/_layout.tsx` (beneath `AuthProvider`).

```
┌─────────────────────────────────────────────────────────────┐
│                       RootLayout                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                      AuthProvider                       │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │                   RecipeProvider                    │ │ │
│ │ │ ┌─────────────────────────────────────────────────┐ │ │ │
│ │ │ │                  Root Stack                     │ │ │ │
│ │ │ │  - (tabs)                                       │ │ │ │
│ │ │ │    ├── Timer (index.tsx)                        │ │ │ │
│ │ │ │    └── Recipes Catalog (recipes.tsx)            │ │ │ │
│ │ │ │  - recipe/[id] (Detail Screen)                  │ │ │ │
│ │ │ │  - recipe/builder (Modal Form)                  │ │ │ │
│ │ │ └─────────────────────────────────────────────────┘ │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Context Interface
```typescript
export interface RecipeContextValue {
  recipes: BrewRecipe[];
  customRecipes: BrewRecipe[];
  presets: BrewRecipe[];
  loading: boolean;
  activeTimerRecipe: BrewRecipe;
  activeTimerDose: number;
  addRecipe: (recipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => Promise<BrewRecipe>;
  updateRecipe: (id: string, updates: Partial<BrewRecipe>) => Promise<BrewRecipe>;
  deleteRecipe: (id: string) => Promise<void>;
  setActiveTimerRecipe: (recipe: BrewRecipe, dose?: number) => void;
  refreshRecipes: () => Promise<void>;
}
```

### Offline-First Storage & Cloud Synchronization
1. **Local Caching**:
   - Custom recipes persist in `@react-native-async-storage/async-storage` under key `@brewlog/custom_recipes`.
   - On app startup, recipes load immediately from cache and merge with `DEFAULT_PRESET_RECIPES`.
2. **Offline Mutation**:
   - Unauthenticated or offline users can create recipes with IDs prefixed by `local-rec-${Date.now()}`.
3. **Supabase Cloud Sync**:
   - Monitored via `useAuth().user`. When user transitions to authenticated:
     a. **Auto-upload**: Any unsynced items (`local-rec-*`) are inserted to Supabase `recipes` and `recipe_stages` via `mapRecipeDomainToInsert` and `mapRecipeStageDomainToInsert` from `@brewlog/supabase`.
     b. **Cloud Fetch**: Queries `recipes` with joined `recipe_stages` ordered by `created_at desc`.
     c. **Row Mapping**: Maps rows via `mapRecipeRowToDomain` and writes fresh state to cache.
4. **Cloud Mutations**:
   - `addRecipe`: Inserts recipe row and stages, returns mapped domain model.
   - `updateRecipe`: Updates recipe row, deletes existing stages for `recipe_id`, inserts updated stages, returns updated domain model.
   - `deleteRecipe`: Deletes recipe row from Supabase (cascades to stages). Presets are protected against deletion.

---

## 4. Navigation & Screen Decomposition

```
apps/mobile
├── app
│   ├── _layout.tsx                 # Root layout with RecipeProvider & Root Stack routes
│   ├── (tabs)
│   │   ├── _layout.tsx             # Tabs layout with headerRight profile button
│   │   ├── index.tsx               # Timer Screen consuming RecipeContext + Recipe Picker Sheet
│   │   └── recipes.tsx             # Catalog Screen with dynamic filter bar & RecipeCard list
│   └── recipe
│       ├── [id].tsx                # Dedicated Recipe Detail Screen (push stack)
│       └── builder.tsx             # Dedicated Recipe Builder Modal (presentation: 'modal')
└── src
    └── features
        └── recipes
            ├── RecipeContext.tsx            # Context provider & useRecipes hook
            ├── RecipeContext.test.tsx       # Vitest suite for context & sync logic
            ├── components
            │   ├── RecipeCard.tsx           # Catalog card with badges & metadata
            │   ├── RecipeCard.test.tsx
            │   ├── MethodFilterBar.tsx      # Dynamic horizontal filter pills
            │   ├── MethodFilterBar.test.tsx
            │   ├── SpecsGrid.tsx            # 4-card specs grid (Water, Ratio, Time, Temp)
            │   ├── SpecsGrid.test.tsx
            │   ├── DoseRescaler.tsx         # Steppers, direct input, and quick presets
            │   ├── DoseRescaler.test.tsx
            │   ├── StagesTimeline.tsx       # Vertical stage sequence with step badges
            │   ├── StagesTimeline.test.tsx
            │   ├── CustomRecipePickerSheet.tsx # Timer custom recipe selector bottom sheet
            │   └── CustomRecipePickerSheet.test.tsx
            └── utils
                ├── timingUtils.ts           # Sequential startSecond & totalTime recalculator
                └── timingUtils.test.ts
```

---

## 5. Detailed Component Specifications

### 5.1 Recipe Catalog (`app/(tabs)/recipes.tsx`)
- **Header**:
  - Eyebrow: `RECIPE CATALOG` (`colors.accent`).
  - Title: `Curated Brew Profiles` (`colors.textPrimary`).
  - Right Action: `BookPlus` icon button (>= 44pt touch target) opening `/recipe/builder`.
- **Dynamic Method Filter Bar (`MethodFilterBar.tsx`)**:
  - Computes `['all', 'custom', ...uniqueMethodsPresent]`.
  - Active pill styled with `colors.panelRecessed` and `colors.accent` border.
- **Card (`RecipeCard.tsx`)**:
  - Title, author tag, brew method badge, custom indicator badge.
  - Metrics row: Ratio (`1:16.7`), Dose (`15g`), Water (`250g`), Time (`3m 30s`).
  - Native `Pressable` with pressed opacity feedback, navigating to `/recipe/${recipe.id}`.

### 5.2 Recipe Detail Screen (`app/recipe/[id].tsx`)
- **Master Header**:
  - Brew method badge, custom/preset pill, author, title, description.
- **Specifications Grid (`SpecsGrid.tsx`)**:
  - 4 industrial panels: `Total Water` (g), `Brew Ratio` (1:X), `Target Time` (m:ss), `Water Temp` (°C).
- **Tactile Dose Rescaler (`DoseRescaler.tsx`)**:
  - Stepper controls (`-` / `+` 1g increments).
  - Tap-to-edit dose input with decimal validation.
  - Quick dose pills: `Single (15g)`, `Standard (18g)`, `Server (30g)`, `Batch (45g)`.
  - Live recalculation of water target and stage amounts via `rescaleRecipeDose`.
- **Brew Steps Timeline (`StagesTimeline.tsx`)**:
  - Ordered sequence showing step index badge, stage name, stage type, target cumulative water weight, duration, and instructions.
- **Action Toolbar**:
  - Primary CTA: **"BREW WITH THIS RECIPE"** (`colors.accent` background, Play icon) — invokes `setActiveTimerRecipe(scaledRecipe, customDose)` and executes `router.replace('/(tabs)')`.
  - Secondary Actions:
    - **"Duplicate"**: Navigates to `/recipe/builder?duplicateId=${recipe.id}`.
    - **"Edit"** (custom only): Navigates to `/recipe/builder?editId=${recipe.id}`.
    - **"Delete"** (custom only): Triggers confirmation dialog before calling `deleteRecipe(recipe.id)` and returning to catalog.

### 5.3 Recipe Builder Modal (`app/recipe/builder.tsx`)
- **Modal Chrome**:
  - Header: Left "Cancel" button (with discard guard), Title ("New Recipe" / "Edit Recipe" / "Duplicate Recipe"), Right "Save" CTA.
- **Section 1: Profile Overview**:
  - Name (required), Author, Brew Method selector pills, Description, Notes.
- **Section 2: Dose & Ratio Engine**:
  - Coffee Dose input (g) and Ratio input (1:X).
  - Auto-calculates Water Target (g) in real-time.
  - Quick ratio presets: `1:15`, `1:16`, `1:16.7`, `1:17`.
- **Section 3: Parameters**:
  - Grind size string and Water Temp (°C).
- **Section 4: Multi-Stage Timeline**:
  - Stage cards with Stage Type picker (`bloom`, `pour`, `agitation`, `drawdown`, `press`, `other`), Name, Duration (s), Target Water (g), and Instructions.
  - Up / Down reorder controls.
  - Delete stage action.
  - "+ Add Brew Stage" button.
  - Auto-computed total brew time header banner.

### 5.4 Timer Integration (`app/(tabs)/index.tsx`)
- Reads `activeTimerRecipe` and `activeTimerDose` from `RecipeContext`.
- Keeps horizontal `MethodPills` for standard presets, appending a `CUSTOM RECIPES` pill.
- Tapping `CUSTOM RECIPES` opens `CustomRecipePickerSheet.tsx` (modal bottom sheet) displaying user custom recipes with quick-select cards.
- If a brew is actively ticking when switching recipes (via handoff or picker), prompts `Alert.alert`:
  > *"A brew is currently in progress. Switching recipes will reset your timer."*
  > Buttons: `[Cancel]` | `[Reset & Switch]`

---

## 6. Data Flow, Error Handling & Edge Cases

1. **Sequential Timing Math (`timingUtils.ts`)**:
   - Stage start times are derived automatically:
     $$\text{stage}[i].\text{startSecond} = \sum_{k=0}^{i-1} \text{stage}[k].\text{durationSeconds}$$
     $$\text{totalTimeSeconds} = \sum_{k=0}^{N-1} \text{stage}[k].\text{durationSeconds}$$
   - When a stage is added, deleted, or reordered, `recalculateTiming` is executed to prevent timeline discontinuities.

2. **Validation Rules**:
   - Recipe name must have at least 1 non-whitespace character.
   - Coffee dose must be between `1` and `100` grams.
   - Brew ratio must be between `1` and `30`.
   - Recipe must have at least 1 stage with duration $> 0$.

3. **Preset Protection**:
   - `DEFAULT_PRESET_RECIPES` have `isPreset: true` and IDs starting with `preset-`.
   - `deleteRecipe` and `updateRecipe` reject any attempts to mutate preset IDs, logging a warning and returning cleanly.

4. **Network Drop & Offline Resilience**:
   - All mutations update local state and `AsyncStorage` first.
   - If Supabase is unreachable, local changes remain active; no error screen or block occurs.

---

## 7. Testing & Verification Strategy

### 7.1 Unit & Component Tests (Vitest + React Native Testing Library)
- `timingUtils.test.ts`: Tests sequential `startSecond` derivation and total time computation under stage reordering.
- `RecipeContext.test.tsx`:
  - Tests hydration from `AsyncStorage` and default preset seeding.
  - Tests offline `addRecipe`, `updateRecipe`, and `deleteRecipe`.
  - Tests preset deletion protection.
  - Tests cloud sync on auth change (uploading `local-rec-*` items and merging Supabase records).
  - Tests `setActiveTimerRecipe`.
- `MethodFilterBar.test.tsx`:
  - Tests dynamic derivation of method pills from available recipes.
  - Tests selecting `ALL`, `CUSTOM`, and specific methods.
- `RecipeCard.test.tsx`: Tests rendering of badges, specs, and navigation on press.
- `DoseRescaler.test.tsx`: Tests stepper clicks, direct input, and quick preset buttons rescaling dose.
- `SpecsGrid.test.tsx` & `StagesTimeline.test.tsx`: Tests specs and timeline formatting.
- `CustomRecipePickerSheet.test.tsx`: Tests custom recipe listing and selection.
- Screen Integration Tests:
  - `RecipesCatalog.test.tsx` (Catalog screen)
  - `RecipeDetail.test.tsx` (Detail screen)
  - `RecipeBuilder.test.tsx` (Builder modal)
  - `TimerScreen.test.tsx` (Timer screen integration)

### 7.2 Quality Gates
1. `npm run typecheck` across all packages (`core`, `supabase`, `web`, `mobile`) — zero errors.
2. `npm test` across all monorepo test suites — 100% passing.
3. `npx expo-doctor` in `apps/mobile` — 21/21 checks passing.
4. Metro production export bundling verification:
   - `npx expo export --platform ios`
   - `npx expo export --platform android`
