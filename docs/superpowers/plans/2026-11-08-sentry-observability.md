# Sentry Observability Across Web & Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate production crash reporting, unhandled exception tracking, React error boundaries, performance navigation spans, and offline sync failure monitoring with zero PII leakage using Sentry across `apps/web` and `apps/mobile`.

**Architecture:** A shared pure-TypeScript telemetry module in `@brewlog/core` defines PII scrubbing rules (sensitive key redaction and email regex masking) and Supabase sync error classification (separating expected offline disconnects from database/RLS rejections). `apps/web` uses `@sentry/react`, React Router v8 browser tracing, a themed in-place recovery UI (`SentryFeedbackFallback`), and `@sentry/vite-plugin` for hidden sourcemap generation. `apps/mobile` uses `@sentry/react-native`, Expo Router navigation container tracing, the `@sentry/react-native/expo` plugin, and EAS Build hooks for native symbol uploads. Both platforms attach anonymized `user.id` on authentication and record structured sync breadcrumbs and exceptions across all five domain context engines.

**Tech Stack:** `@sentry/react`, `@sentry/vite-plugin`, `@sentry/react-native`, `@sentry/react-native/expo`, `react-router` v8, Expo SDK 58, React 19.3, Vite 6, Vitest, TypeScript 5.7/6.0.

**Spec:** [`docs/superpowers/specs/2026-11-08-sentry-observability-design.md`](../specs/2026-11-08-sentry-observability-design.md)

## Global Constraints

- Never transmit email addresses, passwords, auth tokens, refresh tokens, or personal identifiers in Sentry events, breadcrumbs, tags, or contexts.
- Apps must boot cleanly without console errors or warnings when Sentry DSN environment variables (`VITE_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DSN`) are omitted or empty.
- Offline-first network disconnects must emit low-noise breadcrumbs (`category: 'sync.offline'`) and must not flood Sentry with false-positive exception alerts.
- Database/schema/RLS rejections from Supabase must record breadcrumbs and trigger `Sentry.captureException` tagged with domain and operation metadata.
- Production source maps on Web must be generated with `sourcemap: 'hidden'` and deleted after upload to prevent leaking source maps to clients.
- Respect user rule: Do not run broad test suites for intermediate edits; only run scoped unit tests for touched packages during task TDD cycles.

---

### Task 1: Shared Telemetry & Privacy Utilities in `@brewlog/core`

**Files:**
- Create: `packages/core/src/telemetry/scrubPii.ts`
- Create: `packages/core/src/telemetry/classifySyncError.ts`
- Create: `packages/core/src/telemetry/index.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/telemetry/scrubPii.test.ts`
- Test: `packages/core/test/telemetry/classifySyncError.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export function scrubPii<T>(data: T): T;
  export interface SyncTelemetryPayload {
    domain: 'beans' | 'recipes' | 'equipment' | 'reviews' | 'settings';
    operation: 'insert' | 'update' | 'delete' | 'fetch';
    isOffline: boolean;
    recordId?: string;
    error: unknown;
  }
  export function classifySyncError(params: {
    domain: SyncTelemetryPayload['domain'];
    operation: SyncTelemetryPayload['operation'];
    error: unknown;
    recordId?: string;
  }): SyncTelemetryPayload;
  ```

- [ ] **Step 1: Write failing unit tests for `scrubPii` and `classifySyncError`**

Create `packages/core/test/telemetry/scrubPii.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { scrubPii } from '../../src/telemetry/scrubPii';

describe('scrubPii', () => {
  it('redacts sensitive keys in objects', () => {
    const input = {
      user: 'barista',
      password: 'superSecretPassword123',
      token: 'jwt.token.value',
      authorization: 'Bearer secret_token',
      accessToken: 'access123',
      refreshToken: 'refresh123',
      apiKey: 'api_key_secret',
      nested: {
        secretKey: 'top_secret',
      },
    };

    const result = scrubPii(input);
    expect(result.password).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.authorization).toBe('[REDACTED]');
    expect(result.accessToken).toBe('[REDACTED]');
    expect(result.refreshToken).toBe('[REDACTED]');
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.nested.secretKey).toBe('[REDACTED]');
    expect(result.user).toBe('barista');
  });

  it('masks email addresses in strings and messages', () => {
    const input = {
      message: 'Failed to process request for user@example.com with refId 42',
      details: 'Contact admin at support.team@brewlog.coffee now',
    };

    const result = scrubPii(input);
    expect(result.message).toBe('Failed to process request for [REDACTED_EMAIL] with refId 42');
    expect(result.details).toBe('Contact admin at [REDACTED_EMAIL] now');
  });

  it('handles null, undefined, and non-object inputs safely', () => {
    expect(scrubPii(null)).toBeNull();
    expect(scrubPii(undefined)).toBeUndefined();
    expect(scrubPii('plain string')).toBe('plain string');
    expect(scrubPii(12345)).toBe(12345);
  });
});
```

