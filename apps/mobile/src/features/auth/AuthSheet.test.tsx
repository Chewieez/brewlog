/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { AuthSheet } from "./AuthSheet";
import * as AuthContextModule from "./AuthContext";

import { Platform, Keyboard, Animated } from "react-native";

const { mockAlert, mockKeyboardDismiss, mockKeyboardAddListener, getBackHandlerListeners, setBackHandlerListeners } = vi.hoisted(() => {
  let listeners: any[] = [];
  return {
    mockAlert: vi.fn(),
    mockKeyboardDismiss: vi.fn(),
    mockKeyboardAddListener: vi.fn(() => ({ remove: vi.fn() })),
    getBackHandlerListeners: () => listeners,
    setBackHandlerListeners: (next: any[]) => {
      listeners = next;
    },
  };
});

vi.mock("../../lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: null,
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("react-native", () => ({
  View: ({ children, style, testID, accessibilityViewIsModal, ...props }: any) => (
    <div
      data-testid={testID}
      data-accessibility-view-is-modal={accessibilityViewIsModal ? "true" : undefined}
      {...props}
    >
      {children}
    </div>
  ),
  Text: ({ children, style, ...props }: any) => <span {...props}>{children}</span>,
  TextInput: ({
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    accessibilityLabel,
    autoCapitalize,
    autoCorrect,
    spellCheck,
    keyboardType,
    textContentType,
    placeholderTextColor,
    autoComplete,
    importantForAutofill,
    style,
    ...props
  }: any) => (
    <input
      value={value}
      placeholder={placeholder}
      aria-label={accessibilityLabel}
      autoComplete={autoComplete}
      data-text-content-type={textContentType}
      data-important-for-autofill={importantForAutofill}
      onChange={(e) => onChangeText?.(e.target.value)}
      {...props}
    />
  ),
  TouchableOpacity: ({
    children,
    onPress,
    accessibilityLabel,
    disabled,
    activeOpacity,
    hitSlop,
    style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={disabled ? undefined : onPress}
      aria-label={accessibilityLabel}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
  TouchableWithoutFeedback: ({ children, onPress }: any) => (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onPress?.(e);
      }}
    >
      {children}
    </div>
  ),
  Animated: {
    Value: class {
      val: number;
      constructor(val: number) {
        this.val = val;
      }
      setValue(val: number) {
        this.val = val;
      }
    },
    timing: vi.fn(() => ({
      start: vi.fn((cb?: any) => cb?.()),
    })),
    parallel: vi.fn((animations: any[]) => ({
      start: vi.fn((cb?: any) => {
        animations?.forEach((a) => a?.start?.());
        cb?.();
      }),
    })),
    View: ({ children, style, testID, ...props }: any) => (
      <div data-testid={testID || "animated-view"} {...props}>
        {children}
      </div>
    ),
  },
  Keyboard: {
    addListener: mockKeyboardAddListener,
    dismiss: mockKeyboardDismiss,
  },
  Easing: {
    in: (fn: any) => fn,
    out: (fn: any) => fn,
    ease: (t: number) => t,
  },
  ScrollView: ({ children, contentContainerStyle, keyboardShouldPersistTaps, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  Platform: {
    OS: "ios",
    select: (obj: any) => obj.ios ?? obj.default,
  },
  ActivityIndicator: () => <div data-testid="activity-indicator" />,
  Alert: {
    alert: (...args: any[]) => mockAlert(...args),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
  BackHandler: {
    addEventListener: vi.fn((event: string, cb: any) => {
      getBackHandlerListeners().push(cb);
      return {
        remove: vi.fn(() => {
          setBackHandlerListeners(getBackHandlerListeners().filter((l) => l !== cb));
        }),
      };
    }),
  },
}));

vi.mock("expo-haptics", () => ({
  selectionAsync: vi.fn().mockResolvedValue(undefined),
  notificationAsync: vi.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
}));

vi.mock("lucide-react-native", () => ({
  Sparkles: () => <span data-testid="sparkles-icon" />,
  LogOut: () => <span data-testid="logout-icon" />,
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
  CheckCircle2: () => <span data-testid="check-circle-icon" />,
  Lock: () => <span data-testid="lock-icon" />,
  Mail: () => <span data-testid="mail-icon" />,
  User: () => <span data-testid="user-icon" />,
}));

describe("AuthSheet", () => {
  const mockSignIn = vi.fn();
  const mockSignUp = vi.fn();
  const mockResetPassword = vi.fn();
  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setBackHandlerListeners([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders Sign In form by default when user is logged out", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getAllByText, getByPlaceholderText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    expect(getAllByText("SIGN IN").length).toBeGreaterThanOrEqual(1);
    expect(getByPlaceholderText("you@example.com")).toBeDefined();
    expect(getByPlaceholderText("••••••••")).toBeDefined();
  });

  it("switches to Create Account mode and renders Barista Tag input", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getByText, getByPlaceholderText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    fireEvent.click(getByText("CREATE ACCOUNT"));
    expect(getByPlaceholderText("e.g. Greg")).toBeDefined();
  });

  it("renders profile summary and Sign Out action when logged in", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "usr-750e-42a3",
        email: "barista@brewlog.dev",
        user_metadata: { display_name: "Greg" },
      } as any,
      session: { access_token: "token" } as any,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getByText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    expect(getByText("CLOUD CONNECTED")).toBeDefined();
    expect(getByText("Greg")).toBeDefined();
    expect(getByText("barista@brewlog.dev")).toBeDefined();
    expect(getByText("SIGN OUT")).toBeDefined();
  });

  it("switches to Forgot Password mode and back to Sign In", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getByText, queryByPlaceholderText, getByPlaceholderText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    fireEvent.click(getByText("Forgot password?"));
    expect(getByText("RESET PASSWORD")).toBeDefined();
    expect(getByText("SEND RESET LINK")).toBeDefined();
    // Password input hidden in forgot mode
    expect(queryByPlaceholderText("••••••••")).toBeNull();

    // Switch back to Sign In
    fireEvent.click(getByText("← Back to Sign In"));
    expect(getByText("BREWLOG CLOUD")).toBeDefined();
    expect(getByPlaceholderText("••••••••")).toBeDefined();
  });

  it("displays offline warning banner when Supabase is unconfigured", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: false,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getByText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    expect(
      getByText(/Supabase credentials not detected in .env. Running in offline mode./i)
    ).toBeDefined();
  });

  it("validates email address format before submitting", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getAllByText, getByPlaceholderText, getByText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    fireEvent.change(getByPlaceholderText("you@example.com"), {
      target: { value: "invalid-email" },
    });
    fireEvent.change(getByPlaceholderText("••••••••"), {
      target: { value: "secret123" },
    });

    const signInButtons = getAllByText("SIGN IN");
    fireEvent.click(signInButtons[signInButtons.length - 1]);

    expect(getByText("Please enter a valid email address.")).toBeDefined();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("validates password length before submitting", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getAllByText, getByPlaceholderText, getByText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    fireEvent.change(getByPlaceholderText("you@example.com"), {
      target: { value: "user@brewlog.dev" },
    });
    fireEvent.change(getByPlaceholderText("••••••••"), {
      target: { value: "12345" },
    });

    const signInButtons = getAllByText("SIGN IN");
    fireEvent.click(signInButtons[signInButtons.length - 1]);

    expect(getByText("Password must be at least 6 characters.")).toBeDefined();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("submits sign in successfully and closes sheet immediately", async () => {
    mockSignIn.mockResolvedValueOnce({ error: null });

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const onClose = vi.fn();
    const { getAllByText, getByPlaceholderText } = render(
      <AuthSheet visible={true} onClose={onClose} />
    );

    fireEvent.change(getByPlaceholderText("you@example.com"), {
      target: { value: "barista@brewlog.dev" },
    });
    fireEvent.change(getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });

    const signInButtons = getAllByText("SIGN IN");
    await fireEvent.click(signInButtons[signInButtons.length - 1]);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("barista@brewlog.dev", "password123");
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("displays error message when sign in fails", async () => {
    mockSignIn.mockResolvedValueOnce({
      error: new Error("Invalid email or password."),
    });

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getAllByText, getByPlaceholderText, getByText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    fireEvent.change(getByPlaceholderText("you@example.com"), {
      target: { value: "barista@brewlog.dev" },
    });
    fireEvent.change(getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });

    const signInButtons = getAllByText("SIGN IN");
    await fireEvent.click(signInButtons[signInButtons.length - 1]);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("barista@brewlog.dev", "password123");
      expect(getByText("Invalid email or password.")).toBeDefined();
    });
  });

  it("submits sign up successfully with barista display name", async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getByText, getByPlaceholderText, getAllByText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    // Click toggle tab CREATE ACCOUNT
    fireEvent.click(getByText("CREATE ACCOUNT"));

    fireEvent.change(getByPlaceholderText("e.g. Greg"), {
      target: { value: "Greg Lawrence" },
    });
    fireEvent.change(getByPlaceholderText("you@example.com"), {
      target: { value: "greg@brewlog.dev" },
    });
    fireEvent.change(getByPlaceholderText("••••••••"), {
      target: { value: "securepassword" },
    });

    const createAccountButtons = getAllByText("CREATE ACCOUNT");
    await fireEvent.click(createAccountButtons[createAccountButtons.length - 1]);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        "greg@brewlog.dev",
        "securepassword",
        "Greg Lawrence"
      );
      expect(getByText("Check your inbox for the confirmation link!")).toBeDefined();
      expect((getByPlaceholderText("••••••••") as HTMLInputElement).value).toBe("");
    });
  });

  it("displays error message when sign up fails", async () => {
    mockSignUp.mockResolvedValueOnce({
      error: new Error("An account with this email already exists."),
    });

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getByText, getByPlaceholderText, getAllByText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    fireEvent.click(getByText("CREATE ACCOUNT"));

    fireEvent.change(getByPlaceholderText("you@example.com"), {
      target: { value: "existing@brewlog.dev" },
    });
    fireEvent.change(getByPlaceholderText("••••••••"), {
      target: { value: "securepassword" },
    });

    const createAccountButtons = getAllByText("CREATE ACCOUNT");
    await fireEvent.click(createAccountButtons[createAccountButtons.length - 1]);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        "existing@brewlog.dev",
        "securepassword",
        ""
      );
      expect(getByText("An account with this email already exists.")).toBeDefined();
    });
  });

  it("submits reset password request successfully", async () => {
    mockResetPassword.mockResolvedValueOnce({ error: null });

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getByText, getByPlaceholderText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    fireEvent.click(getByText("Forgot password?"));
    fireEvent.change(getByPlaceholderText("you@example.com"), {
      target: { value: "reset@brewlog.dev" },
    });

    await fireEvent.click(getByText("SEND RESET LINK"));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith("reset@brewlog.dev");
      expect(getByText("Password reset email sent!")).toBeDefined();
    });
  });

  it("displays error message when password reset fails", async () => {
    mockResetPassword.mockResolvedValueOnce({
      error: new Error("Unable to reach BrewLog cloud. Please check your internet connection."),
    });

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getByText, getByPlaceholderText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    fireEvent.click(getByText("Forgot password?"));
    fireEvent.change(getByPlaceholderText("you@example.com"), {
      target: { value: "reset@brewlog.dev" },
    });

    await fireEvent.click(getByText("SEND RESET LINK"));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith("reset@brewlog.dev");
      expect(
        getByText("Unable to reach BrewLog cloud. Please check your internet connection.")
      ).toBeDefined();
    });
  });

  it("opens alert confirmation on sign out click and signs out when confirmed", async () => {
    mockSignOut.mockResolvedValueOnce(undefined);

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "usr-1234",
        email: "signedin@brewlog.dev",
      } as any,
      session: { access_token: "token" } as any,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const onClose = vi.fn();
    const { getByText } = render(
      <AuthSheet visible={true} onClose={onClose} />
    );

    fireEvent.click(getByText("SIGN OUT"));

    expect(mockAlert).toHaveBeenCalledWith(
      "Sign Out",
      "Are you sure you want to sign out of BrewLog cloud?",
      expect.any(Array)
    );

    const alertButtons = mockAlert.mock.calls[0][2];
    const signOutBtn = alertButtons.find((b: any) => b.text === "Sign Out");
    expect(signOutBtn).toBeDefined();

    await signOutBtn.onPress();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close icon is clicked", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const onClose = vi.fn();
    const { getByLabelText } = render(
      <AuthSheet visible={true} onClose={onClose} />
    );

    fireEvent.click(getByLabelText("Close sheet"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables backdrop dismissal and close button while submitting is active", async () => {
    let resolveSignIn: any;
    mockSignIn.mockImplementation(
      () => new Promise((resolve) => { resolveSignIn = resolve; })
    );

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const onClose = vi.fn();
    const { getAllByText, getByPlaceholderText, getByLabelText } = render(
      <AuthSheet visible={true} onClose={onClose} />
    );

    fireEvent.change(getByPlaceholderText("you@example.com"), {
      target: { value: "barista@brewlog.dev" },
    });
    fireEvent.change(getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });

    const signInButtons = getAllByText("SIGN IN");
    fireEvent.click(signInButtons[signInButtons.length - 1]);

    // Close button should be disabled
    const closeBtn = getByLabelText("Close sheet");
    fireEvent.click(closeBtn);
    expect(onClose).not.toHaveBeenCalled();

    // Resolve submission
    resolveSignIn?.({ error: null });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("does not render contents when visible is false", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { queryByTestId } = render(
      <AuthSheet visible={false} onClose={vi.fn()} />
    );

    expect(queryByTestId("modal")).toBeNull();
  });

  it("catches unexpected exceptions during submit and displays error message", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("Fatal network crash"));

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getAllByText, getByPlaceholderText, findByText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    fireEvent.change(getByPlaceholderText("you@example.com"), {
      target: { value: "barista@brewlog.dev" },
    });
    fireEvent.change(getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });

    const signInButtons = getAllByText("SIGN IN");
    await fireEvent.click(signInButtons[signInButtons.length - 1]);

    expect(await findByText("Fatal network crash")).toBeDefined();
  });

  it("resets mode to signin when modal becomes visible again", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getByText, queryByPlaceholderText, rerender } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    // Switch to forgot mode
    fireEvent.click(getByText("Forgot password?"));
    expect(queryByPlaceholderText("••••••••")).toBeNull();

    // Close and reopen sheet
    rerender(<AuthSheet visible={false} onClose={vi.fn()} />);
    rerender(<AuthSheet visible={true} onClose={vi.fn()} />);

    // Expect signin mode to be restored (password input present)
    expect(queryByPlaceholderText("••••••••")).not.toBeNull();
  });

  it("resets password input when modal visibility changes", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getByPlaceholderText, rerender } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    const passwordInput = getByPlaceholderText("••••••••");
    fireEvent.change(passwordInput, { target: { value: "supersecret" } });
    expect((passwordInput as HTMLInputElement).value).toBe("supersecret");

    // Close and reopen sheet
    rerender(<AuthSheet visible={false} onClose={vi.fn()} />);
    rerender(<AuthSheet visible={true} onClose={vi.fn()} />);

    const reopenedPasswordInput = getByPlaceholderText("••••••••");
    expect((reopenedPasswordInput as HTMLInputElement).value).toBe("");
  });

  it("clears credentials and inputs on sign out", async () => {
    let currentUser: any = {
      id: "usr-1234",
      email: "signedin@brewlog.dev",
    };

    mockSignOut.mockImplementation(async () => {
      currentUser = null;
    });

    vi.spyOn(AuthContextModule, "useAuth").mockImplementation(() => ({
      user: currentUser,
      session: currentUser ? ({ access_token: "token" } as any) : null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    }));

    const onClose = vi.fn();
    const { getByText, getByPlaceholderText, rerender } = render(
      <AuthSheet visible={true} onClose={onClose} />
    );

    fireEvent.click(getByText("SIGN OUT"));
    const alertButtons = mockAlert.mock.calls[0][2];
    const signOutBtn = alertButtons.find((b: any) => b.text === "Sign Out");
    await signOutBtn.onPress();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Reopen sheet as logged out user
    rerender(<AuthSheet visible={true} onClose={onClose} />);
    const emailInput = getByPlaceholderText("you@example.com");
    const passwordInput = getByPlaceholderText("••••••••");
    expect((emailInput as HTMLInputElement).value).toBe("");
    expect((passwordInput as HTMLInputElement).value).toBe("");
  });

  it("renders in-tree overlay container and animated keyboard container with accessibility modal trapping", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getByTestId, getAllByTestId } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    const modal = getByTestId("modal");
    expect(modal).toBeDefined();
    expect(modal.getAttribute("aria-modal")).toBe("true");
    expect(modal.getAttribute("data-accessibility-view-is-modal")).toBe("true");

    const animatedViews = getAllByTestId("animated-view");
    expect(animatedViews.length).toBeGreaterThanOrEqual(1);
  });

  it("animates slide and backdrop on open and applies safe area bottom padding", () => {
    (Animated.timing as any).mockClear();
    (Animated.parallel as any).mockClear();

    render(<AuthSheet visible={true} onClose={vi.fn()} />);

    expect(Animated.parallel).toHaveBeenCalled();
    expect(Animated.timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1, duration: 200 })
    );
    expect(Animated.timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0, duration: 250 })
    );
  });

  it("registers hardware back press listener and triggers onClose", () => {
    const onClose = vi.fn();
    render(<AuthSheet visible={true} onClose={onClose} />);
    const listeners = getBackHandlerListeners();
    expect(listeners.length).toBeGreaterThan(0);
    const cb = listeners[listeners.length - 1];
    cb();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("suppresses hardware back press dismissal when submission is in flight", async () => {
    let resolveSignIn: any;
    mockSignIn.mockImplementation(
      () => new Promise((resolve) => { resolveSignIn = resolve; })
    );

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const onClose = vi.fn();
    const { getAllByText, getByPlaceholderText } = render(
      <AuthSheet visible={true} onClose={onClose} />
    );

    fireEvent.change(getByPlaceholderText("you@example.com"), {
      target: { value: "barista@brewlog.dev" },
    });
    fireEvent.change(getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });

    const signInButtons = getAllByText("SIGN IN");
    fireEvent.click(signInButtons[signInButtons.length - 1]);

    // Submission is in flight
    const listeners = getBackHandlerListeners();
    expect(listeners.length).toBeGreaterThan(0);
    const cb = listeners[listeners.length - 1];
    const handled = cb();

    expect(handled).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    // Finish async submission
    resolveSignIn?.({ error: null });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("configures inputs with appropriate autoComplete and importantForAutofill metadata for password managers", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getByPlaceholderText, getByText } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    // Sign in mode: username / password
    const emailInput = getByPlaceholderText("you@example.com");
    expect(emailInput.getAttribute("autocomplete")).toBe("username");
    expect(emailInput.getAttribute("data-text-content-type")).toBe("username");
    expect(emailInput.getAttribute("data-important-for-autofill")).toBe("yes");

    const passwordInput = getByPlaceholderText("••••••••");
    expect(passwordInput.getAttribute("autocomplete")).toBe("password");
    expect(passwordInput.getAttribute("data-text-content-type")).toBe("password");
    expect(passwordInput.getAttribute("data-important-for-autofill")).toBe("yes");

    // Switch to create account mode: email / name / password-new
    fireEvent.click(getByText("CREATE ACCOUNT"));

    const signUpEmailInput = getByPlaceholderText("you@example.com");
    expect(signUpEmailInput.getAttribute("autocomplete")).toBe("email");
    expect(signUpEmailInput.getAttribute("data-text-content-type")).toBe("emailAddress");
    expect(signUpEmailInput.getAttribute("data-important-for-autofill")).toBe("yes");

    const nameInput = getByPlaceholderText("e.g. Greg");
    expect(nameInput.getAttribute("autocomplete")).toBe("name");
    expect(nameInput.getAttribute("data-text-content-type")).toBe("name");
    expect(nameInput.getAttribute("data-important-for-autofill")).toBe("yes");

    const newPasswordInput = getByPlaceholderText("••••••••");
    expect(newPasswordInput.getAttribute("autocomplete")).toBe("password-new");
    expect(newPasswordInput.getAttribute("data-text-content-type")).toBe("newPassword");
    expect(newPasswordInput.getAttribute("data-important-for-autofill")).toBe("yes");

    // Switch to forgot password mode: email (reset)
    fireEvent.click(getByText("SIGN IN"));
    fireEvent.click(getByText("Forgot password?"));

    const forgotEmailInput = getByPlaceholderText("you@example.com");
    expect(forgotEmailInput.getAttribute("autocomplete")).toBe("email");
    expect(forgotEmailInput.getAttribute("data-text-content-type")).toBe("emailAddress");
    expect(forgotEmailInput.getAttribute("data-important-for-autofill")).toBe("yes");
  });

  it("unmounts cleanly without throwing", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { unmount } = render(
      <AuthSheet visible={true} onClose={vi.fn()} />
    );

    expect(() => unmount()).not.toThrow();
  });

  it("dismisses any open keyboard when visible is true", () => {
    mockKeyboardDismiss.mockClear();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    render(<AuthSheet visible={true} onClose={vi.fn()} />);
    expect(mockKeyboardDismiss).toHaveBeenCalled();
  });

  it("subscribes to keyboardWillShow and keyboardWillHide on iOS and drives keyboardPadding", () => {
    mockKeyboardAddListener.mockClear();
    (Animated.timing as any).mockClear();
    (Platform as any).OS = "ios";

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { unmount } = render(<AuthSheet visible={true} onClose={vi.fn()} />);

    expect(mockKeyboardAddListener).toHaveBeenCalledWith(
      "keyboardWillShow",
      expect.any(Function)
    );
    expect(mockKeyboardAddListener).toHaveBeenCalledWith(
      "keyboardWillHide",
      expect.any(Function)
    );

    // Simulate keyboardWillShow event
    const showCall = (mockKeyboardAddListener.mock.calls as unknown as [string, (e: any) => void][]).find(
      (call) => call[0] === "keyboardWillShow"
    );
    expect(showCall).toBeDefined();
    showCall![1]({ endCoordinates: { height: 320 }, duration: 250 });

    expect(Animated.timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 320,
        duration: 250,
      })
    );

    // Simulate keyboardWillHide event
    const hideCall = (mockKeyboardAddListener.mock.calls as unknown as [string, (e: any) => void][]).find(
      (call) => call[0] === "keyboardWillHide"
    );
    expect(hideCall).toBeDefined();
    hideCall![1]({ duration: 200 });

    expect(Animated.timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 0,
        duration: 200,
      })
    );

    unmount();
  });

  it("subscribes to keyboardDidShow and keyboardDidHide on Android and drives keyboardPadding", () => {
    mockKeyboardAddListener.mockClear();
    (Animated.timing as any).mockClear();
    (Platform as any).OS = "android";

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    try {
      const { unmount } = render(<AuthSheet visible={true} onClose={vi.fn()} />);

      expect(mockKeyboardAddListener).toHaveBeenCalledWith(
        "keyboardDidShow",
        expect.any(Function)
      );
      expect(mockKeyboardAddListener).toHaveBeenCalledWith(
        "keyboardDidHide",
        expect.any(Function)
      );

      // Simulate keyboardDidShow event
      const showCall = (mockKeyboardAddListener.mock.calls as unknown as [string, (e: any) => void][]).find(
        (call) => call[0] === "keyboardDidShow"
      );
      expect(showCall).toBeDefined();
      showCall![1]({ endCoordinates: { height: 300 } });

      expect(Animated.timing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 300,
          duration: 220,
        })
      );

      // Simulate keyboardDidHide event
      const hideCall = (mockKeyboardAddListener.mock.calls as unknown as [string, (e: any) => void][]).find(
        (call) => call[0] === "keyboardDidHide"
      );
      expect(hideCall).toBeDefined();
      hideCall![1]({});

      expect(Animated.timing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          toValue: 0,
          duration: 200,
        })
      );

      unmount();
    } finally {
      (Platform as any).OS = "ios";
    }
  });

  it("does not attach keyboard listeners when visible is false and removes them on hide", () => {
    mockKeyboardAddListener.mockClear();
    (Platform as any).OS = "ios";

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { rerender } = render(<AuthSheet visible={false} onClose={vi.fn()} />);
    expect(mockKeyboardAddListener).not.toHaveBeenCalled();

    // Show sheet
    rerender(<AuthSheet visible={true} onClose={vi.fn()} />);
    expect(mockKeyboardAddListener).toHaveBeenCalledWith(
      "keyboardWillShow",
      expect.any(Function)
    );
    expect(mockKeyboardAddListener).toHaveBeenCalledWith(
      "keyboardWillHide",
      expect.any(Function)
    );

    const mockRemove = mockKeyboardAddListener.mock.results[0].value.remove;

    // Hide sheet
    rerender(<AuthSheet visible={false} onClose={vi.fn()} />);
    expect(mockRemove).toHaveBeenCalled();
  });
});
