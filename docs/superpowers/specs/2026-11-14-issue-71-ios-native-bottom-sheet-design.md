# Issue #71: Convert iOS Bottom Sheet to Native Option — Design Spec

## Intent & Why
Replace the custom JS grabber and animated overlay used by `AuthSheet` on iOS with iOS's native sheet presentation (`UISheetPresentationController` via Expo Router `formSheet` and `sheetGrabberVisible: true`), while leaving Android's bottom sheet implementation completely unchanged so Android password-manager autofill ([ADR 006](../../adr/006-android-autofill-and-in-tree-modal-overlays.md)) continues working without regression.

At the same time, remove the non-functional static grabber / drag-handle views from `settings/modal` and the four full-screen form modals (`recipe/builder`, `stash/modal`, `equipment/modal`, `reviews/modal`), which are `X`-dismissible modal screens rather than draggable bottom sheets.

## Goals & Non-Goals
### Goals
- Present `AuthSheet` on iOS as a native `formSheet` with `sheetGrabberVisible: true`, interactive swipe-to-dismiss, native backdrop dimming, and native keyboard expansion.
- Keep `AuthSheet` on Android completely unchanged (in-tree `Animated.View` overlay with its custom `grabber`, `Keyboard.addListener`, and `BackHandler`).
- Remove the non-functional static `grabber` from `apps/mobile/app/settings/modal.tsx` and the unused `dragHandle` from `RecipeBuilderScreen`, `BeanModalScreen`, `EquipmentModalScreen`, and `ReviewModalScreen`.

