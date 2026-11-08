const SENSITIVE_KEY_REGEX = /password|token|secret|authorization|accessToken|refreshToken|apiKey/i;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const SENSITIVE_QUERY_PARAM_REGEX =
  /([?&](?:token|secret[_-]?key|secret|password|passwd|auth|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token)=)[^&#\s]+/gi;

export function scrubPii<T>(data: T, seen = new WeakSet<object>()): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data
      .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
      .replace(SENSITIVE_QUERY_PARAM_REGEX, '$1[REDACTED]') as unknown as T;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (data instanceof Date || data instanceof RegExp) {
    return data;
  }

  if (seen.has(data as object)) {
    return '[CIRCULAR]' as unknown as T;
  }
  seen.add(data as object);

  if (Array.isArray(data)) {
    return data.map((item) => scrubPii(item, seen)) as unknown as T;
  }

  if (data instanceof Error) {
    const sanitizedError = new (data.constructor as { new (msg?: string): Error })(
      data.message ? (scrubPii(data.message, seen) as string) : undefined
    );
    sanitizedError.name = data.name;
    sanitizedError.stack = data.stack ? (scrubPii(data.stack, seen) as string) : data.stack;
    for (const [key, value] of Object.entries(data as unknown as Record<string, unknown>)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        (sanitizedError as unknown as Record<string, unknown>)[key] = '[REDACTED]';
      } else {
        (sanitizedError as unknown as Record<string, unknown>)[key] = scrubPii(value, seen);
      }
    }
    return sanitizedError as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = scrubPii(value, seen);
    }
  }
  return sanitized as T;
}
