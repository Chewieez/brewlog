# Mobile Static Top App Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pinned static top app header (`BrewLog` + `<ProfileHeaderButton />`) to the mobile `(tabs)` shell on both iOS and Android, and move each tab screen's title and catalog primary CTA into a shared scrollable `TabScreenHeader`.

**Architecture:** Render a new `TopAppHeader` component once above `<Tabs>` in `app/(tabs)/_layout.tsx` and above `<NativeTabs>` in `app/(tabs)/_layout.ios.tsx` (handling `insets.top` and theme tokens at the shell level). Replace duplicated per-screen headers, `<ProfileHeaderButton />` mounts, `insets.top` padding, and stacked `actionRow` wrappers across all 5 tab screens with a shared `TabScreenHeader` component that places the catalog CTA inline to the right of the page title with wrap-safe alignment.

**Tech Stack:** React Native, Expo SDK 58 (`expo-router`, `expo-router/native-tabs`), `react-native-safe-area-context`, `lucide-react-native`, `@brewlog/ui`, Vitest + `@testing-library/react`.

**Spec:** `docs/superpowers/specs/2026-11-18-mobile-static-top-header-design.md`

## Global Constraints
- Use `@brewlog/ui` theme tokens (`makeStyles`, `useTheme`) for all colors; never hardcode hex values.
- Zero emoji in UI, code, tests, docs, or commit messages.
- Preserve `AuthModalContext.Provider` in both `(tabs)` layouts.
- Preserve 44x44pt minimum touch targets on `ProfileHeaderButton` and catalog CTA buttons.
- Do not modify push detail routes (`recipe/[id]`, `stash/[id]`, `reviews/[id]`) or modal/sheet routes (`auth/sheet`, `settings/modal`, etc.).
- Keep `insets.bottom` padding via `getTabScreenBottomPadding(insets.bottom)` intact on all 5 tab screens.
- Run only targeted test files during task TDD; reserve full test suite and typecheck for final verification before committing/pushing.

## Review Focus
- **Non-zero `insets.top` (Dynamic Island / notch / Android status bar):** `TopAppHeader` must apply `paddingTop: insets.top` dynamically, and tab screens must NOT also apply `insets.top` (which would double the gap). Pinned by tests in Tasks 1 and 4.
- **Narrow viewport & large font scale (`Equipment` + `ADD EQUIPMENT`):** The inline title + CTA row must use `flexWrap: 'wrap'`, `flexShrink: 1` on the title, and `flexShrink: 0` + `marginLeft: 'auto'` on the button so neither clips or misaligns. Pinned by tests in Task 2.
- **Non-interactive brand mark:** Tapping `BrewLog` in `TopAppHeader` must not trigger navigation or act as a button. Pinned by tests in Task 1.
- **Light & dark theme token resolution:** `TopAppHeader` background (`colors.canvas`), badge (`colors.panel`, `colors.borderSubtle`), icon (`colors.accent`), wordmark (`colors.foreground`), and bottom hairline (`colors.borderSubtle`) must update with `ThemeProvider`. Pinned by tests in Task 1.
- **iOS `NativeTabs` auth sheet & container wiring:** Tapping `Account profile` in `TopAppHeader` on iOS must invoke `openAuthSheet` (navigating to `/auth/sheet` with double-tap guard), and `NativeTabs` must sit inside a themed `flex: 1` container below `TopAppHeader`. Pinned by tests in Task 3.

---

### Task 1: `TopAppHeader` Component & `ProfileHeaderButton` Alignment Cleanup

**Files:**
- Create: `apps/mobile/src/components/navigation/TopAppHeader.tsx`
- Create: `apps/mobile/src/components/navigation/TopAppHeader.test.tsx`
- Modify: `apps/mobile/src/features/auth/ProfileHeaderButton.tsx:60-66`

**Interfaces:**
- Consumes: `ProfileHeaderButton` from `../../features/auth/ProfileHeaderButton`, `makeStyles` & `useTheme` from `@brewlog/ui`, `useSafeAreaInsets` from `react-native-safe-area-context`, `Coffee` from `lucide-react-native`, `FONTS` from `../../theme/fonts`.
- Produces:
  ```ts
  export interface TopAppHeaderProps {
    onProfilePress: () => void;
  }
  export const TopAppHeader: React.FC<TopAppHeaderProps>;
  ```

