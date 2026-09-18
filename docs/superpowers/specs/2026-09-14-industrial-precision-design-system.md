# Design Spec: Industrial Precision Theme & Multi-Platform Design System

- **Date**: 2026-09-14
- **Topic**: Industrial Precision (Fellow & Acaia Hardware Aesthetic) Design System with Multi-Theme Extensibility
- **Status**: Validated / Ready for Implementation Planning
- **Targets**: Shared `@brewlog/core` design tokens, `@brewlog/web` UI overhaul, and native app readiness (`@brewlog/mobile`, WearOS, watchOS)

---

## 1. Overview & Objectives

Currently, `@brewlog/web` relies on a generic "AI dark mode" aesthetic:
- Translucent dark cards with blurred glassmorphism (`backdrop-blur-md`).
- Glowing 1px borders (`border-amber-500/30`) and neon drop-shadow halos (`shadow-amber-500/20`).
- Multi-color gradient text clipping (`bg-gradient-to-r ... bg-clip-text text-transparent`).
- Decorative noise (generic sparkle and flame icons attached to section titles).
- Low glanceability for practical brewing on a kitchen counter.

This specification defines the transition to an **Industrial Precision** design language inspired by specialty coffee hardware (Fellow Stagg EKG / Ode, Acaia Lunar scales, and Dieter Rams functionalism).

Additionally, this spec establishes a **centralized design token contract in `@brewlog/core`** that:
1. Powers `@brewlog/web` today via CSS variables and Tailwind v4.
2. Is directly consumable by upcoming native apps (React Native Expo in Phase 3).
3. Architecturally enables adding user-selectable themes (e.g. "Morning Paper / Light Roast") in the future without refactoring component code.

---

## 2. Multi-Platform Theme Architecture (`@brewlog/core`)

