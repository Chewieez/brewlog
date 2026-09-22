/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import RootLayout from '../app/_layout';

vi.mock('react-native-get-random-values', () => ({}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => <div data-testid="mock-safe-area-provider">{children}</div>,
}));

vi.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

vi.mock('expo-router', () => ({
  Stack: Object.assign(
    ({ children }: any) => <div data-testid="mock-stack">{children}</div>,
    {
      Screen: ({ name, options }: any) => (
        <div data-testid={`mock-screen-${name}`} data-options={JSON.stringify(options)} />
      ),
    }
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: vi.fn(),
  hideAsync: vi.fn(),
}));

vi.mock('@expo-google-fonts/outfit', () => ({
  useFonts: () => [true, null],
  Outfit_300Light: 'Outfit_300Light',
  Outfit_400Regular: 'Outfit_400Regular',
  Outfit_500Medium: 'Outfit_500Medium',
  Outfit_600SemiBold: 'Outfit_600SemiBold',
  Outfit_700Bold: 'Outfit_700Bold',
}));

vi.mock('@expo-google-fonts/jetbrains-mono', () => ({
  JetBrainsMono_400Regular: 'JetBrainsMono_400Regular',
  JetBrainsMono_500Medium: 'JetBrainsMono_500Medium',
  JetBrainsMono_700Bold: 'JetBrainsMono_700Bold',
}));

vi.mock('../src/features/auth/AuthContext', () => ({
  AuthProvider: ({ children }: any) => <div data-testid="mock-auth-provider">{children}</div>,
  useAuth: () => ({ user: null }),
}));

vi.mock('../src/features/recipes/RecipeContext', () => ({
  RecipeProvider: ({ children }: any) => <div data-testid="mock-recipe-provider">{children}</div>,
  useRecipes: () => ({ recipes: [] }),
}));

describe('RootLayout', () => {
  it('renders AuthProvider and RecipeProvider wrapping Stack with recipe routes', () => {
    const { getByTestId } = render(<RootLayout />);

    expect(getByTestId('mock-auth-provider')).toBeDefined();
    expect(getByTestId('mock-recipe-provider')).toBeDefined();
    expect(getByTestId('mock-screen-(tabs)')).toBeDefined();
    expect(getByTestId('mock-screen-recipe/[id]')).toBeDefined();
    expect(getByTestId('mock-screen-recipe/builder')).toBeDefined();
  });
});
