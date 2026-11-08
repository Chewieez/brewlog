# Issue #42: Adopt React Context Providers on Web to Match Mobile Context Architecture

**Date:** 2026-11-07
**Issue:** #42 (`refactor(web): consider adopting React Context providers to match mobile context architecture`)

---

## 1. Problem Statement & Motivation

In `apps/mobile`, all domain state (`EquipmentContext`, `RecipeContext`, `StashContext`, `ReviewsContext`) is provided at the application root via dedicated React Context providers. Any screen, modal, or child component can call `useEquipment()`, `useRecipes()`, `useStash()`, or `useReviews()` and read/mutate a single shared source of truth with real-time reactivity and zero prop drilling.

In contrast, `apps/web` currently manages its 4 core domains (`useEquipment`, `useBeans`, `useRecipes`, `useReviews`) as standalone `useState` hooks instantiated inside `RootLayout.tsx` and passed down via React Router's `useRootOutletContext()`. This causes several concrete problems:
1. **Detached State Bugs:** Calling any of these hooks outside `RootLayout` (for example, `useEquipment()` in `RecipeBuilderModal.tsx` and `RecipeDetailPane.tsx`, or `useRecipes()` in `TimerRoute.tsx`) creates an isolated `useState` instance and triggers duplicate Supabase fetches.
2. **Workaround State & Prop Drilling:** `RecipeBuilderModal` had to introduce a local `locallyAddedGrinders` state workaround because adding a grinder via `useEquipment()` did not update detached instances without prop-drilling `equipment` and `onAddEquipment` through `RootLayout` -> `RecipesRoute` -> `RecipeBuilderModal`.
3. **Bloated `RootLayout.tsx`:** `RootLayout` acts as a 315-line god-object aggregating 24 properties into `RootOutletContext`, causing any domain update to invalidate the entire outlet context object.
4. **Cross-Platform Divergence:** `apps/web` already uses React Context for `AuthContext.tsx` and `SettingsContext.tsx`, whereas its 4 domain features use `use*.ts` files with `RootOutletContext`.

---

## 2. Goals & Non-Goals

### Goals
- Convert the 4 Web domain hooks into top-level React Context providers (`EquipmentContext.tsx`, `RecipeContext.tsx`, `BeansContext.tsx`, `ReviewsContext.tsx`), replacing the old `use*.ts` hook files.
- Enforce strict context consumption (`useEquipment`, `useRecipes`, `useBeans`, `useReviews` throw when called outside their provider) while exporting `useOptional*` variants for optional consumption.
- Move cross-route active selection and session state (`selectedRecipe`, `selectedBean`, `pendingBrewSession`) from `RootLayout` into their owning domain providers (`RecipeContext`, `BeansContext`, `ReviewsContext`), matching Mobile's context boundaries.
- Mount all domain providers at the application root via a reusable `<AppProviders>` component in `App.tsx`.
- Update Web routes (`TimerRoute`, `StashRoute`, `RecipesRoute`, `RecipeDetailRoute`, `EquipmentRoute`, `ReviewsRoute`) and components (`RecipeBuilderModal`, `RecipeDetailPane`) to consume domain context hooks directly, removing `RootOutletContext` and `locallyAddedGrinders`.
- Slim `RootLayout.tsx` down to pure layout responsibilities (`Header`, `<Outlet />`, `AuthModal`).

### Non-Goals
- Changing Supabase database schemas, localStorage cache keys, or offline sync algorithms on Web.
- Modifying `apps/mobile` or `@brewlog/core`.

---

## 3. Architecture & Provider Hierarchy

### 3.1 File Structure in `apps/web/src/features/`
The 4 hook files and their test suites are replaced with canonical `*Context.tsx` modules matching `AuthContext.tsx`, `SettingsContext.tsx`, and `apps/mobile`:

| Previous File | New Canonical File | Primary Exports |
|---|---|---|
| `features/equipment/useEquipment.ts` | `features/equipment/EquipmentContext.tsx` | `EquipmentContext`, `EquipmentProvider`, `useEquipment`, `useOptionalEquipment`, `EquipmentContextValue` |
| `features/recipes/useRecipes.ts` | `features/recipes/RecipeContext.tsx` | `RecipeContext`, `RecipeProvider`, `useRecipes`, `useOptionalRecipes`, `RecipeContextValue`, `WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY` |
| `features/stash/useBeans.ts` | `features/stash/BeansContext.tsx` | `BeansContext`, `BeansProvider`, `useBeans`, `useOptionalBeans`, `BeansContextValue` (plus `StashProvider`, `useStash`, `useOptionalStash` aliases) |
| `features/reviews/useReviews.ts` | `features/reviews/ReviewsContext.tsx` | `ReviewsContext`, `ReviewsProvider`, `useReviews`, `useTastingLogs`, `useOptionalReviews`, `ReviewsContextValue` |

Corresponding unit test files are renamed to:
- `features/equipment/EquipmentContext.test.tsx`
- `features/recipes/RecipeContext.test.tsx`
- `features/stash/BeansContext.test.tsx`
- `features/reviews/ReviewsContext.test.tsx`

