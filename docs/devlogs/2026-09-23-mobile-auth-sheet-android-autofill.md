# 🔑 Devlog: Android Password Manager Autofill & In-Tree Sheet Architecture

- **Date**: 2026-09-23
- **Milestone**: Mobile Auth & Platform Hardening (Post-Phase 5)
- **Status**: Completed & Verified ✅
- **Branch**: `fix/android-auth-sheet-autofill`
- **PR**: [#9](https://github.com/Chewieez/brewlog/pull/9)
- **Affected Devices**: Android 14/15/16 (Tested on Google Pixel 10 Pro XL)
- **Tech Stack**: React Native 0.86.3, Expo SDK 57, Android Autofill Framework, Bitwarden, Gboard

---

## 🎯 Context & Problem Statement

During physical device testing on a Google Pixel 10 Pro XL with Bitwarden and Gboard enabled, interacting with `AuthSheet` uncovered critical Android autofill and keyboard UX failures:

1. **Failure of Inline Suggestion Chips**:
   Focusing the email or password inputs did not trigger Bitwarden suggestion chips in the Gboard suggestion bar, even though credentials for the app package (`androidapp://com.brewlog.app`) were saved in the vault.
2. **Android System Autofill Error**:
   Attempting manual autofill (long-pressing an input and tapping **Autofill**) triggered the Android system toast:
   > *"Contents can't be autofilled"*
3. **Background Keyboard Retention**:
   If the user tapped into an input on the screen beneath (such as the numeric coffee dose input on the Timer tab) and subsequently tapped the profile button in the top navigation bar, the numeric keyboard remained open on screen, completely obscuring the user account card and the **SIGN OUT** button.

---

## 🔍 Root Cause Analysis

### 1. React Native `<Modal>` Window Isolation on Android
React Native's `<Modal>` is not rendered as an in-tree overlay; on Android, it creates a separate native `android.app.Dialog` with its own `Window` and `WindowManager`.
- Android's `AutofillManagerService` and Gboard's inline suggestions bind strictly to `MainActivity`.
- When an input inside a secondary `Dialog` window requests an autofill session, Android attempts to harvest the view structure. Because the views belong to a separate window token, the autofill provider receives an empty or disconnected node hierarchy and returns a `null` dataset to the OS, triggering the system toast error *"Contents can't be autofilled"*.

### 2. Autofill Hints vs Password Manager Credential Semantics
- Android requires `autoComplete` hints; it completely ignores iOS's `textContentType`.
- React Native's Android engine (`ReactTextInputManager.kt`) maps `autoComplete="email"` to `View.AUTOFILL_HINT_EMAIL_ADDRESS`. Password managers classify `AUTOFILL_HINT_EMAIL_ADDRESS` as contact info rather than a login identifier.
- To trigger credential lookup and inline suggestion chips, password managers require `View.AUTOFILL_HINT_USERNAME` (`autoComplete="username"`) paired with `View.AUTOFILL_HINT_PASSWORD` (`autoComplete="password"`).

### 3. Keyboard Focus Retention Across Modals
Tapping a header button while a text input is focused does not automatically blur the active input. On Android, the soft keyboard remains active unless `Keyboard.dismiss()` is invoked explicitly.

---

## 🛠️ Solutions Implemented

### 1. In-Tree Overlay Refactor
Replaced React Native's `<Modal>` in [`AuthSheet.tsx`](file:///Users/greglawrence/Projects/brewlog/apps/mobile/src/features/auth/AuthSheet.tsx) with an absolute overlay container:
```tsx
const styles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  // ...
});
```
Anchored the tab root layout in [`apps/mobile/app/(tabs)/_layout.tsx`](file:///Users/greglawrence/Projects/brewlog/apps/mobile/app/(tabs)/_layout.tsx) inside `<View style={{ flex: 1 }}>`.

### 2. Autofill Hint Alignment
Configured cross-platform autofill props:
```tsx
// Email / Username input
<TextInput
  autoComplete={mode === "signup" ? "email" : "username"}
  textContentType={mode === "signup" ? "emailAddress" : "username"}
  importantForAutofill="yes"
/>

// Password input
<TextInput
  autoComplete={mode === "signup" ? "password-new" : "password"}
  textContentType={mode === "signup" ? "newPassword" : "password"}
  importantForAutofill="yes"
/>
```

### 3. Smooth Keyboard Avoidance & Auto-Dismissal
- Added `Keyboard.dismiss()` on sheet trigger in both `_layout.tsx` and `AuthSheet.tsx`.
- On Android, Expo defaults to `softwareKeyboardLayoutMode: "resize"` (`adjustResize`), automatically resizing the root viewport atop the soft keyboard. Manual `paddingBottom` animation is bypassed on Android to prevent double-padding and viewport jump/drift.
- On iOS, `keyboardWillShow` and `keyboardWillHide` animate `keyboardPadding` via `Animated.Value`:
```tsx
const keyboardPadding = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (Platform.OS === "android") return;

  const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
    Animated.timing(keyboardPadding, {
      toValue: e.endCoordinates.height,
      duration: e.duration || 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  });

  const hideSub = Keyboard.addListener("keyboardWillHide", (e) => {
    Animated.timing(keyboardPadding, {
      toValue: 0,
      duration: e?.duration || 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  });

  return () => {
    showSub.remove();
    hideSub.remove();
  };
}, [keyboardPadding]);
```

### 4. Hardware Back Button Support
Integrated Android `BackHandler`:
```tsx
useEffect(() => {
  if (!visible) return;
  const onBackPress = () => {
    if (submitting) return true;
    onClose();
    return true;
  };
  const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
  return () => subscription.remove();
}, [visible, submitting, onClose]);
```

---

## 🧪 Verification & Results

1. **Physical Device Testing (Pixel 10 Pro XL)**:
   - Bitwarden inline suggestion chips pop up cleanly above Gboard when focusing either field.
   - Long-press → Autofill successfully prompts and fills stored credentials without the *"Contents can't be autofilled"* error.
   - Opening the sign-out modal while the numeric keyboard is open cleanly dismisses the keyboard, revealing the account card and SIGN OUT action.
2. **Automated Test Coverage**:
   - 26 tests in `AuthSheet.test.tsx` verifying in-tree rendering, autofill properties, back button handler, and keyboard dismissal.
   - All 247 tests in `apps/mobile` pass cleanly.
   - Monorepo-wide `npm run typecheck` passes with 0 errors.