### Non-Goals
- Changing Android's `AuthSheet` presentation or replacing Android's custom grabber (out of scope per issue #71 and constrained by ADR 006).
- Converting `settings/modal`, `recipe/builder`, `stash/modal`, `equipment/modal`, or `reviews/modal` into partial-detent bottom sheets.
- Installing `@expo/ui` or requiring a native EAS/dev-client rebuild.

## Constraints
- **Android Autofill (ADR 006):** Android `AuthSheet` must remain an in-tree overlay inside `MainActivity`'s view hierarchy (`apps/mobile/app/(tabs)/_layout.tsx`) rather than an `android.app.Dialog` (`<Modal>`).
- **No New Native Dependencies:** `apps/mobile` runs Expo SDK 58 (`expo ~58.0.17`, `expo-router ~58.0.25`, `react-native-screens ~4.30.0`); `@expo/ui` is not installed.
- **Test Compatibility:** Existing Vitest tests (`AuthSheet.test.tsx`, `SettingsModalScreen.test.tsx`, `rootLayout.test.tsx`, `_layout.test.tsx`) must remain green and new iOS route/layout tests must cover the iOS `formSheet` path.

## Approaches Considered
1. **Expo Router `formSheet` (`react-native-screens`) for iOS `AuthSheet` + unchanged Android overlay (Chosen)**
   - Uses `expo-router` and `react-native-screens` already present in `apps/mobile/package.json`.
   - Extracts shared auth/profile form UI into `AuthSheetContent`, mounts an iOS route (`app/auth/sheet.tsx`) configured with `presentation: 'formSheet'` and `sheetGrabberVisible: true` in `app/_layout.tsx`, and routes `openAuthSheet` in `app/(tabs)/_layout.ios.tsx` to `/auth/sheet`.
   - **Pros:** Zero new dependencies, no native rebuild, native `UISheetPresentationController` grabber/detents/keyboard handling, clean Stack transition to `/settings/modal`.
   - **Trade-offs:** Moves iOS `AuthSheet` open/close from boolean overlay state to Stack navigation (`router.push` / `router.dismiss` / `router.replace`), requiring small updates to `_layout.ios.tsx` and `AuthSheet` refactoring.

2. **`@expo/ui` SwiftUI `BottomSheet` + `RNHostView` for iOS `AuthSheet`**
   - Keeps `AuthSheet` state-driven inside `_layout.ios.tsx` via `@expo/ui`'s `<BottomSheet>` wrapping `<RNHostView>`.
   - **Trade-offs:** Rejected because `@expo/ui` is not installed, requires a native dev-client rebuild, introduces `RNHostView` sizing/keyboard friction, and complicates transitioning from a SwiftUI modal into the Expo Router `/settings/modal` Stack route.

3. **React Native `<Modal presentationStyle="pageSheet">` for iOS `AuthSheet`**
   - **Trade-offs:** Rejected because RN's `<Modal>` does not expose `UISheetPresentationController.prefersGrabberVisible` or sheet detents on iOS.

## Design
### 1. Shared `AuthSheetContent` Extraction
- Extract the inner auth/profile/settings-link UI and form logic from `apps/mobile/src/features/auth/AuthSheet.tsx` into `apps/mobile/src/features/auth/AuthSheetContent.tsx` (without the manual `grabber` view).
- Props: `onDismiss: () => void`, `onOpenSettings: () => void`, `onSubmittingChange?: (submitting: boolean) => void`, plus `resetKey` / `visible` lifecycle handling so form state (`password`, `mode`, banners) resets cleanly on open.
- `AuthSheet.tsx` remains the Android/fallback in-tree `Animated.View` overlay (rendering `<View style={styles.grabber} />` + `ScrollView` + `<AuthSheetContent />`), keeping all existing `AuthSheet` behavior, `Keyboard.addListener`, and `BackHandler` intact for `app/(tabs)/_layout.tsx`, while updating its root `testID` from `"modal"` to `"auth-sheet"`.

### 2. Native iOS `formSheet` Route & Wiring
- **Route (`apps/mobile/app/auth/sheet.tsx`):**
  - Renders `<AuthSheetContent />` inside a `ScrollView` (`testID="auth-sheet"`, `keyboardShouldPersistTaps="handled"`, explicit bottom padding via `useSafeAreaInsets().bottom`).
  - No custom `<View style={styles.grabber} />` and no `SafeAreaView edges={['top']}` (so UIKit's native grabber sits cleanly at the top edge without extra top safe-area gap).
  - Dynamically guards interactive swipe-to-dismiss while an auth request is in flight (`gestureEnabled: !submitting` via `Stack.Screen` options).
  - `onDismiss` calls `router.dismiss()` (or `router.back()` if `canGoBack()`).
  - `onOpenSettings` calls `router.replace('/settings/modal')` so the iOS `formSheet` cleanly transitions into Settings without leaving two stacked sheets open.
- **Root Stack (`apps/mobile/app/_layout.tsx`):**
  - Register `<Stack.Screen name="auth/sheet" ... />` with:
    - `presentation: 'formSheet'`
    - `sheetGrabberVisible: true`
    - `sheetAllowedDetents: [0.65, 1.0]` (opens as a bottom sheet and expands cleanly to `1.0` under UIKit when the keyboard opens for email/password inputs)
    - `sheetCornerRadius: 24`
    - `headerShown: false`
    - `contentStyle: { backgroundColor: colors.panel }`
- **iOS Tab Layout (`apps/mobile/app/(tabs)/_layout.ios.tsx`):**
  - Remove `<AuthSheet />` and local `authSheetVisible` state.
  - `openAuthSheet`: dismisses any active keyboard and navigates with `router.push('/auth/sheet')` (guarded if pathname is already `/auth/sheet`).
  - `closeAuthSheet`: dismisses via `router.dismiss()` when `/auth/sheet` is active.
  - `isAuthSheetVisible`: derived from `usePathname() === '/auth/sheet'`.
- **Android Tab Layout (`apps/mobile/app/(tabs)/_layout.tsx`):**
  - Left completely unchanged.

### 3. Remove Non-Functional Grabbers from Non-Sheet Modals
Remove the static, non-interactive handle views and their unused styles from the five `presentation: 'modal'` screens that dismiss via `X`:
- `apps/mobile/app/settings/modal.tsx` (`grabberContainer`, `grabber`)
- `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.tsx` (`dragHandleContainer`, `dragHandle`)
- `apps/mobile/src/features/stash/screens/BeanModalScreen.tsx` (`dragHandleContainer`, `dragHandle`)
- `apps/mobile/src/features/equipment/screens/EquipmentModalScreen.tsx` (`dragHandleContainer`, `dragHandle`)
- `apps/mobile/src/features/reviews/screens/ReviewModalScreen.tsx` (`dragHandleContainer`, `dragHandle`)

## Left to the Builder
- Exact padding/spacing inside `app/auth/sheet.tsx` below the iOS native grabber (verify visually on iOS simulator / device so the header `Profile` / `BREWLOG CLOUD` + `X` button sit cleanly below the `UISheetPresentationController` grabber).
- Keeping `AuthSheet.test.tsx` and `_layout.test.tsx` passing with `testID="auth-sheet"` on the refactored `AuthSheet` + `AuthSheetContent`, and adding unit tests for `app/auth/sheet.tsx`, `app/(tabs)/_layout.ios.tsx`, and `app/_layout.tsx` (`auth/sheet` `formSheet` options).
