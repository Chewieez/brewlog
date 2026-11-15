# Issue #71: Convert iOS Bottom Sheet to Native Option Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `AuthSheet` on iOS to use Expo Router's native `formSheet` presentation with `sheetGrabberVisible: true` while leaving Android's in-tree `AuthSheet` overlay completely unchanged, rename `testID="modal"` on `AuthSheet` to `testID="auth-sheet"` (using `app/auth/sheet.tsx` for the iOS route), and remove the non-functional static grabber/drag-handle views from `settings/modal` and the four full-screen form modals.

**Architecture:** Extract the inner auth/profile UI and form state from `AuthSheet.tsx` into a shared `AuthSheetContent` component. Android (`app/(tabs)/_layout.tsx`) keeps rendering the existing `AuthSheet` in-tree overlay wrapping `AuthSheetContent` with its custom `grabber`, while iOS (`app/(tabs)/_layout.ios.tsx`) navigates to a new Expo Router `app/auth/sheet.tsx` route registered in `app/_layout.tsx` with `presentation: 'formSheet'` and `sheetGrabberVisible: true`.

**Tech Stack:** React Native (`0.88.0`), Expo (`~58.0.17`), Expo Router (`~58.0.25`), `react-native-screens` (`~4.30.0`), TypeScript, Vitest (`^4.1.11`) + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-14-issue-71-ios-native-bottom-sheet-design.md`

## Global Constraints

- **Android Autofill (ADR 006):** Android `AuthSheet` must remain an in-tree overlay inside `MainActivity`'s view hierarchy (`apps/mobile/app/(tabs)/_layout.tsx`) rather than an `android.app.Dialog` (`<Modal>`), and Android setup must remain unchanged.
- **No New Native Dependencies:** `apps/mobile` runs Expo SDK 58 (`expo ~58.0.17`, `expo-router ~58.0.25`, `react-native-screens ~4.30.0`); `@expo/ui` is not installed and must not be added.
- **Test Compatibility:** Existing Vitest tests (`AuthSheet.test.tsx`, `SettingsModalScreen.test.tsx`, `rootLayout.test.tsx`, `_layout.test.tsx`) must remain green, and new iOS route/layout tests must cover the iOS `formSheet` path.
- **Workspace Test Rule:** Run only targeted single-file test checks during intermediate tasks if explicitly needed, and reserve broad/full workspace test and typecheck runs (`npm run typecheck && npm run test`) for final pre-commit verification.

## Review Focus

- **Double-tap guard on iOS `openAuthSheet`:** Tapping `ProfileHeaderButton` rapidly while `/auth/sheet` is opening or already open must not push duplicate `/auth/sheet` routes (`_layout.ios.tsx` checks `pathname === '/auth/sheet'` and uses `router.navigate('/auth/sheet')` or a transition ref lock so rapid same-frame taps before `pathname` updates cannot stack duplicates).
- **In-flight auth submission guard on iOS:** While `submitting === true` inside `app/auth/sheet.tsx`, interactive swipe-to-dismiss (`gestureEnabled: !submitting`) and programmatic `onDismiss` must be blocked, matching Android's guard.
- **ScrollView vs. native sheet drag gesture on iOS:** Configure `sheetInitialDetentIndex: 0` and `sheetExpandsWhenScrolledToEdge: true` on the `auth/sheet` `Stack.Screen`, and set `bounces={false}` on the `<ScrollView>` inside `app/auth/sheet.tsx` so downward drag gestures hand off cleanly to UIKit's swipe-to-dismiss without rubber-banding.
- **Transition from `AuthSheet` to Settings on iOS:** Tapping the Settings row inside `app/auth/sheet.tsx` calls `router.replace('/settings/modal')` so `/settings/modal` replaces the formSheet cleanly instead of stacking over it (with a fallback to `router.dismiss()` + `router.push('/settings/modal')` if UIKit logs a presentation-in-progress warning on simulator verification).
- **Safe dismissal when `closeAuthSheet` is called when not open or when `canDismiss()` is false:** `_layout.ios.tsx` and `app/auth/sheet.tsx` must guard dismissal with `pathname === '/auth/sheet'` / `router.canDismiss()` (falling back to `router.back()` only when `router.canGoBack()` is true) so they never pop an unrelated screen.
- **Android autofill & overlay parity:** Extracting `AuthSheetContent` must preserve every Android input hint (`autoComplete`, `textContentType`, `importantForAutofill`), modal accessibility attributes (`accessibilityViewIsModal`, `aria-modal`), `<View style={styles.grabber} />`, `Keyboard.addListener`, `BackHandler`, and password/mode resets on `visible`/`user` changes, while updating `testID="modal"` → `testID="auth-sheet"`.

---

### Task 1: Extract `AuthSheetContent`, rename `testID` to `"auth-sheet"`, and preserve Android `AuthSheet` overlay

**Files:**
- Create: `apps/mobile/src/features/auth/AuthSheetContent.tsx`
- Modify: `apps/mobile/src/features/auth/AuthSheet.tsx:1-839`
- Modify Test: `apps/mobile/src/features/auth/AuthSheet.test.tsx:774, 922`
- Modify Test: `apps/mobile/__tests__/tabs/_layout.test.tsx:268, 270, 285, 292`
- Create Test: `apps/mobile/src/features/auth/AuthSheetContent.test.tsx`

**Interfaces:**
- Produces in `apps/mobile/src/features/auth/AuthSheetContent.tsx`:
  - `export interface AuthSheetContentProps { isActive: boolean; onDismiss: () => void; onOpenSettings: () => void; onSubmittingChange?: (submitting: boolean) => void; }`
  - `export const AuthSheetContent: React.FC<AuthSheetContentProps>`
- Preserves in `apps/mobile/src/features/auth/AuthSheet.tsx`:
  - `export interface AuthSheetProps { visible: boolean; onClose: () => void; }`
  - `export const AuthSheet: React.FC<AuthSheetProps>` (with root `testID="auth-sheet"`)

- [ ] **Step 1: Add unit tests for `AuthSheetContent` and update `testID="auth-sheet"` expectations**

1. Create `apps/mobile/src/features/auth/AuthSheetContent.test.tsx` testing:
   - `AuthSheetContent` renders the header (`BREWLOG CLOUD` / `Profile`), auth form/profile card, and `Settings` row **without** rendering any `grabber` view.
   - Calling `onOpenSettings` triggers the passed callback (without calling `router.push` directly inside `AuthSheetContent`).
   - Submitting an in-flight sign-in invokes `onSubmittingChange(true)` and then `onSubmittingChange(false)`, and prevents `onDismiss` from firing while submitting.
2. Update `testID="modal"` references to `"auth-sheet"` in `apps/mobile/src/features/auth/AuthSheet.test.tsx` (lines 774, 922) and `apps/mobile/__tests__/tabs/_layout.test.tsx` (lines 268, 270, 285, 292).

- [ ] **Step 2: Run the new/updated test files to verify they fail**

Run (from `apps/mobile`): `npx vitest run src/features/auth/AuthSheetContent.test.tsx src/features/auth/AuthSheet.test.tsx __tests__/tabs/_layout.test.tsx`
Expected: FAIL because `AuthSheetContent.tsx` does not exist yet and `AuthSheet.tsx` still uses `testID="modal"`.

- [ ] **Step 3: Create `apps/mobile/src/features/auth/AuthSheetContent.tsx`**

Move the auth/profile form state (`mode`, `email`, `password`, `displayName`, `submitting`, `errorMessage`, `successMessage`), `handleSubmit`, `handleSignOut`, `switchMode`, the header (`headerTitle` + `Close sheet` button), logged-in `profileSection`, logged-out `formSection` (with exact `autoComplete`, `textContentType`, `importantForAutofill` props from ADR 006), and `preferencesSection` (`Settings` row) into `AuthSheetContent`.
- Reset `password` when `isActive` or `user` changes, and reset `mode` to `"signin"`, `errorMessage`/`successMessage` to `null`, and `submitting` to `false` when `isActive` becomes `true`.
- Call `onSubmittingChange?.(submitting)` whenever `submitting` changes.
- Guard close button press with `if (!submitting) onDismiss()`.
- Wire the `Settings` row to `onOpenSettings`.
- Do NOT include `<View style={styles.grabber} />` or `ScrollView` wrapper inside `AuthSheetContent` so the host (`AuthSheet.tsx` on Android, `app/auth/sheet.tsx` on iOS) owns the outer container/scroll wrapper.

- [ ] **Step 4: Refactor `apps/mobile/src/features/auth/AuthSheet.tsx` to wrap `AuthSheetContent`**

Keep `AuthSheet.tsx` as the exact Android/fallback in-tree overlay:
- Update root `testID="modal"` → `testID="auth-sheet"`.
- Retain `accessibilityViewIsModal={true}`, `aria-modal={true}`, `Animated.View` backdrop + `translateY` sheet container, `Keyboard.addListener`, `BackHandler`, `useSafeAreaInsets`, `<View style={styles.grabber} />`, and `<ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>`.
- Track `submitting` via `onSubmittingChange={setSubmitting}` so `handleDismiss` and `BackHandler` continue blocking dismissal while submitting.
- Pass `isActive={visible}`, `onDismiss={handleDismiss}`, and `onOpenSettings={handleOpenPreferences}` (which keeps `handleDismiss(); router.push("/settings/modal");`) into `<AuthSheetContent />`.

- [ ] **Step 5: Verify `AuthSheetContent.test.tsx`, `AuthSheet.test.tsx`, and `_layout.test.tsx` pass**

Run (from `apps/mobile`): `npx vitest run src/features/auth/AuthSheetContent.test.tsx src/features/auth/AuthSheet.test.tsx __tests__/tabs/_layout.test.tsx`
Expected: PASS.

---

### Task 2: Add native iOS `auth/sheet` `formSheet` route and register in root Stack

**Files:**
- Create: `apps/mobile/app/auth/sheet.tsx`
- Modify: `apps/mobile/app/_layout.tsx:173-180`
- Test: `apps/mobile/__tests__/authSheetRoute.test.tsx` (create) and `apps/mobile/__tests__/rootLayout.test.tsx`

**Interfaces:**
- Consumes: `AuthSheetContent` from `../../src/features/auth/AuthSheetContent`
- Produces:
  - Default export `AuthSheetScreen` at `apps/mobile/app/auth/sheet.tsx`
  - Stack route `name="auth/sheet"` in `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Write failing tests for `app/auth/sheet.tsx` and `app/_layout.tsx` `auth/sheet` options**

