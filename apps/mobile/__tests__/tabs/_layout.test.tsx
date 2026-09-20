/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import TabLayout from "../../app/(tabs)/_layout";
import { AuthProvider } from "../../src/features/auth/AuthContext";

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
  Platform: {
    OS: "ios",
    select: (obj: any) => obj.ios ?? obj.default,
  },
  Modal: ({ visible, children }: any) =>
    visible ? <div data-testid="modal">{children}</div> : null,
  TextInput: ({ ...props }: any) => <input {...props} />,
  TouchableWithoutFeedback: ({ children, onPress }: any) => (
    <div onClick={onPress}>{children}</div>
  ),
  KeyboardAvoidingView: ({ children }: any) => <div>{children}</div>,
  ScrollView: ({ children }: any) => <div>{children}</div>,
  AppState: {
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

vi.mock("lucide-react-native", () => ({
  User: () => null,
  Timer: () => null,
  BookOpen: () => null,
  Coffee: () => null,
  Wrench: () => null,
  Award: () => null,
  X: () => null,
  Mail: () => null,
  Lock: () => null,
  Eye: () => null,
  EyeOff: () => null,
  Loader2: () => null,
  Sparkles: () => null,
  LogOut: () => null,
  AlertCircle: () => null,
  CheckCircle2: () => null,
}));

vi.mock("../../src/lib/supabase", () => ({
  isSupabaseConfigured: false,
  supabase: null,
  createSessionFromUrl: vi.fn(),
}));

vi.mock("expo-haptics", () => ({
  selectionAsync: vi.fn(),
  notificationAsync: vi.fn(),
  NotificationFeedbackType: {},
}));

vi.mock("expo-router", () => {
  return {
    Tabs: Object.assign(
      ({ children, screenOptions }: any) => {
        const headerRight = screenOptions?.headerRight ? screenOptions.headerRight() : null;
        return (
          <div data-testid="tabs-mock">
            <div data-testid="header-right">{headerRight}</div>
            {children}
          </div>
        );
      },
      {
        Screen: ({ name }: any) => <div data-testid={`tab-screen-${name}`} />,
      }
    ),
  };
});

describe("TabLayout Integration", () => {
  it("mounts Tabs with ProfileHeaderButton in headerRight", () => {
    const { getByTestId, getByLabelText } = render(
      <AuthProvider>
        <TabLayout />
      </AuthProvider>
    );

    expect(getByTestId("tabs-mock")).toBeDefined();
    expect(getByLabelText("Account profile")).toBeDefined();
  });
});
