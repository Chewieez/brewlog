import { describe, it, expect } from "vitest";
import {
  mapBeanRowToDomain,
  mapBeanDomainToInsert,
  mapTastingLogRowToDomain,
  mapTastingLogDomainToInsert,
  mapEquipmentRowToDomain,
  mapEquipmentDomainToInsert,
} from "./index";
import { BeanRow, TastingLogRow, EquipmentRow } from "../database.types";
import { Bean, TastingLog, Equipment } from "@brewlog/core";

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
        acidity: 8.0,
        sweetness: 8.5,
        body: 8.0,
        clarity: 8.0,
        aftertaste: 8.0,
        balance: 8.5,
        overall: 8.5,
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
      expect(domain.scores.acidity).toBe(8.0);
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
          acidity: 9.0,
          sweetness: 9.5,
          body: 8.5,
          clarity: 9.0,
          aftertaste: 9.0,
          balance: 9.0,
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
});
