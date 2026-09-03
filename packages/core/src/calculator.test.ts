import { describe, it, expect } from "vitest";
import {
  calculateWaterAmount,
  calculateCoffeeDose,
  calculateRatio,
  rescaleRecipeDose,
  calculateScaScore,
  calculateDaysOffRoast,
  getRestingStatus,
} from "./calculator";
import { BrewRecipe, CuppingAttributes } from "./types";

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
    it("should calculate score out of 100 based on the 8 attributes", () => {
      const perfectScores: CuppingAttributes = {
        fragranceAroma: 10,
        acidity: 10,
        sweetness: 10,
        body: 10,
        clarity: 10,
        aftertaste: 10,
        balance: 10,
        overall: 10,
      };
      expect(calculateScaScore(perfectScores)).toBe(100);

      const specialtyScores: CuppingAttributes = {
        fragranceAroma: 8.5,
        acidity: 8.5,
        sweetness: 8.8,
        body: 8.0,
        clarity: 9.0,
        aftertaste: 8.5,
        balance: 8.7,
        overall: 8.8,
      };
      // sum = 68.8; (68.8 / 80) * 100 = 86.0
      expect(calculateScaScore(specialtyScores)).toBe(86);
    });

    it("should clamp scores between 0 and 100", () => {
      const zeroScores: CuppingAttributes = {
        fragranceAroma: 0,
        acidity: 0,
        sweetness: 0,
        body: 0,
        clarity: 0,
        aftertaste: 0,
        balance: 0,
        overall: 0,
      };
      expect(calculateScaScore(zeroScores)).toBe(0);
    });
  });

  describe("calculateDaysOffRoast", () => {
    it("should return positive days between roast date and today", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 14);
      const roastDateStr = pastDate.toISOString().split("T")[0];

      const days = calculateDaysOffRoast(roastDateStr);
      expect(days).toBeGreaterThanOrEqual(13);
      expect(days).toBeLessThanOrEqual(15);
    });

    it("should return 0 for today or future dates", () => {
      const todayStr = new Date().toISOString().split("T")[0];
      expect(calculateDaysOffRoast(todayStr)).toBe(0);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      expect(calculateDaysOffRoast(futureDate.toISOString().split("T")[0])).toBe(0);
    });

    it("should return 0 for invalid date strings", () => {
      expect(calculateDaysOffRoast("invalid-date-string")).toBe(0);
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
});
