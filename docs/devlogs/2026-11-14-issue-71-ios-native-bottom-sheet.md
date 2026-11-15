# Devlog: iOS Native Bottom Sheet Presentation & Modal Grabber Cleanup

- **Date**: 2026-11-14
- **Milestone**: Issue #71: Convert iOS Bottom Sheet to Use Native Option
- **Status**: Completed & Verified
- **Branch**: `Chewieez/71-convert-ios-bottom-sheet-to-use-native-o`
- **Issue**: [#71](https://github.com/Chewieez/brewlog/issues/71)
- **PR**: [#77](https://github.com/Chewieez/brewlog/pull/77)
- **Design Spec**: [`docs/superpowers/specs/2026-11-14-issue-71-ios-native-bottom-sheet-design.md`](../superpowers/specs/2026-11-14-issue-71-ios-native-bottom-sheet-design.md)
- **Tech Stack**: React Native 0.88 (Expo SDK 58), Expo Router (`~58.0.25`), `react-native-screens` (`~4.30.0`), TypeScript 6, Vitest

---

## Executive Summary

Previously, BrewLog rendered a static decorative grabber bar on `AuthSheet` across both iOS and Android via a custom in-tree React Native overlay, and also rendered inert static grabber views on `settings/modal.tsx` and the four full-screen `X`-dismissible form modals (`RecipeBuilderScreen`, `BeanModalScreen`, `EquipmentModalScreen`, and `ReviewModalScreen`). On iOS, this bypassed native `UISheetPresentationController` sheet physics, native system grabber styling, detent sizing, and swipe-to-dismiss behavior on `AuthSheet`, while the non-interactive bars on full-screen modals misled users into thinking they could drag-dismiss those screens.

This change converts iOS `AuthSheet` presentation to Expo Router's native `formSheet` modal route (`app/auth/sheet.tsx`) while preserving Android's in-tree overlay (`AuthSheet.tsx`) per [ADR 006](../adr/006-android-autofill-and-in-tree-modal-overlays.md) with `PanResponder` grabber drag-to-dismiss, removes the redundant header `X` close button from `AuthSheetContent.tsx` in favor of sheet/grabber swipe, backdrop tap, hardware back, and accessible escape/close actions, renames `AuthSheet` test IDs from `modal` to `auth-sheet`, and removes all non-functional grabber views from non-sheet modal screens.

---

## Architecture & Deliverables

### 1. Shared Auth/Account Form Content (`AuthSheetContent.tsx`)
- Extracted the shared header (`BREWLOG CLOUD` / `Profile` / `RESET PASSWORD`, with no redundant `X` close button), sign-in/sign-up/forgot-password form state, error banner, ADR 006 autofill attributes (`autoComplete`, `textContentType`, `importantForAutofill`), authenticated profile summary, Settings navigation row, and sign-out action into `apps/mobile/src/features/auth/AuthSheetContent.tsx`.
- Exposed `isActive`, `onDismiss`, `onOpenSettings`, and `onSubmittingChange` props (stabilizing `onSubmittingChange` via a ref, calling `updateSubmitting(false)` prior to `onDismiss()` on sign-in success, and disabling dismissal and the Settings row while `submitting` is `true`) so Android overlay and iOS `formSheet` route host identical content without duplicating business logic or rendering an unwanted custom grabber.

### 2. Platform-Split AuthSheet Hosting (`app/auth/sheet.tsx` vs `AuthSheet.tsx`)
- **iOS Native Route (`apps/mobile/app/auth/sheet.tsx` + `app/_layout.tsx`)**:
  - Registered `<Stack.Screen name="auth/sheet" />` in `apps/mobile/app/_layout.tsx` with `presentation: 'formSheet'`, `sheetAllowedDetents: 'fitToContents'`, `sheetExpandsWhenScrolledToEdge: true`, `headerShown: false`, and `contentStyle: { backgroundColor: colors.panel }` (leaving `sheetCornerRadius` unset so UIKit applies its automatic concentric corner radius). `sheetGrabberVisible` starts `false` in `_layout.tsx` and flips to `true` in `app/auth/sheet.tsx` when `transitionStart` / `transitionEnd` fires (so `react-native-screens` updates `UISheetPresentationController.prefersGrabberVisible` after `presentViewController:` starts rather than before presentation).
  - Wrapped `AuthSheetContent` directly inside `<ScrollView testID="auth-sheet" style={styles.container} bounces={false} keyboardShouldPersistTaps="handled" ...>` with `flexGrow: 0` (no `flex: 1`) so `'fitToContents'` measures the sheet's natural content height in both signed-in and signed-out states without leaving empty space underneath or fighting pull-down sheet dismissal.
  - Dynamically syncs `<Stack.Screen options={{ gestureEnabled: !submitting, sheetGrabberVisible: grabberVisible }} />` to prevent swipe-to-dismiss during active auth requests, dismisses safely via `router.dismiss()` / `router.back()`, and navigates to Preferences via `router.replace('/settings/modal')`.
- **iOS Tab Shell (`apps/mobile/app/(tabs)/_layout.ios.tsx`)**:
  - Removed inline `<AuthSheet />` state and component from `TabLayoutIOS`.
  - Wired `AuthModalContext.Provider` on iOS to `router.navigate('/auth/sheet')` with a pathname + `isOpeningRef` double-tap guard and `isAuthSheetVisible = pathname === '/auth/sheet'`.
- **Android In-Tree Overlay (`apps/mobile/src/features/auth/AuthSheet.tsx` + `app/(tabs)/_layout.tsx`)**:
  - Preserved Android's in-tree backdrop, `Keyboard.addListener`, `BackHandler`, and ADR 006 window/autofill architecture, renamed root `testID` from `modal` to `auth-sheet`, isolated the backdrop dismiss control as a leaf sibling `<Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close sheet" accessibilityRole="button" accessibilityState={{ disabled: submitting }} />` behind `sheetContainer` (with `onStartShouldSetResponder={() => true}` on `sheetContainer` so non-interactive inside taps stay trapped without wrapping the form subtree in an accessibility button), added `onAccessibilityEscape`, and wired a `PanResponder` drag-to-dismiss handle on `auth-sheet-grabber` (driving `translateY`/`backdropOpacity`, snapping back below threshold, and disabled while `submitting` is `true`).

### 3. Removal of Non-Functional Grabbers on Non-Sheet Modals
- Removed the decorative `grabberContainer` / `grabber` view from `apps/mobile/app/settings/modal.tsx`.
- Removed `dragHandleContainer` / `dragHandle` views from `RecipeBuilderScreen.tsx`, `BeanModalScreen.tsx`, `EquipmentModalScreen.tsx`, and `ReviewModalScreen.tsx`, adding `paddingTop: 8` to `navHeader` to preserve header breathing room beneath the modal top edge.
- Verified via grep that the only remaining `grabber` or `dragHandle` view in app source resides inside Android's `AuthSheet.tsx`.

---

## Verification Evidence

- **Typecheck**: `npm run typecheck` passed cleanly across all 5 workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- **Unit Tests (`npm run test`)**:
  - `@brewlog/core`: 6 test files, 89 tests passed
  - `@brewlog/supabase`: 4 test files, 29 tests passed
  - `@brewlog/ui`: 12 test files, 63 tests passed
  - `@brewlog/mobile`: 59 test files, 510 tests passed
  - `@brewlog/web`: 28 test files, 273 tests passed
- **Simulator & Emulator Checks**:
  - **iOS Simulator (`iPhone 18 Pro`)**: Verified `app/auth/sheet.tsx` opens in native `formSheet` presentation with system grabber visible immediately, `'fitToContents'` sizing hugging both the signed-in Profile view and signed-out `SIGN IN` view cleanly without wasted space, automatic concentric corner radius inside the display bezel, and no header `X` close button. (Switching to `CREATE ACCOUNT` / opening the software keyboard / `Settings` transition were not separately automated in the iOS simulator.)
  - **Android Emulator (`Pixel_10_Pro`)**: Verified `AuthSheet` overlay renders with the grabber and no `X` close button, inside-sheet taps (`BREWLOG CLOUD` and `CREATE ACCOUNT`) do not dismiss the sheet, dimmed backdrop taps and downward `PanResponder` swipes on `auth-sheet-grabber` dismiss the sheet cleanly, and the `Close sheet` `android.widget.Button` sits as a leaf sibling behind `sheetContainer` in the native accessibility tree.
- **Note**: Web Playwright E2E (`npm run test:e2e`) was not run as no files under `apps/web`, `@brewlog/ui`, `@brewlog/core`, or `@brewlog/supabase` were modified.
