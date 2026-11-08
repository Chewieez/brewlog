import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { initSentry, setTelemetryUser, captureSyncError, wrapReactRouterRouting } from './sentry';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
}));

vi.mock('@sentry/react/react-router', () => ({
  reactRouterBrowserTracingIntegration: vi.fn(() => ({ name: 'ReactRouterTracing' })),
  wrapReactRouterRouting: vi.fn((routes: any) => routes),
}));

describe('web sentry integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not initialize Sentry when VITE_SENTRY_DSN is omitted', () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('initializes Sentry when VITE_SENTRY_DSN is provided with error-only session replay', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@sentry.io/123');
    initSentry();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://key@sentry.io/123',
        replaysSessionSampleRate: 0.0,
        replaysOnErrorSampleRate: 1.0,
        integrations: expect.arrayContaining([
          expect.objectContaining({ name: 'Replay' }),
        ]),
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

  it('exports wrapReactRouterRouting for instrumenting web navigation transitions', () => {
    const mockRoutes = () => null;
    const wrapped = wrapReactRouterRouting(mockRoutes);
    expect(wrapped).toBe(mockRoutes);
  });
});
