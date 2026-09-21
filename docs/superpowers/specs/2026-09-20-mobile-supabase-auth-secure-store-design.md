# Mobile Supabase Auth & Secure Storage Design Spec

**Date:** 2026-09-20  
**Status:** Approved  
**Topic:** Phase 3C — Supabase Auth & Secure Storage Subsystem (`apps/mobile`)  

---

## 1. Overview & Context

In Phase 3B, BrewLog Mobile completed its interactive brew timer subsystem with 1-to-1 faceplate visual continuity, drift-free wall-clock timing, haptics, and audio. The mobile app currently operates in an unauthenticated local state across its bottom-tab screens (`Timer`, `Recipes`, `Stash`, `Equipment`, `Cupping`).

This design specification details **Phase 3C: Supabase Auth & Secure Storage**. It establishes encrypted multiplatform credential persistence, reactive mobile session state management, and an Industrial Precision bottom sheet authentication experience. This serves as the prerequisite secure foundation for Phase 3D cloud-sync features (syncing beans, cupping logs, and custom recipes between Web and Mobile).

---

## 2. Key Requirements & User Decisions

1. **Architecture Path & Strategy (Approach A)**:
   - Implement `LargeSecureStore` adhering strictly to [ADR 003](file:///Users/greglawrence/Projects/brewlog/docs/adr/003-supabase-typescript-multiplatform-best-practices.md) using `expo-secure-store` (for a 256-bit AES key stored in the hardware Keychain / KeyStore) and `@react-native-async-storage/async-storage` (for encrypted session payloads), bypassing the 2048-byte Keychain limit without size risks or multi-key fragmentation.
   - Extend `createBrewlogClient` in `@brewlog/supabase` to support custom storage adapters and `detectSessionInUrl: false` on React Native.

2. **UI Presentation & Mobile Ergonomics**:
   - **Slide-Up Bottom Sheet Modal (`AuthSheet.tsx`)**: Replaces full-screen routing with a compact slide-up sheet featuring an industrial grabber pill, avoiding tab unmounting and preserving active brew timer sessions uninterrupted.
   - **Header Profile Action (`ProfileHeaderButton.tsx`)**: Placed across tab headers (44×44pt touch target). Shows a muted user silhouette when logged out, and a barista initials avatar with an emerald cloud connection dot when logged in.

3. **Authentication Scope & Parity with Web**:
   - Email & Password Sign In.
   - Email & Password Sign Up with Barista Tag (Display Name).
   - Password Reset request (sends reset email link).
   - Clean offline/demo banner if credentials are not configured in `.env`.
   - Authenticated User Profile & Session Overview (Email, Barista Tag, Connection status badge, User ID preview, and Sign Out action with confirmation).

4. **Design System & Typography**:
   - 100% adherence to `INDUSTRIAL_PRECISION_THEME.colors` (`colors.canvas`, `colors.panel`, `colors.panelRecessed`, `colors.accent`, `colors.textPrimary`, `colors.textMuted`, `colors.borderSubtle`, `colors.statusSuccess`, `colors.statusWarning`, `colors.statusError`). Zero hardcoded hex colors.
   - 100% adherence to centralized font tokens `FONTS` (`FONTS.monoRegular`, `FONTS.monoBold`, `FONTS.sansBold`) from `apps/mobile/src/theme/fonts.ts`. Zero raw font family strings.

---

## 3. Security Architecture & Best Practices

To satisfy enterprise mobile security requirements, Phase 3C incorporates the following safeguards:

1. **Hardware-Backed Keychain Protection**:
   - Pass `keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY` to all `expo-secure-store` operations.
   - Prevents tokens from leaking into unencrypted device backups (iCloud/iTunes).
   - Ensures keys cannot be read while the device is locked.
   - Configure `ios.config.usesNonExemptEncryption: false` in `app.json` for App Store export compliance.

2. **Cryptographic Rigor**:
   - Generate fresh 256-bit encryption keys per session write using `crypto.getRandomValues` (CSPRNG).
   - Avoid key/IV reuse across writes.
   - Atomic multi-store invalidation: When `signOut()` is called, keys in `SecureStore` and encrypted records in `AsyncStorage` are both evicted, even if one store throws.

3. **Least-Privilege Cloud Credentials**:
   - The mobile bundle strictly references `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The `service_role` key is never bundled in mobile configs.
   - Data security is enforced server-side via PostgreSQL Row Level Security (RLS) policies (`auth.uid() = user_id`) in `001_initial_schema.sql`.

4. **UI Privacy & OS Autocorrect Defense**:
   - Password inputs enforce `secureTextEntry={true}`, `textContentType="password"` (or `"newPassword"` on signup), `autoCapitalize="none"`, `autoCorrect={false}`, and `spellCheck={false}` to prevent OS keyboard suggestion caching.
   - Email inputs enforce `keyboardType="email-address"`, `textContentType="emailAddress"`, `autoCapitalize="none"`, and `autoCorrect={false}`.
   - Error mapping sanitizes internal database and network error traces before presenting user-facing notices. Zero JWT or password logging in development/production outputs.

---

## 4. Architecture & Component Decomposition

```
apps/mobile
├── src
│   ├── features
│   │   └── auth
│   │       ├── AuthContext.tsx              # Mobile auth state provider & useAuth hook
│   │       ├── AuthContext.test.tsx         # Vitest suite for AuthContext
│   │       ├── AuthSheet.tsx                # Precision bottom sheet modal component
│   │       ├── AuthSheet.test.tsx           # Vitest suite for AuthSheet
│   │       ├── ProfileHeaderButton.tsx      # 44pt header action with avatar & status dot
│   │       └── ProfileHeaderButton.test.tsx # Vitest suite for ProfileHeaderButton
│   └── lib
│       ├── secureStore.ts                   # LargeSecureStore class (AES-256 + SecureStore + AsyncStorage)
│       ├── secureStore.test.ts              # Vitest suite for LargeSecureStore
│       └── supabase.ts                      # Supabase client singleton configured with LargeSecureStore
├── app
│   ├── _layout.tsx                          # Root layout wrapping Stack with AuthProvider
│   └── (tabs)
│       └── _layout.tsx                      # TabLayout embedding ProfileHeaderButton in headerRight
packages/supabase
├── src
│   ├── index.ts                             # Extended createBrewlogClient with BrewlogClientOptions
│   └── index.test.ts                        # Vitest test verifying options and storage forwarding
```

### Component Interfaces

#### `LargeSecureStore` (`apps/mobile/src/lib/secureStore.ts`)
```typescript
export interface SecureStoreDriver {
  getItemAsync(key: string, options?: any): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: any): Promise<void>;
  deleteItemAsync(key: string, options?: any): Promise<void>;
}