1. In `apps/mobile/__tests__/rootLayout.test.tsx`, assert `mock-screen-auth/sheet` is rendered with:
   - `presentation: 'formSheet'`
   - `sheetGrabberVisible: true`
   - `sheetAllowedDetents: [0.65, 1.0]`
   - `sheetInitialDetentIndex: 0`
   - `sheetExpandsWhenScrolledToEdge: true`
   - `sheetCornerRadius: 24`
   - `headerShown: false`
2. Create `apps/mobile/__tests__/authSheetRoute.test.tsx` testing `AuthSheetScreen`:
   - Renders `testID="auth-sheet"` with `AuthSheetContent` inside a `ScrollView` (`bounces={false}`) and no custom `grabber` view.
   - Passes `<Stack.Screen options={{ gestureEnabled: true }} />` initially and switches `gestureEnabled: false` while an auth request is `submitting`.
   - Pressing `Close sheet` calls `router.dismiss()` when `router.canDismiss()` returns `true` (and falls back to `router.back()` when `canDismiss()` is `false` and `canGoBack()` is `true`).
   - Pressing `Settings` calls `router.replace('/settings/modal')`.

- [ ] **Step 2: Run the failing tests**

Run (from `apps/mobile`): `npx vitest run __tests__/authSheetRoute.test.tsx __tests__/rootLayout.test.tsx`
Expected: FAIL because `app/auth/sheet.tsx` does not exist and `app/_layout.tsx` does not register `auth/sheet`.

