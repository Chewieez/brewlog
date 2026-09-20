import { BrewRecipe, DEFAULT_PRESET_RECIPES } from '@brewlog/core';

/**
 * Derives unique brew methods dynamically from a list of brew recipes.
 * Only methods with at least one matching recipe are included.
 */
export const getAvailableMethods = (recipes: BrewRecipe[]): string[] => {
  return Array.from(new Set(recipes.map((r) => r.brewMethod)));
};

/**
 * Available brew methods derived dynamically from default preset recipes.
 */
export const AVAILABLE_METHODS = getAvailableMethods(DEFAULT_PRESET_RECIPES);
