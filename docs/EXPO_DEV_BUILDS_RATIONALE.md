# Technical Brief: Why We Migrated from Expo Go to Expo Development Builds

**Document Purpose:** Decision rationale, architectural background, and talking points for new mobile project kickoffs.  
**Author:** Mobile Engineering  
**Date:** October 2026  

---

## 1. Executive Summary: The Core Distinction

A common question when planning a new React Native project is whether to use "Expo" or "Bare React Native." Often, this confusion stems from equating **Expo Go** with the **Expo framework itself**.

* **Expo Go** is a pre-compiled sandbox client downloaded directly from the App Store or Google Play. It is intended for initial onboarding, quick tutorials, and small isolated UI experiments. It contains a static, pre-packaged set of native modules that cannot be modified.
* **Modern Expo (Continuous Native Generation + `expo-dev-client`)** is Expo's official architecture for commercial, production applications. It allows us to compile a **custom development build** containing our exact native code, third-party libraries, and compiler settings, while retaining 100% of Expo's developer speed (instant Fast Refresh, Expo Router, EAS Build, and EAS Update).

### The Elevator Pitch for Meetings
> "We are not abandoning Expo; we are using Expo in its intended production configuration. Expo Go is an educational sandbox; Expo Development Builds provide the full power of native iOS and Android without losing any of Expo's tooling or developer experience."

---

## 2. Real-World Case Studies: Architectural Walls We Hit in BrewLog

In our BrewLog mobile application, staying in Expo Go would have prevented us from delivering production-grade UX and authentication. Below are real technical hurdles we encountered and resolved by using custom Development Builds:

### Case 1: Android Soft Keyboard Overlapping Form Inputs (`react-native-keyboard-controller`)
* **The Problem:** In deep editing views (Recipe Builder, Stash Bean Modal, Equipment Modal, Cupping Reviews), tapping numeric inputs or multi-line notes caused the Android soft keyboard to overlap active fields and primary CTA buttons. React Native's built-in `<KeyboardAvoidingView>` was erratic: inputs did not lift reliably, layouts jumped, and Android 15 edge-to-edge insets broke positioning.
* **The Solution:** We replaced `KeyboardAvoidingView` with `react-native-keyboard-controller` (`<KeyboardProvider>` in the root layout and `<KeyboardAwareScrollView>` in modal screens), synchronizing view offsets with Android's native `WindowInsetsAnimation` API.
* **Why Expo Go Blocked This:** `react-native-keyboard-controller` relies on custom C++ and Kotlin native code. It cannot run in Expo Go and throws an immediate native runtime exception.

### Case 2: Android `<Modal>` Window Isolation Breaking Password Managers (ADR 006)
* **The Problem:** During physical testing on Android devices (Pixel devices on Android 15/16), opening our authentication sheet inside React Native's standard `<Modal>` broke password manager autofill (Bitwarden, 1Password, Google Password Manager). Selecting "Autofill" produced an Android system error toast: *"Contents can't be autofilled"*, and inline Gboard credential pills never appeared.
* **The Root Cause:** React Native's `<Modal>` instantiates a secondary native `android.app.Dialog` with its own `Window` token, isolating the inputs from `MainActivity` where the system `AutofillManagerService` is bound.
* **The Solution:** We re-engineered authentication into an in-tree absolute overlay with direct hardware `BackHandler` subscriptions, manual `Keyboard.dismiss()` cycles, and native accessibility attributes (`accessibilityViewIsModal`).
* **Why Development Builds Were Necessary:** Diagnosing and verifying low-level OS window tokens, autofill provider responses, and hardware back gestures requires testing directly against a compiled native binary on physical hardware.

### Case 3: Android Keystore 2048-Byte Storage Ceiling on Auth Tokens
* **The Problem:** Supabase authentication JWT payloads containing extended user claims and session metadata can exceed the Android Keystore's 2048-byte single-entry limit when using `expo-secure-store`.
* **The Solution:** We implemented `LargeSecureStore`, a hybrid storage engine that stores a 256-bit AES encryption key in `expo-secure-store` and persists the encrypted ciphertext in `@react-native-async-storage/async-storage` using `aes-js`.
* **Why Development Builds Were Necessary:** Testing hardware-backed Keystore limits and fine-tuning Supabase storage options (`detectSessionInUrl: false`) requires authentic native execution rather than a sandboxed client.

