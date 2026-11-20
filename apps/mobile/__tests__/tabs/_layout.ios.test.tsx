/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import TabLayoutIOS from "../../app/(tabs)/_layout.ios";
import { useAuthModal } from "../../src/features/auth/AuthModalContext";
import { Keyboard } from "react-native";

const {
  mockNavigate,
  mockPush,
  mockDismiss,
  mockBack,
  mockCanDismiss,
  mockCanGoBack,
  mockKeyboardDismiss,
  getPathname,
  setPathname,
} = vi.hoisted(() => {
  let pathname = "/";
  return {
    mockNavigate: vi.fn(),
    mockPush: vi.fn(),
    mockDismiss: vi.fn(),
    mockBack: vi.fn(),
    mockCanDismiss: vi.fn(() => true),
    mockCanGoBack: vi.fn(() => true),
    mockKeyboardDismiss: vi.fn(),
    getPathname: () => pathname,
    setPathname: (next: string) => {
      pathname = next;
    },
  };
});

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

vi.mock("lucide-react-native", () => ({
  Coffee: () => null,
  User: () => null,
}));

vi.mock("../../src/features/auth/AuthContext", () => ({
  useOptionalAuth: () => null,
}));

vi.mock("react-native", () => ({
  View: ({ children, style, testID, ...props }: any) => (
    <div data-testid={testID} {...props}>
      {children}
    </div>
  ),
  Text: ({ children, style, ...props }: any) => <span {...props}>{children}</span>,
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
      {...props}
    >
      {typeof children === "function" ? children({ pressed: false }) : children}
    </button>
  ),
  Keyboard: {
    dismiss: mockKeyboardDismiss,
    addListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  Platform: {
    OS: "ios",
    select: (obj: any) => obj.ios ?? obj.default,
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock("expo-router", () => ({
  useRouter: () => ({
    navigate: mockNavigate,
    push: mockPush,
    dismiss: mockDismiss,
    back: mockBack,
    canDismiss: mockCanDismiss,
    canGoBack: mockCanGoBack,
  }),
  usePathname: () => getPathname(),
}));

const TestConsumer: React.FC<{ screenName: string }> = ({ screenName }) => {
  const { openAuthSheet, closeAuthSheet, isAuthSheetVisible } = useAuthModal();
  return (
    <div>
      <span data-testid={`auth-visible-${screenName}`}>
        {isAuthSheetVisible ? "true" : "false"}
      </span>
      <button
        type="button"
        aria-label={`Open auth from ${screenName}`}
        onClick={openAuthSheet}
      >
        Open Auth
      </button>
      <button
        type="button"
        aria-label={`Close auth from ${screenName}`}
        onClick={closeAuthSheet}
      >
        Close Auth
      </button>
    </div>
  );
};

vi.mock("expo-router/native-tabs", () => {
  const Trigger = Object.assign(
    ({ name }: any) => (
      <div data-testid={`native-tab-${name}`}>
        <TestConsumer screenName={name} />
      </div>
    ),
    {
      Label: ({ children }: any) => <span>{children}</span>,
      Icon: () => null,
    }
  );
  return {
    NativeTabs: Object.assign(
      ({ children }: any) => <div data-testid="native-tabs-mock">{children}</div>,
      { Trigger }
    ),
  };
});

describe("TabLayoutIOS Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPathname("/");
    mockCanDismiss.mockReturnValue(true);
    mockCanGoBack.mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  it("does not mount the in-tree AuthSheet overlay even after calling openAuthSheet", () => {
    const { getByLabelText, queryByTestId } = render(<TabLayoutIOS />);

    expect(queryByTestId("auth-sheet")).toBeNull();
    expect(queryByTestId("modal")).toBeNull();

    fireEvent.click(getByLabelText("Open auth from index"));

    expect(queryByTestId("auth-sheet")).toBeNull();
    expect(queryByTestId("modal")).toBeNull();
  });

  it("dismisses keyboard and navigates to /auth/sheet when openAuthSheet is called", () => {
    const { getByLabelText } = render(<TabLayoutIOS />);

    fireEvent.click(getByLabelText("Open auth from index"));

    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/auth/sheet");
  });

  it("guards against duplicate navigation on rapid double-taps and when already on /auth/sheet", () => {
    const { getByLabelText, rerender } = render(<TabLayoutIOS />);

    // Rapid double-tap before pathname updates
    fireEvent.click(getByLabelText("Open auth from index"));
    fireEvent.click(getByLabelText("Open auth from index"));

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    // Already on /auth/sheet
    setPathname("/auth/sheet");
    rerender(<TabLayoutIOS />);
    vi.clearAllMocks();

    fireEvent.click(getByLabelText("Open auth from index"));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("derives isAuthSheetVisible from pathname === '/auth/sheet'", () => {
    const { getByTestId, rerender } = render(<TabLayoutIOS />);

    expect(getByTestId("auth-visible-index").textContent).toBe("false");

    setPathname("/auth/sheet");
    rerender(<TabLayoutIOS />);

    expect(getByTestId("auth-visible-index").textContent).toBe("true");
  });

  it("closeAuthSheet dismisses only when pathname is /auth/sheet and canDismiss() is true", () => {
    const { getByLabelText, rerender } = render(<TabLayoutIOS />);

    // Not on /auth/sheet: must not dismiss tab navigator
    fireEvent.click(getByLabelText("Close auth from index"));
    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
    expect(mockDismiss).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();

    // On /auth/sheet with canDismiss = true
    setPathname("/auth/sheet");
    rerender(<TabLayoutIOS />);
    vi.clearAllMocks();

    fireEvent.click(getByLabelText("Close auth from index"));
    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it("closeAuthSheet falls back to router.back() when canDismiss() is false and canGoBack() is true", () => {
    setPathname("/auth/sheet");
    mockCanDismiss.mockReturnValue(false);
    mockCanGoBack.mockReturnValue(true);

    const { getByLabelText } = render(<TabLayoutIOS />);

    fireEvent.click(getByLabelText("Close auth from index"));
    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
    expect(mockDismiss).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("renders static TopAppHeader with BrewLog and navigates to /auth/sheet when Account profile is tapped", () => {
    const { getByText, getByLabelText } = render(<TabLayoutIOS />);

    expect(getByText("BrewLog")).toBeDefined();

    fireEvent.click(getByLabelText("Account profile"));
    fireEvent.click(getByLabelText("Account profile"));

    expect(Keyboard.dismiss).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/auth/sheet");
  });
});
