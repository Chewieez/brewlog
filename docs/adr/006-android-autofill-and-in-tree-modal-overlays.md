# ADR 006: Android Autofill Compatibility, Window Isolation, and In-Tree Sheet Overlays

## Status
Accepted

## Context
During physical device testing on Android (Google Pixel running Android 15/16 with Gboard and Bitwarden), password manager autofill completely failed inside the mobile authentication bottom sheet (`AuthSheet`):
1. **Inline Suggestions Failed**: Password manager suggestion chips (pills above Gboard) failed to render when focusing either the email/username or password fields.
2. **System Error on Manual Autofill**: Long-pressing an input and choosing **Autofill** from the Android system context menu triggered an immediate Android system toast:
   > *"Contents can't be autofilled"*

### Root Cause Analysis

1. **Window Isolation in React Native `<Modal>`**:
   * React Native's `<Modal>` component does not simply render layered views. On Android, it instantiates an `android.app.Dialog` with a separate native `Window` and `WindowManager`.
   * Android's `AutofillManagerService` and Gboard's inline suggestion engine bind to `MainActivity`.
   * When text inputs inside a secondary `Dialog` window request an autofill session, Android attempts to harvest the view structure. Because the views belong to a separate window token, the autofill provider receives an empty or disconnected node hierarchy and returns a `null` dataset to the OS, triggering the system toast error *"Contents can't be autofilled"*.

2. **Autofill Hint Mapping in React Native Android**:
   * React Native uses `autoComplete` for Android autofill hints, while `textContentType` is strictly iOS-only (ignored by Android).
   * In React Native's native Android implementation (`ReactTextInputManager.kt`), `autoComplete="email"` maps to `View.AUTOFILL_HINT_EMAIL_ADDRESS`. Password managers classify `AUTOFILL_HINT_EMAIL_ADDRESS` as contact info rather than a login identifier.
   * To trigger credential lookup and inline suggestion chips, password managers require `View.AUTOFILL_HINT_USERNAME` (`autoComplete="username"`) paired with `View.AUTOFILL_HINT_PASSWORD` (`autoComplete="password"`).

3. **Background Keyboard Retention**:
   * When opening an authentication sheet or sign-out modal while an input on the underlying screen (such as the numeric coffee dose input on the Timer tab) is focused, React Native does not automatically dismiss the software keyboard.
   * The active keyboard remains visible and obscures modal actions (such as the account profile card and the "SIGN OUT" button).

4. **Hardware Back Button Handling**:
   * Unlike React Native `<Modal onRequestClose={...}>`, in-tree overlays do not automatically intercept Android hardware back button presses or back edge gestures unless explicitly wired.

---

## Decisions & Architectural Principles

### 1. In-Tree Absolute Overlays for Critical Interactive Sheets
* Replaced React Native's `<Modal>` in `AuthSheet` with an in-tree overlay (`position: 'absolute'`, `StyleSheet.absoluteFillObject`, `elevation: 1000`, `zIndex: 1000`).
* Anchored the overlay inside a `<View style={{ flex: 1 }}>` wrapper in the root tab navigator (`apps/mobile/app/(tabs)/_layout.tsx`).
* Added `accessibilityViewIsModal={true}` and `aria-modal="true"` to the root overlay view to ensure screen readers (VoiceOver and TalkBack) trap focus within the sheet rather than navigating behind it into background tab content.
* Incorporated smooth entrance and exit animations (`translateY` slide on `sheetContainer` and `opacity` fade on `backdrop`) to preserve the native sheet feel without abrupt mount/unmount visual snaps.
* Applied dynamic bottom safe area padding using `useSafeAreaInsets().bottom` (`Math.max(28, insets.bottom + 12)`) to accommodate Android 15 edge-to-edge 3-button/gesture bars and iOS home indicators.
* **Result**: All inputs reside directly within `MainActivity`'s primary view hierarchy, allowing Android's `AutofillManager` and third-party password managers to inspect and autofill credentials without window isolation barriers.

### 2. Dual-Platform Autofill Hint Strategy
All authentication and credential inputs must supply matching attributes for both iOS and Android:

| Field | Mode | Android (`autoComplete`) | iOS (`textContentType`) | `importantForAutofill` |
|---|---|---|---|---|
| Username / Email | Sign In | `"username"` | `"username"` | `"yes"` |
| Email Address | Sign Up / Reset | `"email"` | `"emailAddress"` | `"yes"` |
| Current Password | Sign In | `"password"` | `"password"` | `"yes"` |
| New Password | Sign Up | `"password-new"` | `"newPassword"` | `"yes"` |
| Display Name | Sign Up | `"name"` | `"name"` | `"yes"` |

* Note: React Native's Android engine maps `"password-new"` to `View.AUTOFILL_HINT_NEW_PASSWORD`. Using unmapped strings like `"new-password"` triggers a fallback that breaks Android autofill hint assignment.

### 3. Automated Keyboard Dismissal & Smooth Animated Padding
* Whenever an auth or profile sheet becomes visible (`visible === true`) or is dismissed/closed (`handleCloseAuthSheet`), immediately invoke `Keyboard.dismiss()` to prevent background inputs from keeping the soft keyboard open or unmounting focused inputs with lingering keyboards.
* Avoid `<KeyboardAvoidingView>` inside complex overlay hierarchies where nested absolute modals, transforms, and insets can cause jumpy layout recalculations.
* Instead, subscribe directly to `Keyboard.addListener` using platform-appropriate events (`keyboardWillShow` / `keyboardWillHide` on iOS, and `keyboardDidShow` / `keyboardDidHide` on Android) to drive an `Animated.Value` applied to `paddingBottom` with easing. This ensures that in-tree absolute overlays (`position: 'absolute'`, `bottom: 0`) lift cleanly above the soft keyboard on both platforms.

### 4. Android Hardware Back Button Subscription
* When an in-tree overlay is visible, register a `BackHandler` listener (`hardwareBackPress`).
* If the user presses the back button while the sheet is visible, dismiss the sheet (unless an async submission is currently in flight).
* Clean up the subscription on unmount or when `visible` transitions to `false`.

---

## Consequences

### Positive
* **Password Manager Support**: Bitwarden, 1Password, and Google Password Manager seamlessly display inline suggestions in Gboard and respond correctly to manual autofill.
* **No OS Error Toasts**: Eliminates the Android system *"Contents can't be autofilled"* failure.
* **Deterministic Layout**: Eliminates modal clipping and soft keyboard overlap issues.
* **Native Platform Parity**: Android hardware back button and back navigation gestures behave identically to native modals.

### Negative & Trade-offs
* **Root Anchor Requirement**: In-tree overlays must be mounted at a high-level container with `{ flex: 1 }` so they span the entire display without clipping behind tab bars or sibling views.
* **Manual Lifecycle Wiring**: Overlay visibility, keyboard dismissal, and back handlers must be managed explicitly in component state rather than relying on native OS modal controllers.
