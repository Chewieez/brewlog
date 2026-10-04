import { describe, it, expect } from "vitest";
import { DEFAULT_PRESET_RECIPES } from "./presets";
import { DEFAULT_INITIAL_EQUIPMENT, Equipment } from "./index";

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

describe('DEFAULT_INITIAL_EQUIPMENT', () => {
  it('should export 7 canonical starter equipment items', () => {
    expect(DEFAULT_INITIAL_EQUIPMENT).toHaveLength(7);
  });

  it('should include grinders, brewers, scales, and kettles', () => {
    const types = DEFAULT_INITIAL_EQUIPMENT.map((e) => e.type);
    expect(types).toContain('grinder');
    expect(types).toContain('brewer');
    expect(types).toContain('scale');
    expect(types).toContain('kettle');
  });

  it('should have required fields and default favorite status', () => {
    DEFAULT_INITIAL_EQUIPMENT.forEach((item: Equipment) => {
      expect(item.id).toBeDefined();
      expect(item.brand).toBeTruthy();
      expect(item.model).toBeTruthy();
      expect(item.type).toBeTruthy();
      expect(item.isFavorite).toBe(true);
      expect(item.createdAt).toBeDefined();
    });
  });
});