### Case 4: Native Build Flags and Module Precompilation (`expo-build-properties`)
* **The Problem:** Modern packages (such as `react-native-reanimated` 4.x and `react-native-worklets`) occasionally encounter CocoaPods precompiled module header compilation errors on iOS.
* **The Solution:** We used `expo-build-properties` in `app.json` to configure `ios.usePrecompiledModules: false`, forcing clean source compilation in the generated Podfile.
* **Why Expo Go Blocked This:** Expo Go has an immutable, pre-compiled native core. It completely ignores `expo-build-properties`, native compiler flags, and ProGuard/R8 configurations.

---

## 3. Comparative Summary: Expo Go vs. Expo Development Builds

| Area / Feature | Expo Go | Expo Development Builds (`expo-dev-client`) |
| :--- | :--- | :--- |
| **Third-Party Native Modules** | **Blocked.** Only libraries bundled in the Expo SDK are supported. Any package with custom native code crashes. | **Unrestricted.** Any native iOS or Android dependency across the React Native ecosystem can be installed. |
| **Custom Native Code (Swift / Kotlin)** | **Blocked.** No ability to write local native code or custom native views. | **Supported.** Custom modules can be authored directly using the modern Expo Modules API. |
| **Keyboard & Layout Handling** | Limited to React Native's built-in `<KeyboardAvoidingView>` (unreliable on Android). | Supports native solutions like `react-native-keyboard-controller`. |
| **Build Configuration** | None. Cannot customize Podfile, Gradle scripts, ProGuard rules, or deployment targets. | Fully configurable via `expo-build-properties` and custom config plugins. |
| **OS Extensions & Targets** | None. No iOS Widgets, App Clips, Apple Watch companions, or Android AppWidgets. | Supported via config plugins and Continuous Native Generation (CNG). |
| **Deep Links & Universal Links** | Sandboxed to `exp://` URLs. Cannot test production `apple-app-site-association` or Android App Links. | Validates real bundle IDs, custom schemes, and verified domain association files. |
| **Push Notifications & Credentials** | Sandboxed through Expo's shared APNs/FCM proxy. | Tests direct production APNs / FCM certificates and background notification handlers. |
| **SDK Lifecycle & Upgrades** | Coupled to the Expo Go app version on public app stores. Deprecations force unplanned upgrades. | Decoupled. The team locks its `runtimeVersion` and upgrades dependencies on its own schedule. |
| **Developer Velocity** | Fast Refresh for JavaScript/TypeScript code. | **Identical Fast Refresh** for JavaScript/TypeScript code. Native rebuilds only occur when native dependencies change. |

---

## 4. Key Meeting Talking Points & Objections

### Objection: "Isn't setting up Development Builds slower than just downloading Expo Go?"
* **Response:** "Expo Go is only faster for the first 15 minutes of a project. The moment you need custom native code (such as keyboard management, Bluetooth, or specific analytics), you hit a hard wall. Transitioning from Expo Go to Development Builds mid-project causes unexpected friction. Starting with Development Builds ensures you never hit an architectural dead end."

### Objection: "Does this mean we lose instant hot reloading and have to compile native code all day?"
* **Response:** "No. 95% of daily engineering remains pure TypeScript and UI work with instant Fast Refresh. You only recompile the native development client when you add a new native dependency or change native configuration flags. Day-to-day coding feels identical to Expo Go."

### Objection: "Do all engineers need Xcode and Android Studio installed locally?"
* **Response:** "Not necessarily. Teams using EAS Build can compile the development client in the cloud and distribute the installable `.ipa` or `.apk` to simulators or physical devices. Once installed, engineers can run `npx expo start` and develop without maintaining local native SDKs."