### 3.2 Top-Level `<AppProviders>` Composition
In `apps/web/src/App.tsx`, domain providers wrap the router inside `AuthProvider` and `SettingsProvider`, matching the nesting order in `apps/mobile/app/_layout.tsx`:

```tsx
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <SettingsProvider>
      <RecipeProvider>
        <BeansProvider>
          <EquipmentProvider>
            <ReviewsProvider>
              {children}
            </ReviewsProvider>
          </EquipmentProvider>
        </BeansProvider>
      </RecipeProvider>
    </SettingsProvider>
  </AuthProvider>
);
```

Exporting `AppProviders` allows both `App` and integration test harnesses (such as `TestApp` in `App.test.tsx`) to mount the exact same provider tree.

---

## 4. Domain Context Specifications

### 4.1 `EquipmentContext.tsx`
```ts
export interface EquipmentContextValue {
  equipment: Equipment[];
  grinders: Equipment[];
  brewers: Equipment[];
  scales: Equipment[];
  kettles: Equipment[];
  other: Equipment[];
  loading: boolean;
  addEquipment: (newEquipment: Omit<Equipment, 'id' | 'createdAt'>) => Promise<Equipment>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<Equipment>;
  deleteEquipment: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  refreshEquipment: () => Promise<void>;
}
```
- **Derived Category Lists:** Memoized `grinders`, `brewers`, `scales`, `kettles`, and `other` filtered arrays matching Mobile's `EquipmentContext`.
- **Storage & Sync:** Preserves existing `brewlog_equipment_cache` `localStorage` caching and `local-eq-*` auto-sync behavior.
- **Hooks:**
  - `useEquipment()`: Returns `EquipmentContextValue` or throws `new Error('useEquipment must be used within an EquipmentProvider')`.
  - `useOptionalEquipment()`: Returns `EquipmentContextValue | null`.

### 4.2 `RecipeContext.tsx`
```ts
export const WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY = 'brewlog_last_active_recipe';

export interface RecipeContextValue {
  recipes: BrewRecipe[];
  customRecipes: BrewRecipe[];
  presets: BrewRecipe[];
  selectedRecipe: BrewRecipe;
  loading: boolean;
  addRecipe: (newRecipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => Promise<BrewRecipe>;
  updateRecipe: (id: string, updates: Partial<BrewRecipe>) => Promise<BrewRecipe>;
  deleteRecipe: (id: string) => Promise<void>;
  setSelectedRecipe: (recipe: BrewRecipe) => void;
  refreshRecipes: () => Promise<void>;
}
```
- **Active Recipe Management (migrated from `RootLayout.tsx`):**
  - Initializes `selectedRecipe` from `WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY` in `localStorage` if found in `recipes`, otherwise `recipes[0] || DEFAULT_PRESET_RECIPES[0]`.
  - Self-heals `localStorage` and `selectedRecipe` if the stored recipe ID does not exist in `recipes`.
  - `setSelectedRecipe(recipe)` updates state and persists `{ recipeId: recipe.id }` to `WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY`.
  - `updateRecipe(id, updates)` automatically updates `selectedRecipe` if `selectedRecipe.id === id`.
  - `deleteRecipe(id)` resets `selectedRecipe` to `DEFAULT_PRESET_RECIPES[0]` and updates `localStorage` if `selectedRecipe.id === id`.
- **Hooks:**
  - `useRecipes()`: Returns `RecipeContextValue` or throws `new Error('useRecipes must be used within a RecipeProvider')`.
  - `useOptionalRecipes()`: Returns `RecipeContextValue | null`.

### 4.3 `BeansContext.tsx`
```ts
export interface BeansContextValue {
  beans: Bean[];
  selectedBean: Bean | null;
  loading: boolean;
  addBean: (newBean: Omit<Bean, 'id' | 'createdAt'>) => Promise<Bean>;
  updateBean: (updatedBean: Bean) => Promise<Bean>;
  deleteBean: (id: string) => Promise<void>;
  setSelectedBean: (bean: Bean | null) => void;
  refreshBeans: () => Promise<void>;
}
```
- **Selected Bean Management (migrated from `RootLayout.tsx`):**
  - Initializes `selectedBean` to `beans[0] || INITIAL_BEANS[0] || null`.
  - If `!selectedBean && beans.length > 0`, selects `beans[0]`.
  - `updateBean(updatedBean)` updates `selectedBean` if `selectedBean?.id === updatedBean.id`.
  - `deleteBean(id)` updates `selectedBean` to the first remaining bean (`beans.find((b) => b.id !== id) || null`) if `selectedBean?.id === id`.
- **Hooks & Aliases:**
  - `useBeans()` (and `useStash` alias): Returns `BeansContextValue` or throws `new Error('useBeans must be used within a BeansProvider')`.
  - `useOptionalBeans()` (and `useOptionalStash` alias): Returns `BeansContextValue | null`.
  - `BeansProvider` (and `StashProvider` alias).