Create `packages/core/test/telemetry/classifySyncError.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { classifySyncError } from '../../src/telemetry/classifySyncError';

describe('classifySyncError', () => {
  it('classifies network and fetch dropouts as offline', () => {
    const errors = [
      new Error('Failed to fetch'),
      new Error('Network request failed'),
      new Error('The Internet connection appears to be offline.'),
      { name: 'AbortError', message: 'The user aborted a request.' },
      new TypeError('Load failed'),
    ];

    for (const error of errors) {
      const result = classifySyncError({
        domain: 'beans',
        operation: 'update',
        error,
        recordId: 'bean-123',
      });
      expect(result.isOffline).toBe(true);
      expect(result.domain).toBe('beans');
      expect(result.operation).toBe('update');
      expect(result.recordId).toBe('bean-123');
    }
  });

  it('classifies database, RLS, and Postgres constraints as real errors (not offline)', () => {
    const rlsError = { code: '42501', message: 'new row violates row-level security policy' };
    const constraintError = { code: '23505', message: 'duplicate key value violates unique constraint' };
    const genericServerErr = new Error('500 Internal Server Error');

    expect(classifySyncError({ domain: 'recipes', operation: 'insert', error: rlsError }).isOffline).toBe(false);
    expect(classifySyncError({ domain: 'equipment', operation: 'delete', error: constraintError }).isOffline).toBe(false);
    expect(classifySyncError({ domain: 'settings', operation: 'update', error: genericServerErr }).isOffline).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run command:
```bash
npm run test --workspace=@brewlog/core test/telemetry
```
Expected: FAIL due to missing `scrubPii.ts` and `classifySyncError.ts`.

- [ ] **Step 3: Implement `scrubPii.ts`, `classifySyncError.ts`, and `index.ts`**

Create `packages/core/src/telemetry/scrubPii.ts`:
```typescript
const SENSITIVE_KEY_REGEX = /password|token|secret|authorization|accessToken|refreshToken|apiKey/i;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

export function scrubPii<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data.replace(EMAIL_REGEX, '[REDACTED_EMAIL]') as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => scrubPii(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = scrubPii(value);
      }
    }
    return sanitized as T;
  }

  return data;
}
```

Create `packages/core/src/telemetry/classifySyncError.ts`:
```typescript
export interface SyncTelemetryPayload {
  domain: 'beans' | 'recipes' | 'equipment' | 'reviews' | 'settings';
  operation: 'insert' | 'update' | 'delete' | 'fetch';
  isOffline: boolean;
  recordId?: string;
  error: unknown;
}

const OFFLINE_MESSAGE_PATTERNS = [
  /failed to fetch/i,
  /network request failed/i,
  /network error/i,
  /internet connection appears to be offline/i,
  /load failed/i,
  /timeout/i,
  /abort/i,
];

export function isOfflineError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'string') {
    return OFFLINE_MESSAGE_PATTERNS.some((pattern) => pattern.test(error));
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') return true;
    return OFFLINE_MESSAGE_PATTERNS.some((pattern) => pattern.test(error.message));
  }
  if (typeof error === 'object') {
    const candidate = error as { message?: string; name?: string };
    if (candidate.name === 'AbortError') return true;
    if (typeof candidate.message === 'string') {
      return OFFLINE_MESSAGE_PATTERNS.some((pattern) => pattern.test(candidate.message!));
    }
  }
  return false;
}

