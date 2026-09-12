# React Routing (Phase 1: Core Routing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `@brewlog/web` from state-based tab switching to declarative client-side routing using React Router v7.

**Architecture:** Wrap the app in `<BrowserRouter>`, establish a persistent `<RootLayout>` with `<Outlet />` that distributes shared state to child routes via `useOutletContext()`, update `<Header>` to use `<NavLink>`, and handle cross-view actions via `useNavigate()`.

**Tech Stack:** React 19, React Router v7 (`react-router`), TypeScript, Vitest, `@testing-library/react`.

**Spec:** [`docs/superpowers/specs/2026-09-12-react-routing-design.md`](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-09-12-react-routing-design.md)

## Global Constraints

- React Router v7 installed via `npm i react-router --workspace=@brewlog/web`.
- Use React Router library mode (`BrowserRouter`, `Routes`, `Route`, `NavLink`, `Link`, `Navigate`, `Outlet`, `useNavigate`, `useOutletContext`, `useLocation`).
- Do not modify domain models in `@brewlog/core` or Supabase hooks in `@brewlog/supabase`.
- Preserve existing styling aesthetics (Tailwind dark theme: stone-950, amber-400/500 accents).
- Maintain 100% passing tests across all test suites.

---

### Task 1: Install `react-router`

**Files:**
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `react-router` dependency in `@brewlog/web`.

- [ ] **Step 1: Install `react-router`**
Run: `npm install react-router --workspace=@brewlog/web`

- [ ] **Step 2: Verify installation in `apps/web/package.json`**
Run: `node -e "const pkg = require('./apps/web/package.json'); if (!pkg.dependencies['react-router']) process.exit(1); console.log('react-router installed:', pkg.dependencies['react-router']);"`
Expected: Prints `react-router installed: ^7.x.x`

- [ ] **Step 3: Commit**
```bash
git add apps/web/package.json package-lock.json
git commit -m "build(web): add react-router dependency"
```

---

### Task 2: Implement 404 Catch-All Route (`NotFoundRoute`)

**Files:**
- Create: `apps/web/src/routes/NotFoundRoute.tsx`
- Create: `apps/web/src/routes/NotFoundRoute.test.tsx`

**Interfaces:**
- Produces: `NotFoundRoute: React.FC` component rendering 404 status and a `<Link to="/timer">Return to Brew Assistant</Link>`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/routes/NotFoundRoute.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { NotFoundRoute } from './NotFoundRoute';

