# React Routing Phase 2 Architecture Design: Dynamic Recipe Routes

- **Date**: 2026-09-13
- **Topic**: Dynamic Child Routes & Responsive Master-Detail Layout (`/recipes/:recipeId`)
- **Status**: Complete / Ready for Review
- **Library**: React Router v8 (`react-router` ^8.3.1) in Library Mode

---

## 1. Overview & Context

In Phase 1, `@brewlog/web` was migrated from in-memory state switching to declarative top-level routes (`/timer`, `/stash`, `/recipes`, `/equipment`, `/cupping`, and `*` 404 fallback). 

Phase 2 builds upon this foundation by introducing **dynamic URL parameters** and **nested route outlets**:
- Deep-linking directly to specific recipes via `/recipes/:recipeId`.
- Syncing URL state when browsing recipes so URLs can be shared, bookmarked, and navigated with browser Back/Forward history.
- Implementing a responsive master-detail layout:
  - **Desktop (`lg:` screen):** Two-column master-detail layout (recipe catalog on the left, active recipe detail on the right via `<Outlet />`).
  - **Mobile (`< lg:` screen):** Viewport-swapped navigation (full-width catalog on `/recipes`, tapping a recipe navigates to full-width detail on `/recipes/:recipeId` with a `"← Back to Recipes"` link).
- Graceful 404 error handling when an invalid recipe ID is requested.

---

## 2. Route Hierarchy & URLs