export interface AsyncStorageDriver {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class LargeSecureStore {
  constructor(
    secureStore?: SecureStoreDriver,
    asyncStorage?: AsyncStorageDriver
  ) {}

  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

#### `MobileAuthContextType` (`apps/mobile/src/features/auth/AuthContext.tsx`)
```typescript
export interface MobileAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, pass: string, displayName?: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}
```

#### `AuthSheet` (`apps/mobile/src/features/auth/AuthSheet.tsx`)
```typescript
export interface AuthSheetProps {
  visible: boolean;
  onClose: () => void;
}
```

#### `ProfileHeaderButton` (`apps/mobile/src/features/auth/ProfileHeaderButton.tsx`)
```typescript
export interface ProfileHeaderButtonProps {
  onPress: () => void;
}
```

---

## 5. Mobile Lifecycle & AppState Optimization

When running on mobile, managing connection and refresh intervals during app backgrounding is critical for battery conservation:

1. **Foreground Hydration**: Reads encrypted token from `LargeSecureStore` via `supabase.auth.getSession()`.
2. **AppState Synchronization**:
   - `AppState === 'active'`: Calls `supabase.auth.startAutoRefresh()` to ensure immediate session validity.
   - `AppState === 'background' | 'inactive'`: Calls `supabase.auth.stopAutoRefresh()` to halt background timers and polling.
3. **Session Events**: Subscribes to `onAuthStateChange` to keep `user` and `session` reactive across the mobile UI without manual refetching.

---

## 6. Verification & Automated Testing Plan

### Automated Unit Tests (Vitest)
1. **`packages/supabase/src/index.test.ts`**:
   - Verify `createBrewlogClient` accepts `options.storage` and passes it to Supabase client.
   - Verify `detectSessionInUrl: false` is respected when provided.
2. **`apps/mobile/src/lib/secureStore.test.ts`**:
   - Full encryption/decryption round-trip with mocked drivers.
   - Verify 256-bit key storage in SecureStore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.
   - Verify `getItem` returns null when either store key is missing.
   - Verify `removeItem` deletes entries from both stores.
3. **`apps/mobile/src/features/auth/AuthContext.test.tsx`**:
   - Verify session hydration on mount.
   - Verify reactive updates on `SIGNED_IN` and `SIGNED_OUT`.
   - Verify `AppState` transitions trigger start/stop auto refresh.
   - Verify sanitized error output on invalid credentials.
4. **`apps/mobile/src/features/auth/AuthSheet.test.tsx`**:
   - Verify default logged-out Sign In mode rendering.
   - Verify mode switching between Sign In, Sign Up, and Forgot Password.
   - Verify form validation and submission handling.
   - Verify authenticated view (email, barista tag, and sign out button).
5. **`apps/mobile/src/features/auth/ProfileHeaderButton.test.tsx`**:
   - Verify logged-out icon vs logged-in avatar badge.
   - Verify `onPress` callback execution.

### Monorepo Validation Gate
- `npm run typecheck` across all 4 packages (`core`, `supabase`, `web`, `mobile`) passes with 0 errors.
- `npm run test` passes across all test suites.
- `npx expo-doctor` passes with 0 warnings/errors in `apps/mobile`.
- `npx expo export` bundling passes for iOS and Android.
