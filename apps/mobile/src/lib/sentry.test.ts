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
    captureSyncError('beans', 'insert', error, 'bean-42');

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'sync.error',
        level: 'error',
      })
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: { domain: 'beans', operation: 'insert' },
        extra: { recordId: 'bean-42' },
      })
    );
  });

  it('records breadcrumb only on offline network dropout', () => {
    const offlineErr = new Error('Network request failed');
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
