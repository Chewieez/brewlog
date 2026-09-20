# 📱 Devlog: Phase 3A Mobile Bottom Tab Navigation Shell

- **Date**: 2026-09-19
- **Milestone**: Phase 3A (Mobile Navigation Architecture)
- **Tech Stack**: Expo SDK 57, Expo Router ~57.0.22, React Native 0.86.3, React 19.2.8, `lucide-react-native`, `react-native-svg`, `@brewlog/core`

---

## 🧭 Milestone Purpose & Learning Goals

Following the single-screen smoke test in Phase 3, this milestone established the permanent mobile navigation shell for BrewLog Mobile.

Key objectives achieved:
1. **Idiomatic Expo Router Tab Hierarchy**: Transitioned from a single root screen to an `app/(tabs)/` route group with a native `<Tabs>` navigator.
2. **Unified Icon Parity**: Integrated `react-native-svg` and `lucide-react-native` to share identical iconography with `@brewlog/web` (`Timer`, `BookOpen`, `Coffee`, `Wrench`, `Award`).
3. **Strict Industrial Precision Theme Contract**: Enforced zero hardcoded hex colors by consuming `INDUSTRIAL_PRECISION_THEME.colors` from `@brewlog/core` across the tab bar, headers, and screen panels.
4. **Feature & Smoke Migration**: Migrated the interactive domain math calculator to the default landing route (`/`), while adding dedicated screens for Recipes, Stash, Equipment, and Cupping.

---

## 🧠 Key Concepts & React Native Lessons Learned

### 1. Expo Router Route Groups: `(tabs)`
- Folders enclosed in parentheses (e.g. `app/(tabs)/`) define **route groups**. They organize routes and assign common layouts without adding a segment to the URL path.
- `app/(tabs)/index.tsx` serves as the root path `/` for the application.
- `app/(tabs)/_layout.tsx` configures the bottom tab bar and header navigation options for all child screens in the group.
- The root `app/_layout.tsx` wraps `(tabs)` inside `<Stack>` with `headerShown: false`, ensuring future modal flows (e.g., auth, new recipe creator) can present over the tab bar seamlessly.

### 2. Native SVG Rendering with `lucide-react-native`
- In web React, SVG elements (`<svg>`, `<path>`, `<circle>`) render natively via the browser DOM.
- In React Native, SVG requires a native rendering engine. `react-native-svg` translates SVG definitions into native CoreGraphics (iOS) and Skia/Canvas (Android) calls.
- `lucide-react-native` builds directly on top of `react-native-svg`, providing strongly-typed Lucide icons that accept `size`, `color`, and `strokeWidth` props.

### 3. Bottom Tab Navigator Styling Architecture
The `<Tabs>` navigator in Expo Router accepts `screenOptions` controlling the native chrome:
- **`headerStyle` & `headerTintColor`**: Controls top navigation bar background and title color.
- **`tabBarStyle`**: Controls bottom bar background, border top, height, and padding.
- **`tabBarActiveTintColor` & `tabBarInactiveTintColor`**: Dynamically passed down to the `tabBarIcon` render function (`({ color, size, focused }) => ...`), allowing icons to highlight in `#d97736` (accent orange) when selected and `#71717a` (muted stone) when inactive.

### 4. Avoiding Route Collisions in Expo Router
- Having both `app/index.tsx` and `app/(tabs)/index.tsx` causes a route ambiguity error in Expo Router because both files claim the root `/` path.
- Deleting `app/index.tsx` and nesting the default landing screen under `(tabs)` resolves the hierarchy cleanly.

---

## 🛠️ Verification & Diagnostic Results

- **`npx expo-doctor`**: 21/21 checks passed (0 duplicate packages, clean native SDK 57 alignment).
- **TypeScript (`tsc --noEmit`)**: Passed cleanly across all 4 monorepo packages (`core`, `supabase`, `mobile`, `web`).
- **Automated Tests**: All 132 tests passing across `@brewlog/core`, `@brewlog/supabase`, and `@brewlog/web`.
- **Metro Production Bundling**:
  - **iOS**: 3,089 modules exported cleanly with zero SVG or bundling errors (`entry.js` - 3.3MB).
  - **Android**: 3,234 modules exported cleanly (`entry.js` - 3.6MB).
- **Expo Dev Server**: Active and serving bundle at `exp://192.168.1.152:8081` and `http://localhost:8081`.

---

## ⏭️ Next Steps

1. **Phase 3B**: Supabase mobile authentication and session persistence using `expo-secure-store` and `LargeSecureStore`.
2. **Phase 3C**: Live brew timer with native audio/haptics (`expo-haptics`) and custom recipe editor.
