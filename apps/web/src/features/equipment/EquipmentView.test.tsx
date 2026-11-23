/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import { EquipmentView } from "./EquipmentView";
import { Equipment } from "@brewlog/core";

const MOCK_EQUIPMENT: Equipment[] = [
  {
    id: "grinder-1",
    type: "grinder",
    brand: "Fellow",
    model: "Ode Gen 2",
    subType: "64mm Flat Burrs",
    settingScaleType: "stepped-numbers",
    notes: "Calibrated 1 click off chirp",
    createdAt: "2026-01-01",
  },
  {
    id: "brewer-1",
    type: "brewer",
    brand: "Hario",
    model: "V60 02 Ceramic",
    subType: "Pour-Over",
    createdAt: "2026-01-02",
  },
  {
    id: "scale-1",
    type: "scale",
    brand: "Acaia",
    model: "Lunar",
    subType: "0.01g resolution",
    createdAt: "2026-01-03",
  },
  {
    id: "kettle-1",
    type: "kettle",
    brand: "Fellow",
    model: "Stagg EKG",
    subType: "Variable Temp Gooseneck",
    createdAt: "2026-01-04",
  },
  {
    id: "other-1",
    type: "other",
    brand: "Fellow",
    model: "Atmos Canister",
    subType: "Vacuum Seal Canister",
    createdAt: "2026-01-05",
  },
];

