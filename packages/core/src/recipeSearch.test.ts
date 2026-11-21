import { describe, it, expect } from "vitest";
import { matchesRecipeSearch } from "./recipeSearch";
import { matchesRecipeSearch as matchesRecipeSearchFromIndex } from "./index";
import type { BrewRecipe } from "./types";

const BASE_RECIPE: BrewRecipe = {
  id: "preset-v60-hoffmann",
  name: "Ultimate V60",
  brewMethod: "v60",
  description: "Clean high-extraction pour over with medium-fine grind.",
  author: "James Hoffmann",
  coffeeDoseGrams: 30,
  waterAmountGrams: 500,
  ratio: 16.67,
  grindSize: "Medium-Fine",
  waterTempCelsius: 98,
  totalTimeSeconds: 210,
  stages: [],
  isPreset: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("matchesRecipeSearch", () => {
  it("is re-exported from package index", () => {
    expect(matchesRecipeSearchFromIndex).toBe(matchesRecipeSearch);
  });

  it("returns true for empty or whitespace-only queries", () => {
    expect(matchesRecipeSearch(BASE_RECIPE, "")).toBe(true);
    expect(matchesRecipeSearch(BASE_RECIPE, "   \t\n ")).toBe(true);
  });

  it("matches case-insensitively across name, author, description, and brewMethod with trimming", () => {
    expect(matchesRecipeSearch(BASE_RECIPE, "  ultimate  ")).toBe(true);
    expect(matchesRecipeSearch(BASE_RECIPE, "  hoffmann  ")).toBe(true);
    expect(matchesRecipeSearch(BASE_RECIPE, "HIGH-EXTRACTION")).toBe(true);
    expect(matchesRecipeSearch(BASE_RECIPE, "V60")).toBe(true);
    expect(matchesRecipeSearch(BASE_RECIPE, "aeropress")).toBe(false);
  });

  it("matches hyphenated brewMethod slugs with either hyphens or spaces", () => {
    const frenchPressRecipe: BrewRecipe = {
      ...BASE_RECIPE,
      id: "custom-fp",
      name: "Morning Immersion",
      brewMethod: "french-press",
      description: "Full-bodied immersion brew.",
      author: "Custom",
    };

    expect(matchesRecipeSearch(frenchPressRecipe, "french-press")).toBe(true);
    expect(matchesRecipeSearch(frenchPressRecipe, "french press")).toBe(true);
    expect(matchesRecipeSearch(frenchPressRecipe, "FRENCH PRESS")).toBe(true);

    const kalitaRecipe: BrewRecipe = {
      ...BASE_RECIPE,
      id: "custom-kw",
      name: "Flat Bed Brew",
      brewMethod: "kalita-wave",
      description: "Even extraction.",
    };

    expect(matchesRecipeSearch(kalitaRecipe, "Kalita Wave")).toBe(true);
  });

  it("handles undefined author and empty description safely", () => {
    const minimalCustomRecipe: BrewRecipe = {
      ...BASE_RECIPE,
      id: "custom-minimal",
      name: "Daily Dial",
      brewMethod: "aeropress",
      author: undefined,
      description: "",
    };

    expect(matchesRecipeSearch(minimalCustomRecipe, "daily")).toBe(true);
    expect(matchesRecipeSearch(minimalCustomRecipe, "aeropress")).toBe(true);
    expect(matchesRecipeSearch(minimalCustomRecipe, "nonexistent")).toBe(false);

    const malformedRecipe = {
      ...minimalCustomRecipe,
      name: undefined as unknown as string,
    };
    expect(matchesRecipeSearch(malformedRecipe, "aeropress")).toBe(true);
    expect(matchesRecipeSearch(malformedRecipe, "nonexistent")).toBe(false);
  });
});
