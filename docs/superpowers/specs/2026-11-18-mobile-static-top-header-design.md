# Mobile Static Top App Header & Inline Tab Screen Headers (Issue #90)

## Intent & Why
Add a persistent, non-scrolling top app header to the mobile `(tabs)` shell so the `BrewLog` brand identity and account profile trigger stay pinned at the top of the screen across all 5 tabs, matching web header branding while reclaiming vertical space on the 4 catalog screens by moving their primary CTA buttons inline beside each page title.

## Goals, Non-Goals & Anti-Goals
- **Goals**:
  - Pin a static top app header (`BrewLog` + `<ProfileHeaderButton />`) above the tab navigator in both `apps/mobile/app/(tabs)/_layout.tsx` (Android/default) and `apps/mobile/app/(tabs)/_layout.ios.tsx` (iOS `NativeTabs`).
  - Handle top safe-area insets (`insets.top`) once in the static top header across notched/Dynamic Island iOS devices and edge-to-edge Android devices.
  - Move each tab screen's page title into its scrollable content with a shared header component, placing the primary CTA inline to the right of the title and the full-width subtitle beneath on the 4 catalog screens (`Stash`, `Recipes`, `Equipment`, `Reviews`).
  - Keep narrow viewports and larger system font scales free of clipping or awkward misalignment (especially `Equipment` + `ADD EQUIPMENT`).
- **Non-Goals**:
  - Changing push detail routes (`recipe/[id]`, `stash/[id]`, `reviews/[id]`) or modal/sheet routes (`auth/sheet`, `settings/modal`, etc.).
  - Making the `BrewLog` brand mark interactive or adding a theme toggle to the mobile top bar.
  - Changing the bottom tab bar implementations (`FloatingPillTabBar` on Android/default, `NativeTabs` on iOS).
- **Anti-Goals**:
  - Double-applying top safe-area insets (in both the static bar and the scrollable tab screens).
  - Breaking `useScrollToTop` behavior or iOS `NativeTabs` layout/appearance.
  - Leaving `<ProfileHeaderButton />` or stacked `actionRow` wrappers behind in individual tab screens.

## Constraints
- Use `@brewlog/ui` theme tokens (`colors.canvas`, `colors.panel`, `colors.borderSubtle`, `colors.accent`, `colors.foreground`, `colors.textSecondary`, etc.) so both `Tactile Dark` and `Crisp Studio Light` themes stay consistent.
- Preserve `AuthModalContext.Provider` in both `(tabs)` layouts so existing consumers and tests continue working.
- Maintain 44x44pt minimum touch targets (`ProfileHeaderButton` and catalog primary CTA buttons) and clear accessibility roles/labels.
- Zero emoji in code, copy, or docs.

## Approaches Considered
1. **Approach A — Shell `<TopAppHeader />` + shared `<TabScreenHeader />` (Selected)**
   - Render `<TopAppHeader onProfilePress={openAuthSheet} />` once in both `_layout.tsx` and `_layout.ios.tsx`, and extract a shared `<TabScreenHeader />` for all 5 tab screens.
   - *Trade-offs*: Adds one small shared header component for tab screens, in exchange for a single source of truth for typography, spacing, narrow-screen wrapping, and accessibility across all 5 tabs.
2. **Approach B — Shell `<TopAppHeader />` + per-screen inline headers**
   - Same `<TopAppHeader />` in both layouts, but edit header markup and styles separately in each of the 5 tab screens.
   - *Trade-offs*: One fewer shared component, but repeats identical title + inline CTA + narrow-screen wrapping rules across 4–5 files where they can easily drift.
3. **Ruled out — Expo Router `Tabs` `headerShown: true` + nested `<Stack>` per tab**
   - `NativeTabs` does not render built-in headers; supporting it this way would require restructuring `app/(tabs)/` into 5 nested stack groups for a static app-wide bar.

## Decided Design

### 1. `TopAppHeader` (`apps/mobile/src/components/navigation/TopAppHeader.tsx`)
- **Surface & Safe Area**: `backgroundColor: colors.canvas`, `paddingTop: insets.top`, `borderBottomWidth: 1`, `borderBottomColor: colors.borderSubtle`.
- **Inner Bar**: `minHeight: 52`, `paddingHorizontal: 16`, `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`.
- **Left (Non-Interactive Brand)**:
  - Compact rounded-square badge (`32x32`, `borderRadius: 8`, `backgroundColor: colors.panel`, `borderWidth: 1`, `borderColor: colors.borderSubtle`) containing Lucide `Coffee` (`size={16}`, `color={colors.accent}`).
  - `BrewLog` wordmark (`FONTS.displayBold`, `fontSize: 18`, `color: colors.foreground`, `letterSpacing: -0.3`) beside the badge with `gap: 10`.
  - Marked non-interactive (`accessibilityRole="header"` on the title text or container as appropriate).
