# Phase 7: Centralized Cross-Platform Design System (`@brewlog/ui`) Design Spec

## 1. Overview & Objectives

Phase 7 introduces a centralized cross-platform design system workspace package, `@brewlog/ui` located at `packages/ui`. It unifies UI component contracts across `@brewlog/web` (Vite, React 19, Tailwind CSS v4) and `@brewlog/mobile` (Expo SDK 57, React Native 0.86, StyleSheet).

In addition to component primitives, this phase codifies and enforces the project's typography standards: strictly purging `JetBrains Mono` from numeric values, inputs, metrics, and weights across both web and native apps, restricting `JetBrains Mono` exclusively to uppercase tags and instrument faceplate labels, and standardizing all numeric and readable UI text on `Outfit` tabular figures.

### Key Goals
1. **Workspace Package (`@brewlog/ui`)**: Establish a dedicated package in `packages/ui` consuming tokens from `@brewlog/core` (`INDUSTRIAL_PRECISION_THEME`).
2. **Platform Split Architecture with Unified Contracts**: Enforce identical TypeScript prop interfaces (`[Component].types.ts`) with idiomatic platform rendering (`[Component].web.tsx` with Tailwind v4; `[Component].native.tsx` with React Native StyleSheet). Zero dependency on `react-native-web`.
3. **Typography Enforcement (Purge JetBrains Mono Numbers)**:
   - **Zero numbers in JetBrains Mono**: All values, inputs, weights, timestamps, and metrics render in `Outfit` with `tabular-nums`.
   - **JetBrains Mono restricted**: Allowed exclusively for uppercase technical badges/pills (e.g. `V60`, `AEROPRESS`, `CHEMEX`) and chassis instrument eyebrow labels.
4. **Core Layout & Interaction Primitives (Foundation Pass)**:
   - `Button`: Primary copper, secondary recessed, ghost, danger; Apple HIG $\ge 44\text{pt}$ touch targets, loading/disabled states.
   - `Card` / `Panel`: Standard chassis surface `#18181b`, recessed `#202024`, interactive border highlight states.
   - `Badge` / `Pill`: `mono` uppercase technical badges vs `default` Outfit descriptive tags, status/resting freshness variants.
   - `Input`: Standard text and dedicated numeric variant with Outfit tabular formatting and unit suffix.
   - `MetricTile`: Instrumentation tile with small-caps eyebrow label and prominent Outfit tabular numeric display.
5. **Component Test Suite & Showcase Fixture**: Provide isolated unit tests in `packages/ui` and a visual showcase fixture (`UiShowcase`) rendering all variants and states.

---

## 2. Package Architecture & Bundling

### 2.1 Directory Structure

```
packages/ui/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.web.ts              # Exports web implementations
│   ├── index.native.ts           # Exports native implementations
│   ├── showcase/
│   │   ├── UiShowcase.types.ts
│   │   ├── UiShowcase.web.tsx
│   │   └── UiShowcase.native.tsx
│   ├── button/
│   │   ├── Button.types.ts
│   │   ├── Button.web.tsx
│   │   ├── Button.native.tsx
│   │   └── Button.web.test.tsx
│   ├── card/
│   │   ├── Card.types.ts
│   │   ├── Card.web.tsx
│   │   └── Card.native.tsx
│   ├── badge/
│   │   ├── Badge.types.ts
│   │   ├── Badge.web.tsx
│   │   └── Badge.native.tsx
│   ├── input/
│   │   ├── Input.types.ts
│   │   ├── Input.web.tsx
│   │   └── Input.native.tsx
│   └── metric-tile/
│       ├── MetricTile.types.ts
│       ├── MetricTile.web.tsx
│       └── MetricTile.native.tsx
```

### 2.2 Dual Export & Bundler Configuration (`package.json`)

```json
{
  "name": "@brewlog/ui",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.web.ts",
  "react-native": "./src/index.native.ts",
  "types": "./src/index.web.ts",
  "exports": {
    ".": {
      "react-native": "./src/index.native.ts",
      "default": "./src/index.web.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@brewlog/core": "*"
  },
  "peerDependencies": {
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-native": "0.86.3"
  },
  "peerDependenciesMeta": {
    "react-dom": { "optional": true },
    "react-native": { "optional": true }
  }
}
```

