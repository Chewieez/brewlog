/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("react-native", () => ({
  View: ({ children, style, testID, ...props }: any) => (
    <div data-testid={testID} {...props}>
      {children}
    </div>
  ),
  Text: ({ children, style, ...props }: any) => <span {...props}>{children}</span>,
  TouchableOpacity: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    style,
    activeOpacity,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      {...props}
    >
      {children}
    </button>
  ),
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock("lucide-react-native", () => ({
  User: () => <span data-testid="user-icon" />,
}));

vi.mock("../../lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: null,
}));

import { render, fireEvent, cleanup } from "@testing-library/react";
import { ProfileHeaderButton } from "./ProfileHeaderButton";
import * as AuthContextModule from "./AuthContext";

describe("ProfileHeaderButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders logged-out icon when user is not signed in", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });

    const onPressMock = vi.fn();
    const { getByLabelText, getByTestId } = render(<ProfileHeaderButton onPress={onPressMock} />);

    const button = getByLabelText("Account profile");
    expect(button).toBeDefined();
    expect(getByTestId("user-icon")).toBeDefined();

    fireEvent.click(button);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it("renders user initials and active connection dot when logged in", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "123",
        email: "greg@example.com",
        user_metadata: { display_name: "Greg Lawrence" },
      } as any,
      session: { access_token: "token" } as any,
      loading: false,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });

    const { getByText, getByTestId } = render(<ProfileHeaderButton onPress={vi.fn()} />);

    expect(getByText("GL")).toBeDefined();
    expect(getByTestId("connection-dot")).toBeDefined();
  });

  it("renders two-letter initials when only email (single word) is available", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "123",
        email: "barista@example.com",
        user_metadata: {},
      } as any,
      session: { access_token: "token" } as any,
      loading: false,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });

    const { getByText, getByTestId } = render(<ProfileHeaderButton onPress={vi.fn()} />);

    expect(getByText("BA")).toBeDefined();
    expect(getByTestId("connection-dot")).toBeDefined();
  });

  it("renders logged-out icon when user has neither display_name nor email", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "123",
        user_metadata: {},
      } as any,
      session: { access_token: "token" } as any,
      loading: false,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signUpWithEmail: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    });

    const { getByTestId } = render(<ProfileHeaderButton onPress={vi.fn()} />);

    expect(getByTestId("user-icon")).toBeDefined();
  });
});