- **Right (Pinned Account Action)**:
  - `<ProfileHeaderButton onPress={onProfilePress} />`.
  - Account for `ProfileHeaderButton`'s existing `marginRight: 8` (or remove/offset its trailing margin inside the header) so the button sits cleanly inside the 16px right gutter without losing its 44x44pt touch target.

### 2. Tab Layouts
- **`apps/mobile/app/(tabs)/_layout.tsx`**: Render `<TopAppHeader onProfilePress={openAuthSheet} />` at the top of the existing `styles.container` `<View>` above `<Tabs />`. Keep `<AuthSheet />` mounted as sibling overlay so it covers the full screen including the header.
- **`apps/mobile/app/(tabs)/_layout.ios.tsx`**: Wrap `<TopAppHeader onProfilePress={openAuthSheet} />` and a `flex: 1` container hosting `<NativeTabs ... />` inside a root `<View style={styles.container}>` (`flex: 1`, `backgroundColor: colors.canvas`). Keep `AuthModalContext.Provider` and the `/auth/sheet` navigation logic unchanged.

### 3. `TabScreenHeader` (`apps/mobile/src/components/navigation/TabScreenHeader.tsx`)
- **Props**: `title: string`, `subtitle?: string`, `actionLabel?: string`, `onActionPress?: () => void`, `actionAccessibilityLabel?: string`.
- **Layout**:
  - Outer padding: `paddingTop: 16` (no `insets.top` — handled by `TopAppHeader`), `paddingBottom: 8` (or caller-controlled spacing via optional `style`).
  - **Title + CTA Row**: `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`, `flexWrap: 'wrap'`, `columnGap: 12`, `rowGap: 8`.
    - `title`: `FONTS.displaySemiBold`, `fontSize: 26`, `color: colors.textPrimary`, `flexShrink: 1`, `accessibilityRole="header"`.
    - Optional CTA `Pressable` (when `actionLabel` and `onActionPress` are provided): `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'center'`, `gap: 4`, `backgroundColor: colors.accent`, `minHeight: 44`, `paddingHorizontal: 12`, `borderRadius: 8`, `flexShrink: 0`, `marginLeft: 'auto'`. Renders `<Plus size={16} color={colors.canvas} />` and `FONTS.monoBold` `11px` `colors.canvas` text (`numberOfLines={1}`).
  - **Subtitle**: Full-width directly beneath the title + CTA row (`marginTop: 4`, `fontSize: 13`, `FONTS.bodyRegular`, `color: colors.textSecondary`).

### 4. Tab Screen Updates
Remove `<ProfileHeaderButton />`, `useAuthModal`, `actionRow`, and `insets.top` padding from all 5 tab screens (keeping `insets.bottom` for `getTabScreenBottomPadding(insets.bottom)`):
- `apps/mobile/app/(tabs)/index.tsx`: `<TabScreenHeader title="Timer" />`
- `apps/mobile/src/features/stash/screens/StashCatalogScreen.tsx`: `title="Stash"`, `subtitle="Manage roast dates, resting curves, and freezer storage."`, `actionLabel="ADD BEAN"`, `actionAccessibilityLabel="Add new bean to stash"`
- `apps/mobile/src/features/recipes/screens/RecipesCatalogScreen.tsx`: `title="Recipes"`, `subtitle="Specialty brew guides alongside your custom recipes."`, `actionLabel="NEW RECIPE"`, `actionAccessibilityLabel="Create new custom recipe"`
- `apps/mobile/src/features/equipment/screens/EquipmentCatalogScreen.tsx`: `title="Equipment"`, `subtitle="Manage your grinders, brewers, scales, and kettles."`, `actionLabel="ADD EQUIPMENT"`, `actionAccessibilityLabel="Add new equipment"`
- `apps/mobile/src/features/reviews/screens/ReviewsCatalogScreen.tsx`: `title="Reviews"`, `subtitle="SCA scores, flavor profiles & sensory logs"`, `actionLabel="ADD REVIEW"`, `actionAccessibilityLabel="Add Review"`

## Left to the Builder
- Exact alignment adjustment for `ProfileHeaderButton`'s existing `marginRight: 8` (verify `ProfileHeaderButton.test.tsx` expectations before modifying vs. compensating in `TopAppHeader`).
- Verify `contentInsetAdjustmentBehavior` on iOS `ScrollView`/`FlatList` if needed so `NativeTabs` does not add extra top inset below `TopAppHeader`.
- Unit test structure for `TopAppHeader.test.tsx`, `TabScreenHeader.test.tsx`, `_layout.test.tsx`, `_layout.ios.test.tsx`, and the 5 tab screen test suites.
