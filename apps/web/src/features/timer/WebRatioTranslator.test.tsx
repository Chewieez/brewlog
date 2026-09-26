/** @vitest-environment jsdom */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WebRatioTranslator } from "./WebRatioTranslator";

describe("WebRatioTranslator", () => {
  it("renders and translates proportional dose", () => {
    const onApplyDose = vi.fn();
    render(<WebRatioTranslator currentDose={18} onApplyDose={onApplyDose} />);

    // Expand translator
    fireEvent.click(screen.getByText(/RATIO TRANSLATOR/i));

    const sourceCoffee = screen.getByLabelText(/baseline coffee/i);
    const sourceWater = screen.getByLabelText(/baseline water/i);
    const targetCoffee = screen.getByLabelText(/target coffee/i);

    fireEvent.change(sourceCoffee, { target: { value: "20" } });
    fireEvent.change(sourceWater, { target: { value: "300" } });
    fireEvent.change(targetCoffee, { target: { value: "15" } });

    expect(screen.getByText(/Target Water: 225g/i)).toBeDefined();

    fireEvent.click(screen.getByText(/APPLY 15g TO TIMER/i));
    expect(onApplyDose).toHaveBeenCalledWith(15, 15, 225);
  });

  it("translates proportional coffee when target water changes", () => {
    const onApplyDose = vi.fn();
    render(<WebRatioTranslator currentDose={15} onApplyDose={onApplyDose} />);

    fireEvent.click(screen.getByText(/RATIO TRANSLATOR/i));

    const sourceCoffee = screen.getByLabelText(/baseline coffee/i);
    const sourceWater = screen.getByLabelText(/baseline water/i);
    const targetWater = screen.getByLabelText(/target water/i);

    fireEvent.change(sourceCoffee, { target: { value: "20" } });
    fireEvent.change(sourceWater, { target: { value: "300" } });
    fireEvent.change(targetWater, { target: { value: "240" } });

    expect(screen.getByText(/Target Coffee: 16g/i)).toBeDefined();

    fireEvent.click(screen.getByText(/APPLY 16g TO TIMER/i));
    expect(onApplyDose).toHaveBeenCalledWith(16, 15, 240);
  });

  it("rounds dose to 1 decimal place before calling onApplyDose", () => {
    const onApplyDose = vi.fn();
    render(<WebRatioTranslator currentDose={18} onApplyDose={onApplyDose} />);

    fireEvent.click(screen.getByText(/RATIO TRANSLATOR/i));

    const targetCoffee = screen.getByLabelText(/target coffee/i);
    fireEvent.change(targetCoffee, { target: { value: "15.666" } });

    fireEvent.click(screen.getByText(/APPLY/i));
    expect(onApplyDose).toHaveBeenCalledWith(15.7, 15, 235);
  });
});

