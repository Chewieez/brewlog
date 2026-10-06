import {
  BrewRecipe,
  BrewStage,
  BrewMethodType,
  StageType,
  RecipeGrinderSetting,
} from "@brewlog/core";
import {
  RecipeRow,
  RecipeInsert,
  RecipeStageRow,
  RecipeStageInsert,
  Json,
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

  let grinderSettings: RecipeGrinderSetting[] | undefined;
  if (Array.isArray(row.grinder_settings) && row.grinder_settings.length > 0) {
    grinderSettings = row.grinder_settings as unknown as RecipeGrinderSetting[];
  } else if (typeof row.grinder_settings === "string" && row.grinder_settings.trim() !== "") {
    try {
      const parsed = JSON.parse(row.grinder_settings);
      if (Array.isArray(parsed) && parsed.length > 0) {
        grinderSettings = parsed;
      }
    } catch {
      // ignore parse error
    }
  }

  if ((!grinderSettings || grinderSettings.length === 0) && row.recommended_grinder_id) {
    grinderSettings = [
      {
        grinderId: row.recommended_grinder_id,
        setting: row.grind_size || "",
      },
    ];
  }

  return {
    id: row.id,
    userId: row.user_id || undefined,
    name: row.name,
    brewMethod: row.brew_method as BrewMethodType,
    recommendedBrewerId: row.recommended_brewer_id || undefined,
    recommendedGrinderId:
      row.recommended_grinder_id || grinderSettings?.[0]?.grinderId || undefined,
    grinderSettings:
      grinderSettings && grinderSettings.length > 0 ? grinderSettings : undefined,
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
  recommended_grinder_id:
    recipe.grinderSettings?.[0]?.grinderId || recipe.recommendedGrinderId || null,
  grinder_settings: (recipe.grinderSettings || []) as unknown as Json,
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