* **Vite (`apps/web`) Resolution**: Resolves `"default"` (`src/index.web.ts`), bundling only semantic HTML and Tailwind CSS classes. No React Native code or Babel transformations are loaded.
* **Metro (`apps/mobile`) Resolution**: Metro matches the `"react-native"` export condition, resolving `src/index.native.ts` and linking native primitives.
* **TypeScript Resolution**: Workspaces resolve `@brewlog/ui` via project references or root path mappings without pre-compilation step during development.

---

## 3. Typography Architecture & Token Contract

### 3.1 Rules & Intent

| UI Element | Web (Tailwind v4 / CSS) | Mobile (React Native `StyleSheet`) | Typography Intent |
| :--- | :--- | :--- | :--- |
| **Numeric Values & Metrics** (Dose, Water, Time, Ratios) | `font-['Outfit'] font-light tabular-nums` | `Outfit_300Light` (`FONTS.displayLight`) + `fontVariant: ['tabular-nums']` | **NO JetBrains Mono**. Modern, legible appliance aesthetic. |
| **Numeric Inputs** | `font-['Outfit'] font-light tabular-nums` | `Outfit_300Light` + `fontVariant: ['tabular-nums']` | Consistent user input formatting across platforms. |
| **Uppercase Method Badges** (`variant="mono"`) | `font-mono uppercase tracking-wider text-[10px]` | `JetBrainsMono_700Bold` (`FONTS.monoBold`) + uppercase | **Allowed JetBrains Mono**: Compact technical tags (`V60`, `ESPRESSO`). |
| **Standard Badges** (`variant="default"`) | `font-sans font-medium text-xs` | `Outfit_500Medium` (`FONTS.sansMedium`) | Descriptive tags (roast level, process notes). |
| **Chassis Eyebrow Labels** | `font-mono uppercase tracking-widest text-[10px]` | `JetBrainsMono_700Bold` (`FONTS.monoBold`) + uppercase | Industrial instrument faceplate labels. |
| **Button Labels** | `font-mono uppercase tracking-wider text-xs font-bold` | `JetBrainsMono_700Bold` (`FONTS.monoBold`) + uppercase | Tactile action triggers (`START BREW`, `RESET`). Numeric dose steppers (`+1g`, `-1g`) format numbers in `Outfit`. |

---

## 4. Component Primitive Contracts

### 4.1 `Button`

#### Contract (`Button.types.ts`)
```typescript
import type React from 'react';

export interface ButtonProps {
  label?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  testID?: string;
  accessibilityLabel?: string;
}
```

* **Web Implementation (`Button.web.tsx`)**:
  * Semantic `<button type="button">`.
  * Variants:
    * `primary`: `bg-copper hover:bg-copper-hover text-canvas font-mono font-bold uppercase tracking-wider rounded-md transition-colors`
    * `secondary`: `bg-panel-recessed hover:bg-zinc-800 text-bone border border-border-subtle font-mono font-bold uppercase tracking-wider rounded-md`
    * `ghost`: `bg-transparent hover:bg-panel-recessed text-bone-muted hover:text-bone rounded-md`
    * `danger`: `bg-status-error/10 border border-status-error/40 text-status-error hover:bg-status-error/20 rounded-md`
  * Sizes: `sm` (h-8, px-3, text-xs), `md` (h-11, px-4, text-xs), `lg` (h-12, px-6, text-sm).
* **Native Implementation (`Button.native.tsx`)**:
  * `<Pressable>` with touch target $\ge 44\text{pt}$ (Apple HIG compliance).
  * Consumes `INDUSTRIAL_PRECISION_THEME.colors` and `FONTS.monoBold`.

---

### 4.2 `Card` / `Panel`

#### Contract (`Card.types.ts`)
```typescript
import type React from 'react';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'recessed' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}
```

* **Web Implementation (`Card.web.tsx`)**:
  * `default`: `bg-panel border border-border-subtle rounded-xl`
  * `recessed`: `bg-panel-recessed border border-border-subtle rounded-xl`
  * `interactive`: Adds `cursor-pointer transition-colors hover:border-border-active active:border-copper`
  * Padding options: `none` (`p-0`), `sm` (`p-3`), `md` (`p-4`), `lg` (`p-6`).