describe("EquipmentView", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders category headers and equipment items correctly", () => {
    render(<EquipmentView equipment={MOCK_EQUIPMENT} onAddEquipment={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Equipment" })).toBeDefined();
    expect(screen.getByText(/Grinders \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Brewers & Drippers \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Precision Scales \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Kettles & Water Gear \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Other Equipment & Accessories \(1\)/i)).toBeDefined();

    expect(screen.getByText("Ode Gen 2")).toBeDefined();
    expect(screen.getByText("64mm Flat Burrs")).toBeDefined();
    expect(screen.getByText("stepped-numbers")).toBeDefined();
    expect(screen.getByText("Calibrated 1 click off chirp")).toBeDefined();

    expect(screen.getByText("V60 02 Ceramic")).toBeDefined();
    expect(screen.getByText("Lunar")).toBeDefined();
    expect(screen.getByText("Stagg EKG")).toBeDefined();
    expect(screen.getByText("Atmos Canister")).toBeDefined();
  });

  it("renders empty placeholders when no equipment in categories", () => {
    render(<EquipmentView equipment={[]} onAddEquipment={vi.fn()} />);

    expect(screen.getByText(/No grinders logged yet\./i)).toBeDefined();
    expect(screen.getByText(/No brewers logged yet\./i)).toBeDefined();
    expect(screen.getByText(/No scales logged yet\./i)).toBeDefined();
    expect(screen.getByText(/No kettles logged yet\./i)).toBeDefined();
    expect(screen.getByText(/No other equipment logged yet\./i)).toBeDefined();
  });

  it("opens add equipment modal and handles submitting a new item", async () => {
    const handleAdd = vi.fn();
    render(<EquipmentView equipment={MOCK_EQUIPMENT} onAddEquipment={handleAdd} />);

    // Click Add Equipment
    fireEvent.click(screen.getByRole("button", { name: /add equipment/i }));

    // Modal is open
    expect(screen.getByRole("heading", { name: "Add Equipment" })).toBeDefined();

    // Fill form fields
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Fellow, Comandante, Baratza/i), {
      target: { value: "Comandante" },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Ode Gen 2, C40 MK4, Encore ESP/i), {
      target: { value: "C40 MK4" },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 64mm Flat Burrs, Conical Burrs/i), {
      target: { value: "Conical Burrs" },
    });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /save equipment/i }));

    expect(handleAdd).toHaveBeenCalledTimes(1);
    expect(handleAdd).toHaveBeenCalledWith({
      type: "grinder",
      brand: "Comandante",
      model: "C40 MK4",
      subType: "Conical Burrs",
      settingScaleType: "stepped-numbers",
      notes: undefined,
      isFavorite: false,
    });

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Add Equipment" })).toBeNull();
    });
  });

  it("calls onDeleteEquipment when trash button is clicked", () => {
    const handleDelete = vi.fn();
    render(
      <EquipmentView
        equipment={MOCK_EQUIPMENT}
        onAddEquipment={vi.fn()}
        onDeleteEquipment={handleDelete}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: /delete ode gen 2/i });
    fireEvent.click(deleteBtn);

    expect(handleDelete).toHaveBeenCalledWith("grinder-1");
  });

  it("closes modal when cancel button is clicked", () => {
    render(<EquipmentView equipment={MOCK_EQUIPMENT} onAddEquipment={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /add equipment/i }));
    expect(screen.getByRole("heading", { name: "Add Equipment" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("heading", { name: "Add Equipment" })).toBeNull();
  });

  it("filters equipment by search text", () => {
    render(<EquipmentView equipment={MOCK_EQUIPMENT} onAddEquipment={vi.fn()} />);

    const searchInput = screen.getByLabelText("Search equipment");
    fireEvent.change(searchInput, { target: { value: "V60" } });

    expect(screen.getByText("V60 02 Ceramic")).toBeDefined();
    expect(screen.queryByText("Ode Gen 2")).toBeNull();
    expect(screen.queryByText("Lunar")).toBeNull();
    expect(screen.queryByText("Stagg EKG")).toBeNull();
  });

  it("filters equipment by category filter pills and updates aria-pressed", () => {
    render(<EquipmentView equipment={MOCK_EQUIPMENT} onAddEquipment={vi.fn()} />);

    const filterGroup = screen.getByRole("group", { name: "Filter equipment by category" });
    expect(filterGroup.getAttribute("data-testid")).toBe("equipment-category-filters");

    const allChip = within(filterGroup).getByRole("button", { name: "All" });
    const brewersChip = within(filterGroup).getByRole("button", { name: "Brewers" });
    const otherChip = within(filterGroup).getByRole("button", { name: "Other" });

    expect(allChip.getAttribute("aria-pressed")).toBe("true");
    expect(brewersChip.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(brewersChip);
    expect(brewersChip.getAttribute("aria-pressed")).toBe("true");
    expect(allChip.getAttribute("aria-pressed")).toBe("false");

    expect(screen.getByText(/Brewers & Drippers \(1\)/i)).toBeDefined();
    expect(screen.getByText("V60 02 Ceramic")).toBeDefined();
    expect(screen.queryByRole("heading", { name: /Grinders/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /Precision Scales/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /Kettles & Water Gear/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /Other Equipment & Accessories/i })).toBeNull();

    fireEvent.click(otherChip);
    expect(otherChip.getAttribute("aria-pressed")).toBe("true");
    expect(brewersChip.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText(/Other Equipment & Accessories \(1\)/i)).toBeDefined();
    expect(screen.getByText("Atmos Canister")).toBeDefined();
    expect(screen.queryByRole("heading", { name: /Brewers & Drippers/i })).toBeNull();

    fireEvent.click(allChip);
    expect(allChip.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/Grinders \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Brewers & Drippers \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Other Equipment & Accessories \(1\)/i)).toBeDefined();
  });

  it("supports keyboard parity on category FilterPills", () => {
    render(<EquipmentView equipment={MOCK_EQUIPMENT} onAddEquipment={vi.fn()} />);

    const filterGroup = screen.getByTestId("equipment-category-filters");
    const allChip = within(filterGroup).getByRole("button", { name: "All" });
    const grindersChip = within(filterGroup).getByRole("button", { name: "Grinders" });
    const otherChip = within(filterGroup).getByRole("button", { name: "Other" });

    allChip.focus();
    fireEvent.keyDown(allChip, { key: "ArrowRight" });
    expect(document.activeElement).toBe(grindersChip);

    fireEvent.keyDown(grindersChip, { key: "End" });
    expect(document.activeElement).toBe(otherChip);

    fireEvent.keyDown(otherChip, { key: "ArrowRight" });
    expect(document.activeElement).toBe(allChip);

    fireEvent.keyDown(allChip, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(otherChip);

    fireEvent.keyDown(otherChip, { key: "Home" });
    expect(document.activeElement).toBe(allChip);

    for (const key of ["Tab", "Enter", " "]) {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      allChip.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it("hides category FilterPills when equipment is empty and shows only present categories", () => {
    const { rerender } = render(<EquipmentView equipment={[]} onAddEquipment={vi.fn()} />);
    expect(screen.queryByTestId("equipment-category-filters")).toBeNull();

    rerender(
      <EquipmentView
        equipment={[MOCK_EQUIPMENT[0], MOCK_EQUIPMENT[1]]}
        onAddEquipment={vi.fn()}
      />
    );

    const filterGroup = screen.getByTestId("equipment-category-filters");
    expect(within(filterGroup).getByRole("button", { name: "All" })).toBeDefined();
    expect(within(filterGroup).getByRole("button", { name: "Grinders" })).toBeDefined();
    expect(within(filterGroup).getByRole("button", { name: "Brewers" })).toBeDefined();
    expect(within(filterGroup).queryByRole("button", { name: "Scales" })).toBeNull();
    expect(within(filterGroup).queryByRole("button", { name: "Kettles" })).toBeNull();
    expect(within(filterGroup).queryByRole("button", { name: "Other" })).toBeNull();
  });

  it("resets active category filter to all when selected category disappears", () => {
    const { rerender } = render(
      <EquipmentView
        equipment={[MOCK_EQUIPMENT[0], MOCK_EQUIPMENT[1]]}
        onAddEquipment={vi.fn()}
      />
    );

    const filterGroup = screen.getByTestId("equipment-category-filters");
    fireEvent.click(within(filterGroup).getByRole("button", { name: "Brewers" }));
    expect(screen.queryByRole("heading", { name: /Grinders/i })).toBeNull();
    expect(screen.getByText("V60 02 Ceramic")).toBeDefined();

    rerender(
      <EquipmentView equipment={[MOCK_EQUIPMENT[0]]} onAddEquipment={vi.fn()} />
    );

    expect(screen.getByText(/Grinders \(1\)/i)).toBeDefined();
    expect(screen.getByText("Ode Gen 2")).toBeDefined();
    expect(
      within(screen.getByTestId("equipment-category-filters")).queryByRole("button", {
        name: "Brewers",
      })
    ).toBeNull();
  });

  it("opens edit modal on card click and calls onUpdateEquipment on save", async () => {
    const handleUpdate = vi.fn();
    render(
      <EquipmentView
        equipment={MOCK_EQUIPMENT}
        onAddEquipment={vi.fn()}
        onUpdateEquipment={handleUpdate}
      />
    );

    // Click on Ode Gen 2 card
    fireEvent.click(screen.getByText("Ode Gen 2"));

    // Verify modal is open in edit mode
    expect(screen.getByRole("heading", { name: "Edit Equipment" })).toBeDefined();
    expect(screen.getByDisplayValue("Fellow")).toBeDefined();
    const modelInput = screen.getByDisplayValue("Ode Gen 2");

    // Modify model name
    fireEvent.change(modelInput, { target: { value: "Ode Gen 2 Matte Black" } });

    // Click Save Changes
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(handleUpdate).toHaveBeenCalledWith(
      "grinder-1",
      expect.objectContaining({
        model: "Ode Gen 2 Matte Black",
        brand: "Fellow",
        type: "grinder",
      })
    );
  });

  it("calls onToggleFavorite when star button on card is clicked", () => {
    const handleToggleFavorite = vi.fn();
    render(
      <EquipmentView
        equipment={MOCK_EQUIPMENT}
        onAddEquipment={vi.fn()}
        onToggleFavorite={handleToggleFavorite}
      />
    );

    const favBtn = screen.getByRole("button", { name: /favorite lunar/i });
    fireEvent.click(favBtn);

    expect(handleToggleFavorite).toHaveBeenCalledWith("scale-1");
  });

  it("deletes equipment from edit modal after confirmation", async () => {
    const handleDelete = vi.fn();
    render(
      <EquipmentView
        equipment={MOCK_EQUIPMENT}
        onAddEquipment={vi.fn()}
        onDeleteEquipment={handleDelete}
      />
    );

    // Open edit modal
    fireEvent.click(screen.getByText("Ode Gen 2"));

    // Click Delete in modal
    fireEvent.click(screen.getByRole("button", { name: "DELETE" }));

    // Confirmation modal should appear
    expect(screen.getByText(/Are you sure you want to delete "Fellow Ode Gen 2"?/i)).toBeDefined();

    // Confirm deletion
    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(confirmBtn);

    expect(handleDelete).toHaveBeenCalledWith("grinder-1");
  });

  it("renders equipment modal using the shared pinned header and footer shell", () => {
    render(<EquipmentView equipment={MOCK_EQUIPMENT} onAddEquipment={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /add equipment/i }));

    const modal = screen.getByTestId("equipment-modal");
    const header = screen.getByTestId("equipment-modal-header");
    const body = screen.getByTestId("equipment-modal-body");
    const footer = screen.getByTestId("equipment-modal-footer");

    expect(modal.className).toContain("flex-col");
    expect(modal.className).toContain("overflow-hidden");
    expect(header.className).toContain("shrink-0");
    expect(header.contains(screen.getByRole("heading", { name: "Add Equipment" }))).toBe(true);
    expect(header.contains(screen.getByRole("button", { name: /close dialog/i }))).toBe(true);
    expect(body.className).toContain("overflow-y-auto");
    expect(body.contains(header)).toBe(false);
    expect(footer.className).toContain("shrink-0");
    expect(body.contains(footer)).toBe(false);
  });
});
