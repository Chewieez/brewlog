# Mobile Tab Bar Color Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align mobile bottom tab bar styling across Android (`FloatingPillTabBar`) and iOS (`NativeTabs`) so selected tabs consistently use `colors.accent` (orange) for both icon and label, and unselected tabs use `colors.foregroundSecondary` (WCAG AA secondary grey) for both icon and label.

**Architecture:** Update Android's custom `FloatingPillTabBar` to replace `colors.foreground` on active labels with `colors.accent` and upgrade unselected icon/label tokens from `colors.foregroundMuted` (~3.8:1 contrast) to `colors.foregroundSecondary` (~7.2:1 contrast). Update iOS's `TabLayoutIOS` (`NativeTabs`) to explicitly pass `iconColor={{ default: colors.foregroundSecondary, selected: colors.accent }}` alongside existing `tintColor` and `labelStyle` props.

**Tech Stack:** Expo SDK 58, React Native 0.88.0, React 19.3.0, `expo-router/native-tabs`, `@brewlog/ui` (`useTheme`, `makeStyles`), Vitest, Testing Library.

**Spec:** [`docs/superpowers/specs/2026-09-19-mobile-bottom-tabs-design.md`](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-09-19-mobile-bottom-tabs-design.md)

## Global Constraints

- Zero raw hex values in component code: All colors must resolve dynamically from `useTheme()` / `makeStyles((colors) => ...)` in `@brewlog/ui`.
- Selected tab state: Both icon and label must resolve to `colors.accent` (`#d97736` in dark theme, `#c25412` in light theme).
- Unselected tab state: Both icon and label must resolve to `colors.foregroundSecondary` (`#a8a29e` in dark theme, `#475569` in light theme) for WCAG AA contrast at `10px` label size.
- Do not run full or broad test suites during intermediate edits; run only the targeted test file for each task, then run `typecheck` and targeted tests at completion.

## Review Focus

- Custom `options.tabBarLabel` function descriptor on `FloatingPillTabBar` receives `color: colors.accent` when focused and `color: colors.foregroundSecondary` when unfocused.
- Light theme (`CRISP_STUDIO_LIGHT_THEME`) and dark theme (`TACTILE_DARK_THEME`) both resolve active (`colors.accent`) and inactive (`colors.foregroundSecondary`) tab colors via `@brewlog/ui`'s `ThemeProvider`.

---

### Task 1: Align `FloatingPillTabBar` Selected & Unselected Colors (Android)

**Files:**
- Modify: `apps/mobile/src/components/navigation/FloatingPillTabBar.tsx:154-166,314-320,417-428`
- Test: `apps/mobile/src/components/navigation/FloatingPillTabBar.test.tsx`

**Interfaces:**
- Consumes: `useTheme`, `makeStyles` from `@brewlog/ui` (`colors.accent`, `colors.foregroundSecondary`).
- Produces: `FloatingPillTabBar` rendering active icon + label with `colors.accent` and inactive icon + label with `colors.foregroundSecondary`.

- [ ] **Step 1: Update `FloatingPillTabBar.test.tsx` mocks and add failing color assertions**

In `apps/mobile/src/components/navigation/FloatingPillTabBar.test.tsx`:
1. Pass `style={flattenStyle(style)}` on the mocked `Text` component (`line 44`):
   ```tsx
   Text: ({ children, style, numberOfLines, maxFontSizeMultiplier, ...props }: any) => (
     <span style={flattenStyle(style)} {...props}>{children}</span>
   ),
   ```
2. Pass `data-color={color}` on the mocked `lucide-react-native` icons (`lines 103-109`):
   ```tsx
   vi.mock('lucide-react-native', () => ({
     Timer: ({ color }: any) => <span data-testid="icon-timer" data-color={color} />,
     BookOpen: ({ color }: any) => <span data-testid="icon-recipes" data-color={color} />,
     Bean: ({ color }: any) => <span data-testid="icon-stash" data-color={color} />,
     Scale: ({ color }: any) => <span data-testid="icon-equipment" data-color={color} />,
     Award: ({ color }: any) => <span data-testid="icon-reviews" data-color={color} />,
   }));
   ```
3. Add a test verifying active (`colors.accent` / `#d97736`) and inactive (`colors.foregroundSecondary` / `#a8a29e`) icon and label colors, plus `tabBarLabel` render function `color` argument:
   ```tsx
   it('styles the selected tab with accent color and unselected tabs with foregroundSecondary', () => {
     const customLabelFn = vi.fn(({ color, children }: any) => (
       <span data-testid="custom-label-fn" data-color={color}>{children}</span>
     ));
     const descriptors = {
       'stash-key': {
         options: {
           tabBarLabel: customLabelFn,
         },
       },
     };

     const { getByTestId, getByText } = render(
       <FloatingPillTabBar
         state={{ index: 0, routes }}
         descriptors={descriptors}
         navigation={{ navigate: vi.fn(), emit: vi.fn() }}
       />
     );

     // Active tab (index: Timer) -> colors.accent (#d97736)
     expect(getByTestId('icon-timer').getAttribute('data-color')).toBe('#d97736');
     expect(getByText('Timer').style.color).toBe('rgb(217, 119, 54)');

     // Inactive tab (recipes) -> colors.foregroundSecondary (#a8a29e)
     expect(getByTestId('icon-recipes').getAttribute('data-color')).toBe('#a8a29e');
     expect(getByText('Recipes').style.color).toBe('rgb(168, 162, 158)');

     // Inactive tab with function tabBarLabel (stash) receives colors.foregroundSecondary
     expect(customLabelFn).toHaveBeenCalledWith(
       expect.objectContaining({
         focused: false,
         color: '#a8a29e',
       })
     );
   });
   ```