describe('NotFoundRoute', () => {
  it('renders 404 message and a link returning to /timer', () => {
    render(
      <MemoryRouter>
        <NotFoundRoute />
      </MemoryRouter>
    );

    expect(screen.getByText(/404/i)).toBeDefined();
    expect(screen.getByText(/Brew Spilled/i)).toBeDefined();
    const returnLink = screen.getByRole('link', { name: /Return to Brew Assistant/i });
    expect(returnLink).toBeDefined();
    expect(returnLink.getAttribute('href')).toBe('/timer');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test --workspace=@brewlog/web NotFoundRoute.test.tsx`
Expected: FAIL ("Cannot find module './NotFoundRoute'")

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/web/src/routes/NotFoundRoute.tsx
import React from 'react';
import { Link } from 'react-router';
import { Coffee, ArrowLeft } from 'lucide-react';

export const NotFoundRoute: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-400">
        <Coffee className="w-8 h-8" />
      </div>
      <span className="text-xs font-semibold tracking-wider uppercase text-amber-400 mb-2">
        Error 404
      </span>
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-100 mb-3">
        Brew Spilled — Page Not Found
      </h1>
      <p className="text-stone-400 max-w-md mb-8 text-sm sm:text-base">
        Looks like this grind setting went a bit too fine or the link expired. Let's get you back to brewing.
      </p>
      <Link
        to="/timer"
        className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm transition-colors shadow-lg shadow-amber-500/20"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Brew Assistant</span>
      </Link>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test --workspace=@brewlog/web NotFoundRoute.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/routes/NotFoundRoute.tsx apps/web/src/routes/NotFoundRoute.test.tsx
git commit -m "feat(web): add NotFoundRoute 404 component and tests"
```

---

### Task 3: Update `Header` Navigation to use `<NavLink>` and `<Link>`

**Files:**
- Modify: `apps/web/src/components/shared/Header.tsx`
- Create: `apps/web/src/components/shared/Header.test.tsx`

**Interfaces:**
- Consumes: `Link`, `NavLink` from `react-router`.
- Produces: `Header: React.FC<HeaderProps>` where `HeaderProps` no longer requires `activeTab` or `setActiveTab`.
```tsx
export interface HeaderProps {
  beanCount: number;
  brewCount: number;
  onOpenAuthModal: () => void;
}
```

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/components/shared/Header.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Header } from './Header';

describe('Header', () => {
  it('renders navigation links pointing to router paths', () => {
    render(
      <MemoryRouter initialEntries={['/timer']}>
        <Header beanCount={3} brewCount={5} onOpenAuthModal={vi.fn()} />
      </MemoryRouter>
    );

    const timerLink = screen.getAllByRole('link', { name: /Brew Assistant/i })[0];
    const stashLink = screen.getAllByRole('link', { name: /Coffee Stash/i })[0];
    const recipesLink = screen.getAllByRole('link', { name: /Recipe Studio/i })[0];
    const equipmentLink = screen.getAllByRole('link', { name: /Gear & Grinders/i })[0];
    const cuppingLink = screen.getAllByRole('link', { name: /Cupping & Wheel/i })[0];

    expect(timerLink.getAttribute('href')).toBe('/timer');
    expect(stashLink.getAttribute('href')).toBe('/stash');
    expect(recipesLink.getAttribute('href')).toBe('/recipes');
    expect(equipmentLink.getAttribute('href')).toBe('/equipment');
    expect(cuppingLink.getAttribute('href')).toBe('/cupping');
  });

  it('marks current route as active', () => {
    render(
      <MemoryRouter initialEntries={['/stash']}>
        <Header beanCount={3} brewCount={5} onOpenAuthModal={vi.fn()} />
      </MemoryRouter>
    );

    const stashLink = screen.getAllByRole('link', { name: /Coffee Stash/i })[0];
    expect(stashLink.className).toContain('text-amber-300');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test --workspace=@brewlog/web Header.test.tsx`
Expected: FAIL (Header still expects activeTab and renders buttons)

- [ ] **Step 3: Update `Header.tsx` to use `Link` and `NavLink`**

Update `apps/web/src/components/shared/Header.tsx`:
- Import `Link, NavLink` from `react-router`.
- Define `tabs` with `path`:
  - `id: 'timer'`, `path: '/timer'`, `label: 'Brew Assistant'`, `icon: Timer`
  - `id: 'stash'`, `path: '/stash'`, `label: 'Coffee Stash'`, `icon: Package`, `badge: beanCount`
  - `id: 'recipes'`, `path: '/recipes'`, `label: 'Recipe Studio'`, `icon: BookOpen`
  - `id: 'equipment'`, `path: '/equipment'`, `label: 'Gear & Grinders'`, `icon: Sliders`
  - `id: 'cupping'`, `path: '/cupping'`, `label: 'Cupping & Wheel'`, `icon: Sparkles`, `badge: brewCount`
- Replace the logo button with `<Link to="/timer" ...>`.
- Replace desktop and mobile tab buttons with `<NavLink to={tab.path} className={({ isActive }) => ...}>`.
- Update `HeaderProps` to remove `activeTab` and `setActiveTab`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test --workspace=@brewlog/web Header.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/components/shared/Header.tsx apps/web/src/components/shared/Header.test.tsx
git commit -m "refactor(web): convert Header navigation to NavLink and Link"
```

---

### Task 4: Create `RootLayout` and Route Adapters

**Files:**
- Create: `apps/web/src/layouts/RootLayout.tsx`
- Create: `apps/web/src/routes/TimerRoute.tsx`
- Create: `apps/web/src/routes/StashRoute.tsx`
- Create: `apps/web/src/routes/RecipesRoute.tsx`
- Create: `apps/web/src/routes/EquipmentRoute.tsx`
- Create: `apps/web/src/routes/CuppingRoute.tsx`

**Interfaces:**
- Produces: `RootOutletContext` interface for typed `useOutletContext<RootOutletContext>()`.
- Produces: Route components connecting outlet context and navigation to existing feature views.

- [ ] **Step 1: Create `RootLayout.tsx` with typed outlet context**

```tsx
// apps/web/src/layouts/RootLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { Header } from '../components/shared/Header';
import { AuthModal } from '../features/auth/AuthModal';
import { useAuth } from '../features/auth/AuthContext';
import { useBeans } from '../features/stash/useBeans';
import { useTastingLogs } from '../features/cupping/useTastingLogs';
import { useEquipment } from '../features/equipment/useEquipment';
import { useRecipes } from '../features/recipes/useRecipes';
import { Bean, Equipment, BrewRecipe, TastingLog, DEFAULT_PRESET_RECIPES } from '@brewlog/core';
import { INITIAL_BEANS } from '../lib/sampleData';
import { PendingBrewSession } from '../features/cupping/CuppingView';

export interface RootOutletContext {
  beans: Bean[];
  recipes: BrewRecipe[];
  equipment: Equipment[];
  tastingLogs: TastingLog[];
  selectedBean: Bean | null;
  selectedRecipe: BrewRecipe;
  pendingBrewSession: PendingBrewSession | null;
  setSelectedBean: (bean: Bean | null) => void;
  setSelectedRecipe: (recipe: BrewRecipe) => void;
  setPendingBrewSession: (session: PendingBrewSession | null) => void;
  onAddBean: (bean: Bean) => Promise<void>;
  onAddEquipment: (item: Omit<Equipment, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteEquipment: (id: string) => Promise<void>;
  onAddRecipe: (recipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => Promise<BrewRecipe>;
  onDeleteRecipe: (id: string) => Promise<void>;
  onAddTastingLog: (log: Omit<TastingLog, 'id' | 'createdAt'>) => Promise<void>;
}

export const RootLayout: React.FC = () => {
  const { beans, addBean } = useBeans();
  const { logs: tastingLogs, addTastingLog } = useTastingLogs();
  const { equipment, addEquipment, deleteEquipment } = useEquipment();
  const { recipes, addRecipe, deleteRecipe } = useRecipes();
  const { isPasswordRecovery, authUrlError } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (isPasswordRecovery || authUrlError) {
      setIsAuthModalOpen(true);
    }
  }, [isPasswordRecovery, authUrlError]);

  const [selectedRecipe, setSelectedRecipe] = useState<BrewRecipe>(
    recipes[0] || DEFAULT_PRESET_RECIPES[0]
  );
  const [selectedBean, setSelectedBean] = useState<Bean | null>(INITIAL_BEANS[0] || null);
  const [pendingBrewSession, setPendingBrewSession] = useState<PendingBrewSession | null>(null);

  useEffect(() => {
    if (recipes.length > 0 && !recipes.some((r) => r.id === selectedRecipe.id)) {
      setSelectedRecipe(recipes[0]);
    }
  }, [recipes, selectedRecipe.id]);

  useEffect(() => {
    if (!selectedBean && beans.length > 0) {
      setSelectedBean(beans[0]);
    }
  }, [beans, selectedBean]);

  const contextValue: RootOutletContext = {
    beans,
    recipes,
    equipment,
    tastingLogs,
    selectedBean,
    selectedRecipe,
    pendingBrewSession,
    setSelectedBean,
    setSelectedRecipe,
    setPendingBrewSession,
    onAddBean: addBean,
    onAddEquipment: addEquipment,
    onDeleteEquipment: deleteEquipment,
    onAddRecipe: addRecipe,
    onDeleteRecipe: deleteRecipe,
    onAddTastingLog: addTastingLog,
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <Header
        beanCount={beans.length}
        brewCount={tastingLogs.length}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet context={contextValue} />
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};
```

- [ ] **Step 2: Create Route Components**

Create `apps/web/src/routes/TimerRoute.tsx`:
```tsx
import React from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import { TimerView } from '../features/timer/TimerView';
import { RootOutletContext } from '../layouts/RootLayout';
import { BrewRecipe, Bean } from '@brewlog/core';

export const TimerRoute: React.FC = () => {
  const {
    selectedRecipe,
    selectedBean,
    beans,
    setSelectedBean,
    setPendingBrewSession,
  } = useOutletContext<RootOutletContext>();
  const navigate = useNavigate();

  const handleLogCompletedBrew = (recipe: BrewRecipe, actualTimeSeconds: number, bean: Bean | null) => {
    setPendingBrewSession({
      bean: bean || selectedBean,
      recipe,
      actualTimeSeconds,
    });
    navigate('/cupping');
  };

  return (
    <TimerView
      recipe={selectedRecipe}
      selectedBean={selectedBean}
      beans={beans}
      onSelectBean={setSelectedBean}
      onSelectOtherRecipe={() => navigate('/recipes')}
      onLogCompletedBrew={handleLogCompletedBrew}
    />
  );
};
```

Create `apps/web/src/routes/StashRoute.tsx`:
```tsx
import React from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import { StashView } from '../features/stash/StashView';
import { RootOutletContext } from '../layouts/RootLayout';
import { Bean } from '@brewlog/core';

export const StashRoute: React.FC = () => {
  const { beans, onAddBean, setSelectedBean } = useOutletContext<RootOutletContext>();
  const navigate = useNavigate();

  const handleSelectBeanForBrew = (bean: Bean) => {
    setSelectedBean(bean);
    navigate('/timer');
  };

  return (
    <StashView
      beans={beans}
      onAddBean={onAddBean}
      onSelectBeanForBrew={handleSelectBeanForBrew}
    />
  );
};
```

Create `apps/web/src/routes/RecipesRoute.tsx`:
```tsx
import React from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import { RecipeStudioView } from '../features/recipes/RecipeStudioView';
import { RootOutletContext } from '../layouts/RootLayout';
import { BrewRecipe } from '@brewlog/core';

export const RecipesRoute: React.FC = () => {
  const { recipes, setSelectedRecipe, onAddRecipe, onDeleteRecipe } = useOutletContext<RootOutletContext>();
  const navigate = useNavigate();

  const handleSelectRecipeForTimer = (recipe: BrewRecipe) => {
    setSelectedRecipe(recipe);
    navigate('/timer');
  };

  return (
    <RecipeStudioView
      recipes={recipes}
      onSelectRecipeForTimer={handleSelectRecipeForTimer}
      onAddCustomRecipe={onAddRecipe}
      onDeleteRecipe={onDeleteRecipe}
    />
  );
};
```

Create `apps/web/src/routes/EquipmentRoute.tsx`:
```tsx
import React from 'react';
import { useOutletContext } from 'react-router';
import { EquipmentView } from '../features/equipment/EquipmentView';
import { RootOutletContext } from '../layouts/RootLayout';

export const EquipmentRoute: React.FC = () => {
  const { equipment, onAddEquipment, onDeleteEquipment } = useOutletContext<RootOutletContext>();

  return (
    <EquipmentView
      equipment={equipment}
      onAddEquipment={onAddEquipment}
      onDeleteEquipment={onDeleteEquipment}
    />
  );
};
```

Create `apps/web/src/routes/CuppingRoute.tsx`:
```tsx
import React from 'react';
import { useOutletContext } from 'react-router';
import { CuppingView } from '../features/cupping/CuppingView';
import { RootOutletContext } from '../layouts/RootLayout';

export const CuppingRoute: React.FC = () => {
  const {
    tastingLogs,
    beans,
    pendingBrewSession,
    setPendingBrewSession,
    onAddTastingLog,
  } = useOutletContext<RootOutletContext>();

  return (
    <CuppingView
      logs={tastingLogs}
      beans={beans}
      pendingBrewSession={pendingBrewSession}
      onClearPendingSession={() => setPendingBrewSession(null)}
      onAddTastingLog={async (log) => {
        await onAddTastingLog(log);
        setPendingBrewSession(null);
      }}
    />
  );
};
```

- [ ] **Step 3: Run typecheck on route files**
Run: `npm run typecheck --workspace=@brewlog/web`
Expected: PASS (or clean typecheck of new files)

- [ ] **Step 4: Commit**
```bash
git add apps/web/src/layouts/RootLayout.tsx apps/web/src/routes/
git commit -m "feat(web): add RootLayout and route adapter components"
```

---

### Task 5: Refactor `App.tsx` and Add Router Integration Tests

**Files:**
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/App.test.tsx`

**Interfaces:**
- Consumes: `RootLayout`, Route components, `BrowserRouter`, `Routes`, `Route`, `Navigate`.
- Produces: `App: React.FC` mounted with full route table.

- [ ] **Step 1: Write the failing App routing test**

```tsx
// apps/web/src/App.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router';
import { RootLayout } from './layouts/RootLayout';
import { TimerRoute } from './routes/TimerRoute';
import { StashRoute } from './routes/StashRoute';
import { NotFoundRoute } from './routes/NotFoundRoute';
import { AuthProvider } from './features/auth/AuthContext';

function TestApp({ initialPath = '/' }: { initialPath?: string }) {
  return (
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<Navigate to="/timer" replace />} />
            <Route path="/timer" element={<TimerRoute />} />
            <Route path="/stash" element={<StashRoute />} />
            <Route path="*" element={<NotFoundRoute />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('App Routing', () => {
  it('redirects from / to /timer', () => {
    render(<TestApp initialPath="/" />);
    // Brew Assistant / Timer elements are present
    expect(screen.getByText(/Start Brew/i)).toBeDefined();
  });

  it('navigates directly to /stash', () => {
    render(<TestApp initialPath="/stash" />);
    expect(screen.getByText(/Add Coffee Beans/i)).toBeDefined();
  });

  it('renders 404 page for unknown paths', () => {
    render(<TestApp initialPath="/does-not-exist" />);
    expect(screen.getByText(/Brew Spilled/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test --workspace=@brewlog/web App.test.tsx`
Expected: Run test

- [ ] **Step 3: Update `App.tsx`**

```tsx
// apps/web/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './features/auth/AuthContext';
import { RootLayout } from './layouts/RootLayout';
import { TimerRoute } from './routes/TimerRoute';
import { StashRoute } from './routes/StashRoute';
import { RecipesRoute } from './routes/RecipesRoute';
import { EquipmentRoute } from './routes/EquipmentRoute';
import { CuppingRoute } from './routes/CuppingRoute';
import { NotFoundRoute } from './routes/NotFoundRoute';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<Navigate to="/timer" replace />} />
            <Route path="/timer" element={<TimerRoute />} />
            <Route path="/stash" element={<StashRoute />} />
            <Route path="/recipes" element={<RecipesRoute />} />
            <Route path="/equipment" element={<EquipmentRoute />} />
            <Route path="/cupping" element={<CuppingRoute />} />
            <Route path="*" element={<NotFoundRoute />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 4: Run all web tests to verify they pass**
Run: `npm run test --workspace=@brewlog/web`
Expected: PASS all test files

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/App.tsx apps/web/src/App.test.tsx
git commit -m "feat(web): wire up declarative routing and App.test.tsx"
```

---

### Task 6: Full Verification and Cleanup

**Files:**
- All modified files across the workspace.

- [ ] **Step 1: Run typecheck across entire monorepo**
Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 2: Run all tests across workspaces**
Run: `npm run test`
Expected: 100% passing

- [ ] **Step 3: Run production build**
Run: `npm run build --workspace=@brewlog/web`
Expected: Success with no bundle or syntax errors

- [ ] **Step 4: Commit and finalize**
```bash
git commit --allow-empty -m "chore(web): verify build and typecheck with routing"
```