export function classifySyncError(params: {
  domain: SyncTelemetryPayload['domain'];
  operation: SyncTelemetryPayload['operation'];
  error: unknown;
  recordId?: string;
}): SyncTelemetryPayload {
  const offline = isOfflineError(params.error);
  return {
    domain: params.domain,
    operation: params.operation,
    isOffline: offline,
    recordId: params.recordId,
    error: params.error,
  };
}
```

Create `packages/core/src/telemetry/index.ts`:
```typescript
export * from './scrubPii';
export * from './classifySyncError';
```

Export from `packages/core/src/index.ts`:
```typescript
export * from './telemetry';
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npm run test --workspace=@brewlog/core test/telemetry
```
Expected: PASS with 100% assertions green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/telemetry packages/core/src/index.ts packages/core/test/telemetry
git commit -m "feat(core): add shared PII scrubbing and sync error classification telemetry utilities"
```

---

### Task 2: Web Sentry Client & Error Boundary Recovery UI (`apps/web`)

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/lib/sentry.ts`
- Create: `apps/web/src/components/SentryFeedbackFallback.tsx`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/App.tsx`
- Test: `apps/web/src/lib/sentry.test.ts`
- Test: `apps/web/src/components/SentryFeedbackFallback.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export function initSentry(): void;
  export function setTelemetryUser(userId: string | null): void;
  export function captureSyncError(
    domain: SyncTelemetryPayload['domain'],
    operation: SyncTelemetryPayload['operation'],
    error: unknown,
    recordId?: string
  ): void;
  ```

- [ ] **Step 1: Install `@sentry/react` in `apps/web`**

In `apps/web/package.json`:
Add `"@sentry/react": "^9.0.0"` (or version matching workspace React 19 compatibility) to `dependencies`.
Run:
```bash
npm install --workspace=@brewlog/web
```

- [ ] **Step 2: Write unit tests for `sentry.ts` and `SentryFeedbackFallback`**

Create `apps/web/src/lib/sentry.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { initSentry, setTelemetryUser, captureSyncError } from './sentry';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
}));

describe('web sentry integration', () => {
  const originalEnv = import.meta.env;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (import.meta as any).env = originalEnv;
  });

  it('does not initialize Sentry when VITE_SENTRY_DSN is omitted', () => {
    (import.meta as any).env = { ...originalEnv, VITE_SENTRY_DSN: '' };
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('initializes Sentry when VITE_SENTRY_DSN is provided', () => {
    (import.meta as any).env = { ...originalEnv, VITE_SENTRY_DSN: 'https://key@sentry.io/123' };
    initSentry();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@sentry.io/123',
        sendDefaultPii: false,
      })
    );
  });

  it('sets user ID only and clears on null', () => {
    setTelemetryUser('user-uuid-123');
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-uuid-123' });

    setTelemetryUser(null);
    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });

  it('records breadcrumb and captures exception for database sync errors', () => {
    const error = new Error('RLS check failed');
    captureSyncError('beans', 'update', error, 'bean-1');

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'sync.error',
        level: 'error',
      })
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: { domain: 'beans', operation: 'update' },
        extra: { recordId: 'bean-1' },
      })
    );
  });

  it('records breadcrumb only (no captureException) for offline network dropouts', () => {
    const offlineErr = new Error('Failed to fetch');
    captureSyncError('recipes', 'fetch', offlineErr);

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'sync.offline',
        level: 'info',
      })
    );
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
```

Create `apps/web/src/components/SentryFeedbackFallback.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SentryFeedbackFallback } from './SentryFeedbackFallback';

describe('SentryFeedbackFallback', () => {
  it('renders recovery screen with error info and triggers reset & reload', () => {
    const resetErrorMock = vi.fn();
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadMock },
    });

    render(
      <SentryFeedbackFallback
        error={new Error('Test render crash')}
        resetError={resetErrorMock}
        eventId="event-abc-123"
      />
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/event-abc-123/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    expect(resetErrorMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Reload App/i }));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:
```bash
npm run test --workspace=@brewlog/web src/lib/sentry.test.ts src/components/SentryFeedbackFallback.test.tsx
```
Expected: FAIL due to missing implementation files.

- [ ] **Step 4: Implement `apps/web/src/lib/sentry.ts` and `SentryFeedbackFallback.tsx`**

Create `apps/web/src/lib/sentry.ts`:
```typescript
import * as Sentry from '@sentry/react';
import { reactRouterBrowserTracingIntegration } from '@sentry/react/react-router';
import { scrubPii, classifySyncError, SyncTelemetryPayload } from '@brewlog/core';

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    return;
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

