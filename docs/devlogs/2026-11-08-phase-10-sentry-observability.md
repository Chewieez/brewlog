# Devlog: Sentry Observability, Crash Reporting & Performance Monitoring

- **Date**: 2026-11-08
- **Milestone**: Phase 10: Cross-Platform Sentry Observability & Telemetry Subsystem
- **Status**: Completed & Verified
- **Branch**: `Chewieez/73-feat-observability-integrate-sentry-erro`
- **Issue**: [#73](https://github.com/Chewieez/brewlog/issues/73)
- **Pull Request**: [#76](https://github.com/Chewieez/brewlog/pull/76)
- **Tech Stack**: React 19, React Native 0.88 (Expo SDK 58), Expo Router, Vite, TypeScript 6, `@sentry/react` v11, `@sentry/react-native` v6, `@sentry/vite-plugin`, `@brewlog/core`, `@brewlog/ui`, Vitest, Playwright E2E

---

## Executive Summary

Prior to this milestone, BrewLog lacked centralized telemetry, exception tracking, and performance visibility:
1. **Silent Production Errors**: Unhandled React component errors resulted in broken views or blank screens without structured error reporting or actionable crash context.
2. **Untracked Offline-First Sync Failures**: When offline operations failed during cloud synchronization with Supabase, exceptions were logged only to ephemeral local `console.error` streams.
3. **Missing Navigation and Route Spans**: Web route transitions and mobile screen navigations were uninstrumented, making it impossible to detect slow renders or route transaction regressions.
4. **PII and Sensitive Credential Risk**: Default SDK configurations risk inadvertently transmitting sensitive parameters (email addresses, bearer tokens, API keys, password fields) within telemetry payloads.

Phase 10 implements an end-to-end, privacy-hardened observability architecture across both web and mobile. It provides shared telemetry utilities in `@brewlog/core`, robust error boundaries and recovery UI in `apps/web`, native navigation instrumentation and EAS integration in `apps/mobile`, strict recursive PII stripping, error-only Session Replay with text/media masking, and comprehensive telemetry instrumentation across all five domain context sync engines (`stash`, `recipes`, `equipment`, `reviews`, `settings`).

---

## Architecture & Cross-Package Deliverables

### 1. Pure Telemetry Utilities & Privacy Guards (`@brewlog/core`)

- **`scrubPii<T>(data: T, seen = new WeakSet<object>()): T`**:
  - Recursively inspects objects, arrays, errors, and string values.
  - Redacts sensitive keys matching `/password|token|secret|authorization|accessToken|refreshToken|apiKey/i` with `[REDACTED]`.
  - Regex-masks email addresses in strings and error messages (`[REDACTED_EMAIL]`).
  - Redacts sensitive URL query parameters (`?token=...`, `&apiKey=...`, `?access_token=...`) with `$1[REDACTED]`.
  - Protects against circular reference loops via `WeakSet<object>`, replacing cyclical references with `[CIRCULAR]`.
  - Preserves non-plain objects (`Date`, `RegExp`, `Error`) without converting them to empty plain objects.
- **`classifySyncError({ domain, operation, error, recordId })`**:
  - Distinguishes expected offline network dropouts (`TypeError: Failed to fetch`, `Network request failed`, timeout errors) from critical database / RLS permission violations.
  - Returns `{ isOffline, errorType, tags, breadcrumbMessage }` to route offline dropouts as informational breadcrumbs (`sync.offline`) while escalating true database failures to `Sentry.captureException` (`sync.error`).

### 2. Web Observability & Recovery UI (`apps/web`)

- **Sentry Client Initialization (`apps/web/src/lib/sentry.ts`)**:
  - Gracefully no-ops when `VITE_SENTRY_DSN` is omitted, ensuring local development and tests run without network errors.
  - Traces sample rate: `1.0` (100%) in development and `0.2` (20%) in production.
  - Configures React Router browser tracing integration (`reactRouterBrowserTracingIntegration`) with wrapped routes (`wrapReactRouterRouting(Routes)`).
  - Configures error-only Session Replay (`replaysSessionSampleRate: 0.0`, `replaysOnErrorSampleRate: 1.0`, `maskAllText: true`, `blockAllMedia: true`).
  - Hooks `scrubPii` into `beforeSend` and `beforeBreadcrumb`.
- **Themed Error Boundary & Recovery UI (`SentryFeedbackFallback.tsx`)**:
  - Wraps the entire route tree in `App.tsx` via `Sentry.ErrorBoundary`.
  - Conforms to `@brewlog/ui` design tokens and strict accessibility standards:
    - Zero emoji.
    - Hairline bordered surface separation without prohibited single-sided accent bars.
    - 40px action buttons conforming to the standardized control sizing tokens.
    - "Try again" recovery button and Sentry User Feedback dialog trigger (`Sentry.showReportDialog`).
- **Production Source Maps (`apps/web/vite.config.ts`)**:
  - Integrates `@sentry/vite-plugin` with `sourcemap: 'hidden'` so production bundles do not expose source maps to the public web while uploading symbols to Sentry.

### 3. Mobile Observability & Navigation Tracing (`apps/mobile`)

- **Sentry Native Client Initialization (`apps/mobile/src/lib/sentry.ts`)**:
  - Gracefully no-ops when `EXPO_PUBLIC_SENTRY_DSN` is omitted.
  - Dynamically switches sample rate: `typeof __DEV__ !== 'undefined' && !__DEV__ ? 0.2 : 1.0`.
  - Integrates `Sentry.expoRouterIntegration()` for automatic screen transition and route tracking without navigation container ref boilerplate.
  - Wraps `RootLayout` in `app/_layout.tsx` via `Sentry.wrap()`.
  - Enforces `sendDefaultPii: false`.
- **Expo Config Plugin & EAS Build Setup**:
  - Added `@sentry/react-native/expo` plugin in `apps/mobile/app.json`.
  - Configured EAS CLI coordinates in `apps/mobile/eas.json` for automated dSYM and ProGuard symbol uploads during native builds.

### 4. Auth User Scope & Offline Sync Telemetry

- **User Context Scope**:
  - Automatically binds authenticated user ID (`Sentry.setUser({ id: user.id })`) on login in `AuthContext` (Web & Mobile).
  - Explicitly clears user scope (`Sentry.setUser(null)`) on sign-out to prevent cross-session telemetry contamination.
- **Domain Sync Engine Instrumentation**:
  - Fully instrumented all five domain contexts across Web and Mobile:
    - `StashContext` / `BeansContext` (cellar inventory, roast resting updates, dose deduction)
    - `RecipeContext` (custom recipes and multi-stage steps)
    - `EquipmentContext` (grinders, brewers, scales, calibration scales)
    - `ReviewsContext` (SCA sensory scoring, flavor wheel snapshots)
    - `SettingsContext` (user preferences and theme selection)

---

## Verification Evidence

- **Typecheck**: `npm run typecheck` passed 100% clean across all 5 monorepo workspaces (`@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/mobile`, `@brewlog/web`).
- **Unit Tests**:
  - `@brewlog/core`: 6 test suites, 89 passed
  - `@brewlog/supabase`: 4 test suites, 29 passed
  - `@brewlog/ui`: 12 test suites, 63 passed
  - `@brewlog/mobile`: 56 test suites, 400+ passed
  - `@brewlog/web`: 28 test suites, 273 passed
- **Playwright E2E**: 12/12 web integration tests passed.
- **Browser Live Verification**:
  - Sentry client initialized on `o4512397884391424.ingest.us.sentry.io`.
  - Page transaction and error event envelopes confirmed received with `HTTP 200 OK`.
  - Error-only Session Replay verified capturing rolling buffer upon exception dispatch.
