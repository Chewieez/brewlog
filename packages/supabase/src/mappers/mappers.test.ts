import { describe, it, expect } from "vitest";
import {
  mapBeanRowToDomain,
  mapBeanDomainToInsert,
  mapTastingLogRowToDomain,
  mapTastingLogDomainToInsert,
  mapEquipmentRowToDomain,
  mapEquipmentDomainToInsert,
  mapRecipeRowToDomain,
  mapRecipeDomainToInsert,
  mapRecipeStageRowToDomain,
  mapRecipeStageDomainToInsert,
} from "./index";
import {
  BeanRow,
  TastingLogRow,
  EquipmentRow,
  RecipeRow,
  RecipeStageRow,
} from "../database.types";
import { Bean, TastingLog, Equipment, BrewRecipe, BrewStage } from "@brewlog/core";

describe("Shared Mappers (@brewlog/supabase)", () => {
  describe("Bean Mappers", () => {
    it("maps raw PostgreSQL BeanRow to domain Bean entity", () => {
      const row: BeanRow = {
        id: "bean-123",
        user_id: "user-456",
        roaster: "Onyx Coffee Lab",
        name: "Southern Weather",
        origin_country: "Colombia / Ethiopia",
        region: "Huila / Yirgacheffe",
        farm: "Various Smallholders",
        variety: ["Caturra", "Castillo", "Heirloom"],
        altitude_meters: 1850,
        process: "washed",
        roast_level: "medium",
        roast_date: "2026-08-20",
        flavor_notes: ["Milk Chocolate", "Plum", "Candied Walnuts"],
        rating: 4.8,
        bag_weight_grams: 340,
        remaining_grams: 280,
        price: 21.5,
        is_favorite: true,
        notes: "Great balanced daily driver espresso and pour-over",
        created_at: "2026-08-25T12:00:00Z",
        updated_at: "2026-08-25T12:00:00Z",
      };

      const domain = mapBeanRowToDomain(row);

      expect(domain.id).toBe("bean-123");
      expect(domain.userId).toBe("user-456");
      expect(domain.roaster).toBe("Onyx Coffee Lab");
      expect(domain.name).toBe("Southern Weather");
      expect(domain.originCountry).toBe("Colombia / Ethiopia");
      expect(domain.process).toBe("washed");
      expect(domain.roastLevel).toBe("medium");
      expect(domain.bagWeightGrams).toBe(340);
      expect(domain.bagWeightOz).toBe(12); // 340 / 28.3495 ≈ 12.0
      expect(domain.isFavorite).toBe(true);
    });

    it("maps domain Bean to PostgreSQL BeanInsert payload", () => {
      const bean: Omit<Bean, "id" | "createdAt"> = {
        roaster: "Sey",
        name: "Worka Sakaro",
        originCountry: "Ethiopia",
        variety: ["Kurume", "Dega"],
        altitudeMeters: 2000,
        process: "washed",
        roastLevel: "light",
        roastDate: "2026-09-01",
        flavorNotes: ["Peach Blossom", "Meyer Lemon"],
        bagWeightGrams: 250,
        remainingGrams: 250,
        price: 24,
        isFavorite: false,
      };

      const payload = mapBeanDomainToInsert(bean, "user-999");

      expect(payload.user_id).toBe("user-999");
      expect(payload.roaster).toBe("Sey");
      expect(payload.name).toBe("Worka Sakaro");
      expect(payload.origin_country).toBe("Ethiopia");
      expect(payload.process).toBe("washed");
      expect(payload.roast_level).toBe("light");
      expect(payload.bag_weight_grams).toBe(250);
      expect(payload.remaining_grams).toBe(250);
      expect(payload.is_favorite).toBe(false);
    });
  });

  describe("TastingLog Mappers", () => {
    it("maps raw PostgreSQL TastingLogRow to domain TastingLog entity", () => {
      const row: TastingLogRow = {
        id: "log-1",
        user_id: "user-456",
        bean_id: "bean-123",
        recipe_id: "recipe-789",
        grinder_id: "eq-1",
        brewer_id: "eq-2",
        grinder_snapshot: "Comandante C40",
        brewer_snapshot: "Hario V60 02",
        bean_name_snapshot: "Southern Weather",
        roaster_snapshot: "Onyx",
        recipe_name_snapshot: "Hoffmann V60",
        brew_method: "v60",
        brew_date: "2026-09-02T10:00:00Z",
        coffee_dose_grams: 20,
        water_amount_grams: 300,
        actual_time_seconds: 210,
        grind_setting: "22 clicks",
        water_temp_celsius: 94,
        fragrance_aroma: 8.5,
        flavor: 8.5,
        aftertaste: 8.0,
        acidity: 8.0,
        body: 8.0,
        balance: 8.5,
        uniformity: 10.0,
        clean_cup: 10.0,
        sweetness: 8.5,
        overall: 8.5,
        clarity: 8.0,
        calculated_sca_score: 87.5,
        rating: 4.5,
        flavor_tags: ["Chocolate", "Plum"],
        notes: "Very juicy and sweet drawdown",
        would_brew_again: true,
        created_at: "2026-09-02T10:05:00Z",
      };

      const domain = mapTastingLogRowToDomain(row);

      expect(domain.id).toBe("log-1");
      expect(domain.brewMethod).toBe("v60");
      expect(domain.scores.fragranceAroma).toBe(8.5);
      expect(domain.scores.flavor).toBe(8.5);
      expect(domain.scores.aftertaste).toBe(8.0);
      expect(domain.scores.acidity).toBe(8.0);
      expect(domain.scores.body).toBe(8.0);
      expect(domain.scores.balance).toBe(8.5);
      expect(domain.scores.uniformity).toBe(10.0);
      expect(domain.scores.cleanCup).toBe(10.0);
      expect(domain.scores.sweetness).toBe(8.5);
      expect(domain.scores.overall).toBe(8.5);
      expect(domain.calculatedScaScore).toBe(87.5);
      expect(domain.wouldBrewAgain).toBe(true);
    });

    it("maps domain TastingLog to PostgreSQL TastingLogInsert payload", () => {
      const log: Omit<TastingLog, "id" | "createdAt"> = {
        beanNameSnapshot: "Geisha",
        roasterSnapshot: "Panama Roasters",
        recipeNameSnapshot: "4:6 Method",
        brewMethod: "v60",
        brewDate: "2026-09-05T08:00:00Z",
        coffeeDoseGrams: 15,
        waterAmountGrams: 225,
        actualTimeSeconds: 195,
        grindSetting: "Coarse",
        waterTempCelsius: 91,
        scores: {
          fragranceAroma: 9.0,
          flavor: 9.0,
          aftertaste: 9.0,
          acidity: 9.0,
          body: 8.5,
          balance: 9.0,
          uniformity: 10.0,
          cleanCup: 10.0,
          sweetness: 9.5,
          overall: 9.0,
        },
        calculatedScaScore: 92.5,
        rating: 5,
        flavorTags: ["Jasmine", "Bergamot", "Peach"],
        notes: "Exceptional cup",
        wouldBrewAgain: true,
      };

      const payload = mapTastingLogDomainToInsert(log, "user-456");

      expect(payload.user_id).toBe("user-456");
      expect(payload.bean_name_snapshot).toBe("Geisha");
      expect(payload.fragrance_aroma).toBe(9.0);
      expect(payload.flavor).toBe(9.0);
      expect(payload.uniformity).toBe(10.0);
      expect(payload.clean_cup).toBe(10.0);
      expect(payload.calculated_sca_score).toBe(92.5);
      expect(payload.flavor_tags).toEqual(["Jasmine", "Bergamot", "Peach"]);
    });
  });

  describe("Equipment Mappers", () => {
    it("maps raw PostgreSQL EquipmentRow to domain Equipment entity", () => {
      const row: EquipmentRow = {
        id: "eq-100",
        user_id: "user-456",
        type: "grinder",
        brand: "Fellow",
        model: "Ode Gen 2",
        sub_type: "flat-burr",
        setting_scale_type: "stepped-numbers",
        is_favorite: true,
        notes: "Calibrated to 1 click off chirp",
        created_at: "2026-09-01T10:00:00Z",
      };

      const domain = mapEquipmentRowToDomain(row);

      expect(domain.id).toBe("eq-100");
      expect(domain.type).toBe("grinder");
      expect(domain.brand).toBe("Fellow");
      expect(domain.model).toBe("Ode Gen 2");
      expect(domain.settingScaleType).toBe("stepped-numbers");
      expect(domain.isFavorite).toBe(true);
    });

    it("maps domain Equipment to PostgreSQL EquipmentInsert payload", () => {
      const item: Omit<Equipment, "id" | "createdAt"> = {
        type: "brewer",
        brand: "Hario",
        model: "Switch 02",
        subType: "hybrid-dripper",
        isFavorite: true,
      };

      const payload = mapEquipmentDomainToInsert(item, "user-456");

      expect(payload.user_id).toBe("user-456");
      expect(payload.type).toBe("brewer");
      expect(payload.brand).toBe("Hario");
      expect(payload.model).toBe("Switch 02");
      expect(payload.sub_type).toBe("hybrid-dripper");
      expect(payload.is_favorite).toBe(true);
    });
  });

  describe("Recipe Mappers", () => {
    it("maps raw PostgreSQL RecipeRow and unordered RecipeStageRows to domain BrewRecipe entity", () => {
      const row: RecipeRow = {
        id: "recipe-456",
        user_id: "user-123",
        name: "Hoffmann V60 1-Cup",
        brew_method: "v60",
        recommended_brewer_id: "eq-v60",
        recommended_grinder_id: "eq-ode",
        description: "Classic single cup pour over technique",
        author: "James Hoffmann",
        coffee_dose_grams: 15,
        water_amount_grams: 250,
        ratio: 16.67,
        grind_size: "Medium-Fine",
        water_temp_celsius: 99,
        total_time_seconds: 210,
        is_preset: false,
        is_favorite: true,
        notes: "Great clarity and sweetness",
        created_at: "2026-09-01T12:00:00Z",
        updated_at: "2026-09-01T12:00:00Z",
      };

      // Passed out of order to verify sorting by step_order ascending
      const stages: RecipeStageRow[] = [
        {
          id: "stage-2",
          recipe_id: "recipe-456",
          step_order: 1,
          name: "Main Pour",
          start_second: 45,
          duration_seconds: 60,
          target_water_weight_grams: 250,
          instruction: "Pour steadily in circles up to 250g",
          stage_type: "pour",
        },
        {
          id: "stage-1",
          recipe_id: "recipe-456",
          step_order: 0,
          name: "Bloom",
          start_second: 0,
          duration_seconds: 45,
          target_water_weight_grams: 50,
          instruction: "Saturate grounds and swirl",
          stage_type: "bloom",
        },
        {
          id: "stage-3",
          recipe_id: "recipe-456",
          step_order: 2,
          name: "Drawdown",
          start_second: 105,
          duration_seconds: 105,
          target_water_weight_grams: 250,
          instruction: "Swirl once and allow full drawdown",
          stage_type: "drawdown",
        },
      ];

      const domain = mapRecipeRowToDomain(row, stages);

      expect(domain.id).toBe("recipe-456");
      expect(domain.userId).toBe("user-123");
      expect(domain.name).toBe("Hoffmann V60 1-Cup");
      expect(domain.brewMethod).toBe("v60");
      expect(domain.recommendedBrewerId).toBe("eq-v60");
      expect(domain.recommendedGrinderId).toBe("eq-ode");
      expect(domain.description).toBe("Classic single cup pour over technique");
      expect(domain.author).toBe("James Hoffmann");
      expect(domain.coffeeDoseGrams).toBe(15);
      expect(domain.waterAmountGrams).toBe(250);
      expect(domain.ratio).toBe(16.67);
      expect(domain.grindSize).toBe("Medium-Fine");
      expect(domain.waterTempCelsius).toBe(99);
      expect(domain.totalTimeSeconds).toBe(210);
      expect(domain.isPreset).toBe(false);
      expect(domain.isFavorite).toBe(true);
      expect(domain.notes).toBe("Great clarity and sweetness");
      expect(domain.createdAt).toBe("2026-09-01T12:00:00Z");

      // Verify stages were sorted correctly
      expect(domain.stages).toHaveLength(3);
      expect(domain.stages[0].id).toBe("stage-1");
      expect(domain.stages[0].name).toBe("Bloom");
      expect(domain.stages[0].startSecond).toBe(0);
      expect(domain.stages[0].stageType).toBe("bloom");

      expect(domain.stages[1].id).toBe("stage-2");
      expect(domain.stages[1].name).toBe("Main Pour");
      expect(domain.stages[1].startSecond).toBe(45);

      expect(domain.stages[2].id).toBe("stage-3");
      expect(domain.stages[2].name).toBe("Drawdown");
      expect(domain.stages[2].startSecond).toBe(105);
    });

    it("maps domain BrewRecipe to PostgreSQL RecipeInsert payload", () => {
      const recipe: Omit<BrewRecipe, "id" | "createdAt"> = {
        name: "Aeropress Inverted",
        brewMethod: "aeropress",
        description: "Rich immersion brew profile",
        author: "Tim Wendelboe",
        coffeeDoseGrams: 14,
        waterAmountGrams: 200,
        ratio: 14.3,
        grindSize: "Medium",
        waterTempCelsius: 85,
        totalTimeSeconds: 120,
        stages: [],
        isPreset: false,
        isFavorite: true,
        notes: "Inverted method with 1 min steep",
      };

      const payload = mapRecipeDomainToInsert(recipe, "user-789");

      expect(payload.user_id).toBe("user-789");
      expect(payload.name).toBe("Aeropress Inverted");
      expect(payload.brew_method).toBe("aeropress");
      expect(payload.author).toBe("Tim Wendelboe");
      expect(payload.coffee_dose_grams).toBe(14);
      expect(payload.water_amount_grams).toBe(200);
      expect(payload.ratio).toBe(14.3);
      expect(payload.grind_size).toBe("Medium");
      expect(payload.water_temp_celsius).toBe(85);
      expect(payload.total_time_seconds).toBe(120);
      expect(payload.is_preset).toBe(false);
      expect(payload.is_favorite).toBe(true);
      expect(payload.notes).toBe("Inverted method with 1 min steep");
    });

    it("maps RecipeStageRow to domain BrewStage", () => {
      const row: RecipeStageRow = {
        id: "stg-99",
        recipe_id: "rec-1",
        step_order: 0,
        name: "Initial Bloom",
        start_second: 0,
        duration_seconds: 35,
        target_water_weight_grams: 60,
        instruction: "Wet grounds thoroughly",
        stage_type: "bloom",
      };

      const domain = mapRecipeStageRowToDomain(row);

      expect(domain.id).toBe("stg-99");
      expect(domain.name).toBe("Initial Bloom");
      expect(domain.startSecond).toBe(0);
      expect(domain.durationSeconds).toBe(35);
      expect(domain.targetWaterWeightGrams).toBe(60);
      expect(domain.instruction).toBe("Wet grounds thoroughly");
      expect(domain.stageType).toBe("bloom");
    });

    it("maps BrewStage domain entity to RecipeStageInsert payload", () => {
      const stage: BrewStage = {
        id: "temp-stage",
        name: "Plunge",
        startSecond: 60,
        durationSeconds: 30,
        targetWaterWeightGrams: 200,
        instruction: "Gently press plunger down over 30 seconds",
        stageType: "press",
      };

      const payload = mapRecipeStageDomainToInsert(stage, "rec-123", 2);

      expect(payload.recipe_id).toBe("rec-123");
      expect(payload.step_order).toBe(2);
      expect(payload.name).toBe("Plunge");
      expect(payload.start_second).toBe(60);
      expect(payload.duration_seconds).toBe(30);
      expect(payload.target_water_weight_grams).toBe(200);
      expect(payload.instruction).toBe("Gently press plunger down over 30 seconds");
      expect(payload.stage_type).toBe("press");
    });
  });
});