Create `apps/web/src/components/SentryFeedbackFallback.tsx`:
```tsx
import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

export interface SentryFeedbackFallbackProps {
  error?: Error | null;
  resetError?: () => void;
  eventId?: string | null;
}

export const SentryFeedbackFallback: React.FC<SentryFeedbackFallbackProps> = ({
  error,
  resetError,
  eventId,
}) => {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="bg-panel border border-border text-foreground rounded-xl p-6 sm:p-8 max-w-md w-full shadow-lg">
        <div className="flex items-center gap-3 text-red-500 mb-4">
          <AlertTriangle className="w-8 h-8 flex-shrink-0" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">Something went wrong</h2>
        </div>
        <p className="text-sm text-foreground/70 mb-4">
          BrewLog encountered an unexpected issue while rendering this view. Your local data remains safe in offline storage.
        </p>

        {eventId && (
          <div className="mb-6 p-2.5 bg-canvas rounded border border-border text-xs font-mono text-foreground/60 select-all">
            Event ID: {eventId}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {resetError && (
            <button
              type="button"
              onClick={resetError}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-panel border border-border hover:bg-canvas text-foreground transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Wire into `apps/web/src/main.tsx` and `apps/web/src/App.tsx`**

In `apps/web/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initSentry } from './lib/sentry';
import { App } from './App';
import './index.css';

initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

In `apps/web/src/App.tsx`:
Wrap `<BrowserRouter>` with `<Sentry.ErrorBoundary fallback={SentryFeedbackFallback}>`:
```tsx
import * as Sentry from '@sentry/react';
import { SentryFeedbackFallback } from './components/SentryFeedbackFallback';
// ...
export const App: React.FC = () => {
  return (
    <AppProviders>
      <Sentry.ErrorBoundary fallback={SentryFeedbackFallback}>
        <BrowserRouter>
          <Routes>
            <Route element={<RootLayout />}>
              <Route index element={<Navigate to="/timer" replace />} />
              <Route path="timer" element={<TimerRoute />} />
              <Route path="stash" element={<StashRoute />} />
              <Route path="recipes" element={<RecipesRoute />}>
                <Route index element={<RecipeIndexRoute />} />
                <Route path=":recipeId" element={<RecipeDetailRoute />} />
              </Route>
              <Route path="equipment" element={<EquipmentRoute />} />
              <Route path="reviews" element={<ReviewsRoute />} />
              <Route path="settings" element={<SettingsRoute />} />
              <Route path="cupping" element={<Navigate to="/reviews" replace />} />
              <Route path="*" element={<NotFoundRoute />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </Sentry.ErrorBoundary>
    </AppProviders>
  );
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run:
```bash
npm run test --workspace=@brewlog/web src/lib/sentry.test.ts src/components/SentryFeedbackFallback.test.tsx
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/src/lib/sentry.ts apps/web/src/components/SentryFeedbackFallback.tsx apps/web/src/main.tsx apps/web/src/App.tsx apps/web/src/lib/sentry.test.ts apps/web/src/components/SentryFeedbackFallback.test.tsx
git commit -m "feat(web): initialize Sentry with React Router tracing and ErrorBoundary fallback"
```

---

### Task 3: Web Vite Source Map Upload Plugin (`apps/web`)

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/vite.config.ts`

**Interfaces:**
- Produces: Hidden production sourcemaps with `@sentry/vite-plugin` configured on demand when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are provided.

- [ ] **Step 1: Install `@sentry/vite-plugin` in `apps/web`**

In `apps/web/package.json`:
Add `"@sentry/vite-plugin": "^3.1.2"` to `devDependencies`.
Run:
```bash
npm install --workspace=@brewlog/web
```

- [ ] **Step 2: Update `apps/web/vite.config.ts`**

