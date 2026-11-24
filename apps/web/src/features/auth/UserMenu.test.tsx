/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { User } from '@supabase/supabase-js';
import { UserMenu } from './UserMenu';
import { useAuth } from './AuthContext';

vi.mock('./AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

function buildAuthValue(overrides: Partial<ReturnType<typeof useAuth>> = {}): ReturnType<typeof useAuth> {
  return {
    user: null,
    session: null,
    loading: false,
    isConfigured: true,
    isPasswordRecovery: false,
    authUrlError: null,
    clearAuthUrlError: vi.fn(),
    setIsPasswordRecovery: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updatePassword: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const mockUser = {
  id: 'user-1',
  email: 'brewer@example.com',
  user_metadata: {
    display_name: 'Clara Brewer',
  },
} as unknown as User;

describe('UserMenu', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders unauthenticated Settings icon link and SIGN IN trigger button', () => {
    const onOpenAuthModal = vi.fn();
    mockUseAuth.mockReturnValue(buildAuthValue({ user: null }));

    render(
      <MemoryRouter>
        <UserMenu onOpenAuthModal={onOpenAuthModal} />
      </MemoryRouter>
    );

    const settingsLink = screen.getByRole('link', { name: 'Settings' });
    expect(settingsLink.getAttribute('href')).toBe('/settings');

    const signInButton = screen.getByRole('button', { name: /SIGN IN/i });
    fireEvent.click(signInButton);
    expect(onOpenAuthModal).toHaveBeenCalledTimes(1);
  });

  it('renders signed-in dropdown identity and Settings / Sign Out items with font-sans typography', () => {
    mockUseAuth.mockReturnValue(buildAuthValue({ user: mockUser }));

    render(
      <MemoryRouter>
        <UserMenu onOpenAuthModal={vi.fn()} />
      </MemoryRouter>
    );

    const trigger = screen.getByRole('button', { name: 'User account menu' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const emailEl = screen.getByText('brewer@example.com');
    const dropdownPanel = emailEl.closest('.rounded-xl')!;
    expect(dropdownPanel.className).toContain('font-sans');
    expect(dropdownPanel.className).not.toContain('font-mono');

    const settingsLink = screen.getByRole('link', { name: 'Settings' });
    expect(settingsLink.textContent).toBe('Settings');
    expect(settingsLink.getAttribute('href')).toBe('/settings');
    expect(settingsLink.className).toContain('font-sans');
    expect(settingsLink.className).toContain('text-xs');
    expect(settingsLink.className).toContain('lg:text-sm');
    expect(settingsLink.className).toContain('font-medium');
    expect(settingsLink.className).toContain('h-8');
    expect(settingsLink.className).toContain('rounded-lg');
    expect(settingsLink.className).not.toContain('font-mono');
    expect(settingsLink.className).not.toContain('uppercase');

    const signOutBtn = screen.getByRole('button', { name: 'Sign Out' });
    expect(signOutBtn.textContent).toBe('Sign Out');
    expect(signOutBtn.getAttribute('type')).toBe('button');
    expect(signOutBtn.className).toContain('font-sans');
    expect(signOutBtn.className).toContain('text-xs');
    expect(signOutBtn.className).toContain('lg:text-sm');
    expect(signOutBtn.className).toContain('font-medium');
    expect(signOutBtn.className).toContain('h-8');
    expect(signOutBtn.className).toContain('rounded-lg');
    expect(signOutBtn.className).not.toContain('font-mono');
    expect(signOutBtn.className).not.toContain('uppercase');

    const logOutIcon = signOutBtn.querySelector('svg')!;
    const logOutIconClass = logOutIcon.getAttribute('class') ?? '';
    expect(logOutIconClass).toContain('group-hover:text-status-error');
    expect(logOutIconClass).not.toContain('text-red-400');
  });

  it('calls signOut and closes the dropdown when Sign Out is clicked', () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(buildAuthValue({ user: mockUser, signOut }));

    render(
      <MemoryRouter>
        <UserMenu onOpenAuthModal={vi.fn()} />
      </MemoryRouter>
    );

    const trigger = screen.getByRole('button', { name: 'User account menu' });
    fireEvent.click(trigger);

    const signOutBtn = screen.getByRole('button', { name: 'Sign Out' });
    fireEvent.click(signOutBtn);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Sign Out' })).toBeNull();
  });
});
