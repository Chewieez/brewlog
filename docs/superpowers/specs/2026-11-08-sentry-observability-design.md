# Issue #73: Integrate Sentry Error Tracking & Performance Monitoring Across Web and Mobile

**Date:** 2026-11-08  
**Issue:** #73 (`feat(observability): integrate Sentry error tracking and performance monitoring across web and mobile`)  
**Status:** Approved for Implementation Planning  

---

## 1. Problem Statement & Motivation

BrewLog operates as an offline-first specialty coffee companion across Web (`apps/web`) and Mobile (`apps/mobile`). Today, runtime errors, unhandled rejections, and offline database synchronization failures rely purely on `console.error` logs. 

In production, this creates critical visibility gaps:
1. **Silent Production Failures:** Client-side rendering crashes and unhandled promise rejections are invisible without user reports.
2. **Offline-First Sync Failures:** Supabase upserts or migrations failing due to database schema conflicts, Postgres constraints, or RLS permission issues are lost in user sessions.
3. **Performance & Latency Blindspots:** Route transitions (e.g. `/timer`, `/stash`, `/recipes`, `/equipment`, `/reviews`, `/settings`) and initial display timings lack observability spans.
4. **Minified Stack Traces:** Without automated source map and debug symbol uploads in Vite and EAS/Metro builds, production crash reports are unreadable.

---

## 2. Goals & Non-Goals

### Goals
- **Web Observability (`apps/web`):**
  - Install and initialize `@sentry/react` via `VITE_SENTRY_DSN` with graceful degradation (no-op, zero warnings) when DSN is omitted in local/offline development.
  - Wrap the route tree with `Sentry.ErrorBoundary` and an in-place recovery card styled with `@brewlog/ui` design tokens ("Try Again" and "Reload App" actions).
  - Configure React Router v8 browser tracing integration to record route transition spans.
  - Configure `@sentry/vite-plugin` in `vite.config.ts` to generate and upload hidden production source maps when Sentry build credentials are present.
- **Mobile Observability (`apps/mobile`):**
  - Install and initialize `@sentry/react-native` via `EXPO_PUBLIC_SENTRY_DSN` with graceful offline/dev fallback.
  - Add `@sentry/react-native/expo` config plugin to `apps/mobile/app.json`.
  - Wrap `RootLayout` with `Sentry.wrap(RootLayout)` in `app/_layout.tsx` and integrate Expo Router navigation tracking.
  - Configure EAS Build hooks in `eas.json` for automatic dSYM, ProGuard/R8, and Hermes bytecode source map uploads.
- **Shared Privacy & Sync Telemetry Core (`packages/core`):**
  - Centralize PII sanitization in `packages/core/src/telemetry/scrubPii.ts` to automatically redact sensitive keys (`password`, `token`, `secret`, `authorization`, `accessToken`, `refreshToken`, `apiKey`) and regex-redact email addresses (`[REDACTED_EMAIL]`).
  - Classify Supabase sync errors in `packages/core/src/telemetry/classifySyncError.ts` to differentiate expected offline disconnects (breadcrumbs only) from unexpected backend/RLS rejections (`captureException` + breadcrumbs).
- **Context & Auth Integration:**
  - Attach anonymized user scope (`user.id` only — strip email and name) in `AuthContext` on sign-in, and clear user scope on sign-out across Web and Mobile.
  - Instrument offline-first sync engines (`BeansContext`/`StashContext`, `RecipeContext`, `EquipmentContext`, `ReviewsContext`, `SettingsContext`) across Web and Mobile.

### Non-Goals
- Adding Session Replay video recordings or invasive DOM recording (keeping privacy-first and lightweight).
- Altering Supabase schema, table structures, or existing offline caching mechanisms in localStorage or AsyncStorage.

---

## 3. Architecture & Design Specifications

### 3.1 Shared Privacy & Sync Telemetry (`packages/core/src/telemetry/`)

To prevent logic duplication and ensure identical privacy standards across Vite and Metro, platform-agnostic utilities reside in `@brewlog/core`:

