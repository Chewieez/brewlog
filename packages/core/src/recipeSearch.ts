import type { BrewRecipe } from "./types";

/**
 * Match a recipe against a user search query across name, author,
 * description, and brew method (both raw slug and space-normalized).
 */
export function matchesRecipeSearch(recipe: BrewRecipe, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }

  const rawMethod = (recipe.brewMethod ?? "").toLowerCase();
  const spacedMethod = rawMethod.replace(/-/g, " ");

  return (
    (recipe.name ?? "").toLowerCase().includes(q) ||
    (recipe.author ?? "").toLowerCase().includes(q) ||
    (recipe.description ?? "").toLowerCase().includes(q) ||
    rawMethod.includes(q) ||
    spacedMethod.includes(q)
  );
}
