# 📱 Devlog: Phase 3 React Native Expo Foundation & Monorepo Setup

- **Date**: 2026-09-18 / 2026-09-19
- **Milestone**: Phase 3 (Mobile App Foundation)
- **Tech Stack**: Expo SDK 57, React Native 0.86, React 19.2.8, Expo Router, TypeScript, npm workspaces

---

## 🧭 Milestone Purpose & Learning Goals
The goal of this milestone was to establish the mobile subsystem (`apps/mobile`) in the BrewLog monorepo, following industry best practices and core React Native patterns rather than rushing into third-party abstractions.

Key focus areas:
1. Understanding how Expo and Metro bundler operate inside an npm workspaces monorepo.
2. Learning core React Native primitives (`View`, `Text`, `TextInput`, `ScrollView`, `Pressable`) and how layout differs from the browser DOM.
3. Consuming shared domain logic (`calculateWaterAmount`, `DEFAULT_PRESET_RECIPES`) and design tokens (`INDUSTRIAL_PRECISION_THEME`) from `@brewlog/core`.
4. Configuring Expo Router for declarative native navigation.

---

## 🧠 Key Concepts & Lessons Learned

### 1. Web DOM vs. React Native Primitives
Unlike web development where HTML elements inherit browser styling and document flows:
- **No Bare Text**: On web, `<div>Hello</div>` works. In React Native, text placed outside of `<Text>` crashes the native renderer. All strings must be wrapped in `<Text>`.
- **No Automatic Document Scrolling**: Browsers scroll the `<body>` when content overflows. In React Native, `<View>` has no scroll behavior; any screen that can exceed viewport height must use `<ScrollView>`.
- **No CSS Inheritance / Cascade**: In web CSS/Tailwind, setting `className="text-stone-400 text-sm"` on a parent `<div>` cascades to all child elements. In React Native, styles do not cascade — text styling must be explicitly applied to `<Text>`.
- **Touch Primitives**: React Native uses `<Pressable>` with callback state `style={({ pressed }) => [...]}` instead of CSS `:hover` or `<button>`.

### 2. Yoga Flexbox vs. Web CSS Flexbox
React Native uses Facebook's **Yoga** engine (written in C++):
- **Default Direction**: Web Flexbox defaults to `flex-direction: row`. React Native defaults to `flex-direction: column` because mobile screens are vertically oriented.
- **No CSS Grid**: CSS Grid (`grid-cols-2`, `grid-cols-4`) does not exist in native React Native. Multi-column grids must be built using Flexbox (`flexDirection: 'row'`, `flexWrap: 'wrap'`, or `<FlatList numColumns={2}>`).
- **Density Units**: Style measurements (`padding: 16`, `fontSize: 18`) are unitless numbers representing density-independent pixels (dp/points), not CSS pixels or `rem`.

### 3. Expo Router & Safe Areas
- **Entry Point**: `"main": "expo-router/entry"` in `package.json` directs Expo to initialize the filesystem routing engine.
- **Safe Area Insets**: Hardware notches, Dynamic Islands, and home indicator bars require `<SafeAreaProvider>` from `react-native-safe-area-context` so content does not render behind hardware cutouts.
- **Root Layout (`app/_layout.tsx`)**: Defines the native `<Stack>` navigation header, title, and canvas background colors inherited across screen transitions.

### 4. Metro Bundler in an npm Workspaces Monorepo
- Prior to SDK 52, monorepos required manual Metro configurations for `watchFolders` and `resolver.nodeModulesPaths`.
- In **Expo SDK 57**, `expo/metro-config` provides built-in monorepo resolution. `metro.config.js` simply extends `getDefaultConfig(__dirname)`.
- Dependency hoisting: React Native native modules require single-version deduplication. We aligned `react` and `react-dom` to `19.2.8` across root and web packages via `overrides`, eliminating duplicate module warnings in `expo-doctor`.

---

## 🛠️ Verification & Diagnostic Results
- **`expo-doctor`**: 21/21 checks passed (clean dependency alignment and schema).
- **TypeScript**: `tsc --noEmit` clean across all 4 workspaces (`core`, `supabase`, `mobile`, `web`).
- **Tests**: 132/132 tests passing across `@brewlog/core`, `@brewlog/supabase`, and `@brewlog/web`.
- **Metro Bundle Test**: Successfully exported native production bundles for iOS (`entry.hbc` - 2.4MB) and Android (`entry.hbc` - 2.7MB).
- **Interactive Preview**: Running live on iOS Simulator (iPhone 17 Pro) with interactive inputs and live calculations.

---

## ⏭️ Next Steps
1. **Phase 3A**: Scaffold `(tabs)/_layout.tsx` for mobile bottom navigation (Timer, Recipes, Stash, Gear, Cupping).
2. **Phase 3B**: Configure Supabase client with `expo-secure-store` / `LargeSecureStore` for persistent encrypted mobile auth sessions.
