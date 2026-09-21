/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { User, Session } from "@supabase/supabase-js";

const mockRemoveAppState = vi.fn();
let appStateCallback: ((state: string) => void) | null = null;

// Mock react-native AppState
vi.mock("react-native", () => ({
  AppState: {
    addEventListener: vi.fn((_event: string, callback: (state: string) => void) => {
      appStateCallback = callback;
      return { remove: mockRemoveAppState };
    }),
  },
}));

const mockUnsubscribe = vi.fn();
let authStateCallback: ((event: string, session: Session | null) => void) | null = null;

const mockUser: User = {
  id: "usr-123",
  email: "barista@brewlog.dev",
  user_metadata: { display_name: "Greg" },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2026-09-20T00:00:00.000Z",
};

const mockSession: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: mockUser,
};

const mockStartAutoRefresh = vi.fn();
const mockStopAutoRefresh = vi.fn();
const mockGetSession = vi.fn(async () => ({ data: { session: mockSession }, error: null }));
const mockOnAuthStateChange = vi.fn((callback) => {
  authStateCallback = callback;
  return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
});
const mockSignInWithPassword = vi.fn(async ({ email, password }: { email: string; password: string }) => {
  if (password === "wrong") {
    return { data: { user: null, session: null }, error: new Error("Invalid login credentials") };
  }
  return { data: { user: mockUser, session: mockSession }, error: null };
});
const mockSignUp = vi.fn(async ({ email, password, options }: any) => {
  if (email === "existing@brewlog.dev") {
    return { data: { user: null, session: null }, error: new Error("User already registered") };
  }
  return { data: { user: mockUser, session: mockSession }, error: null };
});
const mockResetPasswordForEmail = vi.fn(async (email: string) => {
  if (email === "offline@brewlog.dev") {
    return { data: {}, error: new Error("Failed to fetch") };
  }
  return { data: {}, error: null };
});
const mockSignOut = vi.fn(async () => ({ error: null }));

// Mock supabase client
vi.mock("../../lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: any) => mockOnAuthStateChange(cb),
      signInWithPassword: (params: any) => mockSignInWithPassword(params),
      signUp: (params: any) => mockSignUp(params),
      resetPasswordForEmail: (params: any) => mockResetPasswordForEmail(params),
      signOut: () => mockSignOut(),
      startAutoRefresh: () => mockStartAutoRefresh(),
      stopAutoRefresh: () => mockStopAutoRefresh(),
    },
  },
}));

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it("throws an error when useAuth is used outside AuthProvider", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");
  });

  it("hydrates user and session on mount", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user?.email).toBe("barista@brewlog.dev");
    expect(result.current.session?.access_token).toBe("mock-access-token");
    expect(result.current.isConfigured).toBe(true);
  });

  it("handles sign in success", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.signInWithEmail(" barista@brewlog.dev ", "correct-password");
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "barista@brewlog.dev",
      password: "correct-password",
    });
    expect(response?.error).toBeNull();
  });

  it("handles sign in failure with sanitized error message", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.signInWithEmail("test@test.com", "wrong");
    });

    expect(response?.error?.message).toBe("Invalid email or password.");
  });

  it("handles sign up with custom display name", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.signUpWithEmail("new@brewlog.dev", "secret123", " Custom Name ");
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "new@brewlog.dev",
      password: "secret123",
      options: {
        data: {
          display_name: "Custom Name",
        },
      },
    });
    expect(response?.error).toBeNull();
  });

  it("handles sign up fallback to email prefix when display name is not provided", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.signUpWithEmail("  specialty_brewer@brewlog.dev  ", "secret123");
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "specialty_brewer@brewlog.dev",
      password: "secret123",
      options: {
        data: {
          display_name: "specialty_brewer",
        },
      },
    });
    expect(response?.error).toBeNull();
  });

  it("handles sign up failure with sanitized error message", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.signUpWithEmail("existing@brewlog.dev", "secret123");
    });

    expect(response?.error?.message).toBe("An account with this email already exists.");
  });

  it("handles resetPasswordForEmail success", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.resetPasswordForEmail(" barista@brewlog.dev ");
    });

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith("barista@brewlog.dev");
    expect(response?.error).toBeNull();
  });

  it("handles resetPasswordForEmail network failure with sanitized message", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.resetPasswordForEmail("offline@brewlog.dev");
    });

    expect(response?.error?.message).toBe("Unable to reach BrewLog cloud. Please check your internet connection.");
  });

  it("handles signOut and clears state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).not.toBeNull();
    expect(result.current.session).not.toBeNull();

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("guarantees local state eviction when signOut throws an error", async () => {
    mockSignOut.mockRejectedValueOnce(new Error("Supabase network error"));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).not.toBeNull();
    expect(result.current.session).not.toBeNull();

    await act(async () => {
      try {
        await result.current.signOut();
      } catch (err: any) {
        expect(err.message).toBe("Supabase network error");
      }
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("manages startAutoRefresh and stopAutoRefresh based on AppState changes", async () => {
    renderHook(() => useAuth(), { wrapper });

    expect(appStateCallback).toBeDefined();

    act(() => {
      appStateCallback?.("active");
    });
    expect(mockStartAutoRefresh).toHaveBeenCalled();

    act(() => {
      appStateCallback?.("background");
    });
    expect(mockStopAutoRefresh).toHaveBeenCalled();
  });

  it("unsubscribes and removes event listeners on unmount", async () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockRemoveAppState).toHaveBeenCalled();
  });

  it("updates user and session on onAuthStateChange events", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const updatedUser: User = {
      ...mockUser,
      id: "usr-updated",
      email: "updated@brewlog.dev",
    };
    const updatedSession: Session = {
      ...mockSession,
      user: updatedUser,
      access_token: "updated-token",
    };

    act(() => {
      authStateCallback?.("TOKEN_REFRESHED", updatedSession);
    });

    expect(result.current.user?.id).toBe("usr-updated");
    expect(result.current.session?.access_token).toBe("updated-token");
  });
});
