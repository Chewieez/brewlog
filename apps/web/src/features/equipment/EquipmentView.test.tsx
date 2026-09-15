/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
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
];

describe("EquipmentView", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders category headers and equipment items correctly", () => {
    render(<EquipmentView equipment={MOCK_EQUIPMENT} onAddEquipment={vi.fn()} />);

    expect(screen.getByText(/Gear & Equipment/i)).toBeDefined();
    expect(screen.getByText(/Grinders \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Brewers & Drippers \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Precision Scales \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Kettles & Water Gear \(1\)/i)).toBeDefined();

    expect(screen.getByText("Ode Gen 2")).toBeDefined();
    expect(screen.getByText("64mm Flat Burrs")).toBeDefined();
    expect(screen.getByText("stepped-numbers")).toBeDefined();
    expect(screen.getByText("Calibrated 1 click off chirp")).toBeDefined();

    expect(screen.getByText("V60 02 Ceramic")).toBeDefined();
    expect(screen.getByText("Lunar")).toBeDefined();
    expect(screen.getByText("Stagg EKG")).toBeDefined();
  });

  it("renders empty placeholders when no equipment in categories", () => {
    render(<EquipmentView equipment={[]} onAddEquipment={vi.fn()} />);

    expect(screen.getByText(/No grinders logged yet\./i)).toBeDefined();
    expect(screen.getByText(/No brewers logged yet\./i)).toBeDefined();
    expect(screen.getByText(/No scales logged yet\./i)).toBeDefined();
    expect(screen.getByText(/No kettles logged yet\./i)).toBeDefined();
  });

  it("opens add equipment modal and handles submitting a new item", () => {
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
    });

    // Modal closes
    expect(screen.queryByRole("heading", { name: "Add Equipment" })).toBeNull();
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
});