- [ ] **Step 3: Implement `apps/mobile/app/auth/sheet.tsx`**

Implement `AuthSheetScreen`:
- Track `submitting` state via `onSubmittingChange={setSubmitting}`.
- Render `<Stack.Screen options={{ gestureEnabled: !submitting }} />` so iOS swipe-to-dismiss is disabled during active sign-in/sign-up/reset requests.
- Render `<ScrollView testID="auth-sheet" style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(28, insets.bottom + 12) }]} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>` with `colors.panel` background and top padding (`paddingTop: 20`) below UIKit's native grabber without adding `SafeAreaView edges={['top']}`.
- Inside `ScrollView`, render `<AuthSheetContent isActive={true} onDismiss={handleDismiss} onOpenSettings={handleOpenSettings} onSubmittingChange={setSubmitting} />`.
- `handleDismiss`: if `submitting` return; dismiss keyboard, then if `router.canDismiss()` call `router.dismiss()`, else if `router.canGoBack()` call `router.back()`.
- `handleOpenSettings`: dismiss keyboard and call `router.replace('/settings/modal')` (note: if iOS simulator verification shows UIKit warning during `formSheet` → `modal` replacement, fall back to dismissing `/auth/sheet` first and pushing `/settings/modal` after transition).

- [ ] **Step 4: Register `auth/sheet` in `apps/mobile/app/_layout.tsx`**