We will nest child routes beneath `recipes` inside [`apps/web/src/App.tsx`](file:///Users/greglawrence/Projects/brewlog/apps/web/src/App.tsx):

```tsx
<Route path="recipes" element={<RecipesRoute />}>
  <Route index element={<RecipeIndexRoute />} />
  <Route path=":recipeId" element={<RecipeDetailRoute />} />
</Route>
```

### URL Behavior Matrix

| URL Path | Viewport | Behavior |
| :--- | :--- | :--- |
| `/recipes` | Desktop (`lg:`) | Automatically redirects via `<Navigate replace to={`/recipes/${firstRecipe.id}`} />` so the URL always explicitly identifies the visible recipe. |
| `/recipes` | Mobile (`< lg:`) | Renders the full recipe catalog and method filters. Selecting a recipe navigates to `/recipes/:recipeId`. |
| `/recipes/:recipeId` | Desktop (`lg:`) | Two-column layout: Left column highlights the active recipe card; right column (`<Outlet />`) renders the selected recipe details, dose scaler, and steps. |
| `/recipes/:recipeId` | Mobile (`< lg:`) | Catalog list is hidden; right column renders full-width recipe details with a top `"← Back to Recipes"` link pointing back to `/recipes`. |
| `/recipes/:recipeId` *(invalid ID)* | All | If `:recipeId` does not match any preset or custom recipe, renders `<NotFoundRoute />`. |

---

## 3. Component Architecture & Decomposition

To maintain clean separation of concerns and avoid a monolithic view file, `RecipeStudioView.tsx` will be decomposed into focused sub-components:

```
apps/web/src/
├── routes/
│   ├── RecipesRoute.tsx          # Parent route shell: header, filters, catalog container, and <Outlet />
│   ├── RecipeIndexRoute.tsx       # Index child route: desktop default redirect, mobile placeholder
│   └── RecipeDetailRoute.tsx      # Detail child route: reads useParams(), manages dose scaling, renders detail pane
└── features/recipes/
    ├── RecipeCatalogList.tsx      # Left-hand recipe cards list with method filtering & NavLink styling
    ├── RecipeDetailPane.tsx       # Right-hand recipe detail: dose scaler, brew specs, steps checklist, and timer button
    └── RecipeBuilderModal.tsx     # Existing modal for creating custom recipes (unchanged)
```

### 3.1 Parent Route (`RecipesRoute.tsx`)
- Consumes top-level application state from `useRootOutletContext()`:
  - `recipes`, `onAddRecipe`, `onDeleteRecipe`, `setSelectedRecipe`.
- Manages filter state (`selectedMethodFilter`: `'all' | 'v60' | ...`).
- Renders:
  - Top header (Title, description, "Build Custom Recipe" button, and `<RecipeBuilderModal />`).
  - Brew method filter pills.
  - Responsive two-column container:
    - Left column (`lg:col-span-5`): `<RecipeCatalogList />`
      - Hidden on mobile when on `/recipes/:recipeId` (`hidden lg:block`).
      - Full-width on mobile when on `/recipes` (`block lg:col-span-5`).
    - Right column (`lg:col-span-7`): `<Outlet context={recipeOutletContext} />`
      - Hidden on mobile when on `/recipes` (`hidden lg:block`).
      - Full-width on mobile when on `/recipes/:recipeId` (`col-span-1 lg:col-span-7`).
- Exposes typed outlet context:
  ```tsx
  export interface RecipeOutletContext {
    recipes: BrewRecipe[];
    onSelectRecipeForTimer: (recipe: BrewRecipe) => void;
    onDeleteRecipe?: (id: string) => Promise<void> | void;
  }
  export const useRecipeOutletContext = () => useOutletContext<RecipeOutletContext>();
  ```

### 3.2 Index Child Route (`RecipeIndexRoute.tsx`)
- Consumes `useRecipeOutletContext()`.
- On desktop, detects screen width (or renders an auto-redirect `<Navigate replace to={`/recipes/${recipes[0]?.id || 'preset-v60-hoffmann'}`} />`).
- On mobile, renders `null` because the catalog list already fills the view.

### 3.3 Detail Child Route (`RecipeDetailRoute.tsx`)
- Extracts `:recipeId` using `useParams<{ recipeId: string }>()`.
- Looks up recipe in `recipes`:
  ```tsx
  const { recipeId } = useParams();
  const { recipes, onSelectRecipeForTimer, onDeleteRecipe } = useRecipeOutletContext();
  const recipe = recipes.find((r) => r.id === recipeId);

  if (!recipe) {
    return <NotFoundRoute />;
  }
  ```
- Manages local dose scaling state (`customDose`, initialized to `recipe.coffeeDoseGrams`).
- Renders `<RecipeDetailPane>`:
  - Includes a mobile-only top header with `<Link to="/recipes">← Back to Recipes</Link>`.
  - Dose rescaling slider (`rescaleRecipeDose(recipe, customDose)`).
  - Brew ratio, water amount, temperature, grind size, total time.
  - Step-by-step instruction timeline.
  - If custom recipe: "Delete Recipe" button (deleting calls `onDeleteRecipe` and executes `navigate('/recipes')`).
  - "Brew with this Recipe" button (calls `onSelectRecipeForTimer(scaledRecipe)` and executes `navigate('/timer')`).

---

## 4. Navigation Flow & User Actions

1. **Direct Deep Link (`/recipes/preset-v60-hoffmann`)**:
   - Desktop: Opens Recipe Studio with Hoffmann V60 active on the right and highlighted on the left.
   - Mobile: Opens directly to Hoffmann V60 detail view with `"← Back to Recipes"`.
2. **Selecting a Recipe Card**:
   - Card click navigates to `/recipes/:recipeId`.
   - Re-renders the `<Outlet />` without re-mounting the outer `RecipesRoute` shell.
3. **Saving a New Custom Recipe**:
   - In `RecipeBuilderModal`, submitting calls `onAddRecipe(newRecipe)` and awaits the created recipe.
   - On success, navigates directly to `/recipes/${createdRecipe.id}`.
4. **Deleting a Custom Recipe**:
   - Clicking delete triggers confirmation modal.
   - On confirm, awaits `onDeleteRecipe(id)` and calls `navigate('/recipes')`.
5. **Brewing a Recipe**:
   - Clicking "Brew with this Recipe" passes the dose-rescaled recipe to `setSelectedRecipe` and calls `navigate('/timer')`.
6. **Invalid Recipe ID**:
   - Visiting `/recipes/non-existent-id` renders `<NotFoundRoute />` with its coffee-spilled artwork and return button.

---

## 5. Verification Plan

### Automated Tests
1. **Child Route Unit Tests (`RecipeDetailRoute.test.tsx`)**:
   - Test rendering with a valid `:recipeId` under `<MemoryRouter initialEntries={['/recipes/preset-v60-hoffmann']}>`.
   - Test rendering with an unknown `:recipeId` renders `<NotFoundRoute />`.
   - Test dose slider interaction updates water amount and step weights.
   - Test "Brew with this Recipe" calls `onSelectRecipeForTimer` with scaled recipe and navigates to `/timer`.
   - Test mobile "← Back to Recipes" link points to `/recipes`.
2. **Integration Tests (`App.test.tsx`)**:
   - Visiting `/recipes` navigates/renders recipe list.
   - Visiting `/recipes/preset-aeropress-aeropress-timer` directly mounts Aeropress recipe detail.
   - Visiting `/recipes/invalid-route` directly mounts 404 page.
3. **Monorepo Integrity**:
   - `npm run typecheck` across monorepo (0 errors).
   - `npm run test` across workspaces (100% passing).
   - `npm run build --workspace=@brewlog/web` (clean production build).

### Manual Verification
1. **Desktop Viewport:**
   - Navigate to `/recipes`. Confirm URL auto-redirects to first recipe ID and highlights card.
   - Click different recipes. Confirm URL changes, right pane updates instantly, and Back/Forward buttons traverse previously viewed recipes.
2. **Mobile Viewport:**
   - Navigate to `/recipes`. Confirm only recipe catalog list and method filters appear.
   - Tap a recipe. Confirm URL updates to `/recipes/:recipeId` and detail view displays with `"← Back to Recipes"`.
   - Tap `"← Back to Recipes"`. Confirm return to `/recipes` catalog list.
3. **Deep Link & 404:**
   - Type `/recipes/preset-chemex-standard` directly in browser address bar. Confirm correct recipe loads.
   - Type `/recipes/fake-recipe-id`. Confirm 404 page renders.