Edit `apps/web/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

const isSentryConfigured = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
);

export default defineConfig({
  build: {
    sourcemap: isSentryConfigured ? "hidden" : false,
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
          filesToDeleteAfterUpload: ["./dist/**/*.map"],
        },
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@brewlog/core": path.resolve(__dirname, "../../packages/core/src"),
      "@brewlog/supabase": path.resolve(__dirname, "../../packages/supabase/src"),
      "@brewlog/ui": path.resolve(__dirname, "../../packages/ui/src/index.web.ts"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    open: false,
  },
});
```

- [ ] **Step 3: Verify build succeeds with Sentry credentials omitted**

Run:
```bash
npm run build --workspace=@brewlog/web
```
Expected: Clean build without throwing any Sentry authentication errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/vite.config.ts
git commit -m "feat(web): configure sentryVitePlugin for production sourcemap upload"
```

---

### Task 4: Mobile Sentry Client, Expo Plugin & Navigation Tracing (`apps/mobile`)

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`
- Create: `apps/mobile/src/lib/sentry.ts`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/eas.json`
- Test: `apps/mobile/src/lib/sentry.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export function initSentry(): void;
  export function setTelemetryUser(userId: string | null): void;
  export function captureSyncError(
    domain: SyncTelemetryPayload['domain'],
    operation: SyncTelemetryPayload['operation'],
    error: unknown,
    recordId?: string
  ): void;
  export const navigationIntegration: any;
  ```

- [ ] **Step 1: Install `@sentry/react-native` in `apps/mobile`**

In `apps/mobile/package.json`:
Add `"@sentry/react-native": "~6.7.0"` (compatible with Expo SDK 58 and React Native 0.88).
Run:
```bash
npm install --workspace=@brewlog/mobile
```

- [ ] **Step 2: Add Expo Config Plugin in `apps/mobile/app.json`**

In `apps/mobile/app.json`, append `"@sentry/react-native/expo"` to the `expo.plugins` array:
```json
[
  "@sentry/react-native/expo",
  {
    "organization": "brewlog",
    "project": "brewlog-mobile"
  }
]
```

- [ ] **Step 3: Write unit tests for mobile `sentry.ts`**

Create `apps/mobile/src/lib/sentry.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/react-native';
import { initSentry, setTelemetryUser, captureSyncError } from './sentry';

vi.mock('@sentry/react-native', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  reactNavigationIntegration: vi.fn(() => ({
    registerNavigationContainer: vi.fn(),
  })),
  wrap: vi.fn((component) => component),
}));

describe('mobile sentry integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it('does not initialize when EXPO_PUBLIC_SENTRY_DSN is omitted', () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('initializes Sentry when EXPO_PUBLIC_SENTRY_DSN is set', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://key@sentry.io/mobile';
    initSentry();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@sentry.io/mobile',
        sendDefaultPii: false,
      })
    );
  });

  it('sets user ID and clears scope on null', () => {
    setTelemetryUser('mobile-user-123');
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'mobile-user-123' });

    setTelemetryUser(null);
    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });

  it('records breadcrumb and captures exception on database sync failure', () => {
    const error = new Error('Supabase constraint violation');
    captureSyncError('stash', 'insert', error, 'bean-42');

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'sync.error',
        level: 'error',
      })
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: { domain: 'stash', operation: 'insert' },
        extra: { recordId: 'bean-42' },
      })
    );
  });
});
```

- [ ] **Step 4: Implement `apps/mobile/src/lib/sentry.ts`**

Create `apps/mobile/src/lib/sentry.ts`:
```typescript
import * as Sentry from '@sentry/react-native';
import { scrubPii, classifySyncError, SyncTelemetryPayload } from '@brewlog/core';

export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return;
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

- [ ] **Step 5: Wrap RootLayout in `apps/mobile/app/_layout.tsx`**

In `apps/mobile/app/_layout.tsx`:
```tsx
import * as Sentry from '@sentry/react-native';
import { useNavigationContainerRef } from 'expo-router';
import { initSentry, navigationIntegration } from '../src/lib/sentry';

initSentry();

function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (navigationRef) {
      navigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  // Existing fonts, providers, and navigator...
}

export default Sentry.wrap(RootLayout);
```

- [ ] **Step 6: Update `apps/mobile/eas.json` with Sentry profile guidance**

In `apps/mobile/eas.json`:
Add environment variables for `SENTRY_ORG` and `SENTRY_PROJECT` in `preview` and `production` profiles.