- [ ] **Step 1: Write failing unit tests in `apps/mobile/src/components/navigation/TopAppHeader.test.tsx`**

Test cases to assert:
1. Renders `BrewLog` wordmark with `accessibilityRole="header"`, coffee icon badge (`testID="top-app-header-brand-icon"`), and `ProfileHeaderButton` (`Account profile` button).
2. Brand mark (`BrewLog`) is non-interactive (not inside a `button` role; only 1 button exists in the header: `Account profile`).
3. Pressing `Account profile` calls `onProfilePress` once.
4. Applies `paddingTop` equal to `useSafeAreaInsets().top` on the root header container (`testID="top-app-header"`) for both `top: 59` (notched/Dynamic Island iOS) and `top: 0`.
5. Resolves theme colors from `ThemeProvider` (`TACTILE_DARK_THEME` default vs `CRISP_STUDIO_LIGHT_THEME`) for `backgroundColor` (`colors.canvas`) and `borderBottomColor` (`colors.borderSubtle`).

- [ ] **Step 2: Run targeted test to verify it fails**

Run: `npx vitest run src/components/navigation/TopAppHeader.test.tsx` (from `apps/mobile`)
Expected: FAIL because `TopAppHeader.tsx` does not exist yet.

- [ ] **Step 3: Implement `TopAppHeader` and remove trailing `marginRight: 8` from `ProfileHeaderButton`**

In `apps/mobile/src/components/navigation/TopAppHeader.tsx`:
- Root `<View testID="top-app-header" style={[styles.wrapper, { paddingTop: insets.top }]}>` with `backgroundColor: colors.canvas`, `borderBottomWidth: 1`, `borderBottomColor: colors.borderSubtle`.
- Inner row `<View style={styles.bar}>` with `minHeight: 52`, `paddingLeft: 16`, `paddingRight: 10`, `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'` (10px right padding + 6px internal hit-target padding inside the 44px `ProfileHeaderButton` aligns the 32px avatar flush with the 16px screen gutter).
- Left brand group (`flexDirection: 'row'`, `alignItems: 'center'`, `gap: 10`):
  - Badge `<View testID="top-app-header-brand-icon" style={styles.brandIconBadge}>` (`width: 32`, `height: 32`, `borderRadius: 8`, `backgroundColor: colors.panel`, `borderWidth: 1`, `borderColor: colors.borderSubtle`, `alignItems: 'center'`, `justifyContent: 'center'`) containing `<Coffee size={16} color={colors.accent} />`.
  - `<Text accessibilityRole="header" style={styles.brandTitle}>BrewLog</Text>` (`fontFamily: FONTS.displayBold`, `fontSize: 18`, `letterSpacing: -0.3`, `color: colors.foreground`).
- Right action: `<ProfileHeaderButton onPress={onProfilePress} />`.

