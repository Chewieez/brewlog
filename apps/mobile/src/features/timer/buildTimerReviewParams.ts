import { BrewRecipe, Equipment } from '@brewlog/core';

export interface TimerReviewParamsInput {
  activeRecipe: BrewRecipe;
  activeTimerDose: number;
  elapsedSeconds: number;
  activeBrewBean?: { id: string } | null;
  splits?: Array<{ label: string; second: number; intervalSeconds: number }>;
  equipment?: Equipment[];
}

export function buildTimerReviewParams({
  activeRecipe,
  activeTimerDose,
  elapsedSeconds,
  activeBrewBean,
  splits = [],
  equipment,
}: TimerReviewParamsInput): Record<string, string> {
  let formattedSplitsNotes: string | undefined;
  if (splits.length > 0) {
    const formattedSplits = splits
      .map(
        (s) =>
          `• ${s.label}: ${Math.floor(s.second / 60)}:${String(s.second % 60).padStart(2, '0')} (+${s.intervalSeconds}s)`
      )
      .join('\n');
    formattedSplitsNotes = `Free Brew Splits:\n${formattedSplits}`;
  }

  const reviewParams: Record<string, string> = {
    fromTimer: 'true',
    brewMethod: activeRecipe.brewMethod,
    dose: String(activeTimerDose),
    water: String(activeRecipe.waterAmountGrams),
    actualTime: String(elapsedSeconds),
  };

  if (activeBrewBean?.id) {
    reviewParams.beanId = activeBrewBean.id;
  }
  if (activeRecipe.id) {
    reviewParams.recipeId = activeRecipe.id;
    reviewParams.recipeName = activeRecipe.name;
  }

  const primaryGrinder = activeRecipe.grinderSettings?.find(
    (gs) => gs.grinderId && (!equipment || equipment.some((e) => e.id === gs.grinderId))
  );

  if (primaryGrinder) {
    reviewParams.grinderId = primaryGrinder.grinderId;
    const grindVal = primaryGrinder.setting || activeRecipe.grindSize;
    if (grindVal) {
      reviewParams.grind = grindVal;
    }
  } else {
    const isRecommendedInEquipment = Boolean(
      activeRecipe.recommendedGrinderId &&
      (!equipment || equipment.some((e) => e.id === activeRecipe.recommendedGrinderId))
    );
    if (isRecommendedInEquipment && activeRecipe.recommendedGrinderId) {
      reviewParams.grinderId = activeRecipe.recommendedGrinderId;
    }
    if (activeRecipe.grindSize) {
      reviewParams.grind = activeRecipe.grindSize;
    }
  }

  if (activeRecipe.waterTempCelsius) {
    reviewParams.temp = String(activeRecipe.waterTempCelsius);
  }
  if (activeRecipe.recommendedBrewerId) {
    reviewParams.brewerId = activeRecipe.recommendedBrewerId;
  }
  if (formattedSplitsNotes) {
    reviewParams.notes = formattedSplitsNotes;
  }

  return reviewParams;
}
