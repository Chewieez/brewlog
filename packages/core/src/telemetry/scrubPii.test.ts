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
});
