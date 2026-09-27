# 📖 Devlog: Phase 7A Centralized Cross-Platform Design System Primitives (`@brewlog/ui`)

- **Date**: 2026-09-26
- **Milestone**: Phase 7A (Design System Primitives & Foundation)
- **Status**: Completed & Verified ✅
- **Branch**: `feature/phase-7-design-system`
- **Tech Stack**: React 19.2.8, React Native 0.86.3, Expo SDK 57, Tailwind CSS v4, TypeScript 5.7+, `@brewlog/core`, Vitest, `@testing-library/react`

---

## 🎯 Executive Summary

As BrewLog expanded across web (`apps/web`) and mobile (`apps/mobile`), visual and functional divergence emerged. Developing features independently on web (Vite, React 19, Tailwind CSS v4) and mobile (Expo SDK 57, React Native 0.86, StyleSheet) led to inconsistencies in button states, card borders, touch ergonomics, and typography. In particular, numeric metrics and timestamps were inconsistently rendered in either monospace `JetBrains Mono` or variable-width system fonts.

Phase 7 establishes **`@brewlog/ui`**, a dedicated monorepo workspace package at `packages/ui` that unifies UI component contracts across all platforms while enforcing strict industrial precision design standards:
1. **Platform-Split Architecture with Unified Contracts**: Standardized TypeScript contracts (`Component.types.ts`) guaranteeing identical API surfaces, with platform-specific implementations (`.web.tsx` consuming Tailwind v4 utility tokens and `.native.tsx` consuming React Native primitives with `@brewlog/core` theme tokens). This completely eliminates `react-native-web` bundling complexity and runtime overhead.
2. **Strict Typography Enforcement**:
   - **Purged Monospace Numbers**: Strictly eliminated `JetBrains Mono` from all numeric values, inputs, weights, timestamps, and metrics.
   - **Outfit Tabular Figures**: Standardized all numbers and readable metrics on `Outfit` tabular numerals (`font-['Outfit'] font-light tabular-nums` on web, `Outfit_300Light` on mobile).
   - **Restricted JetBrains Mono**: Monospace font is restricted exclusively to uppercase technical pills (e.g. `V60`, `CHEMEX`) and chassis instrument eyebrow labels.
3. **Core Foundation Primitives**:
   - `Button`: Four semantic variants (`primary` copper, `secondary` recessed, `ghost`, `danger`), icon slots, loading state with inline spinner, and Apple HIG-compliant $\ge 44\text{pt}$ touch targets.
   - `Card` / `Panel`: Standard chassis surface (`#18181b`), recessed panel (`#202024`), interactive active border highlight states, and platform-specific press handling.
   - `Badge` / `Pill`: `mono` uppercase technical badges vs `default` Outfit descriptive tags, resting freshness variants.
   - `Input`: Standard text and dedicated numeric input variants with unit suffix, defensive value stringification, active focus ring, and paired web `htmlFor` accessibility labels.
   - `MetricTile`: Instrumentation tile with small-caps eyebrow label and prominent Outfit tabular numeric display.
4. **Interactive Component Showcase (`UiShowcase`)**: Visual component fixture rendering all primitives across states (default, hover, active, disabled, loading) on both web and native platforms.

---

## 🏗️ Architecture & Monorepo Structure

```
packages/ui/
├── package.json                  # Conditional exports: "react-native" vs "default"
├── tsconfig.json                 # Strict TypeScript configuration extending root
├── vitest.config.ts              # Isolated Vitest configuration with jsdom
└── src/
    ├── index.web.ts              # Public web exports
    ├── index.native.ts           # Public native exports
    ├── button/
    │   ├── Button.types.ts       # Shared TypeScript prop contract
    │   ├── Button.web.tsx        # Semantic HTML + Tailwind v4
    │   ├── Button.native.tsx     # React Native Pressable + StyleSheet
    │   └── Button.web.test.tsx   # Contract and behavior tests
    ├── card/
    │   ├── Card.types.ts
    │   ├── Card.web.tsx
    │   ├── Card.native.tsx
    │   └── Card.web.test.tsx
    ├── badge/
    │   ├── Badge.types.ts
    │   ├── Badge.web.tsx
    │   ├── Badge.native.tsx
    │   └── Badge.web.test.tsx
    ├── input/
    │   ├── Input.types.ts
    │   ├── Input.web.tsx
    │   ├── Input.native.tsx
    │   └── Input.web.test.tsx
    ├── metric-tile/
    │   ├── MetricTile.types.ts
    │   ├── MetricTile.web.tsx
    │   ├── MetricTile.native.tsx
    │   └── MetricTile.web.test.tsx
    └── showcase/
        ├── UiShowcase.types.ts
        ├── UiShowcase.web.tsx
        └── UiShowcase.native.tsx
```

---

## 🔍 Key Technical Decisions & Edge-Case Refinements

### 1. Zero `react-native-web` Dependency

Rather than using `react-native-web`—which introduces bundler complexities in Vite, CSS reset bloat, and impedance mismatches with Tailwind v4—`@brewlog/ui` employs platform-split file naming. The monorepo resolves:
- `"react-native": "./src/index.native.ts"` for Metro / Expo.
- `"default": "./src/index.web.ts"` for Vite / Web.

Both implementations satisfy the exact same `Component.types.ts` contract, guaranteeing drop-in interchangeability.

### 2. Native String Child Handling in `Button.native.tsx`

In React Native, raw string children inside a `<Pressable>` throw an error if not wrapped in `<Text>`. `Button.native.tsx` defensively inspects `children`:
- If `typeof children === 'string'` or `'number'`, wraps it in a styled `<Text>` element respecting the button variant.
- Supports numeric `0` children safely using nullish coalescing (`children != null`).
- Renders custom JSX children without duplicate text wrapping.

### 3. Active Border & Focus Styling

- **Web**: Uses Tailwind CSS v4 arbitrary properties with CSS custom variables mapped to theme tokens (`focus-visible:ring-2 focus-visible:ring-(--color-accent)`).
- **Mobile**: Tracks focus and active pressed states dynamically via `useState` and `onFocus`/`onBlur` handlers, applying `borderActive` (`#3f3f46`) and `borderAccent` (`#d97736`) styles without relying on pseudo-selectors.

---

## 🧪 Quality Checks & Verification

- **`packages/ui` Test Suite**: 15 unit tests covering all primitives (Button variants/loading/disabled, Card click/interactive states, Input label pairing/error borders, MetricTile label/value rendering).
- **TypeScript**: `npm run typecheck` clean across all workspaces with `noEmit: true` in `packages/ui/tsconfig.json`.
- **Bundling**: Clean compilation in Vite (web) and Metro (iOS/Android).
