import { vi } from 'vitest';

vi.mock('@sentry/react-native', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  reactNavigationIntegration: vi.fn(() => ({
    registerNavigationContainer: vi.fn(),
  })),
  wrap: vi.fn((component: unknown) => component),
}));
