/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { AuthSheet } from "./AuthSheet";
import * as AuthContextModule from "./AuthContext";

const mockAlert = vi.fn();

vi.mock("../../lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: null,
}));

vi.mock("react-native", () => ({
  Modal: ({ visible, children }: any) =>
    visible ? <div data-testid="modal">{children}</div> : null,
  View: ({ children, style, testID, ...props }: any) => (
    <div data-testid={testID} {...props}>
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
    style,
    ...props
  }: any) => (
    <input
      value={value}
      placeholder={placeholder}
      aria-label={accessibilityLabel}
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
  KeyboardAvoidingView: ({ children, behavior, style, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
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

  it("submits sign in successfully and closes sheet after delay", async () => {
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
    const { getAllByText, getByPlaceholderText, findByText } = render(
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

    expect(await findByText("Signed in successfully!")).toBeDefined();
    expect(mockSignIn).toHaveBeenCalledWith("barista@brewlog.dev", "password123");

    await waitFor(
      () => {
        expect(onClose).toHaveBeenCalledTimes(1);
      },
      { timeout: 1500 }
    );
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

  it("clears close timer on unmount without throwing", () => {
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
});
