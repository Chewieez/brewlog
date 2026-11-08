import * as Sentry from '@sentry/react-native';
import { scrubPii, classifySyncError, SyncTelemetryPayload } from '@brewlog/core';

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: typeof __DEV__ !== 'undefined' && !__DEV__ ? 0.2 : 1.0,
    integrations: [
      Sentry.expoRouterIntegration(),
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