In `apps/mobile/src/features/auth/ProfileHeaderButton.tsx`:
- Remove `marginRight: 8` from `styles.container` (lines 60-66) so the header controls right-edge alignment cleanly.

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `npx vitest run src/components/navigation/TopAppHeader.test.tsx src/features/auth/ProfileHeaderButton.test.tsx` (from `apps/mobile`)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/navigation/TopAppHeader.tsx apps/mobile/src/components/navigation/TopAppHeader.test.tsx apps/mobile/src/features/auth/ProfileHeaderButton.tsx
git commit -m "feat(mobile): add static TopAppHeader component"
```

---

### Task 2: `TabScreenHeader` Shared Scrollable Screen Header Component

**Files:**
- Create: `apps/mobile/src/components/navigation/TabScreenHeader.tsx`
- Create: `apps/mobile/src/components/navigation/TabScreenHeader.test.tsx`

**Interfaces:**
- Consumes: `makeStyles` & `useTheme` from `@brewlog/ui`, `Plus` from `lucide-react-native`, `FONTS` from `../../theme/fonts`.
- Produces:
  ```ts
  export interface TabScreenHeaderProps {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onActionPress?: () => void;
    actionAccessibilityLabel?: string;
  }
  export const TabScreenHeader: React.FC<TabScreenHeaderProps>;
  ```

- [ ] **Step 1: Write failing unit tests in `apps/mobile/src/components/navigation/TabScreenHeader.test.tsx`**

Test cases to assert:
1. Title-only mode (`<TabScreenHeader title="Timer" />`): renders `Timer` with `accessibilityRole="header"`, renders no subtitle and no CTA button.
2. Catalog mode (`title="Equipment"`, `subtitle="Manage your grinders, brewers, scales, and kettles."`, `actionLabel="ADD EQUIPMENT"`, `onActionPress={fn}`, `actionAccessibilityLabel="Add new equipment"`):
   - Renders title and CTA inside the same `titleRow` container (`testID="tab-screen-header-title-row"`).
   - Renders subtitle as a sibling directly beneath `titleRow` (not inside `titleRow`).
   - Pressing the CTA button calls `onActionPress` once and exposes `accessibilityRole="button"` and `accessibilityLabel="Add new equipment"`.
3. Narrow-screen / font-scale wrap safety: verifies `titleRow` style has `flexDirection: 'row'`, `flexWrap: 'wrap'`, `alignItems: 'center'`, `justifyContent: 'space-between'`, title has `flexShrink: 1`, and CTA button has `minHeight: 44`, `flexShrink: 0`, `marginLeft: 'auto'`.

- [ ] **Step 2: Run targeted test to verify it fails**

Run: `npx vitest run src/components/navigation/TabScreenHeader.test.tsx` (from `apps/mobile`)
Expected: FAIL because `TabScreenHeader.tsx` does not exist yet.

- [ ] **Step 3: Implement `TabScreenHeader` in `apps/mobile/src/components/navigation/TabScreenHeader.tsx`**

- Root `<View style={styles.container}>` (`gap: 4`).
- Title + CTA row `<View testID="tab-screen-header-title-row" style={styles.titleRow}>`:
  - `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`, `flexWrap: 'wrap'`, `columnGap: 12`, `rowGap: 8`.
  - `<Text accessibilityRole="header" style={styles.title}>{title}</Text>` (`fontFamily: FONTS.displaySemiBold`, `fontSize: 26`, `color: colors.textPrimary`, `flexShrink: 1`).
  - When `actionLabel && onActionPress`:
    - `<Pressable onPress={onActionPress} style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]} accessibilityRole="button" accessibilityLabel={actionAccessibilityLabel ?? actionLabel} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>`
    - `styles.actionButton`: `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'center'`, `gap: 4`, `backgroundColor: colors.accent`, `minHeight: 44`, `paddingHorizontal: 12`, `borderRadius: 8`, `flexShrink: 0`, `marginLeft: 'auto'`.
    - Inside: `<Plus size={16} color={colors.canvas} />` and `<Text numberOfLines={1} style={styles.actionButtonText}>{actionLabel}</Text>` (`fontFamily: FONTS.monoBold`, `fontSize: 11`, `color: colors.canvas`, `letterSpacing: 1`).
- Subtitle (when `subtitle` is provided): `<Text style={styles.subtitle}>{subtitle}</Text>` (`fontSize: 13`, `fontFamily: FONTS.bodyRegular`, `color: colors.textSecondary`).

- [ ] **Step 4: Run targeted test to verify it passes**

Run: `npx vitest run src/components/navigation/TabScreenHeader.test.tsx` (from `apps/mobile`)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/navigation/TabScreenHeader.tsx apps/mobile/src/components/navigation/TabScreenHeader.test.tsx
git commit -m "feat(mobile): add shared TabScreenHeader with inline CTA layout"
```

---

