/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, within } from "@testing-library/react";

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
    hitSlop: _hitSlop,
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
  Plus: ({ size, color }: any) => (
    <span data-testid="plus-icon" data-size={size} data-color={color} />
  ),
}));

import { TabScreenHeader } from "./TabScreenHeader";

function flattenStyle(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return Object.assign({}, ...parsed.filter(Boolean));
  }
  return parsed ?? {};
}

describe("TabScreenHeader", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders title-only mode without subtitle or CTA button", () => {
    const { getByRole, queryByRole } = render(<TabScreenHeader title="Timer" />);

    expect(getByRole("heading", { name: "Timer" })).toBeDefined();
    expect(queryByRole("button")).toBeNull();
  });

  it("renders title and CTA inline in the same row with full-width subtitle beneath", () => {
    const onActionPress = vi.fn();
    const { getByTestId, getByText } = render(
      <TabScreenHeader
        title="Equipment"
        subtitle="Manage your grinders, brewers, scales, and kettles."
        actionLabel="ADD EQUIPMENT"
        onActionPress={onActionPress}
        actionAccessibilityLabel="Add new equipment"
      />
    );

    const titleRow = getByTestId("tab-screen-header-title-row");
    expect(within(titleRow).getByRole("heading", { name: "Equipment" })).toBeDefined();

    const ctaButton = within(titleRow).getByRole("button", { name: "Add new equipment" });
    expect(ctaButton).toBeDefined();
    expect(within(ctaButton).getByText("ADD EQUIPMENT")).toBeDefined();

    // Subtitle sits beneath titleRow, not inside it
    expect(
      within(titleRow).queryByText("Manage your grinders, brewers, scales, and kettles.")
    ).toBeNull();
    expect(
      getByText("Manage your grinders, brewers, scales, and kettles.")
    ).toBeDefined();

    fireEvent.click(ctaButton);
    expect(onActionPress).toHaveBeenCalledTimes(1);
  });

  it("applies wrap-safe flex styles for narrow viewports and large font scales", () => {
    const { getByTestId, getByRole } = render(
      <TabScreenHeader
        title="Equipment"
        subtitle="Manage your grinders, brewers, scales, and kettles."
        actionLabel="ADD EQUIPMENT"
        onActionPress={vi.fn()}
        actionAccessibilityLabel="Add new equipment"
      />
    );

    const titleRowStyle = flattenStyle(
      getByTestId("tab-screen-header-title-row").getAttribute("data-style")
    );
    expect(titleRowStyle).toMatchObject({
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
    });

    const titleStyle = flattenStyle(
      getByRole("heading", { name: "Equipment" }).getAttribute("data-style")
    );
    expect(titleStyle).toMatchObject({
      flexShrink: 1,
    });

    const buttonStyle = flattenStyle(
      getByRole("button", { name: "Add new equipment" }).getAttribute("data-style")
    );
    expect(buttonStyle).toMatchObject({
      minHeight: 44,
      flexShrink: 0,
      marginLeft: "auto",
    });
  });
});