- [ ] **Step 7: Run tests to verify they pass**

Run:
```bash
npm run test --workspace=@brewlog/mobile src/lib/sentry.test.ts
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json apps/mobile/app.json apps/mobile/src/lib/sentry.ts apps/mobile/app/_layout.tsx apps/mobile/eas.json apps/mobile/src/lib/sentry.test.ts
git commit -m "feat(mobile): integrate @sentry/react-native with Expo Router tracing and config plugin"
```

---

### Task 5: Auth Context User Scope & Sign-Out Telemetry (Web & Mobile)

**Files:**
- Modify: `apps/web/src/features/auth/AuthContext.tsx`
- Modify: `apps/mobile/src/features/auth/AuthContext.tsx`

**Interfaces:**
- Consumes: `setTelemetryUser(userId: string | null)` from `apps/web/src/lib/sentry` and `apps/mobile/src/lib/sentry`.

- [ ] **Step 1: Wire `setTelemetryUser` in `apps/web/src/features/auth/AuthContext.tsx`**

In `apps/web/src/features/auth/AuthContext.tsx`:
- Import `setTelemetryUser` from `../../lib/sentry`.
- In `supabase.auth.getSession()` callback:
  ```typescript
  const userId = session?.user?.id ?? null;
  setTelemetryUser(userId);
  ```
- In `onAuthStateChange((event, session) => ...)`:
  ```typescript
  const userId = session?.user?.id ?? null;
  setTelemetryUser(userId);
  ```
- In `signOut()`:
  ```typescript
  setTelemetryUser(null);
  ```

- [ ] **Step 2: Wire `setTelemetryUser` in `apps/mobile/src/features/auth/AuthContext.tsx`**

In `apps/mobile/src/features/auth/AuthContext.tsx`:
- Import `setTelemetryUser` from `../../lib/sentry`.
- In `supabase.auth.getSession()` callback:
  ```typescript
  const userId = session?.user?.id ?? null;
  setTelemetryUser(userId);
  ```
- In `onAuthStateChange((_event, session) => ...)`:
  ```typescript
  const userId = session?.user?.id ?? null;
  setTelemetryUser(userId);
  ```
- In `signOut()`:
  ```typescript
  setTelemetryUser(null);
  ```

- [ ] **Step 3: Run existing Auth tests**

Run:
```bash
npm run test --workspace=@brewlog/web src/features/auth
npm run test --workspace=@brewlog/mobile src/features/auth
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/auth/AuthContext.tsx apps/mobile/src/features/auth/AuthContext.tsx
git commit -m "feat(auth): attach anonymized user id and clear telemetry scope on sign-out across web and mobile"
```

---

### Task 6: Web Offline Sync Engine Telemetry Instrumentation

**Files:**
- Modify: `apps/web/src/features/stash/BeansContext.tsx`
- Modify: `apps/web/src/features/recipes/RecipeContext.tsx`
- Modify: `apps/web/src/features/equipment/EquipmentContext.tsx`
- Modify: `apps/web/src/features/reviews/ReviewsContext.tsx`
- Modify: `apps/web/src/features/settings/SettingsContext.tsx`

**Interfaces:**
- Consumes: `captureSyncError` from `../../lib/sentry`

- [ ] **Step 1: Instrument `BeansContext.tsx`**

In `apps/web/src/features/stash/BeansContext.tsx`:
- Import `captureSyncError` from `../../lib/sentry`.
- On auto-sync offline insert error: `captureSyncError('beans', 'insert', insertErr, item.id)`.
- On `fetchBeans` select error: `captureSyncError('beans', 'fetch', error)`.
- On `addBean` insert error: `captureSyncError('beans', 'insert', error)`.
- On `updateBean` update error: `captureSyncError('beans', 'update', error, updatedBean.id)`.
- On `deleteBean` delete error: `captureSyncError('beans', 'delete', error, id)`.

- [ ] **Step 2: Instrument `RecipeContext.tsx`**

