import { expect } from 'vitest';

interface CustomMatchers<R = unknown> {
  toBeInTheDocument(): R;
  toBeDisabled(): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
  toBeInTheDocument(received: Element | null | undefined) {
    const pass =
      received != null &&
      Boolean(received.ownerDocument?.body.contains(received));
    return {
      pass,
      message: () =>
        pass
          ? 'expected element not to be in document'
          : 'expected element to be in document',
    };
  },
  toBeDisabled(received: Element | null | undefined) {
    const pass =
      received != null &&
      (Boolean((received as any).disabled) || received.hasAttribute('disabled'));
    return {
      pass,
      message: () =>
        pass
          ? 'expected element not to be disabled'
          : 'expected element to be disabled',
    };
  },
});

