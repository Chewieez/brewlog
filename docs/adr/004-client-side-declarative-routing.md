# ADR 004: Client-Side Declarative Routing via React Router v8 Library Mode

## Status
Accepted

## Context
`@brewlog/web` originally managed view navigation through an in-memory `activeTab` state in `App.tsx` and raw `<button onClick={() => setActiveTab(...)}>` elements in `Header.tsx`.

While simple initially, this approach suffered from major limitations:
1. **No URL-driven state**: Users could not bookmark, refresh, or share URLs to specific tools (Timer, Stash, Recipe Studio, Gear, Cupping).
2. **Broken browser history**: The browser's Back and Forward buttons were non-functional for in-app navigation.
3. **No deep-linking**: Features like inspecting a specific recipe (`/recipes/:recipeId`) or bean (`/stash/:beanId`) could not be directly addressed.
4. **Auth redirect friction**: Password recovery and magic link redirects from Supabase could not land cleanly on target route paths.

## Decision
We adopted **React Router v8** (`react-router` ^8.3.1) in **Library Mode**:
- **Library Mode over Framework Mode**: We chose declarative client-side library routing (`BrowserRouter`, `Routes`, `Route`, `Outlet`, `NavLink`, `Link`, `useNavigate`, `useOutletContext`, `useParams`) within our existing Vite SPA, rather than adopting full-framework Remix mode. This keeps the build pipeline lightweight and avoids requiring a Node server runtime.
- **Persistent Shell with `<RootLayout>` and `<Outlet />`**: Shared UI (responsive `Header`, global `AuthModal`, top-level notification state) lives in `RootLayout`. Route views render inside `<Outlet context={contextValue} />`, preserving audio playback and modal state across navigations.
- **Nested Child Routes for Master-Detail**: Features with list-detail hierarchies (such as `/recipes` and `/recipes/:recipeId`) utilize nested routing with route-level `<Outlet />` to support responsive two-column layouts on desktop and stacked views on mobile.
- **Dedicated 404 Catch-All Route**: An unmatched path wildcard (`path="*"`) renders a coffee-themed `NotFoundRoute`.

## Consequences
- **Positive**:
  - Full browser Back / Forward history traversal and deep-linkable URLs.
  - Accessible navigation using native anchor semantics (`<NavLink>` and `<Link>`).
  - URL-synchronized active states without manual state management.
  - Clean architectural separation between application shell, layout, and feature routes.
- **Tradeoff**:
  - Requires static hosts (e.g. Netlify, Cloudflare Pages, GitHub Pages) to configure an SPA rewrite rule (e.g., `/* /index.html 200`) so that hard refreshes on nested paths resolve to `index.html`.
