import { describe, it, expect } from 'vitest';
import { DEFAULT_PRESET_RECIPES, BrewRecipe } from '@brewlog/core';
import { getAvailableMethods, AVAILABLE_METHODS } from './recipeUtils';

describe('recipeUtils - getAvailableMethods', () => {
  it('derives unique methods from DEFAULT_PRESET_RECIPES', () => {
    const methods = getAvailableMethods(DEFAULT_PRESET_RECIPES);

    // Must include methods that have recipes
    expect(methods).toEqual(['v60', 'aeropress', 'flair']);
    expect(methods).toContain('v60');
    expect(methods).toContain('aeropress');
    expect(methods).toContain('flair');

    // Must NOT include methods without recipes
    expect(methods).not.toContain('chemex');
    expect(methods).not.toContain('french-press');
  });

  it('deduplicates methods when multiple recipes share the same brewMethod', () => {
    const v60Recipes = DEFAULT_PRESET_RECIPES.filter((r) => r.brewMethod === 'v60');
    expect(v60Recipes.length).toBeGreaterThan(1);

    const methods = getAvailableMethods(DEFAULT_PRESET_RECIPES);
    const v60Occurrences = methods.filter((m) => m === 'v60');
    expect(v60Occurrences.length).toBe(1);
  });

  it('returns empty array when recipe list is empty', () => {
    expect(getAvailableMethods([])).toEqual([]);
  });

  it('derives methods dynamically for any custom recipe set', () => {
    const customRecipes = [
      { brewMethod: 'chemex' },
      { brewMethod: 'chemex' },
      { brewMethod: 'kalita-wave' },
    ] as BrewRecipe[];

    expect(getAvailableMethods(customRecipes)).toEqual(['chemex', 'kalita-wave']);
  });

  it('AVAILABLE_METHODS matches getAvailableMethods(DEFAULT_PRESET_RECIPES)', () => {
    expect(AVAILABLE_METHODS).toEqual(getAvailableMethods(DEFAULT_PRESET_RECIPES));
  });
});