Following [ADR 001](file:///Users/greglawrence/Projects/brewlog/docs/adr/001-monorepo-and-shared-domain.md), design tokens are declared as pure TypeScript types and constants in `packages/core/src/theme.ts` with zero UI framework dependencies.

### 2.1 Theme Schema (`ThemeTokens`)

```ts
export interface ThemeColors {
  canvas: string;          // Main background (non-reflective, matte)
  panel: string;           // Cards, containers, modals
  panelRecessed: string;   // Inset controls, inactive timeline cards, chips
  borderSubtle: string;    // Hairline mechanical seams (zero glow)
  borderActive: string;    // Hover / focus boundaries
  accent: string;          // Primary active machine state / focal action
  accentHover: string;     // Interactive hover state
  textPrimary: string;     // High-contrast data & headings (bone white)
  textSecondary: string;   // Secondary labels & units
  textMuted: string;       // Helper text & inactive indicators
  statusSuccess: string;   // Completed steps / peak resting window
  statusWarning: string;   // Approaching limits / warning states
}

export interface ThemeTokens {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
}
```

### 2.2 Default Theme Definition: `INDUSTRIAL_PRECISION_THEME`

```ts
export const INDUSTRIAL_PRECISION_THEME: ThemeTokens = {
  id: 'industrial-precision',
  name: 'Industrial Precision',
  isDark: true,
  colors: {
    canvas: '#121214',          // Anodized matte charcoal
    panel: '#18181b',           // Zinc-900 solid panel
    panelRecessed: '#202024',   // Inset dark surface
    borderSubtle: '#27272a',    // Zinc-800 mechanical hairline
    borderActive: '#3f3f46',    // Zinc-700
    accent: '#d97736',          // Brushed warm copper / amber
    accentHover: '#e88344',     // Interactive copper
    textPrimary: '#f4f4f5',     // High-contrast bone / ivory
    textSecondary: '#a1a1aa',   // Clean muted zinc
    textMuted: '#71717a',       // Subtle helper text
    statusSuccess: '#22c55e',   // Solid green
    statusWarning: '#f59e0b',   // Solid amber
  },
};
```

### 2.3 Extensibility for Future Themes (e.g. Light Roast / Morning Paper)
Because all components consume semantic tokens (`canvas`, `panel`, `accent`, `textPrimary`), adding a light theme or alternate palette in the future only requires adding an alternate definition (e.g. `LIGHT_ROAST_THEME`) in `@brewlog/core` and switching CSS variable definitions on `document.documentElement.setAttribute('data-theme', themeId)`.

---

## 3. Web Implementation (`apps/web`)

### 3.1 Global CSS & Tailwind Mapping (`apps/web/src/index.css`)
- Root CSS variables map to `INDUSTRIAL_PRECISION_THEME`:
  - `--color-canvas: #121214`
  - `--color-surface-panel: #18181b`
  - `--color-surface-recessed: #202024`
  - `--color-border-subtle: #27272a`
  - `--color-copper: #d97736`
  - `--color-bone: #f4f4f5`
- Utility helper classes:
  - `.hardware-panel`: Solid matte surface `#18181b` with 1px `#27272a` hairline border.
  - `.hardware-inset`: Inset surface `#202024` with 1px `#27272a` border.
- Base `body` styling set to canvas `#121214` and high-contrast text `#f4f4f5`.
- Removal of `.glass-panel` and `.glass-panel-glow`.

---

## 4. Component Transformations Across Views

### 4.1 Shell & Navigation ([Header.tsx](file:///Users/greglawrence/Projects/brewlog/apps/web/src/components/shared/Header.tsx))
- Solid opaque bar (`#121214` canvas, `#27272a` bottom seam).
- Logo: Matte tile with subtle brushed-copper hairline accent and bone-white "BrewLog" wordmark with a monospace `PRECISION` badge. (No gradient text clippings or glossy multi-color squares).
- Navigation: Tactile mechanical tabs. Inactive: muted zinc with solid hover. Active: high-contrast matte panel (`bg-zinc-800 text-amber-300 border border-zinc-700`) preserving compatibility with existing test suites.

### 4.2 Brew Assistant ([TimerView.tsx](file:///Users/greglawrence/Projects/brewlog/apps/web/src/features/timer/TimerView.tsx))
- **Counter Glanceability**: Oversized bone-white timer numbers (`64px–72px font-mono` displaying `02:45`) and prominent Dose (`20.0g`) and Water Target (`300g`) indicators readable from 3+ feet away.
- **Precision Progress Ring**: Clean matte track (`#27272a`) with a solid brushed-copper arc (`#d97736`). Blurry glow halos removed.
- **Controls**: Primary "Start Brew / Pause" in brushed copper (`#d97736`), secondary "Reset" and "Mute" in beveled matte zinc.
- **Pour Timeline**: Clean vertical stage checklist with status indicators (green check for past, pulsating copper dot for current, solid gray for upcoming) and explicit water target badges.

### 4.3 Recipe Studio ([RecipesRoute.tsx](file:///Users/greglawrence/Projects/brewlog/apps/web/src/routes/RecipesRoute.tsx), [RecipeCatalogList.tsx](file:///Users/greglawrence/Projects/brewlog/apps/web/src/features/recipes/RecipeCatalogList.tsx), [RecipeDetailPane.tsx](file:///Users/greglawrence/Projects/brewlog/apps/web/src/features/recipes/RecipeDetailPane.tsx))
- Header: Sparkle icons removed; tactile "Build Custom Recipe" button in brushed copper.
- Method Filter Pills: Solid matte pills with crisp active state.
- Catalog Cards: Flat matte panels (`#18181b` with `#27272a` borders); active recipe card marked with high-contrast border and copper accent.
- Detail Pane: 4-card measurement specs grid with monospace digits; high-contrast dose scaler slider; clean instruction timeline cards.

### 4.4 Coffee Stash ([StashView.tsx](file:///Users/greglawrence/Projects/brewlog/apps/web/src/features/stash/StashView.tsx))
- Clear typographic hierarchy: Roaster and Coffee Name emphasized.
- Solid resting-status badges (green for peak, amber for resting window) eliminating nested borders.
- Tactile "Brew This Bean →" action button.

### 4.5 Gear & Grinders ([EquipmentView.tsx](file:///Users/greglawrence/Projects/brewlog/apps/web/src/features/equipment/EquipmentView.tsx))
- Clean equipment inventory grouped by Grinders, Brewers, Scales, and Kettles.
- Monospace spec tags for burr types, step scales, and grinder notes.

### 4.6 Cupping & Wheel ([CuppingView.tsx](file:///Users/greglawrence/Projects/brewlog/apps/web/src/features/cupping/CuppingView.tsx))
- Professional sensory cupping form with high-contrast slider tracks and tactile thumbs.
- Total SCA score display in a solid, high-contrast score badge.
- Flavor tag chips without rainbow glow.

---

## 5. Verification Plan

### Automated Tests
```bash
# Verify shared core tokens
npm test -w @brewlog/core

# Verify web component tests & routing integration
npm test -w @brewlog/web

# Monorepo type check
npm run typecheck

# Production build
npm run build -w apps/web
```

### Manual Verification
1. Verify `/timer`: Test oversized timer digits, SVG progress ring sweep on start/pause/reset, and pour timeline.
2. Verify `/recipes` and `/recipes/:recipeId`: Check master-detail responsive layout, catalog card selection, and dose scaler.
3. Verify `/stash`, `/equipment`, and `/cupping`: Check clean visual consistency across all views.
