# Plan: Web Recipe Editing Flow Alignment (Opportunity 2)

## Current Workspace State
- **Repo**: `brewlog`
- **Branch**: `fix/issue-32-bean-persistence-and-flow-alignment`
- **PR**: [PR #33](https://github.com/Chewieez/brewlog/pull/33)
- **Latest Commit**: `75b4790` (`feat(web): add localStorage caching, offline sync, and bean deletion with single initial bean`)
- **Status**: Clean working tree, all tests passing (124 tests), monorepo typechecks cleanly.
- **Active Dev Processes**:
  - Web Vite dev server running on port `3000`
  - Mobile Expo Metro bundler running on port `8081`

---

## What Has Been Completed on PR #33
1. **Remote Database Migrations**: Executed `002_align_sca_cupping_attributes.sql` and `003_add_bean_cellar_status.sql` on remote Supabase.
2. **Core Domain Promotion**: Promoted `calculateBeanRestingInfo` and `offsetRoastDateForThaw` into `@brewlog/core` with 12 comprehensive unit tests in `packages/core/src/restingUtils.test.ts`.
3. **Web Stash Alignment (Opportunity 1)**:
   - Enhanced modal with full terroir, roast, cellar, resting days, price, and notes.
   - Resting badges & frozen cellar indicators on bean cards.
   - Web bean editing (`updateBean`, EDIT button, pre-populated modal).
   - Web bean deletion (`deleteBean`, DELETE BEAN modal button).
   - `localStorage` caching (`brewlog_beans_cache`) and offline auto-sync (`local-bean-*`).
   - Trimmed `INITIAL_BEANS` down to a single sample bean.
4. **Form & UX Polish**: Numeric constraints (`min="0"`), `id`/`htmlFor` pairings, modal `Escape` key handler, resting badge colors, Vitest config `dist/` exclusions.

---

## Next Task to Execute: Opportunity 2 (Recipe Editing on Web)

**Goal**: Align Web recipe management with Mobile by adding full recipe editing capabilities.

### Mobile Reference Implementation
- Data layer: `apps/mobile/src/features/recipes/RecipeContext.tsx` has `updateRecipe(id: string, updates: Partial<BrewRecipe>): Promise<BrewRecipe>`.
- UI: `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.tsx` supports pre-population via `editId` and calls `updateRecipe(editId, payload)`.

### Exact Steps for Web Implementation:
1. **Data Hook (`apps/web/src/features/recipes/useRecipes.ts`)**:
   - Add `updateRecipe(id: string, updates: Partial<BrewRecipe>): Promise<BrewRecipe>`.
   - Guard against editing preset recipes:
     ```ts
     if (id.startsWith('preset-') || DEFAULT_PRESET_RECIPES.some((p) => p.id === id)) {
       console.warn('Cannot edit built-in preset recipe:', id);
       return DEFAULT_PRESET_RECIPES.find((p) => p.id === id)!;
     }
     ```
   - Update in-memory state and persist to `localStorage` (`brewlog_custom_recipes_cache`).
   - If authenticated and not a local unsynced ID (`!id.startsWith('local-rec-')`):
     - Update the `recipes` row in Supabase via `mapRecipeDomainToInsert`.
     - If `updates.stages` is provided, delete existing stages (`supabase.from('recipe_stages').delete().eq('recipe_id', id)`) and insert the updated stages mapped via `mapRecipeStageDomainToInsert`.
   - Return updated recipe and export `updateRecipe` from the hook.

2. **Context & Outlets (`apps/web/src/layouts/RootLayout.tsx`)**:
   - Add `onUpdateRecipe: (id: string, updates: Partial<BrewRecipe>) => Promise<BrewRecipe>` to `RootOutletContext`.
   - Destructure `updateRecipe` from `useRecipes()` and expose `onUpdateRecipe` in `contextValue`.

3. **Recipe Studio Route (`apps/web/src/routes/RecipesRoute.tsx`)**:
   - Add state: `const [editingRecipe, setEditingRecipe] = useState<BrewRecipe | null>(null);`.
   - Add `onEditRecipe: (recipe: BrewRecipe) => void` to `RecipeOutletContext`.
   - In `handleSaveRecipe`:
     - If `editingRecipe` exists: call `onUpdateRecipe(editingRecipe.id, recipeData)`.
     - If creating: call `onAddRecipe(recipeData)` and navigate to `/recipes/${created.id}`.
   - Pass `initialRecipe={editingRecipe}` to `RecipeBuilderModal`.
   - Reset `editingRecipe` to `null` when modal closes or when clicking "NEW RECIPE".

4. **UI Triggers**:
   - **`apps/web/src/features/recipes/RecipeDetailPane.tsx`**:
     - Accept `onEditRecipe?: (recipe: BrewRecipe) => void` prop.
     - For custom recipes (`isCustom`), render an EDIT button/icon next to the Delete button.
   - **`apps/web/src/routes/RecipeDetailRoute.tsx`**:
     - Retrieve `onEditRecipe` from `useRecipeOutletContext()` and pass it to `RecipeDetailPane`.
   - **`apps/web/src/features/recipes/RecipeCatalogList.tsx`**:
     - Accept `onEditRecipe?: (recipe: BrewRecipe) => void` prop.
     - Render an edit button on custom recipe card items.
   - **`apps/web/src/routes/RecipesRoute.tsx`**:
     - Pass `onEditRecipe` to `RecipeCatalogList`.

5. **Modal Adaptability (`apps/web/src/features/recipes/RecipeBuilderModal.tsx`)**:
   - Add `initialRecipe?: BrewRecipe | null` prop.
   - When `initialRecipe` changes / modal opens with `initialRecipe`:
     - Pre-populate form state (`name`, `author`, `brewMethod`, `grindSize`, `waterTempCelsius`, `description`, `notes`, `coffeeDoseGrams`, `ratio`, `waterAmountGrams`, `stages`).
     - Set modal title to `"Edit Recipe"`.
     - Set submit button text to `"SAVE CHANGES"`.
   - When opened with `initialRecipe === null`:
     - Reset form state to defaults.
     - Set modal title to `"Create New Custom Recipe"`.
     - Set submit button text to `"SAVE RECIPE"`.

6. **Tests & Verification**:
   - In `apps/web/src/features/recipes/useRecipes.test.ts`:
     - Test editing an existing custom recipe updates `localStorage` and state.
     - Test editing guards against built-in preset recipes.
     - Test editing syncs `recipes` and `recipe_stages` in Supabase when authenticated.
   - In `apps/web/src/features/recipes/RecipeDetailPane.test.tsx` and/or `RecipeCatalogList.test.tsx`:
     - Test clicking EDIT button triggers `onEditRecipe`.
   - Verify with:
     - `npm run typecheck` (all 5 workspaces)
     - `npm test` (all tests passing)
   - Commit and push to `fix/issue-32-bean-persistence-and-flow-alignment`.