### Task 3: Mount `TopAppHeader` in Both `(tabs)` Layouts

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.ios.tsx`
- Modify: `apps/mobile/__tests__/tabs/_layout.test.tsx`
- Modify: `apps/mobile/__tests__/tabs/_layout.ios.test.tsx`

**Interfaces:**
- Consumes: `TopAppHeader` from `../../src/components/navigation/TopAppHeader` (Task 1).
- Produces: Pinned `TopAppHeader` rendered above `<Tabs>` (Android/default) and above `<NativeTabs>` (iOS) with `onProfilePress={openAuthSheet}`.

- [ ] **Step 1: Add failing tests to `apps/mobile/__tests__/tabs/_layout.test.tsx` and `apps/mobile/__tests__/tabs/_layout.ios.test.tsx`**

In `_layout.test.tsx`:
- Assert `TabLayout` renders `BrewLog` and the `Account profile` button in `TopAppHeader`, and clicking `Account profile` opens `AuthSheet` and dismisses the keyboard.
- Assert `TabLayoutIOS` renders `BrewLog` and the `Account profile` button in `TopAppHeader`.

In `_layout.ios.test.tsx`:
- Add `View`, `Text`, `Pressable` to the `react-native` mock, plus `react-native-safe-area-context` (`useSafeAreaInsets`) and `lucide-react-native` (`Coffee`, `User`) mocks.
- Assert `TabLayoutIOS` renders `BrewLog` and `Account profile`, and clicking `Account profile` dismisses the keyboard and navigates to `/auth/sheet` (and guards against rapid double-taps).

- [ ] **Step 2: Run targeted layout tests to verify new assertions fail**

Run: `npx vitest run __tests__/tabs/_layout.test.tsx __tests__/tabs/_layout.ios.test.tsx` (from `apps/mobile`)
Expected: FAIL because neither layout renders `TopAppHeader` yet.

- [ ] **Step 3: Update `apps/mobile/app/(tabs)/_layout.tsx` and `apps/mobile/app/(tabs)/_layout.ios.tsx`**

In `apps/mobile/app/(tabs)/_layout.tsx`:
- Import `TopAppHeader` from `../../src/components/navigation/TopAppHeader` and `useTheme` from `@brewlog/ui`.
- Apply `backgroundColor: colors.canvas` to `styles.container`.
- Render `<TopAppHeader onProfilePress={openAuthSheet} />` inside `<View style={[styles.container, { backgroundColor: colors.canvas }]}>` immediately above `<Tabs ... />`.

In `apps/mobile/app/(tabs)/_layout.ios.tsx`:
- Import `View`, `StyleSheet` from `react-native` and `TopAppHeader` from `../../src/components/navigation/TopAppHeader`.
- Wrap `<TopAppHeader onProfilePress={openAuthSheet} />` and `<View style={styles.tabsContainer}><NativeTabs ... /></View>` inside `<View style={[styles.container, { backgroundColor: colors.canvas }]}>` (`flex: 1`).

- [ ] **Step 4: Run targeted layout tests to verify they pass**

Run: `npx vitest run __tests__/tabs/_layout.test.tsx __tests__/tabs/_layout.ios.test.tsx` (from `apps/mobile`)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/(tabs)/_layout.tsx apps/mobile/app/(tabs)/_layout.ios.tsx apps/mobile/__tests__/tabs/_layout.test.tsx apps/mobile/__tests__/tabs/_layout.ios.test.tsx
git commit -m "feat(mobile): mount static TopAppHeader in Android and iOS tab layouts"
```

---

