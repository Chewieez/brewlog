# Issue 30: Recipe Grinder Settings Design Spec

## 1. Overview & Goals
When dialing in recipes, home brewers often own specific grinders (e.g. Fellow Ode Gen 2, Comandante C40) with dedicated dial settings or click counts. Currently, `BrewRecipe` only stores a freeform `grindSize` text string (e.g., "Medium-Fine") and an optional `recommendedGrinderId`.

This feature addresses GitHub Issue #30:
1. Allow users to configure one or more grinders with specific dial settings for each recipe.
2. In the Recipe Builder (Web and Mobile), if the user has grinders in their equipment, allow adding grinder + setting entries.
3. If the user does not have any grinders added to equipment, provide an inline option to add their first grinder without leaving the flow. If grinders already exist, only select from existing grinders.
4. If a grinder is erased/deleted from equipment, gracefully filter it out and hide it in the UI.
5. In the Brew Timer & Review flows, use the first grinder entry as the primary default pre-fill, while allowing the user to freely change the grinder or edit the grind setting before saving the review.

---

## 2. Architecture & Data Model

### 2.1 Core Types (`packages/core/src/types.ts`)
```ts
export interface RecipeGrinderSetting {
  grinderId: string;
  setting: string;
}

export interface BrewRecipe {
  id: string;
  userId?: string;
  name: string;
  brewMethod: BrewMethodType;
  recommendedBrewerId?: string;
  recommendedGrinderId?: string; // Maintained for backward compatibility (mirrors grinderSettings[0]?.grinderId)
  grinderSettings?: RecipeGrinderSetting[]; // Ordered list of grinder associations and dial settings
  description: string;
  author?: string;
  coffeeDoseGrams: number;
  waterAmountGrams: number;
  ratio: number;
  grindSize: string; // Universal fallback descriptor (e.g. "Medium-Fine")
  waterTempCelsius: number;
  totalTimeSeconds: number;
  stages: BrewStage[];
  notes?: string;
  isPreset?: boolean;
  isFavorite?: boolean;
  createdAt: string;
}
```

### 2.2 Database Migration (`packages/supabase/migrations/004_add_recipe_grinder_settings.sql`)
```sql
-- Migration 004: Add grinder_settings to recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS grinder_settings JSONB NOT NULL DEFAULT '[]'::jsonb;
```

### 2.3 Supabase Database Types (`packages/supabase/src/database.types.ts`)
Update `recipes.Row`, `recipes.Insert`, and `recipes.Update` to include:
```ts
grinder_settings: Json;
```

### 2.4 Supabase Mappers (`packages/supabase/src/mappers/recipeMappers.ts`)
* `mapRecipeRowToDomain`:
  * Parses `row.grinder_settings` as `RecipeGrinderSetting[]`.
  * Backward compatibility: If `grinder_settings` is empty/undefined but `row.recommended_grinder_id` is present, populates `recommendedGrinderId` and sets `grinderSettings: [{ grinderId: row.recommended_grinder_id, setting: row.grind_size || '' }]`.
* `mapRecipeDomainToInsert`:
  * Sets `grinder_settings: recipe.grinderSettings || []`.
  * Sets `recommended_grinder_id: recipe.grinderSettings?.[0]?.grinderId || recipe.recommendedGrinderId || null`.

---

## 3. Web Implementation Details

### 3.1 Recipe Builder Modal (`apps/web/src/features/recipes/RecipeBuilderModal.tsx`)
1. **Equipment Hook**: Consume `useEquipment()` to get `equipment` and `addEquipment`. Filter `userGrinders = equipment.filter(e => e.type === 'grinder')`.
2. **Form State**:
   * `grinderSettings: RecipeGrinderSetting[]` initialized from `initialRecipe?.grinderSettings || []`.
   * If `initialRecipe?.recommendedGrinderId` exists and `grinderSettings` is empty, initialize with `[{ grinderId: initialRecipe.recommendedGrinderId, setting: initialRecipe.grindSize || '' }]`.
3. **Empty State & Inline Creation**:
   * If `userGrinders.length === 0`:
     * Display a clean banner: *"No grinders in your equipment yet."*
     * Provide an `+ Add Grinder` button that opens a compact inline card within the modal with fields for Brand, Model, and Setting Scale (Clicks, Stepped, Stepless, Microns).
     * Submitting calls `addEquipment`, appends the new grinder to the user's equipment, and automatically creates the first grinder row with this grinder selected.
4. **Existing Grinders Selection**:
   * If `userGrinders.length > 0`:
     * Do NOT offer inline grinder creation (prevents UI clutter).
     * Display configured rows:
       * **Grinder Dropdown**: Lists existing user grinders (`Brand Model`).
       * **Setting Input**: Text input for dial setting (e.g. `5.1` or `18 clicks`).
       * **Primary Indicator**: First item is badged as `Primary` (used as prefill default).
       * **Remove Button**: Trash icon button to delete row.
     * **`+ Add Another Grinder` Button**: Enabled if `grinderSettings.length < userGrinders.length`.