In `apps/web/src/features/recipes/RecipeContext.tsx`:
- Import `captureSyncError` from `../../lib/sentry`.
- On auto-sync offline insert error: `captureSyncError('recipes', 'insert', recErr, item.id)`.
- On `fetchRecipes` select error: `captureSyncError('recipes', 'fetch', error)`.
- On `addRecipe` insert error: `captureSyncError('recipes', 'insert', recError)`.
- On `updateRecipe` update error: `captureSyncError('recipes', 'update', updateErr, id)`.
- On `deleteRecipe` delete error: `captureSyncError('recipes', 'delete', error, id)`.

- [ ] **Step 3: Instrument `EquipmentContext.tsx`**

In `apps/web/src/features/equipment/EquipmentContext.tsx`:
- Import `captureSyncError` from `../../lib/sentry`.
- On auto-sync offline insert error: `captureSyncError('equipment', 'insert', insertErr, item.id)`.
- On `fetchEquipment` select error: `captureSyncError('equipment', 'fetch', error)`.
- On `addEquipment` insert error: `captureSyncError('equipment', 'insert', error)`.
- On `updateEquipment` update error: `captureSyncError('equipment', 'update', error, id)`.
- On `deleteEquipment` delete error: `captureSyncError('equipment', 'delete', error, id)`.

- [ ] **Step 4: Instrument `ReviewsContext.tsx`**

In `apps/web/src/features/reviews/ReviewsContext.tsx`:
- Import `captureSyncError` from `../../lib/sentry`.
- On `fetchReviews` select error: `captureSyncError('reviews', 'fetch', error)`.
- On `addReview` insert error: `captureSyncError('reviews', 'insert', error)`.
- On `updateReview` update error: `captureSyncError('reviews', 'update', error, id)`.
- On `deleteReview` delete error: `captureSyncError('reviews', 'delete', error, id)`.

- [ ] **Step 5: Instrument `SettingsContext.tsx`**

In `apps/web/src/features/settings/SettingsContext.tsx`:
- Import `captureSyncError` from `../../lib/sentry`.
- On `initSettings` select error: `captureSyncError('settings', 'fetch', error)`.
- On `initSettings` upsert error: `captureSyncError('settings', 'insert', upsertError)`.
- On `updateSettings` upsert error: `captureSyncError('settings', 'update', error)`.
- On `resetToDefaults` upsert error: `captureSyncError('settings', 'update', error)`.

- [ ] **Step 6: Run Web Context Tests**

