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
      return OFFLINE_MESSAGE_PATTERNS.some((pattern) => pattern.test(candidate.message));
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