#### A. PII Scrubbing (`packages/core/src/telemetry/scrubPii.ts`)
- **Key-based Redaction:** Any object property matching `/password|token|secret|authorization|accessToken|refreshToken|apiKey/i` is replaced with `[REDACTED]`.
- **Email Regex Redaction:** Any string value matching `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g` is replaced with `[REDACTED_EMAIL]`.
- **URL Parameter Sanitization:** Sensitive query string parameters are stripped from URLs.

#### B. Sync Error Classification (`packages/core/src/telemetry/classifySyncError.ts`)
- Identifies network dropouts:
  - `Failed to fetch`, `Network request failed`, `NetworkError`, `AbortError`, `TypeError: Load failed`, timeout codes.
- Identifies backend rejections:
  - Postgres errors (e.g., `23505` uniqueness, `42501` RLS, `23503` foreign key, `22P02` invalid text representation, 500 HTTP status).
- Returns structured payload:
  ```typescript
  export interface SyncTelemetryPayload {
    domain: 'beans' | 'recipes' | 'equipment' | 'reviews' | 'settings';
    operation: 'insert' | 'update' | 'delete' | 'fetch';
    isOffline: boolean;
    recordId?: string;
    error: unknown;
  }
  ```

---

### 3.2 Web Application (`apps/web`)

#### A. Sentry Client Module (`apps/web/src/lib/sentry.ts`)
```typescript
import * as Sentry from '@sentry/react';
import { reactRouterBrowserTracingIntegration } from '@sentry/react/react-router';
import { scrubPii, classifySyncError, SyncTelemetryPayload } from '@brewlog/core';

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    return; // Graceful offline/local development: no-op, zero console warnings
  }

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    integrations: [
      reactRouterBrowserTracingIntegration(),
    ],
    beforeSend(event) {
      return scrubPii(event);
    },
    beforeBreadcrumb(breadcrumb) {
      return scrubPii(breadcrumb);
    },
  });
}

export function setTelemetryUser(userId: string | null): void {
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

export function captureSyncError(
  domain: SyncTelemetryPayload['domain'],
  operation: SyncTelemetryPayload['operation'],
  error: unknown,
  recordId?: string
): void {
  const telemetry = classifySyncError({ domain, operation, error, recordId });
  
  Sentry.addBreadcrumb({
    category: telemetry.isOffline ? 'sync.offline' : 'sync.error',
    message: `${operation.toUpperCase()} on ${domain} ${telemetry.isOffline ? 'deferred (offline)' : 'failed'}`,
    level: telemetry.isOffline ? 'info' : 'error',
    data: { domain, operation, recordId },
  });

  if (!telemetry.isOffline) {
    Sentry.captureException(error, {
      tags: { domain, operation },
      extra: { recordId },
    });
  }
}
```

#### B. Fallback Recovery Screen (`apps/web/src/components/SentryFeedbackFallback.tsx`)
- Rendered via `Sentry.ErrorBoundary` in `apps/web/src/App.tsx`.
- Designed with `@brewlog/ui` primitives:
  - Card container with `bg-panel border border-border text-foreground rounded-lg p-6 max-w-md mx-auto my-12 shadow-sm`.
  - Icon and headline: "Something went wrong".
  - Explanatory copy and optional Sentry `eventId` display for support diagnostics.
  - Actions:
    - **"Try Again"** button (`variant="secondary"`) executing `resetError()`.
    - **"Reload App"** button (`variant="primary"`) executing `window.location.reload()`.

#### C. Vite Source Map Configuration (`apps/web/vite.config.ts`)
- Configured using `@sentry/vite-plugin`:
```typescript
const isSentryConfigured = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
);

export default defineConfig({
  build: {
    sourcemap: isSentryConfigured ? 'hidden' : false,
  },
  plugins: [
    react(),
    tailwindcss(),
    isSentryConfigured &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          filesToDeleteAfterUpload: ['./dist/**/*.map'],
        },
      }),
  ].filter(Boolean),
  // ...
});
```

---

### 3.3 Mobile Application (`apps/mobile`)

#### A. Expo Config Plugin (`apps/mobile/app.json`)
```json
{
  "expo": {
    "plugins": [
      [
        "@sentry/react-native/expo",
        {
          "organization": "brewlog",
          "project": "brewlog-mobile"
        }
      ]
    ]
  }
}
```

