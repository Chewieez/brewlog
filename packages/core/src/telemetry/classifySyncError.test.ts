import { describe, it, expect } from 'vitest';
import { classifySyncError } from './classifySyncError';

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
