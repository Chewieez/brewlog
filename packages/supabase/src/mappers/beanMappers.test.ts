import { describe, it, expect } from "vitest";
import { mapBeanRowToDomain, mapBeanDomainToInsert } from "./beanMappers";
import { BeanRow } from "../database.types";
import { Bean } from "@brewlog/core";

describe("beanMappers", () => {
  it("maps new cellar fields from Supabase row to domain", () => {
    const row: BeanRow = {
      id: "bean-1",
      user_id: "user-1",
      roaster: "Sey",
      name: "Worka Sakaro",
      origin_country: "Ethiopia",
      region: "Gedeb",
      farm: "Worka",
      variety: ["Kurume", "Dega"],
      altitude_meters: 2100,
      process: "washed",
      roast_level: "light",
      roast_date: "2026-09-01",
      recommended_rest_days: 14,
      flavor_notes: ["Peach", "Jasmine"],
      rating: 4.8,
      bag_weight_grams: 250,
      remaining_grams: 214,
      price: 24,
      is_favorite: true,
      is_frozen: true,
      frozen_date: "2026-09-15",
      is_archived: false,
      notes: "Floral and sweet",
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-15T00:00:00Z",
    };

    const domain = mapBeanRowToDomain(row);
    expect(domain.recommendedRestDays).toBe(14);
    expect(domain.isFrozen).toBe(true);
    expect(domain.frozenDate).toBe("2026-09-15");
    expect(domain.isArchived).toBe(false);
  });

  it("maps domain with cellar fields to Supabase insert payload", () => {
    const bean: Omit<Bean, "id" | "createdAt"> = {
      roaster: "Passenger",
      name: "Agaro",
      flavorNotes: ["Citrus"],
      recommendedRestDays: 21,
      isFrozen: true,
      frozenDate: "2026-09-20",
      isArchived: false,
    };

    const insert = mapBeanDomainToInsert(bean, "user-1");
    expect(insert.recommended_rest_days).toBe(21);
    expect(insert.is_frozen).toBe(true);
    expect(insert.frozen_date).toBe("2026-09-20");
    expect(insert.is_archived).toBe(false);
  });

  it("handles fallback defaults when cellar fields are absent or null", () => {
    const row: BeanRow = {
      id: "bean-2",
      user_id: "user-1",
      roaster: "Tim Wendelboe",
      name: "Caballero",
      origin_country: "Honduras",
      region: null,
      farm: null,
      variety: null,
      altitude_meters: null,
      process: null,
      roast_level: null,
      roast_date: null,
      recommended_rest_days: null,
      flavor_notes: [],
      rating: null,
      bag_weight_grams: null,
      remaining_grams: null,
      price: null,
      is_favorite: false,
      is_frozen: false,
      frozen_date: null,
      is_archived: false,
      notes: null,
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    };

    const domain = mapBeanRowToDomain(row);
    expect(domain.recommendedRestDays).toBeUndefined();
    expect(domain.isFrozen).toBe(false);
    expect(domain.frozenDate).toBeUndefined();
    expect(domain.isArchived).toBe(false);

    const bean: Omit<Bean, "id" | "createdAt"> = {
      roaster: "Tim Wendelboe",
      name: "Caballero",
      flavorNotes: [],
    };

    const insert = mapBeanDomainToInsert(bean, "user-1");
    expect(insert.recommended_rest_days).toBeNull();
    expect(insert.is_frozen).toBe(false);
    expect(insert.frozen_date).toBeNull();
    expect(insert.is_archived).toBe(false);
  });

  it("strictly preserves remainingGrams === 0 in both domain and insert payloads", () => {
    const row: BeanRow = {
      id: "bean-zero",
      user_id: "user-1",
      roaster: "Sey",
      name: "Empty Bag",
      origin_country: null,
      region: null,
      farm: null,
      variety: null,
      altitude_meters: null,
      process: null,
      roast_level: null,
      roast_date: null,
      recommended_rest_days: null,
      flavor_notes: [],
      rating: null,
      bag_weight_grams: 250,
      remaining_grams: 0,
      price: null,
      is_favorite: false,
      is_frozen: false,
      frozen_date: null,
      is_archived: true,
      notes: null,
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    };

    const domain = mapBeanRowToDomain(row);
    expect(domain.remainingGrams).toBe(0);

    const bean: Omit<Bean, "id" | "createdAt"> = {
      roaster: "Sey",
      name: "Empty Bag",
      bagWeightGrams: 250,
      remainingGrams: 0,
      flavorNotes: [],
    };

    const insert = mapBeanDomainToInsert(bean, "user-1");
    expect(insert.remaining_grams).toBe(0);
  });
});
