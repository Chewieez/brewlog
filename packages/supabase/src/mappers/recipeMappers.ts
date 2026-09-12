import { BrewRecipe, BrewStage, BrewMethodType, StageType } from "@brewlog/core";
import {
  RecipeRow,
  RecipeInsert,
  RecipeStageRow,
  RecipeStageInsert,
} from "../database.types";

export const mapRecipeStageRowToDomain = (row: RecipeStageRow): BrewStage => ({
  id: row.id,
  name: row.name,
  startSecond: row.start_second,
  durationSeconds: row.duration_seconds,
  targetWaterWeightGrams: Number(row.target_water_weight_grams),
  instruction: row.instruction,
  stageType: (row.stage_type || "other") as StageType,
});

export const mapRecipeRowToDomain = (
  row: RecipeRow,
  stages: RecipeStageRow[] = []
): BrewRecipe => {
  const sortedStages = [...stages].sort((a, b) => a.step_order - b.step_order);
  return {
    id: row.id,
    userId: row.user_id || undefined,
    name: row.name,
    brewMethod: row.brew_method as BrewMethodType,
    recommendedBrewerId: row.recommended_brewer_id || undefined,
    recommendedGrinderId: row.recommended_grinder_id || undefined,
    description: row.description || "",
    author: row.author || undefined,
    coffeeDoseGrams: Number(row.coffee_dose_grams),
    waterAmountGrams: Number(row.water_amount_grams),
    ratio: Number(row.ratio),
    grindSize: row.grind_size,
    waterTempCelsius: row.water_temp_celsius,
    totalTimeSeconds: row.total_time_seconds,
    stages: sortedStages.map(mapRecipeStageRowToDomain),
    notes: row.notes || undefined,
    isPreset: row.is_preset ?? false,
    isFavorite: row.is_favorite ?? false,
    createdAt: row.created_at,
  };
};

export const mapRecipeDomainToInsert = (
  recipe: Omit<BrewRecipe, "id" | "createdAt">,
  userId?: string
): RecipeInsert => ({
  user_id: userId || null,
  name: recipe.name,
  brew_method: recipe.brewMethod,
  recommended_brewer_id: recipe.recommendedBrewerId || null,
  recommended_grinder_id: recipe.recommendedGrinderId || null,
  description: recipe.description || "",
  author: recipe.author || null,
  coffee_dose_grams: recipe.coffeeDoseGrams,
  water_amount_grams: recipe.waterAmountGrams,
  ratio: recipe.ratio,
  grind_size: recipe.grindSize,
  water_temp_celsius: recipe.waterTempCelsius,
  total_time_seconds: recipe.totalTimeSeconds,
  is_preset: recipe.isPreset ?? false,
  is_favorite: recipe.isFavorite ?? false,
  notes: recipe.notes || null,
});

export const mapRecipeStageDomainToInsert = (
  stage: BrewStage,
  recipeId: string,
  stepOrder: number
): RecipeStageInsert => ({
  recipe_id: recipeId,
  step_order: stepOrder,
  name: stage.name,
  start_second: stage.startSecond,
  duration_seconds: stage.durationSeconds,
  target_water_weight_grams: stage.targetWaterWeightGrams,
  instruction: stage.instruction,
  stage_type: stage.stageType,
});

