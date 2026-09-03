import { describe, it, expect } from "vitest";
import { DEFAULT_PRESET_RECIPES } from "./presets";

describe("Preset Recipes Data Integrity", () => {
  it("should contain standard specialty coffee presets", () => {
    expect(DEFAULT_PRESET_RECIPES.length).toBeGreaterThanOrEqual(4);
  });

  DEFAULT_PRESET_RECIPES.forEach((recipe) => {
    describe(`Recipe: ${recipe.name}`, () => {
      it("should have valid metadata", () => {
        expect(recipe.id).toBeDefined();
        expect(recipe.name.length).toBeGreaterThan(0);
        expect(recipe.brewMethod).toBeDefined();
        expect(recipe.coffeeDoseGrams).toBeGreaterThan(0);
        expect(recipe.waterAmountGrams).toBeGreaterThan(0);
        expect(recipe.ratio).toBeGreaterThan(0);
        expect(recipe.totalTimeSeconds).toBeGreaterThan(0);
        expect(recipe.grindSize).toBeDefined();
        expect(recipe.waterTempCelsius).toBeGreaterThanOrEqual(80);
      });

      it("should have valid, sequentially ordered stages", () => {
        expect(recipe.stages.length).toBeGreaterThan(0);

        let previousStart = -1;
        recipe.stages.forEach((stage, idx) => {
          expect(stage.id).toBeDefined();
          expect(stage.name.length).toBeGreaterThan(0);
          expect(stage.durationSeconds).toBeGreaterThan(0);
          expect(stage.startSecond).toBeGreaterThan(previousStart);
          expect(stage.instruction.length).toBeGreaterThan(0);
          expect(stage.targetWaterWeightGrams).toBeGreaterThan(0);
          expect(stage.targetWaterWeightGrams).toBeLessThanOrEqual(recipe.waterAmountGrams);

          previousStart = stage.startSecond;
        });
      });

      it("final stage target water weight should match total recipe water", () => {
        const finalStage = recipe.stages[recipe.stages.length - 1];
        expect(finalStage.targetWaterWeightGrams).toBe(recipe.waterAmountGrams);
      });
    });
  });
});