### Task 4: Migrate All 5 Tab Screens to `TabScreenHeader`

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx`
- Modify: `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx`
- Modify: `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx`
- Modify: `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx`
- Modify: `apps/mobile/__tests__/tabs/index.test.tsx`
- Modify: `apps/mobile/src/features/stash/screens/StashCatalogScreen.test.tsx`
- Modify: `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx`
- Modify: `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.test.tsx`
- Modify: `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.test.tsx`

**Interfaces:**
- Consumes: `TabScreenHeader` from `src/components/navigation/TabScreenHeader` (Task 2).

- [ ] **Step 1: Update the 5 screen test files with expectations for the migrated headers**

In each of the 5 test files:
- Assert `queryByLabelText('Account profile')` (or `queryByRole('button', { name: 'Account profile' })`) is `null` — confirming `<ProfileHeaderButton />` is removed from individual tab screens.
- In `EquipmentCatalogScreen.test.tsx`: replace the old `triggers openAuthSheet when ProfileHeaderButton in header is tapped` test (lines 264–280) with a test verifying `ProfileHeaderButton` is no longer rendered inside `EquipmentCatalogScreen` and that `Equipment` + `ADD EQUIPMENT` share `tab-screen-header-title-row`.
- In `StashCatalogScreen.test.tsx`, `RecipesCatalogScreen.test.tsx`, `ReviewsCatalogScreen.test.tsx`: assert `tab-screen-header-title-row` contains both the page title and primary CTA (`ADD BEAN`, `NEW RECIPE`, `ADD REVIEW`), and that `Account profile` is not rendered inside the screen.
- In `index.test.tsx`: assert `Timer` is rendered and `Account profile` is not rendered inside `TimerScreen`.

- [ ] **Step 2: Run the 5 targeted screen tests to verify new assertions fail**

Run: `npx vitest run __tests__/tabs/index.test.tsx src/features/stash/screens/StashCatalogScreen.test.tsx src/features/recipes/screens/RecipesCatalogScreen.test.tsx src/features/equipment/screens/EquipmentCatalogScreen.test.tsx src/features/reviews/screens/ReviewsCatalogScreen.test.tsx` (from `apps/mobile`)
Expected: FAIL because the screens still render `ProfileHeaderButton` and do not use `TabScreenHeader`.

- [ ] **Step 3: Refactor all 5 tab screens to use `TabScreenHeader`**

For each screen, remove `ProfileHeaderButton`, `useAuthModal`, `actionRow`, unused header styles, and `{ paddingTop: Math.max(insets.top, 16) }` (keeping `insets.bottom` for `getTabScreenBottomPadding(insets.bottom)` and setting clean fixed `paddingTop: 16` on each screen's top header container):
1. `apps/mobile/app/(tabs)/index.tsx`: render `<View style={styles.headerContainer}><TabScreenHeader title="Timer" /></View>` (`paddingHorizontal: 16`, `paddingTop: 16`, `paddingBottom: 8`).
2. `apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx`: replace `titleRow` + `actionRow` inside `renderHeader` with `<TabScreenHeader title="Stash" subtitle="Manage roast dates, resting curves, and freezer storage." actionLabel="ADD BEAN" onActionPress={handleAddBag} actionAccessibilityLabel="Add new bean to stash" />`; use fixed `paddingTop: 16` on `headerContainer`.
3. `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx`: replace `titleRow` + `actionRow` with `<TabScreenHeader title="Recipes" subtitle="Specialty brew guides alongside your custom recipes." actionLabel="NEW RECIPE" onActionPress={handleCreateNew} actionAccessibilityLabel="Create new custom recipe" />`; use fixed `paddingTop: 16` on `header`.
4. `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx`: replace `titleRow` + `actionRow` with `<TabScreenHeader title="Equipment" subtitle="Manage your grinders, brewers, scales, and kettles." actionLabel="ADD EQUIPMENT" onActionPress={handleAddEquipment} actionAccessibilityLabel="Add new equipment" />`; use fixed `paddingTop: 16` on `headerContainer`.
5. `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx`: replace `titleRow` + `actionRow` inside `renderHeader` with `<TabScreenHeader title="Reviews" subtitle="SCA scores, flavor profiles & sensory logs" actionLabel="ADD REVIEW" onActionPress={handleAddReview} actionAccessibilityLabel="Add Review" />`; use fixed `paddingTop: 16` on `headerContainer`.

- [ ] **Step 4: Run the 5 targeted screen tests to verify they pass**

Run: `npx vitest run __tests__/tabs/index.test.tsx src/features/stash/screens/StashCatalogScreen.test.tsx src/features/recipes/screens/RecipesCatalogScreen.test.tsx src/features/equipment/screens/EquipmentCatalogScreen.test.tsx src/features/reviews/screens/ReviewsCatalogScreen.test.tsx` (from `apps/mobile`)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/(tabs)/index.tsx apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx apps/mobile/__tests__/tabs/index.test.tsx apps/mobile/src/features/stash/screens/StashCatalogScreen.test.tsx apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.test.tsx apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.test.tsx apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.test.tsx
git commit -m "feat(mobile): migrate tab screens to TabScreenHeader with inline CTAs"
```

---

### Task 5: Documentation Updates & Full Verification

**Files:**
- Modify: `README.md` (if Key Features / Roadmap needs updating)
- Modify: `docs/ROADMAP.md`
- Create: `docs/devlogs/2026-11-18-issue-90-mobile-static-top-header.md`

- [ ] **Step 1: Update project documentation per `AGENTS.md`**

- Review `README.md` and `docs/ROADMAP.md` and update completed items / Key Features for Issue #90.
- Create `docs/devlogs/2026-11-18-issue-90-mobile-static-top-header.md` summarizing the problem, architecture (`TopAppHeader` + `TabScreenHeader` across Android `Tabs` and iOS `NativeTabs`), accessibility/safe-area safeguards, and verification evidence.

- [ ] **Step 2: Run full mobile typecheck and test suite**

Run from `apps/mobile`:
- `npm run typecheck`
- `npm test`
Expected: 0 TypeScript errors and all unit tests passing.

- [ ] **Step 3: Commit documentation**

```bash
git add README.md docs/ROADMAP.md docs/devlogs/2026-11-18-issue-90-mobile-static-top-header.md
git commit -m "docs: document mobile static top app header (issue #90)"
```
