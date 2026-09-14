# Industrial Precision Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the visual design and UX of BrewLog to an Industrial Precision aesthetic (inspired by Fellow and Acaia hardware), backed by shared design tokens in `@brewlog/core` that are reusable by upcoming native mobile and watch apps.

**Architecture:** Define platform-agnostic TypeScript theme tokens (`ThemeTokens`) in `@brewlog/core`. Map tokens to Tailwind CSS variables in `@brewlog/web` via `@theme` in `index.css`. Systematically transform the application shell, Brew Assistant timer, Recipe Studio master-detail, Coffee Stash, Equipment inventory, and Cupping sensory views into solid, high-contrast matte hardware surfaces, completely eliminating blurry glassmorphism, glowing neon borders, and gradient text clippings.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS v4, Lucide React, Vitest, React Router v8 Library Mode.

**Spec:** [`docs/superpowers/specs/2026-09-14-industrial-precision-design-system.md`](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-09-14-industrial-precision-design-system.md)

## Global Constraints
- All colors must derive from the `INDUSTRIAL_PRECISION_THEME` token contract.
- Zero blurry glassmorphism (`backdrop-filter: blur(...)` or translucent muddy cards).
- Zero glowing drop-shadows (`shadow-amber-500/20` or colored border glows).
- High counter glanceability: primary numerical metrics (Timer, Dose, Water Target) must use high-contrast bone-white (`#f4f4f5`) tabular typography readable from 3+ feet away.
- Existing accessibility attributes (`role`, `aria-*`) and router integration contracts (`Header.test.tsx`, `App.test.tsx`) must remain 100% passing.

---

### Task 1: Shared Design Tokens in `@brewlog/core`

**Files:**
- Create: `packages/core/src/theme.ts`
- Create: `packages/core/src/theme.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Produces: `ThemeColors`, `ThemeTokens`, `INDUSTRIAL_PRECISION_THEME`, `THEMES`

- [ ] **Step 1: Write failing tests for shared theme tokens**

Create `packages/core/src/theme.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { INDUSTRIAL_PRECISION_THEME, THEMES } from './theme';