5. **Universal `grindSize`**: Retain the standard `grindSize` input (e.g., "Medium-Fine") so every recipe continues to have a general descriptor.

### 3.2 Recipe Detail Pane (`apps/web/src/features/recipes/RecipeDetailPane.tsx`)
1. Consume `useEquipment()` to look up grinder equipment by ID.
2. **Erased Grinder Filter**: Any `grinderId` in `recipe.grinderSettings` not found in `equipment` is filtered out and hidden.
3. If active grinders remain:
   * Render a dedicated "Grinder Settings" section showing each grinder's brand, model, and dial setting (e.g. *Fellow Ode Gen 2 — 5.1*, *Comandante C40 — 18 clicks*), with the primary grinder identified.
4. If no active grinder settings remain:
   * Display the standard `recipe.grindSize` ("Medium-Fine").

---

## 4. Mobile Implementation Details

### 4.1 Mobile Recipe Builder (`apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.tsx`)
1. **Equipment Context**: Consume `useEquipment()` from `EquipmentContext` (`grinders: Equipment[]`, `addEquipment`).
2. **State Management**:
   * `grinderSettings: RecipeGrinderSetting[]` initialized from `sourceRecipe?.grinderSettings || []` (or fallback from `sourceRecipe?.recommendedGrinderId`).
3. **Grinder Section Behavior**:
   * If `grinders.length === 0`:
     * Show card: *"No grinders added to equipment yet."*
     * `+ Add Grinder` button triggers a sheet/modal for Brand, Model, and Setting Scale.
     * Saving calls `addEquipment` and populates the first grinder setting row.
   * If `grinders.length > 0`:
     * Only permit selection from existing equipment grinders.
     * Each row provides:
       * Grinder selection picker/action-sheet.
       * Dial setting text input.
       * Primary badge on first row.
       * Delete row button.
     * `+ Add Grinder Setting` button to add subsequent grinders from available equipment.
4. **General Grind Size**: Preserves general `grindSize` text field.

### 4.2 Mobile Recipe Details (`apps/mobile/src/features/recipes/screens/RecipeDetailScreen.tsx`)
1. Read `grinders` from `EquipmentContext`.
2. Filter out any erased grinders from `recipe.grinderSettings`.
3. If active grinder settings exist:
   * Render a "Grinder Settings" card directly below the recipe title / specs grid listing each grinder (`Brand Model: Setting`).
4. If none exist:
   * Render fallback general `recipe.grindSize`.

---

## 5. Brew Timer & Review Flow Integration

### 5.1 Web (`apps/web/src/features/reviews/ReviewsView.tsx`)
* When starting a review from `pendingBrewSession`:
  * Identify primary grinder: `primary = recipe.grinderSettings?.[0]`.
  * Validate `primary.grinderId` exists in `equipment`.
  * If valid:
    * Pre-fill `grinderId` with `primary.grinderId`.
    * Pre-fill `grindSetting` with `primary.setting || recipe.grindSize`.
  * If invalid or missing:
    * `grinderId` is empty (or custom).
    * `grindSetting` pre-fills with `recipe.grindSize` (e.g. "Medium-Fine").
* The user remains free to change the grinder selection or edit the text input before saving.

### 5.2 Mobile (`apps/mobile/app/(tabs)/index.tsx` & `ReviewFormScreen.tsx`)
* When timer completes and passes params to the review flow:
  * Extract primary grinder: `primary = activeRecipe.grinderSettings?.[0]`.
  * Pre-fill `reviewParams.grinderId = primary.grinderId` and `reviewParams.grind = primary.setting || activeRecipe.grindSize`.
  * If no grinder settings: `reviewParams.grind = activeRecipe.grindSize`.
* In `ReviewFormScreen.tsx`, user can adjust both grinder and setting as needed.

---

## 6. Testing Strategy

1. **Unit Tests**:
   * `packages/supabase/src/mappers/mappers.test.ts`:
     * Mapping `RecipeRow` with `grinder_settings` JSONB to domain model.
     * Mapping domain `BrewRecipe` with `grinderSettings` to insert row (including syncing `recommended_grinder_id`).
     * Backward compatibility: mapping legacy row with `recommended_grinder_id` and no `grinder_settings`.
2. **Web Tests**:
   * `apps/web/src/features/recipes/RecipeBuilderModal.test.tsx`:
     * Inline add grinder when 0 grinders exist.
     * Selecting existing grinders and typing settings.
     * Removing a grinder row.
   * `apps/web/src/features/recipes/RecipeDetailPane.test.tsx`:
     * Displays configured grinder settings.
     * Hides erased grinders cleanly.
3. **Mobile Tests**:
   * `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.test.tsx`:
     * Grinder setting inputs and saving recipe payload.
   * `apps/mobile/src/features/recipes/screens/RecipeDetailScreen.test.tsx`:
     * Rendering grinder settings card.