Run:
```bash
npm run test --workspace=@brewlog/web src/features/
```
Expected: All context tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/stash/BeansContext.tsx apps/web/src/features/recipes/RecipeContext.tsx apps/web/src/features/equipment/EquipmentContext.tsx apps/web/src/features/reviews/ReviewsContext.tsx apps/web/src/features/settings/SettingsContext.tsx
git commit -m "feat(web): instrument Supabase sync operations with Sentry breadcrumbs and exception tracking"
```

---

### Task 7: Mobile Offline Sync Engine Telemetry Instrumentation

**Files:**
- Modify: `apps/mobile/src/features/stash/StashContext.tsx`
- Modify: `apps/mobile/src/features/recipes/RecipeContext.tsx`
- Modify: `apps/mobile/src/features/equipment/EquipmentContext.tsx`
- Modify: `apps/mobile/src/features/reviews/ReviewsContext.tsx`
- Modify: `apps/mobile/src/features/settings/SettingsContext.tsx`

**Interfaces:**
- Consumes: `captureSyncError` from `../../lib/sentry`

- [ ] **Step 1: Instrument `StashContext.tsx`**

In `apps/mobile/src/features/stash/StashContext.tsx`:
- Import `captureSyncError` from `../../lib/sentry`.
- On pending deletes error: `captureSyncError('beans', 'delete', delErr, id)`.
- On auto-sync unsynced error: `captureSyncError('beans', 'insert', beanErr, item.id)`.
- On pending updates error: `captureSyncError('beans', 'update', updErr, id)`.
- On `fetchBeans` select error: `captureSyncError('beans', 'fetch', error)`.
- On `addBean` error: `captureSyncError('beans', 'insert', beanError, fallback.id)`.
- On `updateBean` error: `captureSyncError('beans', 'update', error, id)`.
- On `deleteBean` error: `captureSyncError('beans', 'delete', error, id)`.

- [ ] **Step 2: Instrument `RecipeContext.tsx`**

In `apps/mobile/src/features/recipes/RecipeContext.tsx`:
- Import `captureSyncError` from `../../lib/sentry`.
- On auto-sync unsynced error: `captureSyncError('recipes', 'insert', recErr, item.id)`.
- On `fetchRecipes` select error: `captureSyncError('recipes', 'fetch', error)`.
- On `addRecipe` error: `captureSyncError('recipes', 'insert', recError)`.
- On `updateRecipe` error: `captureSyncError('recipes', 'update', err, id)`.
- On `deleteRecipe` error: `captureSyncError('recipes', 'delete', err, id)`.

- [ ] **Step 3: Instrument `EquipmentContext.tsx`**

In `apps/mobile/src/features/equipment/EquipmentContext.tsx`:
- Import `captureSyncError` from `../../lib/sentry`.
- On pending deletes error: `captureSyncError('equipment', 'delete', delErr, id)`.
- On auto-sync unsynced error: `captureSyncError('equipment', 'insert', eqErr, item.id)`.
- On pending updates error: `captureSyncError('equipment', 'update', updErr, id)`.
- On `fetchEquipment` select error: `captureSyncError('equipment', 'fetch', error)`.
- On `addEquipment` error: `captureSyncError('equipment', 'insert', eqError, fallback.id)`.
- On `updateEquipment` error: `captureSyncError('equipment', 'update', error, id)`.
- On `deleteEquipment` error: `captureSyncError('equipment', 'delete', error, id)`.

- [ ] **Step 4: Instrument `ReviewsContext.tsx`**

In `apps/mobile/src/features/reviews/ReviewsContext.tsx`:
- Import `captureSyncError` from `../../lib/sentry`.
- On pending deletes error: `captureSyncError('reviews', 'delete', delErr, id)`.
- On auto-sync unsynced error: `captureSyncError('reviews', 'insert', revErr, item.id)`.
- On pending updates error: `captureSyncError('reviews', 'update', updErr, id)`.
- On `fetchReviews` select error: `captureSyncError('reviews', 'fetch', error)`.
- On `addReview` error: `captureSyncError('reviews', 'insert', revError, fallback.id)`.
- On `updateReview` error: `captureSyncError('reviews', 'update', error, id)`.
- On `deleteReview` error: `captureSyncError('reviews', 'delete', error, id)`.

- [ ] **Step 5: Instrument `SettingsContext.tsx`**

In `apps/mobile/src/features/settings/SettingsContext.tsx`:
- Import `captureSyncError` from `../../lib/sentry`.
- On `initSettings` select error: `captureSyncError('settings', 'fetch', error)`.
- On `initSettings` upsert error: `captureSyncError('settings', 'insert', upsertError)`.
- On `updateSettings` upsert error: `captureSyncError('settings', 'update', error)`.
- On `resetToDefaults` upsert error: `captureSyncError('settings', 'update', error)`.

- [ ] **Step 6: Run Mobile Context Tests**

Run:
```bash
npm run test --workspace=@brewlog/mobile
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/features/stash/StashContext.tsx apps/mobile/src/features/recipes/RecipeContext.tsx apps/mobile/src/features/equipment/EquipmentContext.tsx apps/mobile/src/features/reviews/ReviewsContext.tsx apps/mobile/src/features/settings/SettingsContext.tsx
git commit -m "feat(mobile): instrument Supabase sync operations with Sentry breadcrumbs and exception tracking"
```

---

### Task 8: End-to-End Verification & Quality Gates

**Files:**
- Test all deliverables against acceptance criteria.

- [ ] **Step 1: Run typechecks across all workspaces**

Run:
```bash
npm run typecheck
```
Expected: Zero TypeScript errors across `@brewlog/core`, `@brewlog/supabase`, `@brewlog/ui`, `@brewlog/web`, and `@brewlog/mobile`.

- [ ] **Step 2: Run test suite across all workspaces**

Run:
```bash
npm run test
```
Expected: All unit tests pass cleanly.

- [ ] **Step 3: Run Playwright E2E tests for Web**

Run:
```bash
npm run test:e2e --workspace=@brewlog/web
```
Expected: All E2E flows execute cleanly without errors or regressions.

- [ ] **Step 4: Final commit and verify git status**

```bash
git status
```
Ensure working tree is clean.
