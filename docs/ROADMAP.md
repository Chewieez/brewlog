# 🗺️ BrewLog Roadmap & Technical Debt

This document tracks upcoming milestones, architectural refactors, and technical debt items for BrewLog across web, mobile, and shared packages.

---

## 🧭 Active Milestones

### Phase 1: Web App Core Routing (Complete ✅)
- Declarative client-side routing via React Router v8 library mode (`BrowserRouter`, `Routes`, `Route`, `Outlet`, `NavLink`, `Link`).
- Dedicated routes for `/timer`, `/stash`, `/recipes`, `/equipment`, `/cupping`, and catch-all `*` 404 page (`NotFoundRoute`).
- Preserved root shell layout (`RootLayout`) and persistent authentication handling.

### Phase 2: Dynamic Recipe Routing & Master-Detail (Complete ✅)
- Dynamic child routes at `/recipes/:recipeId` with nested `<Outlet />`.
- Responsive master-detail layout (desktop 2-column grid; mobile catalog list to full-width detail with back link).
- Direct deep-linking and URL synchronization.
- 404 fallback for invalid recipe IDs.

---

## 📋 Technical Debt & Component Refactoring (TODO)

### 🔗 Human-Friendly URL Slugs for Custom Recipes
- [ ] **Hybrid Slug-ID Routing (`/recipes/:slug--:id` or short hash)**:
  - Custom recipes currently use raw UUIDs in their URL path (e.g. `/recipes/750e6dda-1814-42a3-9a0f-f97220c202a9`).
  - Implement a hybrid slug pattern (e.g. `/recipes/my-morning-v60--750e6dda`).
  - Update route matching to extract the UUID/ID portion for recipe lookup while displaying the human-readable slug for sharing, readability, and bookmarking without database collision risks.

### 🧩 Recipe Feature Component Decomposition
Once Phase 2 routing is complete and stabilized with passing tests, decompose the recipe UI components into focused, single-responsibility units:

- [ ] **`RecipeDetailPane` Decomposition**:
  - `RecipeHeader.tsx` — Recipe title, author, brew method badge, preset/custom badges, and header action buttons ("Brew with this Recipe", delete).
  - `RecipeDoseSlider.tsx` — Coffee dose rescaling range slider, dose indicators, and scaling math.
  - `RecipeSpecsGrid.tsx` — 4-card specifications grid (Total Water, Brew Ratio, Target Time, Water Temp).
  - `RecipeStepsTimeline.tsx` — Step-by-step instruction timeline with duration, target water weights, and descriptions.
- [ ] **`RecipeCatalogList` Decomposition**:
  - `RecipeCard.tsx` — Individual recipe card with method badges, ratio summary, and selection/delete actions.
  - `MethodFilterTabs.tsx` — Reusable brew method filter buttons.

### 🫘 Coffee Stash Deep-Linking (Phase 2B)
- [ ] Implement Approach B (single component route with `useParams`) for `/stash/:beanId` to explore the alternative dynamic routing pattern.
- [ ] Create dedicated bean detail view / modal route.

---

## 🚀 Upcoming Project Milestones

- **Phase 3**: Mobile App (React Native Expo) feature parity and shared domain integration.
- **Phase 4**: WearOS companion app and tile (Jetpack Compose, Wearable DataLayer).
- **Phase 5**: watchOS companion app and complications (SwiftUI, WatchConnectivity).
