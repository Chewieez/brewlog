/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthModal } from './AuthModal';
import { useAuth } from './AuthContext';

vi.mock('./AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('AuthModal', () => {
  const mockSignUp = vi.fn();
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      signInWithEmail: vi.fn(),
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
      isConfigured: true,
      isPasswordRecovery: false,
      authUrlError: null,
      clearAuthUrlError: vi.fn(),
      setIsPasswordRecovery: vi.fn(),
    });
  });

  it('renders GO TO SIGN IN and CLOSE buttons with font-mono uppercase tracking-wider after successful signup', async () => {
    mockSignUp.mockResolvedValue({ error: null });

    render(<AuthModal isOpen={true} onClose={mockClose} />);

    // Switch to Sign Up mode using the tab button
    const tabButtons = screen.getAllByRole('button', { name: 'CREATE ACCOUNT' });
    fireEvent.click(tabButtons[0]);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });

    // Submit form
    const submitBtn = screen.getAllByRole('button', { name: 'CREATE ACCOUNT' })[1];
    fireEvent.click(submitBtn);

    // Wait for email confirmation screen
    await waitFor(() => {
      expect(screen.getByText('Check Your Inbox')).toBeDefined();
    });

    const goToSignInBtn = screen.getByRole('button', { name: /GO TO SIGN IN/i });
    expect(goToSignInBtn).toBeDefined();
    expect(screen.getByText('GO TO SIGN IN')).toBeDefined();

    const closeBtn = screen.getByRole('button', { name: 'CLOSE' });
    expect(closeBtn).toBeDefined();
    expect(closeBtn.className).toContain('font-mono');
    expect(closeBtn.className).toContain('uppercase');
    expect(closeBtn.className).toContain('tracking-wider');

    fireEvent.click(closeBtn);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
