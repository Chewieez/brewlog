# React Routing Architecture Design

- **Date**: 2026-09-12
- **Topic**: Client-Side Routing Migration for BrewLog Web
- **Status**: Draft / Awaiting Review

## 1. Overview & Context

Currently, `@brewlog/web` manages navigation through local component state (`activeTab` in `App.tsx`) and renders views conditionally. Tab switches are triggered by `<button onClick={() => setActiveTab(...)}>` in `Header.tsx`.

This document specifies the migration of `@brewlog/web` from state-based tab switching to declarative client-side routing using **React Router v7**. The primary objective is to teach core and intermediate routing patterns in a real-world React 19 application.

### Goals
- Introduce `react-router` into `@brewlog/web`.
- Replace manual tab state with URL-driven routing.
- Preserve persistent application shell (sticky header, auth modals) via `<RootLayout>` and `<Outlet />`.
- Provide active link styling via `<NavLink>`.
- Support programmatic navigation via `useNavigate()`.
- Add a coffee-themed 404 catch-all page for unknown routes.
- Prepare the foundation for Phase 2 dynamic routes (`/recipes/:recipeId`, `/stash/:beanId`).

### Non-Goals
- Server-Side Rendering (SSR) or full-framework Remix mode. (We use React Router as a library inside the existing Vite SPA.)
- Modifying backend Supabase schemas or `@brewlog/core` domain models.

---

## 2. Route Hierarchy & URLs

### Phase 1: Core Routes
| URL Path | Route Element | Description |
| :--- | :--- | :--- |
| `/` | `<Navigate to="/timer" replace />` | Declarative redirect to primary assistant |
| `/timer` | `<TimerRoute />` | Brew Assistant (timer, active recipe, active bean) |
| `/stash` | `<StashRoute />` | Coffee Stash (beans inventory, add bean) |
| `/recipes` | `<RecipesRoute />` | Recipe Studio (recipe library, custom recipe creator) |
| `/equipment` | `<EquipmentRoute />` | Gear & Grinders (equipment manager) |
| `/cupping` | `<CuppingRoute />` | Cupping & Wheel (tasting logs, post-brew handoff) |
| `*` | `<NotFoundRoute />` | 404 fallback page with link to `/timer` |

### Phase 2: Dynamic Detail Routes
| URL Path | Route Element | Description |
| :--- | :--- | :--- |
| `/recipes/:recipeId` | `<RecipeDetailRoute />` | Deep link to inspect or edit a specific recipe |
| `/stash/:beanId` | `<BeanDetailRoute />` | Deep link to inspect a specific coffee bean |

---

## 3. Component Architecture & Data Flow

### 3.1 Application Shell (`RootLayout.tsx`)
A new layout component, `RootLayout`, will encapsulate the shared view structure:
- Renders `<Header />`.
- Mounts shared data hooks (`useBeans`, `useRecipes`, `useEquipment`, `useTastingLogs`, `useAuth`).
- Manages cross-cutting selections (`selectedRecipe`, `selectedBean`).
- Renders `<main className="..."><Outlet context={contextValue} /></main>`.
- Renders `<AuthModal />` to handle global authentication and password recovery triggers.

### 3.2 Outlet Context (`useOutletContext`)
Child routes access shared state and mutation handlers using React Router's typed outlet context:
```tsx
export interface RootOutletContext {
  beans: Bean[];
  recipes: BrewRecipe[];
  equipment: Equipment[];
  tastingLogs: TastingLog[];
  selectedBean: Bean | null;
  selectedRecipe: BrewRecipe;
  setSelectedBean: (bean: Bean | null) => void;
  setSelectedRecipe: (recipe: BrewRecipe) => void;
  onAddBean: (bean: Bean) => Promise<void>;
  onAddEquipment: (item: Omit<Equipment, "id" | "createdAt">) => Promise<void>;
  onDeleteEquipment: (id: string) => Promise<void>;
  onAddRecipe: (recipe: Omit<BrewRecipe, "id" | "createdAt">) => Promise<BrewRecipe>;
  onDeleteRecipe: (id: string) => Promise<void>;
  onAddTastingLog: (log: Omit<TastingLog, "id" | "createdAt">) => Promise<void>;
}
```

### 3.3 Declarative Navigation (`Header.tsx`)
- Tab buttons are replaced by `<NavLink to={tab.path}>`.
- Dynamic styling uses `({ isActive }) => ...`:
  - Active: `bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10`
  - Inactive: `text-stone-400 hover:text-stone-200 hover:bg-stone-900/60`
- Logo button becomes a `<Link to="/timer">`.
- Badges (e.g. bean count, brew count) remain visible in the nav link.

### 3.4 Programmatic Navigation (`useNavigate`)
Existing cross-feature tab transitions are converted to router navigations:
1. **Selecting a bean for brew (Stash -> Timer)**:
   Sets `selectedBean` and executes `navigate('/timer')`.
2. **Selecting a recipe for timer (Recipes -> Timer)**:
   Sets `selectedRecipe` and executes `navigate('/timer')`.
3. **Switching from timer to recipes (Timer -> Recipes)**:
   Executes `navigate('/recipes')`.
4. **Logging a completed brew (Timer -> Cupping)**:
   Executes `navigate('/cupping', { state: { pendingBrewSession } })`.

---

## 4. Error Handling & 404s

### Catch-All Route (`path="*"`)
A dedicated component `NotFoundView.tsx`:
- Rendered when a URL does not match any configured route.
- Styled in dark stone and amber tones matching the BrewLog aesthetic.
- Displays an intuitive message (*"Page Not Found - Brew Spilled"*) and a button `<Link to="/timer">Return to Brew Assistant</Link>`.

---

## 5. Verification Plan

### Automated Tests
- Type checking: `npm run typecheck` across workspaces.
- Production build: `npm run build --workspace=@brewlog/web`.
- Route unit and integration tests using `@testing-library/react` and `<MemoryRouter>`:
  - Verify `/` redirects to `/timer`.
  - Verify navigation links contain active styling on the corresponding route.
  - Verify unmatched routes render `NotFoundView`.

### Manual Browser Verification
- Verify navigation bar links update the URL and switch views without a full page reload.
- Verify browser **Back** and **Forward** buttons correctly traverse history.
- Verify page reload at `/stash`, `/recipes`, `/equipment`, `/cupping` retains the current view.
- Verify Stash bean selection redirects to `/timer` with selected bean preserved.
- Verify Timer completion navigates to `/cupping` with pending session data loaded.