### 4.4 `ReviewsContext.tsx`
```ts
export interface ReviewsContextValue {
  logs: TastingLog[];
  reviews: TastingLog[];
  loading: boolean;
  pendingBrewSession: PendingBrewSession | null;
  setPendingBrewSession: (session: PendingBrewSession | null) => void;
  addReview: (log: Omit<TastingLog, 'id' | 'createdAt'>) => Promise<TastingLog | void>;
  updateReview: (id: string, updates: Partial<TastingLog>) => Promise<TastingLog | void>;
  deleteReview: (id: string) => Promise<void>;
  addTastingLog: (log: Omit<TastingLog, 'id' | 'createdAt'>) => Promise<TastingLog | void>;
  updateTastingLog: (id: string, updates: Partial<TastingLog>) => Promise<TastingLog | void>;
  deleteTastingLog: (id: string) => Promise<void>;
  refreshLogs: () => Promise<void>;
}
```
- **Pending Brew Session Management (migrated from `RootLayout.tsx`):**
  - Holds `pendingBrewSession: PendingBrewSession | null` and `setPendingBrewSession`.
- **Hooks:**
  - `useReviews()` and `useTastingLogs()`: Return `ReviewsContextValue` or throw `new Error('useReviews must be used within a ReviewsProvider')`.
  - `useOptionalReviews()`: Returns `ReviewsContextValue | null`.

---

## 5. Route & Component Updates

### 5.1 `RootLayout.tsx`
- Removes `RootOutletContext` and `useRootOutletContext`.
- Consumes `useBeans()` for `beans.length`, `useReviews()` for `logs.length`, and `useAuth()` for `isPasswordRecovery` and `authUrlError`.
- Renders `<Header />`, `<main><Outlet /></main>`, and `<AuthModal />`.

### 5.2 Route Components
- **`TimerRoute.tsx`**: Consumes `useRecipes()` (`selectedRecipe`, `addRecipe`), `useBeans()` (`beans`, `selectedBean`, `setSelectedBean`), and `useReviews()` (`setPendingBrewSession`).
- **`StashRoute.tsx`**: Consumes `useBeans()` (`beans`, `addBean`, `updateBean`, `deleteBean`, `setSelectedBean`).
- **`EquipmentRoute.tsx`**: Consumes `useEquipment()` (`equipment`, `addEquipment`, `updateEquipment`, `deleteEquipment`, `toggleFavorite`).
- **`ReviewsRoute.tsx`**: Consumes `useReviews()`, `useBeans()`, `useRecipes()`, and `useEquipment()`.
- **`RecipesRoute.tsx` & `RecipeDetailRoute.tsx`**:
  - `RecipesRoute` consumes `useRecipes()` (`recipes`, `addRecipe`, `updateRecipe`, `deleteRecipe`, `setSelectedRecipe`).
  - `RecipeOutletContext` is narrowed to UI-specific coordination between `RecipesRoute` and `RecipeDetailRoute` (`onEditRecipe`), or `RecipeDetailRoute` consumes `useRecipes()` directly for `recipes`, `setSelectedRecipe`, and `deleteRecipe`, only reading `onEditRecipe` from `useRecipeOutletContext()` to open the shared `RecipeBuilderModal`.

### 5.3 Feature Components (`RecipeBuilderModal.tsx` & `RecipeDetailPane.tsx`)
- **`RecipeBuilderModal.tsx`**:
  - Uses `useOptionalEquipment()` (falling back to optional `equipment` / `onAddEquipment` props if provided in isolated unit tests, or using context directly).
  - Removes the `locallyAddedGrinders` state workaround—when `addEquipment` is called inside `handleSaveInlineGrinder`, `EquipmentContext` updates `equipment` in-place immediately.
- **`RecipeDetailPane.tsx`**:
  - Uses `useOptionalEquipment()` alongside optional `equipment` prop override so it shares the root `EquipmentContext` in the app while remaining simple to render in isolated unit tests.

---

## 6. Testing Strategy

1. **Context Unit Tests (`EquipmentContext.test.tsx`, `BeansContext.test.tsx`, `RecipeContext.test.tsx`, `ReviewsContext.test.tsx`)**:
   - Pass `{ wrapper: <Provider> }` to all `renderHook` calls.
   - Add a test to each suite verifying that calling `useEquipment()`, `useBeans()`, `useRecipes()`, or `useReviews()` outside its provider throws the expected error.
   - Add tests for `grinders`/`brewers`/`scales`/`kettles`/`other` derived lists in `EquipmentContext.test.tsx`.
   - Add tests for `selectedRecipe` persistence, self-healing, update, and delete fallback in `RecipeContext.test.tsx`.
   - Add tests for `selectedBean` initialization, update synchronization, and delete fallback in `BeansContext.test.tsx`.
   - Add tests for `pendingBrewSession` state in `ReviewsContext.test.tsx`.
2. **Route & Integration Tests (`App.test.tsx`, `TimerRoute.test.tsx`, `RecipeDetailRoute.test.tsx`, `RecipeDetailPane.test.tsx`, `RecipeBuilderModal.test.tsx`)**:
   - Update `App.test.tsx` to wrap `TestApp` and custom route tests with `<AppProviders>`.
   - Update `TimerRoute.test.tsx` and `RecipeDetailRoute.test.tsx` to provide or mock the domain contexts instead of `RootOutletContext`.
