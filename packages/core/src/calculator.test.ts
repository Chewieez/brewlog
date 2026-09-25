import { describe, it, expect } from "vitest";
import {
  calculateWaterAmount,
  calculateCoffeeDose,
  calculateRatio,
  calculateTargetWater,
  calculateTargetCoffee,
  solveProportionalScale,
  splitsToRecipeStages,
  rescaleRecipeDose,
  calculateScaScore,
  calculateDaysOffRoast,
  getRestingStatus,
} from "./calculator";
import { BrewRecipe, BrewSplit, CuppingAttributes } from "./types";

describe("Brew Calculator Math", () => {
  describe("calculateWaterAmount", () => {
    it("should accurately calculate total water weight based on dose and ratio", () => {
      expect(calculateWaterAmount(15, 16)).toBe(240);
      expect(calculateWaterAmount(20, 15)).toBe(300);
      expect(calculateWaterAmount(18.5, 16.67)).toBe(308);
    });

    it("should round to nearest whole gram", () => {
      expect(calculateWaterAmount(15.2, 16.67)).toBe(253);
    });
  });

  describe("calculateCoffeeDose", () => {
    it("should calculate dose from total water and ratio", () => {
      expect(calculateCoffeeDose(240, 16)).toBe(15);
      expect(calculateCoffeeDose(500, 16.67)).toBe(30);
    });

    it("should handle invalid ratios gracefully", () => {
      expect(calculateCoffeeDose(250, 0)).toBe(0);
      expect(calculateCoffeeDose(250, -1)).toBe(0);
    });
  });

  describe("calculateRatio", () => {
    it("should calculate ratio from dose and water amount", () => {
      expect(calculateRatio(15, 240)).toBe(16);
      expect(calculateRatio(20, 300)).toBe(15);
      expect(calculateRatio(30, 500)).toBe(16.7);
    });

    it("should return 0 if coffee dose is zero or negative", () => {
      expect(calculateRatio(0, 250)).toBe(0);
      expect(calculateRatio(-5, 250)).toBe(0);
    });
  });

  describe("rescaleRecipeDose", () => {
    const sampleRecipe: BrewRecipe = {
      id: "test-v60",
      name: "Test V60",
      brewMethod: "v60",
      description: "Test recipe",
      coffeeDoseGrams: 20,
      waterAmountGrams: 300,
      ratio: 15,
      grindSize: "Medium",
      waterTempCelsius: 93,
      totalTimeSeconds: 180,
      createdAt: "2026-01-01T00:00:00Z",
      stages: [
        {
          id: "s1",
          name: "Bloom",
          startSecond: 0,
          durationSeconds: 45,
          targetWaterWeightGrams: 60,
          instruction: "Pour 60g",
          stageType: "bloom",
        },
        {
          id: "s2",
          name: "Main Pour",
          startSecond: 45,
          durationSeconds: 45,
          targetWaterWeightGrams: 300,
          instruction: "Pour to 300g",
          stageType: "pour",
        },
      ],
    };

    it("should proportionally scale total water and individual stages", () => {
      // Scale from 20g dose to 30g dose (1.5x scale)
      const scaled = rescaleRecipeDose(sampleRecipe, 30);

      expect(scaled.coffeeDoseGrams).toBe(30);
      expect(scaled.waterAmountGrams).toBe(450);
      expect(scaled.stages).toHaveLength(2);
      expect(scaled.stages[0].targetWaterWeightGrams).toBe(90);
      expect(scaled.stages[1].targetWaterWeightGrams).toBe(450);
    });

    it("should proportionally scale down when decreasing dose", () => {
      // Scale from 20g dose to 10g dose (0.5x scale)
      const scaled = rescaleRecipeDose(sampleRecipe, 10);

      expect(scaled.coffeeDoseGrams).toBe(10);
      expect(scaled.waterAmountGrams).toBe(150);
      expect(scaled.stages[0].targetWaterWeightGrams).toBe(30);
      expect(scaled.stages[1].targetWaterWeightGrams).toBe(150);
    });

    it("should not mutate the original recipe object", () => {
      rescaleRecipeDose(sampleRecipe, 30);
      expect(sampleRecipe.coffeeDoseGrams).toBe(20);
      expect(sampleRecipe.waterAmountGrams).toBe(300);
      expect(sampleRecipe.stages[0].targetWaterWeightGrams).toBe(60);
    });

    it("should return unchanged recipe if new dose or original dose is non-positive", () => {
      expect(rescaleRecipeDose(sampleRecipe, 0)).toBe(sampleRecipe);
      expect(rescaleRecipeDose(sampleRecipe, -5)).toBe(sampleRecipe);
    });
  });

  describe("calculateScaScore", () => {
    it("should calculate score out of 100 based on the 10 official SCA attributes", () => {
      const perfectScores: CuppingAttributes = {
        fragranceAroma: 10,
        flavor: 10,
        aftertaste: 10,
        acidity: 10,
        body: 10,
        balance: 10,
        uniformity: 10,
        cleanCup: 10,
        sweetness: 10,
        overall: 10,
      };
      expect(calculateScaScore(perfectScores)).toBe(100);

      const specialtyScores: CuppingAttributes = {
        fragranceAroma: 8.5,
        flavor: 8.75,
        aftertaste: 8.25,
        acidity: 8.5,
        body: 8.25,
        balance: 8.5,
        uniformity: 10.0,
        cleanCup: 10.0,
        sweetness: 10.0,
        overall: 8.75,
      };
      // sum = 8.5 + 8.75 + 8.25 + 8.5 + 8.25 + 8.5 + 8.75 + 10 + 10 + 10 = 89.5
      expect(calculateScaScore(specialtyScores)).toBe(89.5);
    });

    it("should deduct defects when present", () => {
      const scoresWithDefect: CuppingAttributes = {
        fragranceAroma: 8.0,
        flavor: 8.0,
        aftertaste: 8.0,
        acidity: 8.0,
        body: 8.0,
        balance: 8.0,
        uniformity: 8.0,
        cleanCup: 8.0,
        sweetness: 10.0,
        overall: 8.0,
      };
      // base sum = (7 * 8.0) + (2 * 8.0) + 10.0 = 56.0 + 16.0 + 10.0 = 82.0; defect = 4.0 -> 78.0
      expect(calculateScaScore(scoresWithDefect, 4.0)).toBe(78);
    });

    it("should support legacy 8-attribute logs with clarity fallback", () => {
      const legacyScores: CuppingAttributes = {
        fragranceAroma: 8.5,
        acidity: 8.5,
        sweetness: 8.8,
        body: 8.0,
        clarity: 9.0,
        aftertaste: 8.5,
        balance: 8.7,
        overall: 8.8,
      } as any;
      // legacy formula: (68.8 / 80) * 100 = 86.0
      expect(calculateScaScore(legacyScores)).toBe(86);
    });

    it("should clamp scores between 0 and 100", () => {
      const zeroScores: CuppingAttributes = {
        fragranceAroma: 0,
        flavor: 0,
        aftertaste: 0,
        acidity: 0,
        body: 0,
        balance: 0,
        uniformity: 0,
        cleanCup: 0,
        sweetness: 0,
        overall: 0,
      };
      expect(calculateScaScore(zeroScores)).toBe(0);

      // Defect greater than sum clamps to 0
      expect(calculateScaScore(zeroScores, 10)).toBe(0);
    });
  });

  describe("calculateDaysOffRoast", () => {
    it("should return exact calendar days with a deterministic reference date", () => {
      // Fixed reference date: September 6, 2026
      const refDate = new Date(2026, 8, 6, 15, 30, 0); // Sept 6, 2026 3:30 PM local

      // Roasted 14 days ago: August 23, 2026
      expect(calculateDaysOffRoast("2026-08-23", refDate)).toBe(14);

      // Roasted same day: September 6, 2026
      expect(calculateDaysOffRoast("2026-09-06", refDate)).toBe(0);

      // Roasted 1 day ago: September 5, 2026
      expect(calculateDaysOffRoast("2026-09-05", refDate)).toBe(1);

      // Future roast date: September 10, 2026 -> clamped to 0
      expect(calculateDaysOffRoast("2026-09-10", refDate)).toBe(0);
    });

    it("should accurately cross month boundaries and leap years", () => {
      // Leap year test: March 1, 2024 with roast date Feb 27, 2024 -> 3 days (Feb 27, 28, 29)
      const leapRef = new Date(2024, 2, 1, 10, 0, 0); // March 1, 2024
      expect(calculateDaysOffRoast("2024-02-27", leapRef)).toBe(3);

      // Year boundary test: Jan 3, 2026 with roast date Dec 30, 2025 -> 4 days
      const newYearRef = new Date(2026, 0, 3, 8, 0, 0);
      expect(calculateDaysOffRoast("2025-12-30", newYearRef)).toBe(4);
    });

    it("should correctly handle full ISO strings as well as YYYY-MM-DD", () => {
      const refDate = new Date(2026, 8, 6, 12, 0, 0);
      expect(calculateDaysOffRoast("2026-09-01T18:45:00.000Z", refDate)).toBe(5);
    });

    it("should return positive days between roast date and today (default reference)", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 14);
      const year = pastDate.getFullYear();
      const month = String(pastDate.getMonth() + 1).padStart(2, "0");
      const day = String(pastDate.getDate()).padStart(2, "0");
      const roastDateStr = `${year}-${month}-${day}`;

      const days = calculateDaysOffRoast(roastDateStr);
      // Calendar day diff is exactly 14
      expect(days).toBe(14);
    });

    it("should return 0 for today or future dates", () => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      expect(calculateDaysOffRoast(todayStr)).toBe(0);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}-${String(futureDate.getDate()).padStart(2, "0")}`;
      expect(calculateDaysOffRoast(futureStr)).toBe(0);
    });

    it("should return 0 for invalid date strings or empty input", () => {
      expect(calculateDaysOffRoast("invalid-date-string")).toBe(0);
      expect(calculateDaysOffRoast("")).toBe(0);
      // @ts-expect-error test runtime guard against null/undefined
      expect(calculateDaysOffRoast(null)).toBe(0);
    });
  });

  describe("getRestingStatus", () => {
    it("should classify < 5 days as resting", () => {
      expect(getRestingStatus(0).status).toBe("resting");
      expect(getRestingStatus(4).status).toBe("resting");
    });

    it("should classify 5-28 days as peak", () => {
      expect(getRestingStatus(5).status).toBe("peak");
      expect(getRestingStatus(14).status).toBe("peak");
      expect(getRestingStatus(28).status).toBe("peak");
    });

    it("should classify 29-60 days as aging", () => {
      expect(getRestingStatus(29).status).toBe("aging");
      expect(getRestingStatus(45).status).toBe("aging");
      expect(getRestingStatus(60).status).toBe("aging");
    });

    it("should classify > 60 days as past-peak", () => {
      expect(getRestingStatus(61).status).toBe("past-peak");
      expect(getRestingStatus(120).status).toBe("past-peak");
    });
  });

  describe("Phase 6 Proportional Math & Split Converter", () => {
    describe("calculateTargetWater & calculateTargetCoffee", () => {
      it("calculates target water correctly", () => {
        expect(calculateTargetWater(18, 16)).toBe(288);
        expect(calculateTargetWater(15.5, 15)).toBe(233);
        expect(calculateTargetWater(0, 16)).toBe(0);
        expect(calculateTargetWater(18, 0)).toBe(0);
      });

      it("calculates target coffee correctly with 1 decimal place", () => {
        expect(calculateTargetCoffee(288, 16)).toBe(18);
        expect(calculateTargetCoffee(250, 16.5)).toBe(15.2);
        expect(calculateTargetCoffee(0, 16)).toBe(0);
        expect(calculateTargetCoffee(250, 0)).toBe(0);
      });
    });

    describe("solveProportionalScale", () => {
      it("solves target water given target coffee from source baseline", () => {
        const result = solveProportionalScale({
          sourceCoffee: 20,
          sourceWater: 320,
          targetCoffee: 15,
        });
        expect(result.ratio).toBe(16);
        expect(result.targetCoffee).toBe(15);
        expect(result.targetWater).toBe(240);
      });

      it("solves target coffee given target water from source baseline", () => {
        const result = solveProportionalScale({
          sourceCoffee: 22,
          sourceWater: 350,
          targetWater: 250,
        });
        expect(result.ratio).toBe(15.9);
        expect(result.targetWater).toBe(250);
        expect(result.targetCoffee).toBe(15.7);
      });

      it("handles zero and negative inputs safely without throwing", () => {
        const zeroResult = solveProportionalScale({
          sourceCoffee: 0,
          sourceWater: 300,
          targetCoffee: 15,
        });
        expect(zeroResult.ratio).toBe(0);
        expect(zeroResult.targetWater).toBe(0);

        const negResult = solveProportionalScale({
          sourceCoffee: -10,
          sourceWater: 150,
          targetWater: 200,
        });
        expect(negResult.ratio).toBe(0);
        expect(negResult.targetCoffee).toBe(0);
      });
    });

    describe("splitsToRecipeStages", () => {
      it("creates a single full extraction stage when no splits are provided", () => {
        const stages = splitsToRecipeStages([], 180, 300);
        expect(stages).toHaveLength(1);
        expect(stages[0].name).toBe("Full Extraction");
        expect(stages[0].startSecond).toBe(0);
        expect(stages[0].durationSeconds).toBe(180);
        expect(stages[0].targetWaterWeightGrams).toBe(300);
      });

      it("converts multiple splits into progressive stages with correct durations", () => {
        const splits: BrewSplit[] = [
          { id: "s1", second: 45, intervalSeconds: 45, label: "Bloom", tag: "bloom" },
          { id: "s2", second: 105, intervalSeconds: 60, label: "First Pour", tag: "pour" },
          { id: "s3", second: 180, intervalSeconds: 75, label: "Drawdown", tag: "drawdown" },
        ];
        const stages = splitsToRecipeStages(splits, 210, 300);
        expect(stages).toHaveLength(4);
        expect(stages[0].name).toBe("Bloom");
        expect(stages[0].startSecond).toBe(0);
        expect(stages[0].durationSeconds).toBe(45);

        expect(stages[1].name).toBe("First Pour");
        expect(stages[1].startSecond).toBe(45);
        expect(stages[1].durationSeconds).toBe(60);

        expect(stages[2].name).toBe("Drawdown");
        expect(stages[2].startSecond).toBe(105);
        expect(stages[2].durationSeconds).toBe(75);

        expect(stages[3].name).toBe("Finish & Drain");
        expect(stages[3].startSecond).toBe(180);
        expect(stages[3].durationSeconds).toBe(30);
      });
    });
  });
});

