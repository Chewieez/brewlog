# Design Spec: Phase 3A Mobile Bottom Tab Navigation Shell

- **Date**: 2026-09-19
- **Topic**: Phase 3A React Native (Expo Router) Bottom Tab Navigation & Lucide Icon Integration
- **Status**: Validated / Ready for Implementation Planning
- **Targets**: `apps/mobile` workspace, Expo Router `(tabs)` group, `@brewlog/core` theme integration

---

## 1. Overview & Objectives

Following the successful scaffolding of the React Native foundation and smoke screen in Phase 3, this milestone establishes the primary application navigation shell for BrewLog Mobile.

### Core Goals
1. **Expo Router Tab Navigation**: Convert the single-screen smoke test into an idiomatic Expo Router tab navigation hierarchy using an `app/(tabs)/` route group.
2. **Unified Icon System (`lucide-react-native`)**: Install `react-native-svg` and `lucide-react-native` to achieve 1-to-1 visual icon parity with `@brewlog/web`.
3. **Strict Industrial Precision Theme Contract**: Style the tab bar, screen headers, cards, and interactive controls strictly using `INDUSTRIAL_PRECISION_THEME.colors` from `@brewlog/core` with zero hardcoded hex strings.
4. **Feature & Smoke Migration**:
   - Tab 1: **Timer** (`/`) — Hosts the interactive Water Ratio Calculator and quick brew action button.
   - Tab 2: **Recipes** (`/recipes`) — Displays the core preset recipe cards (`DEFAULT_PRESET_RECIPES`).
   - Tab 3: **Stash** (`/stash`) — Industrial inventory placeholder card.
   - Tab 4: **Equipment** (`/equipment`) — Gear & grinder locker placeholder card.
   - Tab 5: **Cupping** (`/cupping`) — 10-attribute SCA sensory cupping placeholder card.

---

## 2. Navigation Architecture

### 2.1 Directory Layout
```text
apps/mobile/app/
├── (tabs)/
│   ├── _layout.tsx           # Native Bottom Tabs navigator (styling & Lucide icon mapping)
│   ├── index.tsx             # Timer tab (default route '/')
│   ├── recipes.tsx           # Recipes catalog tab
│   ├── stash.tsx             # Coffee stash tab
│   ├── equipment.tsx         # Equipment & gear tab
│   └── cupping.tsx           # SCA cupping log tab
├── _layout.tsx               # Root Stack (headerShown: false for tabs, SafeAreaProvider, StatusBar)
└── +not-found.tsx            # (Optional) 404 handler if needed
```

### 2.2 Root Stack (`app/_layout.tsx`)
- Outer `<Stack>` wraps all routes inside `<SafeAreaProvider>`.
- Configures `<StatusBar style="light" />`.
- Sets `headerShown: false` for the `(tabs)` route group, allowing future modal screens (such as authentication or recipe creation) to present over the tab bar.
- Uses `INDUSTRIAL_PRECISION_THEME.colors.canvas` for root content background.

### 2.3 Tabs Navigator (`app/(tabs)/_layout.tsx`)
- Renders `<Tabs>` with global `screenOptions`:
  - `headerStyle`: `{ backgroundColor: colors.panel }`
  - `headerTintColor`: `colors.textPrimary`
  - `headerTitleStyle`: `{ fontWeight: '700' }`
  - `tabBarStyle`:
    - `backgroundColor`: `colors.panel`
    - `borderTopColor`: `colors.borderSubtle`
    - `borderTopWidth`: `1`
  - `tabBarActiveTintColor`: `colors.accent` (`#d97736` machine orange)
  - `tabBarInactiveTintColor`: `colors.textMuted` (`#71717a` subdued stone)
  - `tabBarLabelStyle`: `{ fontSize: 11, fontWeight: '600' }`

### 2.4 Tab Screen Specifications
| Tab Route | Label | Lucide Icon | Purpose / Content |
| :--- | :--- | :--- | :--- |
| `index.tsx` | `Timer` | `Timer` | Primary landing route (`/`). Hosts live water ratio calculator and brewing status. |
| `recipes.tsx` | `Recipes` | `BookOpen` | Renders list of `DEFAULT_PRESET_RECIPES` from `@brewlog/core`. |
| `stash.tsx` | `Stash` | `Coffee` | Coffee bean stash inventory placeholder card. |
| `equipment.tsx` | `Equipment` | `Wrench` | Grinder & brewer equipment placeholder card. |
| `cupping.tsx` | `Cupping` | `Award` | SCA sensory cupping log placeholder card. |

---

## 3. Dependencies & Compatibility

All new packages must align with Expo SDK 57 and React 19.2.8:
- `react-native-svg`: Installed via `npx expo install react-native-svg` (certified SDK 57 release).
- `lucide-react-native`: Latest stable compatible with React 19 / React Native 0.86.
- Deduplication: Verified via `npx expo-doctor` to ensure zero duplicate native binaries.

---

## 4. UI & Component Design

### 4.1 Timer Tab (`app/(tabs)/index.tsx`)
- Wraps content in `<ScrollView>` with `contentContainerStyle={{ padding: 16, gap: 16 }}`.
- **Card 1: Brew Assistant Ready**: Displays status and active machine profile.
- **Card 2: Water Ratio Calculator**: Controlled numeric text inputs for Coffee Dose (g) and Ratio (1:X), driving `calculateWaterAmount(dose, ratio)` from `@brewlog/core`.
- **Card 3: Quick Action**: Pressable button with `backgroundColor: colors.accent` and `color: colors.textPrimary` titled "Start Brew Session".

### 4.2 Recipes Tab (`app/(tabs)/recipes.tsx`)
- Maps over `DEFAULT_PRESET_RECIPES` from `@brewlog/core`.
- Renders each recipe in an industrial panel card (`colors.panel`, `colors.borderSubtle`).
- Displays recipe title, author, brew method badge (e.g. `V60`, `AEROPRESS`, `FLAIR`), ratio, and dose in grams.

### 4.3 Stash, Equipment, and Cupping Tabs
- Render themed informational cards with matching Lucide icons, descriptive subtitles, and clear indicators that cloud sync & data layers will hook into these screens in upcoming milestones.

---

## 5. Verification Plan

1. **Dependency Audit**:
   - Run `npx expo-doctor` in `apps/mobile` to confirm 21/21 checks pass with new SVG/Lucide packages.
2. **TypeScript Compilation**:
   - Run `npm run typecheck` across all workspaces to verify route typings, icon props, and layout configs compile cleanly.
3. **Metro Native Bundling**:
   - Run `npx expo export --platform ios` and `npx expo export --platform android` to confirm all 5 tab routes and SVG assets bundle without packaging errors.
4. **Live iOS Simulator Verification**:
   - Boot app in `iPhone 17 Pro` simulator.
   - Verify bottom tab bar renders 5 icons with proper active/inactive tints.
   - Confirm tapping tabs switches screens cleanly.
   - Verify bottom safe area padding clears the home indicator bar.
