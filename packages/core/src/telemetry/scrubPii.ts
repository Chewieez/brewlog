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