Inside `<Stack>` in `NavigationRoot()` (`apps/mobile/app/_layout.tsx`, adjacent to `settings/modal`), add:
```tsx
<Stack.Screen
  name="auth/sheet"
  options={{
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.65, 1.0],
    sheetInitialDetentIndex: 0,
    sheetExpandsWhenScrolledToEdge: true,
    sheetCornerRadius: 24,
    headerShown: false,
    contentStyle: { backgroundColor: colors.panel },
  }}
/>
```

- [ ] **Step 5: Run tests to verify they pass**

Run (from `apps/mobile`): `npx vitest run __tests__/authSheetRoute.test.tsx __tests__/rootLayout.test.tsx`
Expected: PASS.

---

### Task 3: Wire `app/(tabs)/_layout.ios.tsx` to native `/auth/sheet` route (leaving Android `_layout.tsx` untouched)

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.ios.tsx:1-89`
- Create Test: `apps/mobile/__tests__/tabs/_layout.ios.test.tsx`
- Verify untouched: `apps/mobile/app/(tabs)/_layout.tsx` and `apps/mobile/__tests__/tabs/_layout.test.tsx`

**Interfaces:**
- Consumes: `useRouter`, `usePathname` from `expo-router`
- Produces: `AuthModalContext.Provider` values `{ openAuthSheet, closeAuthSheet, isAuthSheetVisible }` in `TabLayoutIOS`

- [ ] **Step 1: Write failing tests in `apps/mobile/__tests__/tabs/_layout.ios.test.tsx`**

Mock `expo-router/native-tabs` (`NativeTabs` + `NativeTabs.Trigger` + `.Label` + `.Icon`), `expo-router` (`useRouter`, `usePathname`), and `react-native` (`Keyboard`), and assert:
1. `TabLayoutIOS` does NOT render the in-tree `AuthSheet` overlay (`queryByTestId('auth-sheet')` is `null` even after calling `openAuthSheet`).
2. Calling `openAuthSheet()` calls `Keyboard.dismiss()` and `router.navigate('/auth/sheet')` (or `router.push('/auth/sheet')` with a ref lock) when `pathname !== '/auth/sheet'`.
3. Calling `openAuthSheet()` while `pathname === '/auth/sheet'` or twice in rapid succession before `pathname` updates does NOT trigger a duplicate navigation call (double-tap guard).
4. `isAuthSheetVisible` is `true` when `pathname === '/auth/sheet'` and `false` otherwise.
5. Calling `closeAuthSheet()` calls `Keyboard.dismiss()`, and calls `router.dismiss()` only when `pathname === '/auth/sheet'` and `router.canDismiss()` is `true` (never calling `router.dismiss()` when already on a tab route).

- [ ] **Step 2: Run the failing test**

Run (from `apps/mobile`): `npx vitest run __tests__/tabs/_layout.ios.test.tsx`
Expected: FAIL because `_layout.ios.tsx` still mounts `<AuthSheet />` and sets local boolean state instead of navigating to `'/auth/sheet'`.

- [ ] **Step 3: Update `apps/mobile/app/(tabs)/_layout.ios.tsx`**

- Remove `useState`, `AuthSheet` import, and `<AuthSheet />` JSX.
- Import `useRouter, usePathname` from `'expo-router'`.
- Compute `const isAuthSheetVisible = pathname === '/auth/sheet';`.
- Maintain a `useRef(false)` `isOpeningRef` (reset in `useEffect` whenever `pathname` changes) alongside the `pathname === '/auth/sheet'` check so rapid double-taps before `usePathname()` updates cannot dispatch two navigation actions.
- `openAuthSheet`: `Keyboard.dismiss();` and if `pathname !== '/auth/sheet'` and `!isOpeningRef.current`, set `isOpeningRef.current = true` and call `router.navigate('/auth/sheet')` (or `router.push('/auth/sheet')`).
- `closeAuthSheet`: `Keyboard.dismiss();` and if `pathname === '/auth/sheet'`, reset `isOpeningRef.current = false` and call `router.dismiss()` if `router.canDismiss()` (else if `router.canGoBack()` call `router.back()`).
- Leave `apps/mobile/app/(tabs)/_layout.tsx` completely unmodified.

- [ ] **Step 4: Run `_layout.ios.test.tsx` and `_layout.test.tsx`**

Run (from `apps/mobile`): `npx vitest run __tests__/tabs/_layout.ios.test.tsx __tests__/tabs/_layout.test.tsx`
Expected: PASS (both iOS native routing layout and Android in-tree overlay layout tests green).

---

### Task 4: Remove non-functional `grabber` and `dragHandle` views from `settings/modal` and the four full-screen form modals

**Files:**
- Modify: `apps/mobile/app/settings/modal.tsx:107-111, 367-377`
- Modify: `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.tsx:525-527, 1136-1146`
- Modify: `apps/mobile/src/features/stash/screens/BeanModalScreen.tsx:335-337, 730-740`
- Modify: `apps/mobile/src/features/equipment/screens/EquipmentModalScreen.tsx:258-260, 528-538`
- Modify: `apps/mobile/src/features/reviews/screens/ReviewModalScreen.tsx:312-314, 724-734`
- Test: `apps/mobile/src/features/settings/screens/SettingsModalScreen.test.tsx` (and existing feature modal tests)

- [ ] **Step 1: Add regression assertion to `SettingsModalScreen.test.tsx` (optional check that header still renders without grabber)**

Verify `SettingsModalScreen.test.tsx` renders cleanly without any grabber/handle view in `settings/modal.tsx`, `RecipeBuilderScreen.tsx`, `BeanModalScreen.tsx`, `EquipmentModalScreen.tsx`, and `ReviewModalScreen.tsx`.

- [ ] **Step 2: Remove the static grabber / drag-handle JSX and unused styles in all 5 files**

- In `apps/mobile/app/settings/modal.tsx`: remove lines 107-110 (`{/* Grabber Handle */} <View style={styles.grabberContainer}><View style={styles.grabber} /></View>`) and `grabberContainer` / `grabber` from `useStyles` (`header` already has `paddingTop: 8`).
- In `apps/mobile/src/features/recipes/screens/RecipeBuilderScreen.tsx`: remove `<View style={styles.dragHandleContainer}><View style={styles.dragHandle} /></View>` (lines 525-527) and `dragHandleContainer` / `dragHandle` from `useStyles`, and add `paddingTop: 8` to `navHeader` so the header controls do not sit flush against the top edge.
- In `apps/mobile/src/features/stash/screens/BeanModalScreen.tsx`: remove lines 335-337 and `dragHandleContainer` / `dragHandle` from `useStyles`, and add `paddingTop: 8` to `navHeader`.
- In `apps/mobile/src/features/equipment/screens/EquipmentModalScreen.tsx`: remove lines 258-260 and `dragHandleContainer` / `dragHandle` from `useStyles`, and add `paddingTop: 8` to `navHeader`.
- In `apps/mobile/src/features/reviews/screens/ReviewModalScreen.tsx`: remove lines 312-314 and `dragHandleContainer` / `dragHandle` from `useStyles`, and add `paddingTop: 8` to `navHeader`.

- [ ] **Step 3: Run the five modal screen test suites**

Run (from `apps/mobile`): `npx vitest run src/features/settings/screens/SettingsModalScreen.test.tsx src/features/recipes/screens/RecipeBuilderScreen.test.tsx src/features/stash/screens/BeanModalScreen.test.tsx src/features/equipment/screens/EquipmentModalScreen.test.tsx src/features/reviews/screens/ReviewModalScreen.test.tsx`
Expected: PASS.

---

### Task 5: Documentation, Full Verification & Pre-Commit Protocol

**Files:**
- Modify: `README.md`
- Modify: `docs/ROADMAP.md`
- Create: `docs/devlogs/2026-11-14-issue-71-ios-native-bottom-sheet.md`

- [ ] **Step 1: Update `README.md`, `docs/ROADMAP.md`, and create dated devlog per `AGENTS.md` protocol**

- Update `README.md` Key Features to note iOS native `formSheet` presentation for `AuthSheet` alongside Android's ADR 006 in-tree overlay.
- Update `docs/ROADMAP.md` under Completed Milestones referencing issue #71 and linking to `docs/devlogs/2026-11-14-issue-71-ios-native-bottom-sheet.md` and `docs/superpowers/specs/2026-11-14-issue-71-ios-native-bottom-sheet-design.md`.
- Write `docs/devlogs/2026-11-14-issue-71-ios-native-bottom-sheet.md` summarizing the architecture, iOS vs Android platform split, cleanup of static modal handles, and verification evidence.

- [ ] **Step 2: Run full typecheck and test suite across workspaces before committing**

Run (from repo root):
```bash
npm run typecheck && npm run test
```
Expected: All workspace typechecks and Vitest tests pass with zero failures.

- [ ] **Step 3: Check git status/diff and verify no non-Android regressions**

Ensure `apps/mobile/app/(tabs)/_layout.tsx` has zero unintended changes and `AuthSheet.tsx` preserves Android's `grabber`, `Keyboard.addListener`, `BackHandler`, and autofill attributes.
