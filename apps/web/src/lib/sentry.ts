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
