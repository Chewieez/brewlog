# Design Spec: React Native Mobile Foundation & Smoke Screen

- **Date**: 2026-09-18
- **Topic**: Phase 3 React Native (Expo SDK 57) Monorepo Scaffolding & Smoke Screen
- **Status**: Validated / Ready for Implementation Planning
- **Targets**: `apps/mobile` workspace, `@brewlog/core` integration, Expo Router setup

---

## 1. Overview & Objectives

Following the completion of the Web App Core Routing and Industrial Precision UI theme overhaul (PR #3), this milestone establishes the foundation for the mobile app (`apps/mobile`) in the BrewLog monorepo.

### Core Goals
1. **Scaffold `apps/mobile`**: Initialize an Expo SDK 57 app with TypeScript in the existing `apps/mobile` directory.
2. **Monorepo Symlink Resolution**: Configure Metro bundler (`metro.config.js`) to automatically resolve local workspace packages (`@brewlog/core`).
3. **Expo Router Shell**: Set up `expo-router` with a root navigation stack, dark status bar, and safe area provider.
4. **Learning-Focused React Native Smoke Screen**: Build an interactive screen demonstrating core React Native primitives (`ScrollView`, `View`, `Text`, `TextInput`, `Pressable`) styled with `StyleSheet.create` using shared tokens from `packages/core/src/theme.ts` (`INDUSTRIAL_PRECISION_THEME`).
5. **Verify Domain Logic**: Prove end-to-end integration by calculating coffee brew water live via `@brewlog/core/calculateWaterFromRatio` and rendering core preset recipes (`PRESET_RECIPES`).

---

## 2. Architecture & Monorepo Configuration

### 2.1 Directory Structure
```text
apps/mobile/
├── app/
│   ├── _layout.tsx           # Root navigation stack, SafeAreaProvider, StatusBar
│   └── index.tsx             # Interactive Smoke Screen
├── app.json                  # Expo configuration
├── metro.config.js           # Metro bundler config extending expo/metro-config
├── package.json              # Workspace configuration & dependencies
└── tsconfig.json             # TypeScript config extending expo/tsconfig.base
```

### 2.2 Workspace Dependencies & Versions
All dependencies align with the official Expo SDK 57 release matrix and our monorepo-wide React 19 standard:
- `expo`: `~57.0.24`
- `react`: `19.2.3`
- `react-native`: `0.86.3`
- `expo-router`: `~57.0.22`
- `react-native-safe-area-context`: `^5.6.2`
- `react-native-screens`: `^4.23.0`
- `expo-status-bar`: `~57.0.1`
- `expo-constants`: `~18.0.1`
- `@brewlog/core`: `*` (resolved via npm workspaces)

### 2.3 `metro.config.js`
Utilizes Expo SDK 57's native monorepo workspace resolution:
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
```

### 2.4 `package.json` Entry Point
Directs Expo to load the router runtime:
```json
{
  "name": "@brewlog/mobile",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## 3. Navigation & Shell Design

### 3.1 Root Layout (`app/_layout.tsx`)
- Wraps the application in `<SafeAreaProvider>` from `react-native-safe-area-context`.
- Sets `<StatusBar style="light" />` for dark matte background contrast.
- Configures `<Stack>` navigation screen options matching `INDUSTRIAL_PRECISION_THEME`:
  - `headerStyle`: `{ backgroundColor: INDUSTRIAL_PRECISION_THEME.colors.panel }` (`#18181b`)
  - `headerTintColor`: `INDUSTRIAL_PRECISION_THEME.colors.textPrimary` (`#f4f4f5`)
  - `headerTitleStyle`: `{ fontWeight: '700' }`
  - `contentStyle`: `{ backgroundColor: INDUSTRIAL_PRECISION_THEME.colors.canvas }` (`#121214`)

---

## 4. UI Components & Educational Smoke Screen (`app/index.tsx`)

The smoke screen renders an industrial-styled dashboard containing three distinct verification sections:

### 4.1 Section A: System Environment Status Card
- Displays active platform (`Platform.OS`), Expo SDK version, and confirmation of `@brewlog/core` package linking.
- Encapsulated in a panel card with subtle mechanical hairline border (`INDUSTRIAL_PRECISION_THEME.colors.borderSubtle`).

### 4.2 Section B: Interactive Water Ratio Calculator
- Teaches controlled `TextInput` usage in React Native (`keyboardType="numeric"`).
- State: `dose` (default `"18"`g) and `ratio` (default `"16"` [1:16]).
- Dynamically calls `@brewlog/core`:
  ```ts
  const targetWater = calculateWaterFromRatio(parseFloat(dose) || 0, parseFloat(ratio) || 0);
  ```
- Displays live output in an accent-bordered result container (`INDUSTRIAL_PRECISION_THEME.colors.accent`).

### 4.3 Section C: Preset Recipes List
- Iterates over `PRESET_RECIPES` from `@brewlog/core`.
- Displays recipe title, brew method badge, ratio, and default dose in grams.
- Verifies array mapping, React Native key management, and child `<Text>` styling inheritance isolation.

---

## 5. Styling Contract

- All styling is authored via `StyleSheet.create`.
- Colors, borders, and accents strictly reference `INDUSTRIAL_PRECISION_THEME.colors` from `@brewlog/core`:
  - `canvas`: `#121214` (root background)
  - `panel`: `#18181b` (card containers)
  - `panelRecessed`: `#202024` (input backgrounds)
  - `borderSubtle`: `#27272a` (hairline borders)
  - `borderActive`: `#3f3f46` (active input borders)
  - `accent`: `#d97736` (amber/orange machine accent)
  - `textPrimary`: `#f4f4f5` (high-contrast headings & numbers)
  - `textSecondary`: `#a1a1aa` (labels & subheadings)
  - `textMuted`: `#71717a` (placeholders & hints)
- Explicit layout using React Native Flexbox (`flexDirection`, `gap`, `padding`).

---

## 6. Verification & Validation Plan

1. **Dependency Installation & Symlink Validation**:
   - Run `npm install` from the repository root to verify npm workspaces link `@brewlog/mobile` with `@brewlog/core`.
2. **Type Checking**:
   - Run `npm run typecheck --workspace=@brewlog/mobile` (and `npm run typecheck` across all workspaces) to confirm zero TypeScript compilation errors.
3. **Expo Doctor Audit**:
   - Run `npx expo-doctor` within `apps/mobile` to confirm 100% package compatibility with SDK 57.
4. **Metro Export Bundle Test**:
   - Run `npx expo export --platform web` or dry-run bundle build to verify Metro resolves all imports without runtime packaging errors.
5. **Interactive Verification**:
   - Run `npm run dev:mobile` from repo root.
   - Verify UI renders cleanly with dark theme, input typing updates live calculations, and preset recipes list displays.