* **Native Implementation (`Card.native.tsx`)**:
  * Renders `<View>` (or `<Pressable>` if `onPress` provided).
  * Styled with `INDUSTRIAL_PRECISION_THEME.colors.panel` and hairline borders.

---

### 4.3 `Badge` / `Pill`

#### Contract (`Badge.types.ts`)
```typescript
export interface BadgeProps {
  label: string;
  variant?: 'mono' | 'default' | 'accent' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  testID?: string;
}
```

* **Typography & Variant Enforcement**:
  * `mono`: Rendered in **JetBrains Mono bold uppercase** (`font-mono uppercase text-[10px] tracking-wider` / `FONTS.monoBold`). Intended for brewing method chips (`V60`, `AEROPRESS`).
  * `default`: Rendered in **Outfit sans medium** (`font-sans text-xs` / `FONTS.sansMedium`). Intended for descriptions and general metadata.
  * Status variants (`accent`, `success`, `warning`, `error`): Apply color tokens (`statusSuccess`, `statusWarning`, `statusError`, `accent`) with subtle backgrounds and borders.

---

### 4.4 `Input`

#### Contract (`Input.types.ts`)
```typescript
export interface InputProps {
  value: string | number;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
  variant?: 'default' | 'numeric';
  unit?: string;
  error?: string;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}
```

* **Typography & Numeric Variant**:
  * When `variant="numeric"`: Renders in **Outfit font-light** with `tabular-nums` formatting and right-aligned text. It does **not** render in JetBrains Mono.
  * Unit suffix (e.g. `g`, `s`, `°C`): Displayed adjacent to numeric values in `Outfit font-light text-zinc-400`.
  * Label: Rendered in small-caps uppercase tracking-wider eyebrow text above input field.

---

### 4.5 `MetricTile`

#### Contract (`MetricTileProps`)
```typescript
export interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  variant?: 'default' | 'accent' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  testID?: string;
}
```

* **Structure & Faceplate Design**:
  * Eyebrow Label: `text-[10px] font-mono tracking-widest text-text-muted uppercase` (e.g. `COFFEE DOSE`, `WATER TARGET`).
  * Value: `text-2xl sm:text-3xl font-['Outfit'] font-light text-text-primary tabular-nums` (or `text-accent` if `variant="accent"`).
  * Unit: Sub-sized `text-xs text-text-muted font-['Outfit'] font-light ml-1`.

---

## 5. Showcase Fixture (`UiShowcase`)

To enable instant verification of components on both web and mobile, `@brewlog/ui` will export a showcase fixture:

* `UiShowcase.web.tsx`: Mountable web fixture demonstrating:
  * Buttons: All 4 variants (`primary`, `secondary`, `ghost`, `danger`) in active, loading, and disabled states.
  * MetricTiles: 3-column chassis instrumentation (`COFFEE DOSE`, `WATER TARGET`, `POUR TO`).
  * Badges: `mono` uppercase pills (`V60`, `FLAIR 58`) vs `default` text tags vs status badges (`PEAK`, `NEEDS REST`).
  * Inputs: Standard text input vs numeric dose input with `g` unit.
  * Cards: Standard vs recessed vs interactive cards.
* `UiShowcase.native.tsx`: React Native screen component demonstrating the same primitives and verifying Apple HIG touch targets ($\ge 44\text{pt}$).

---

## 6. Testing & Quality Verification

1. **Unit Testing (`packages/ui`)**:
   * Setup Vitest in `packages/ui` with `@testing-library/react` and `jsdom`.
   * Unit tests for each primitive (`Button.web.test.tsx`, `Badge.web.test.tsx`, `MetricTile.web.test.tsx`, etc.).
   * Assertions validating typography rules:
     * `MetricTile` renders value in Outfit tabular font and not `font-mono`.
     * `Badge` with `variant="mono"` renders `font-mono uppercase`.
     * `Badge` with `variant="default"` renders `font-sans`.
     * `Button` fires `onPress` callback and obeys `disabled` / `loading` flags.
2. **Workspace Type-Check**:
   * Execute `npm run typecheck` across the entire monorepo (`packages/core`, `packages/supabase`, `packages/ui`, `apps/web`, `apps/mobile`).
3. **Bundling & Platform Integrity**:
   * Verify Vite web production build: `npm run build --workspace=@brewlog/web`.
   * Verify Metro mobile bundling: clean module graph with zero missing React Native references.
