/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { AuthSheetContent } from "./AuthSheetContent";
import * as AuthContextModule from "./AuthContext";

const { mockAlert } = vi.hoisted(() => ({
  mockAlert: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: null,
}));

vi.mock("react-native", () => ({
  View: ({ children, style, testID, ...props }: any) => (
    <div data-testid={testID} data-has-grabber={style?.width === 36 && style?.height === 4 ? "true" : undefined} {...props}>
      {children}
    </div>
  ),
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
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
  TouchableOpacity: ({ children, onPress, accessibilityLabel, disabled, activeOpacity, hitSlop, style, ...props }: any) => (
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
  Pressable: ({ children, onPress, accessibilityLabel, accessibilityRole, accessibilityState, disabled, style: _style, ...props }: any) => (
    <button
      type="button"
      onClick={disabled ? undefined : onPress}
      aria-label={accessibilityLabel}
      role={accessibilityRole}
      aria-selected={accessibilityState?.selected}
      disabled={disabled}
      {...props}
    >
      {typeof children === "function" ? children({ pressed: false }) : children}
    </button>
  ),
  ActivityIndicator: () => <div data-testid="activity-indicator" />,
  Alert: {
    alert: (...args: any[]) => mockAlert(...args),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Platform: {
    OS: "ios",
    select: (obj: any) => obj.ios ?? obj.default,
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
  LogOut: () => <span data-testid="logout-icon" />,
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
  CheckCircle2: () => <span data-testid="check-circle-icon" />,
  Lock: () => <span data-testid="lock-icon" />,
  Mail: () => <span data-testid="mail-icon" />,
  User: () => <span data-testid="user-icon" />,
  Settings: () => <span data-testid="settings-icon" />,
  ArrowLeft: () => <span data-testid="arrow-left-icon" />,
  ChevronRight: () => <span data-testid="chevron-right-icon" />,
}));

describe("AuthSheetContent", () => {
  const mockSignIn = vi.fn();
  const mockSignUp = vi.fn();
  const mockResetPassword = vi.fn();
  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  afterEach(() => {
    cleanup();
  });

  it("renders BREWLOG CLOUD header, auth form, and Settings row without any grabber view", () => {
    const { container, getByText } = render(
      <AuthSheetContent isActive={true} onDismiss={vi.fn()} onOpenSettings={vi.fn()} />
    );

    expect(getByText("BREWLOG CLOUD")).toBeDefined();
    expect(getByText("Settings")).toBeDefined();
    expect(container.querySelector('[data-has-grabber="true"]')).toBeNull();
  });

  it("renders Profile header when user is signed in", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "user-1",
        email: "barista@brewlog.dev",
        user_metadata: { display_name: "Greg" },
      } as any,
      session: {} as any,
      loading: false,
      isConfigured: true,
      signInWithEmail: mockSignIn,
      signUpWithEmail: mockSignUp,
      resetPasswordForEmail: mockResetPassword,
      signOut: mockSignOut,
    });

    const { getByText } = render(
      <AuthSheetContent isActive={true} onDismiss={vi.fn()} onOpenSettings={vi.fn()} />
    );

    expect(getByText("Profile")).toBeDefined();
    expect(getByText("Greg")).toBeDefined();
  });

  it("invokes onOpenSettings callback when Settings row is pressed", () => {
    const onOpenSettings = vi.fn();
    const { getByText } = render(
      <AuthSheetContent isActive={true} onDismiss={vi.fn()} onOpenSettings={onOpenSettings} />
    );

    fireEvent.click(getByText("Settings"));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("notifies onSubmittingChange and blocks onDismiss while sign-in is in flight", async () => {
    let resolveSignIn!: (val: { error: null }) => void;
    mockSignIn.mockImplementation(
      () =>
        new Promise<{ error: null }>((resolve) => {
          resolveSignIn = resolve;
        })
    );

    const onDismiss = vi.fn();
    const onOpenSettings = vi.fn();
    const onSubmittingChange = vi.fn();

    const { getByPlaceholderText, getAllByText, queryByLabelText, getByText } = render(
      <AuthSheetContent
        isActive={true}
        onDismiss={onDismiss}
        onOpenSettings={onOpenSettings}
        onSubmittingChange={onSubmittingChange}
      />
    );

    expect(queryByLabelText("Close sheet")).toBeNull();

    fireEvent.change(getByPlaceholderText("you@example.com"), {
      target: { value: "barista@brewlog.dev" },
    });
    fireEvent.change(getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });

    const signInButtons = getAllByText("SIGN IN");
    fireEvent.click(signInButtons[signInButtons.length - 1]);

    await waitFor(() => {
      expect(onSubmittingChange).toHaveBeenCalledWith(true);
    });

    fireEvent.click(getByText("Settings"));
    expect(onDismiss).not.toHaveBeenCalled();
    expect(onOpenSettings).not.toHaveBeenCalled();

    resolveSignIn({ error: null });

    await waitFor(() => {
      expect(onSubmittingChange).toHaveBeenCalledWith(false);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
    const lastFalseIdx = onSubmittingChange.mock.invocationCallOrder[onSubmittingChange.mock.calls.findIndex((c) => c[0] === false)];
    const dismissOrder = onDismiss.mock.invocationCallOrder[0];
    expect(lastFalseIdx).toBeLessThan(dismissOrder);
  });

  it("preserves form state when parent passes a fresh inline onSubmittingChange function on rerender", () => {
    const tracker = vi.fn();
    const { rerender, getByPlaceholderText, getByText } = render(
      <AuthSheetContent
        isActive={true}
        onDismiss={vi.fn()}
        onOpenSettings={vi.fn()}
        onSubmittingChange={(next) => tracker(next)}
      />
    );

    fireEvent.click(getByText("CREATE ACCOUNT"));
    const passwordInput = getByPlaceholderText("••••••••") as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "secret123" } });
    expect(passwordInput.value).toBe("secret123");

    rerender(
      <AuthSheetContent
        isActive={true}
        onDismiss={vi.fn()}
        onOpenSettings={vi.fn()}
        onSubmittingChange={(next) => tracker(next)}
      />
    );

    expect((getByPlaceholderText("••••••••") as HTMLInputElement).value).toBe("secret123");
    expect(getByText("BARISTA TAG / NAME")).toBeDefined();
  });
});
