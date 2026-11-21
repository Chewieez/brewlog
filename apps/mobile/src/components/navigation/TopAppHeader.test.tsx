/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import {
  ThemeProvider,
  TACTILE_DARK_THEME,
  CRISP_STUDIO_LIGHT_THEME,
} from "@brewlog/ui";

const { getInsets, setInsets } = vi.hoisted(() => {
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  return {
    getInsets: () => insets,
    setInsets: (next: { top: number; bottom: number; left: number; right: number }) => {
      insets = next;
    },
  };
});

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => getInsets(),
}));

vi.mock("react-native", () => ({
  View: ({ children, style, testID, accessibilityRole, ...props }: any) => (
    <div
      data-testid={testID}
      role={accessibilityRole}
      data-style={JSON.stringify(style)}
      {...props}
    >
      {children}
    </div>
  ),
  Text: ({ children, style, accessibilityRole, numberOfLines, ...props }: any) => (
    <span
      role={accessibilityRole === "header" ? "heading" : accessibilityRole}
      data-style={JSON.stringify(style)}
      data-number-of-lines={numberOfLines}
      {...props}
    >
      {children}
    </span>
  ),
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityRole,
    style,
    ...props
  }: any) => (
    <button
      type="button"
      onClick={onPress}
      role={accessibilityRole}
      aria-label={accessibilityLabel}
      data-style={JSON.stringify(
        typeof style === "function" ? style({ pressed: false }) : style
      )}
      {...props}
    >
      {typeof children === "function" ? children({ pressed: false }) : children}
    </button>
  ),
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock("lucide-react-native", () => ({
  Coffee: ({ size, color }: any) => (
    <span data-testid="coffee-brand-icon" data-size={size} data-color={color} />
  ),
  User: ({ size, color }: any) => (
    <span data-testid="user-icon" data-size={size} data-color={color} />
  ),
}));

vi.mock("../../features/auth/AuthContext", () => ({
  useOptionalAuth: () => null,
}));

import { TopAppHeader } from "./TopAppHeader";

function flattenStyle(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return Object.assign({}, ...parsed.filter(Boolean));
  }
  return parsed ?? {};
}

describe("TopAppHeader", () => {
  beforeEach(() => {
    setInsets({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders BrewLog wordmark, coffee icon badge, and ProfileHeaderButton", () => {
    const { getByRole, getByText, getByTestId } = render(
      <TopAppHeader onProfilePress={vi.fn()} />
    );

    expect(getByText("BrewLog")).toBeDefined();
    expect(getByRole("heading", { name: "BrewLog" })).toBeDefined();
    expect(getByTestId("top-app-header-brand-icon")).toBeDefined();
    expect(getByTestId("coffee-brand-icon")).toBeDefined();
    expect(getByRole("button", { name: "Account profile" })).toBeDefined();
  });

  it("keeps the BrewLog brand mark non-interactive", () => {
    const { getAllByRole } = render(<TopAppHeader onProfilePress={vi.fn()} />);

    const buttons = getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].getAttribute("aria-label")).toBe("Account profile");
  });

  it("calls onProfilePress when the pinned account button is pressed", () => {
    const onProfilePress = vi.fn();
    const { getByRole } = render(<TopAppHeader onProfilePress={onProfilePress} />);

    fireEvent.click(getByRole("button", { name: "Account profile" }));
    expect(onProfilePress).toHaveBeenCalledTimes(1);
  });

  it("applies top safe-area inset dynamically for notched and non-notched devices", () => {
    setInsets({ top: 59, bottom: 34, left: 0, right: 0 });
    const { getByTestId, rerender } = render(
      <TopAppHeader onProfilePress={vi.fn()} />
    );

    expect(flattenStyle(getByTestId("top-app-header").getAttribute("data-style"))).toMatchObject({
      paddingTop: 59,
    });

    setInsets({ top: 0, bottom: 0, left: 0, right: 0 });
    rerender(<TopAppHeader onProfilePress={vi.fn()} />);

    expect(flattenStyle(getByTestId("top-app-header").getAttribute("data-style"))).toMatchObject({
      paddingTop: 0,
    });
  });

  it("resolves dark and light theme tokens from @brewlog/ui", () => {
    const { getByTestId, getByRole, rerender } = render(
      <ThemeProvider theme={TACTILE_DARK_THEME}>
        <TopAppHeader onProfilePress={vi.fn()} />
      </ThemeProvider>
    );

    expect(flattenStyle(getByTestId("top-app-header").getAttribute("data-style"))).toMatchObject({
      backgroundColor: TACTILE_DARK_THEME.colors.canvas,
      borderBottomWidth: 1,
      borderBottomColor: TACTILE_DARK_THEME.colors.borderSubtle,
    });
    expect(
      flattenStyle(getByTestId("top-app-header-brand-icon").getAttribute("data-style"))
    ).toMatchObject({
      backgroundColor: TACTILE_DARK_THEME.colors.panel,
      borderColor: TACTILE_DARK_THEME.colors.borderSubtle,
    });
    expect(getByTestId("coffee-brand-icon").getAttribute("data-color")).toBe(
      TACTILE_DARK_THEME.colors.accent
    );
    const titleEl = getByRole("heading", { name: "BrewLog" });
    expect(flattenStyle(titleEl.getAttribute("data-style"))).toMatchObject({
      color: TACTILE_DARK_THEME.colors.foreground,
      flexShrink: 1,
    });
    expect(titleEl.getAttribute("data-number-of-lines")).toBe("1");

    rerender(
      <ThemeProvider theme={CRISP_STUDIO_LIGHT_THEME}>
        <TopAppHeader onProfilePress={vi.fn()} />
      </ThemeProvider>
    );

    expect(flattenStyle(getByTestId("top-app-header").getAttribute("data-style"))).toMatchObject({
      backgroundColor: CRISP_STUDIO_LIGHT_THEME.colors.canvas,
      borderBottomWidth: 1,
      borderBottomColor: CRISP_STUDIO_LIGHT_THEME.colors.borderSubtle,
    });
    expect(
      flattenStyle(getByTestId("top-app-header-brand-icon").getAttribute("data-style"))
    ).toMatchObject({
      backgroundColor: CRISP_STUDIO_LIGHT_THEME.colors.panel,
      borderColor: CRISP_STUDIO_LIGHT_THEME.colors.borderSubtle,
    });
    expect(getByTestId("coffee-brand-icon").getAttribute("data-color")).toBe(
      CRISP_STUDIO_LIGHT_THEME.colors.accent
    );
    expect(
      flattenStyle(getByRole("heading", { name: "BrewLog" }).getAttribute("data-style"))
    ).toMatchObject({
      color: CRISP_STUDIO_LIGHT_THEME.colors.foreground,
    });
  });
});