#### B. Sentry Client Module (`apps/mobile/src/lib/sentry.ts`)
```typescript
import * as Sentry from '@sentry/react-native';
import { scrubPii, classifySyncError, SyncTelemetryPayload } from '@brewlog/core';

export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return; // Graceful offline/local development: no-op, zero console warnings
  }

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 1.0,
    integrations: [
      navigationIntegration,
    ],
    beforeSend(event) {
      return scrubPii(event);
    },
    beforeBreadcrumb(breadcrumb) {
      return scrubPii(breadcrumb);
    },
  });
}

export function setTelemetryUser(userId: string | null): void {
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

export function captureSyncError(
  domain: SyncTelemetryPayload['domain'],
  operation: SyncTelemetryPayload['operation'],
  error: unknown,
  recordId?: string
): void {
  const telemetry = classifySyncError({ domain, operation, error, recordId });

  Sentry.addBreadcrumb({
    category: telemetry.isOffline ? 'sync.offline' : 'sync.error',
    message: `${operation.toUpperCase()} on ${domain} ${telemetry.isOffline ? 'deferred (offline)' : 'failed'}`,
    level: telemetry.isOffline ? 'info' : 'error',
    data: { domain, operation, recordId },
  });

  if (!telemetry.isOffline) {
    Sentry.captureException(error, {
      tags: { domain, operation },
      extra: { recordId },
    });
  }
}
```

#### C. Root Layout Integration (`apps/mobile/app/_layout.tsx`)
```tsx
import { initSentry, navigationIntegration } from '../src/lib/sentry';
import * as Sentry from '@sentry/react-native';
import { useNavigationContainerRef } from 'expo-router';

initSentry();

function RootLayout() {
  const ref = useNavigationContainerRef();

  useEffect(() => {
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  // Providers & App Navigator...
}

export default Sentry.wrap(RootLayout);
```

#### D. EAS Build Profiles (`apps/mobile/eas.json`)
- Environment mapping for `SENTRY_ORG` and `SENTRY_PROJECT` in preview and production profiles.
- Native symbol and Hermes bytecode upload is driven by `@sentry/react-native/expo` when `SENTRY_AUTH_TOKEN` is present in EAS secrets.

---

### 3.4 Context & Auth Integration (Web & Mobile)

#### A. Auth Contexts
- In both `apps/web/src/features/auth/AuthContext.tsx` and `apps/mobile/src/features/auth/AuthContext.tsx`:
  - When session is hydrated or `onAuthStateChange` emits a user:
    `setTelemetryUser(session.user.id)` (no emails, names, or metadata).
  - On `signOut()`:
    `setTelemetryUser(null)` (clears scope).

#### B. Domain Contexts
In all 5 Contexts on Web and Mobile:
1. `BeansContext` / `StashContext`
2. `RecipeContext`
3. `EquipmentContext`
4. `ReviewsContext`
5. `SettingsContext`

Replace unmonitored `console.error` catches on Supabase queries with:
```typescript
captureSyncError('beans', 'update', err, bean.id);
```
- Offline network disconnects emit a breadcrumb.
- Real Postgres/RLS/schema failures report an exception with domain tags.

---

## 4. Privacy & Zero-PII Verification

1. **User Scope:** Only `user.id` (UUID string) is sent. `user.email`, `user.phone`, and `user_metadata` are never attached.
2. **Breadcrumbs & Errors:** Any occurrence of email regex or sensitive tokens in error messages or parameters is stripped before transmission.
3. **Automated Tests:** Unit tests in `@brewlog/core` assert that mock events with sensitive keys and emails are sanitized.

---

## 5. Acceptance Criteria Checklist

- [ ] Web and Mobile apps boot cleanly without errors or warnings when Sentry DSN environment variables are omitted.
- [ ] Unhandled React rendering errors trigger `Sentry.ErrorBoundary` and display the themed in-place recovery UI.
- [ ] React Router v8 (Web) and Expo Router (Mobile) record navigation transition spans.
- [ ] Supabase sync errors differentiate offline network drops (breadcrumbs) from backend rejections (`captureException`).
- [ ] Zero PII (emails, tokens, passwords) is transmitted in Sentry payloads or breadcrumbs.
- [ ] Vite build generates hidden source maps with `@sentry/vite-plugin` when build credentials exist.
- [ ] EAS build configuration and Expo plugin in `app.json` are properly configured for native symbol uploads.
