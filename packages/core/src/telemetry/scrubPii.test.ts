import { describe, it, expect } from 'vitest';
import { scrubPii } from './scrubPii';

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

  it('safely handles circular references without throwing Maximum call stack size exceeded', () => {
    const cyclic: Record<string, unknown> = {
      name: 'Cyclic Object',
      email: 'leak@example.com',
    };
    cyclic.self = cyclic;
    cyclic.nested = { parent: cyclic };

    const result = scrubPii(cyclic) as Record<string, unknown>;
    expect(result.name).toBe('Cyclic Object');
    expect(result.self).toBe('[CIRCULAR]');
    expect((result.nested as Record<string, unknown>).parent).toBe('[CIRCULAR]');
  });

  it('preserves Date and RegExp instances without converting to empty objects', () => {
    const now = new Date('2026-11-08T12:00:00Z');
    const pattern = /^[a-z]+$/i;
    const input = {
      timestamp: now,
      regex: pattern,
      note: 'safe data',
    };

    const result = scrubPii(input);
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.timestamp.toISOString()).toBe('2026-11-08T12:00:00.000Z');
    expect(result.regex).toBeInstanceOf(RegExp);
    expect(result.regex.source).toBe('^[a-z]+$');
  });

  it('preserves and scrubs Error instances', () => {
    const err = new Error('Database error for user barista@brewlog.dev');
    (err as unknown as Record<string, unknown>).token = 'secret_token_123';

    const result = scrubPii(err);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Database error for user [REDACTED_EMAIL]');
    expect((result as unknown as Record<string, unknown>).token).toBe('[REDACTED]');
  });
});