- [ ] **Step 2: Run targeted test to verify it fails**

Run:
```bash
npx vitest run apps/mobile/src/components/navigation/FloatingPillTabBar.test.tsx
```
Expected: FAIL — `Timer` label color is `rgb(245, 240, 235)` (`colors.foreground`) instead of `rgb(217, 119, 54)` (`colors.accent`), and inactive icon/label color is `#78716c` (`colors.foregroundMuted`) instead of `#a8a29e` (`colors.foregroundSecondary`).

- [ ] **Step 3: Update `FloatingPillTabBar.tsx` to use `colors.accent` and `colors.foregroundSecondary`**

In `apps/mobile/src/components/navigation/FloatingPillTabBar.tsx`:
- Line 154: Change `renderIcon(isFocused ? colors.accent : colors.foregroundMuted)` to:
  ```tsx
  {renderIcon(isFocused ? colors.accent : colors.foregroundSecondary)}
  ```
- Line 317: Change `color: isFocused ? colors.accent : colors.foregroundMuted` in `options.tabBarLabel(...)` to:
  ```tsx
  color: isFocused ? colors.accent : colors.foregroundSecondary,
  ```
- Lines 417-428: Update `label` and `labelActive` in `useStyles`:
  ```tsx
  label: {
    fontFamily: FONTS.sansMedium,
    fontSize: 10,
    marginTop: 2,
    color: colors.foregroundSecondary,
    letterSpacing: 0.2,
  },
  labelActive: {
    fontFamily: FONTS.sansBold,
    color: colors.accent,
    fontWeight: '700',
  },
  ```

- [ ] **Step 4: Run targeted test to verify it passes**

Run:
```bash
npx vitest run apps/mobile/src/components/navigation/FloatingPillTabBar.test.tsx
```
Expected: PASS

---

### Task 2: Add `iconColor` Contract to `TabLayoutIOS` (`NativeTabs`)

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.ios.tsx:30-41`
- Test: `apps/mobile/__tests__/tabs/_layout.test.tsx`

**Interfaces:**
- Consumes: `NativeTabs` from `expo-router/native-tabs`, `useTheme` from `@brewlog/ui`.
- Produces: `TabLayoutIOS` passing `iconColor={{ default: colors.foregroundSecondary, selected: colors.accent }}` alongside `tintColor={colors.accent}` and `labelStyle`.

- [ ] **Step 1: Add failing test for `TabLayoutIOS` color props in `apps/mobile/__tests__/tabs/_layout.test.tsx`**

In `apps/mobile/__tests__/tabs/_layout.test.tsx`:
1. Add a mock for `expo-router/native-tabs` that captures props passed to `NativeTabs`:
   ```tsx
   const mockNativeTabs = vi.fn(({ children }: any) => (
     <div data-testid="native-tabs-mock">{children}</div>
   ));
   vi.mock("expo-router/native-tabs", () => ({
     NativeTabs: Object.assign(
       (props: any) => mockNativeTabs(props),
       {
         Trigger: Object.assign(
           ({ name, children }: any) => <div data-testid={`native-tab-trigger-${name}`}>{children}</div>,
           {
             Label: ({ children }: any) => <span>{children}</span>,
             Icon: () => null,
           }
         ),
       }
     ),
   }));
   ```
2. Import `TabLayoutIOS` from `../../app/(tabs)/_layout.ios` and add a test:
   ```tsx
   it("configures NativeTabs on iOS with accent selected color and foregroundSecondary default color for both icons and labels", () => {
     render(
       <AuthProvider>
         <TabLayoutIOS />
       </AuthProvider>
     );

     expect(mockNativeTabs).toHaveBeenCalledWith(
       expect.objectContaining({
         tintColor: "#d97736",
         iconColor: {
           default: "#a8a29e",
           selected: "#d97736",
         },
         labelStyle: {
           default: {
             color: "#a8a29e",
           },
           selected: {
             color: "#d97736",
           },
         },
       })
     );
   });
   ```

- [ ] **Step 2: Run targeted test to verify it fails**

Run:
```bash
npx vitest run apps/mobile/__tests__/tabs/_layout.test.tsx
```
Expected: FAIL — `iconColor` is `undefined` on `NativeTabs`.

- [ ] **Step 3: Add `iconColor` to `NativeTabs` in `apps/mobile/app/(tabs)/_layout.ios.tsx`**

In `apps/mobile/app/(tabs)/_layout.ios.tsx`:
```tsx
      <NativeTabs
        blurEffect={isDark ? 'dark' : 'systemMaterialLight'}
        tintColor={colors.accent}
        iconColor={{
          default: colors.foregroundSecondary,
          selected: colors.accent,
        }}
        labelStyle={{
          default: {
            color: colors.foregroundSecondary,
          },
          selected: {
            color: colors.accent,
          },
        }}
      >
```

- [ ] **Step 4: Run targeted test and typecheck to verify**

Run:
```bash
npx vitest run apps/mobile/__tests__/tabs/_layout.test.tsx apps/mobile/src/components/navigation/FloatingPillTabBar.test.tsx
npm run typecheck --workspace=@brewlog/mobile
```
Expected: All tests PASS and `tsc --noEmit` exits `0`.

- [ ] **Step 5: Commit changes**

```bash
git add apps/mobile/src/components/navigation/FloatingPillTabBar.tsx \
        apps/mobile/src/components/navigation/FloatingPillTabBar.test.tsx \
        apps/mobile/app/\(tabs\)/_layout.ios.tsx \
        apps/mobile/__tests__/tabs/_layout.test.tsx
git commit -m "fix(mobile): align tab bar selected accent and unselected secondary colors across iOS and Android"
```