describe('theme tokens', () => {
  it('exports INDUSTRIAL_PRECISION_THEME with all required color keys', () => {
    expect(INDUSTRIAL_PRECISION_THEME.id).toBe('industrial-precision');
    expect(INDUSTRIAL_PRECISION_THEME.isDark).toBe(true);
    expect(INDUSTRIAL_PRECISION_THEME.colors.canvas).toBe('#121214');
    expect(INDUSTRIAL_PRECISION_THEME.colors.panel).toBe('#18181b');
    expect(INDUSTRIAL_PRECISION_THEME.colors.panelRecessed).toBe('#202024');
    expect(INDUSTRIAL_PRECISION_THEME.colors.borderSubtle).toBe('#27272a');
    expect(INDUSTRIAL_PRECISION_THEME.colors.borderActive).toBe('#3f3f46');
    expect(INDUSTRIAL_PRECISION_THEME.colors.accent).toBe('#d97736');
    expect(INDUSTRIAL_PRECISION_THEME.colors.accentHover).toBe('#e88344');
    expect(INDUSTRIAL_PRECISION_THEME.colors.textPrimary).toBe('#f4f4f5');
    expect(INDUSTRIAL_PRECISION_THEME.colors.textSecondary).toBe('#a1a1aa');
    expect(INDUSTRIAL_PRECISION_THEME.colors.textMuted).toBe('#71717a');
    expect(INDUSTRIAL_PRECISION_THEME.colors.statusSuccess).toBe('#22c55e');
    expect(INDUSTRIAL_PRECISION_THEME.colors.statusWarning).toBe('#f59e0b');
  });

  it('includes INDUSTRIAL_PRECISION_THEME in THEMES map', () => {
    expect(THEMES['industrial-precision']).toBe(INDUSTRIAL_PRECISION_THEME);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/src/theme.test.ts`
Expected: FAIL with module `./theme` not found.

- [ ] **Step 3: Implement `theme.ts` and export from `index.ts`**

Create `packages/core/src/theme.ts`:
```ts
export interface ThemeColors {
  canvas: string;
  panel: string;
  panelRecessed: string;
  borderSubtle: string;
  borderActive: string;
  accent: string;
  accentHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  statusSuccess: string;
  statusWarning: string;
}

export interface ThemeTokens {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
}

export const INDUSTRIAL_PRECISION_THEME: ThemeTokens = {
  id: 'industrial-precision',
  name: 'Industrial Precision',
  isDark: true,
  colors: {
    canvas: '#121214',
    panel: '#18181b',
    panelRecessed: '#202024',
    borderSubtle: '#27272a',
    borderActive: '#3f3f46',
    accent: '#d97736',
    accentHover: '#e88344',
    textPrimary: '#f4f4f5',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    statusSuccess: '#22c55e',
    statusWarning: '#f59e0b',
  },
};

export const THEMES: Record<string, ThemeTokens> = {
  [INDUSTRIAL_PRECISION_THEME.id]: INDUSTRIAL_PRECISION_THEME,
};
```

Export from `packages/core/src/index.ts`:
```ts
export * from './theme';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/src/theme.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/theme.ts packages/core/src/theme.test.ts packages/core/src/index.ts
git commit -m "feat(core): add shared multi-platform design tokens"
```

---

### Task 2: Global CSS & Shell Setup in `@brewlog/web`

**Files:**
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/src/layouts/RootLayout.tsx`

**Interfaces:**
- Consumes: `INDUSTRIAL_PRECISION_THEME` from `@brewlog/core`

- [ ] **Step 1: Update `apps/web/src/index.css`**

Replace obsolete `.glass-panel` and dark coffee colors with the hardware theme variables:
```css
@import "tailwindcss";

@theme {
  --font-sans: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --color-canvas: #121214;
  --color-surface-panel: #18181b;
  --color-surface-recessed: #202024;
  --color-border-subtle: #27272a;
  --color-border-active: #3f3f46;
  --color-copper: #d97736;
  --color-copper-hover: #e88344;
  --color-bone: #f4f4f5;
  --color-bone-muted: #a1a1aa;
}

@layer base {
  body {
    font-family: var(--font-sans);
    background-color: #121214;
    color: #f4f4f5;
  }
}

.hardware-panel {
  background-color: #18181b;
  border: 1px solid #27272a;
}

.hardware-panel-inset {
  background-color: #202024;
  border: 1px solid #27272a;
}
```

- [ ] **Step 2: Update `RootLayout.tsx` background**

In `apps/web/src/layouts/RootLayout.tsx`:
Change root container to:
```tsx
<div className="min-h-screen bg-[#121214] text-zinc-100 flex flex-col font-sans selection:bg-[#d97736]/30 selection:text-zinc-100">
```

- [ ] **Step 3: Run web tests to verify no regressions**

Run: `npx vitest run apps/web/src/App.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/index.css apps/web/src/layouts/RootLayout.tsx
git commit -m "style(web): configure industrial precision tokens and root layout"
```

---

### Task 3: Shell & Header Redesign

**Files:**
- Modify: `apps/web/src/components/shared/Header.tsx`
- Test: `apps/web/src/components/shared/Header.test.tsx`

**Interfaces:**
- Maintains `onOpenAuthModal`, `beanCount`, `brewCount`, and router link attributes.

- [ ] **Step 1: Update `Header.tsx`**

1. Replace sticky header styling with solid matte finish: `sticky top-0 z-40 w-full border-b border-zinc-800/90 bg-[#121214]/95`.
2. Replace multi-color gradient logo with a matte tile:
   ```tsx
   <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#18181b] border border-zinc-800 group-hover:border-[#d97736]/60 transition-colors flex items-center justify-center flex-shrink-0 shadow-sm">
     <Coffee className="w-4 h-4 sm:w-5 sm:h-5 text-[#d97736]" />
   </div>
   ```
3. Update brand title to solid bone white:
   ```tsx
   <span className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100">
     BrewLog
   </span>
   <span className="hidden xl:inline-block ml-2 px-2 py-0.5 text-[10px] font-mono font-medium tracking-wider uppercase rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
     Precision
   </span>
   ```
4. Style `NavLink` items to tactile tabs:
   - Inactive: `text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent`
   - Active: `bg-zinc-800/90 text-amber-300 border border-zinc-700 shadow-sm` (keeps `text-amber-300` for test assertions)
   - Badge: `font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700`

- [ ] **Step 2: Run Header test suite**

Run: `npx vitest run apps/web/src/components/shared/Header.test.tsx`
Expected: PASS (all 3 tests)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/shared/Header.tsx
git commit -m "style(web): restyle Header with tactile industrial hardware tabs"
```

---

### Task 4: Brew Assistant (TimerView) Redesign

**Files:**
- Modify: `apps/web/src/features/timer/TimerView.tsx`
- Test: `apps/web/src/features/timer/useBrewTimer.test.ts`
- Test: `apps/web/src/App.test.tsx`

**Interfaces:**
- Preserves all props (`recipe`, `selectedBean`, `beans`, `onSelectBean`, `onSelectOtherRecipe`, `onLogCompletedBrew`).

- [ ] **Step 1: Overhaul `TimerView.tsx`**

1. Top Recipe Banner:
   - Container: `p-4 rounded-xl bg-[#18181b] border border-zinc-800`.
   - Method badge: `font-mono uppercase px-2 py-0.5 text-xs bg-zinc-800 text-zinc-200 border border-zinc-700`.
   - Recipe name: `text-xl font-bold text-zinc-100 tracking-tight`.
   - Dose scaler input: `bg-[#202024] border border-zinc-800 rounded-lg text-[#d97736] font-mono font-bold`.
   - Change recipe button: `bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200`.
2. Center Progress Display & Counter Glanceability:
   - SVG track: `stroke-zinc-800` strokeWidth="10" (no glow).
   - SVG active sweep: `stroke-[#d97736]` strokeWidth="10" (brushed copper).
   - Inner timer text: `text-6xl sm:text-7xl font-extrabold font-mono text-zinc-100` (bone white, huge).
   - Target grams badge: `bg-[#202024] border border-zinc-700 text-zinc-200 font-mono text-xs font-semibold`.
3. Controls:
   - Start / Pause: `px-8 py-3.5 rounded-xl font-mono text-sm uppercase tracking-wider font-bold` with `bg-[#d97736] text-zinc-950 hover:bg-[#e88344]` when running, `bg-zinc-100 text-zinc-950 hover:bg-white` when stopped.
   - Reset & Mute: `rounded-xl bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700`.
4. Pour Timeline Guide:
   - Container: `p-6 rounded-2xl bg-[#18181b] border border-zinc-800`.
   - Active stage: `bg-[#202024] border-[#d97736]`.
   - Past stage: `bg-[#141416] border-zinc-800/40 opacity-50`.
   - Upcoming stage: `bg-[#18181b] border-zinc-800`.

- [ ] **Step 2: Run Timer & App tests**

Run: `npx vitest run apps/web/src/features/timer/useBrewTimer.test.ts apps/web/src/App.test.tsx`
Expected: PASS (15/15 tests)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/timer/TimerView.tsx
git commit -m "style(web): overhaul TimerView with high-contrast glanceable display"
```

---

### Task 5: Recipe Studio Master-Detail Redesign

**Files:**
- Modify: `apps/web/src/routes/RecipesRoute.tsx`
- Modify: `apps/web/src/features/recipes/RecipeCatalogList.tsx`
- Modify: `apps/web/src/features/recipes/RecipeDetailPane.tsx`
- Test: `apps/web/src/features/recipes/RecipeCatalogList.test.tsx`
- Test: `apps/web/src/features/recipes/RecipeDetailPane.test.tsx`
- Test: `apps/web/src/routes/RecipeDetailRoute.test.tsx`

- [ ] **Step 1: Update `RecipesRoute.tsx`**
  - Strip `Sparkles` icon from title.
  - "Build Custom Recipe" button in brushed copper: `bg-[#d97736] hover:bg-[#e88344] text-zinc-950 font-bold`.

- [ ] **Step 2: Update `RecipeCatalogList.tsx`**
  - Method filter pills: `bg-zinc-800/90 border border-zinc-700 text-zinc-300` when inactive; `bg-[#202024] border-[#d97736] text-[#d97736]` when active.
  - Recipe cards: `bg-[#18181b] border border-zinc-800 hover:border-zinc-700`. Active card highlighted with `border-zinc-600 bg-[#202024]`.
  - Badges: `Preset` in muted zinc, `Custom` with copper accent.

- [ ] **Step 3: Update `RecipeDetailPane.tsx`**
  - Specs grid: 4 measurement cards in `bg-[#18181b] border border-zinc-800`, values in `font-mono text-zinc-100 font-bold`.
  - Dose rescaler slider: High-contrast track and thumb.
  - Action button "Brew with this Recipe": `bg-zinc-100 hover:bg-white text-zinc-950 font-bold` or copper.

- [ ] **Step 4: Run Recipe test suites**

Run: `npx vitest run apps/web/src/features/recipes/RecipeCatalogList.test.tsx apps/web/src/features/recipes/RecipeDetailPane.test.tsx apps/web/src/routes/RecipeDetailRoute.test.tsx`
Expected: PASS (16/16 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/RecipesRoute.tsx apps/web/src/features/recipes/RecipeCatalogList.tsx apps/web/src/features/recipes/RecipeDetailPane.tsx
git commit -m "style(web): restyle Recipe Studio master-detail layout"
```

---

### Task 6: Coffee Stash Redesign

**Files:**
- Modify: `apps/web/src/features/stash/StashView.tsx`

- [ ] **Step 1: Update `StashView.tsx`**
  - Header: Clean title, "Add Coffee Bean" button in brushed copper (`bg-[#d97736] hover:bg-[#e88344] text-zinc-950`).
  - Search & Filters: Recessed input `bg-[#18181b] border border-zinc-800 text-zinc-100` and process select.
  - Bean cards: Solid matte card `bg-[#18181b] border border-zinc-800 hover:border-zinc-700`.
  - Resting status: Solid badge (green for peak, amber for resting, slate for past peak), no nested borders.
  - Flavor tags: Matte tags `bg-zinc-800 text-zinc-300 border border-zinc-700`.
  - Action: "Brew This Bean →" button in `bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200`.

- [ ] **Step 2: Run verification**

Run: `npx vitest run apps/web/src/App.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/stash/StashView.tsx
git commit -m "style(web): restyle Coffee Stash with matte roastery cards"
```

---

### Task 7: Gear & Equipment Redesign

**Files:**
- Modify: `apps/web/src/features/equipment/EquipmentView.tsx`
- Test: `apps/web/src/features/equipment/useEquipment.test.ts`

- [ ] **Step 1: Update `EquipmentView.tsx`**
  - Header: Remove `Sparkles` icon, "Add Equipment" button in brushed copper (`bg-[#d97736] hover:bg-[#e88344] text-zinc-950`).
  - Category sections: Grinders, Brewers, Scales, Kettles with clean headers.
  - Equipment cards: Solid matte finish `bg-[#18181b] border border-zinc-800`, monospace setting/burr chips `bg-zinc-800 text-zinc-300 border border-zinc-700`.

- [ ] **Step 2: Run equipment test suite**

Run: `npx vitest run apps/web/src/features/equipment/useEquipment.test.ts`
Expected: PASS (5/5 tests)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/equipment/EquipmentView.tsx
git commit -m "style(web): restyle Gear & Equipment inventory views"
```

---

### Task 8: Cupping & Sensory View Redesign

**Files:**
- Modify: `apps/web/src/features/cupping/CuppingView.tsx`
- Test: `apps/web/src/features/cupping/CuppingView.test.tsx`
- Test: `apps/web/src/features/cupping/ScaFlavorWheelSvg.test.tsx`

- [ ] **Step 1: Update `CuppingView.tsx`**
  - Cupping form: High-contrast slider tracks and tactile thumbs for the 10 SCA attributes.
  - Score badge: Solid chip `86.5 Excellent (Specialty)` without neon glows.
  - Flavor tag pills: Clean matte tags `bg-zinc-800 text-zinc-300 border border-zinc-700`.
  - Save Tasting Log button: High-contrast action button.

- [ ] **Step 2: Run cupping test suites**

Run: `npx vitest run apps/web/src/features/cupping/CuppingView.test.tsx apps/web/src/features/cupping/ScaFlavorWheelSvg.test.tsx`
Expected: PASS (14/14 tests)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/cupping/CuppingView.tsx
git commit -m "style(web): restyle Cupping & Sensory evaluation views"
```

---

### Task 9: Monorepo Verification & Build

**Files:**
- None (verification only)

- [ ] **Step 1: Run all monorepo unit and integration tests**

Run: `npm test`
Expected: All 116+ tests across `@brewlog/core`, `@brewlog/supabase`, and `@brewlog/web` PASS.

- [ ] **Step 2: Run monorepo typecheck**

Run: `npm run typecheck`
Expected: 0 errors across all workspaces.

- [ ] **Step 3: Build web app production bundle**

Run: `npm run build -w apps/web`
Expected: Production build compiles cleanly with minified assets in `< 1.5s`.
