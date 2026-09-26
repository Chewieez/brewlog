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
    fireEvent.click(screen.getByText(/RATIO CALCULATOR/i));

    const sourceCoffee = screen.getByLabelText(/source coffee/i);
    const sourceWater = screen.getByLabelText(/source water/i);
    const targetCoffee = screen.getByLabelText(/target coffee/i);

    fireEvent.change(sourceCoffee, { target: { value: "20" } });
    fireEvent.change(sourceWater, { target: { value: "300" } });
    fireEvent.change(targetCoffee, { target: { value: "15" } });

    const targetWater = screen.getByLabelText(/target water/i) as HTMLInputElement;
    expect(targetWater.value).toBe("225");

    fireEvent.click(screen.getByText(/APPLY DOSE/i));
    expect(onApplyDose).toHaveBeenCalledWith(15, 15, 225);
  });

  it("translates proportional coffee when target water changes", () => {
    const onApplyDose = vi.fn();
    render(<WebRatioTranslator currentDose={15} onApplyDose={onApplyDose} />);

    fireEvent.click(screen.getByText(/RATIO CALCULATOR/i));

    const sourceCoffee = screen.getByLabelText(/source coffee/i);
    const sourceWater = screen.getByLabelText(/source water/i);
    const targetWater = screen.getByLabelText(/target water/i);

    fireEvent.change(sourceCoffee, { target: { value: "20" } });
    fireEvent.change(sourceWater, { target: { value: "300" } });
    fireEvent.change(targetWater, { target: { value: "240" } });

    const targetCoffee = screen.getByLabelText(/target coffee/i) as HTMLInputElement;
    expect(targetCoffee.value).toBe("16");

    fireEvent.click(screen.getByText(/APPLY DOSE/i));
    expect(onApplyDose).toHaveBeenCalledWith(16, 15, 240);
  });

  it("rounds dose to 1 decimal place before calling onApplyDose", () => {
    const onApplyDose = vi.fn();
    render(<WebRatioTranslator currentDose={18} onApplyDose={onApplyDose} />);

    fireEvent.click(screen.getByText(/RATIO CALCULATOR/i));

    const targetCoffee = screen.getByLabelText(/target coffee/i);
    fireEvent.change(targetCoffee, { target: { value: "15.666" } });

    fireEvent.click(screen.getByText(/APPLY DOSE/i));
    expect(onApplyDose).toHaveBeenCalledWith(15.7, 15, 235);
  });

  it("initializes baseline values from baseCoffee and baseWater and solves target coffee", () => {
    const onApplyDose = vi.fn();
    render(
      <WebRatioTranslator
        currentDose={30}
        baseCoffee={30}
        baseWater={500}
        onApplyDose={onApplyDose}
      />
    );

    fireEvent.click(screen.getByText(/RATIO CALCULATOR/i));

    const sourceCoffee = screen.getByLabelText(/source coffee/i) as HTMLInputElement;
    const sourceWater = screen.getByLabelText(/source water/i) as HTMLInputElement;
    const targetWater = screen.getByLabelText(/target water/i) as HTMLInputElement;
    const targetCoffee = screen.getByLabelText(/target coffee/i) as HTMLInputElement;

    expect(sourceCoffee.value).toBe("30");
    expect(sourceWater.value).toBe("500");

    fireEvent.change(targetWater, { target: { value: "300" } });
    expect(targetCoffee.value).toBe("18");

    fireEvent.click(screen.getByText(/APPLY DOSE/i));
    expect(onApplyDose).toHaveBeenCalledWith(18, 16.7, 300);
  });

  it("cleans up applied badge timeout on unmount without errors", () => {
    vi.useFakeTimers();
    const onApplyDose = vi.fn();
    const { unmount } = render(
      <WebRatioTranslator currentDose={18} onApplyDose={onApplyDose} />
    );

    fireEvent.click(screen.getByText(/RATIO CALCULATOR/i));
    fireEvent.click(screen.getByText(/APPLY DOSE/i));

    expect(screen.getByText(/DOSE APPLIED/i)).toBeDefined();

    unmount();
    vi.advanceTimersByTime(2500);
    vi.useRealTimers();
  });
});
