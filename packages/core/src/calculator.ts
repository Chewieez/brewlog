import { BrewRecipe, BrewStage, CuppingAttributes } from "./types";

export function calculateWaterAmount(coffeeDoseGrams: number, ratio: number): number {
  return Math.round(coffeeDoseGrams * ratio);
}

export function calculateCoffeeDose(waterAmountGrams: number, ratio: number): number {
  if (ratio <= 0) return 0;
  return Number((waterAmountGrams / ratio).toFixed(1));
}

export function calculateRatio(coffeeDoseGrams: number, waterAmountGrams: number): number {
  if (coffeeDoseGrams <= 0) return 0;
  return Number((waterAmountGrams / coffeeDoseGrams).toFixed(1));
}

export function rescaleRecipeDose(recipe: BrewRecipe, newDoseGrams: number): BrewRecipe {
  if (recipe.coffeeDoseGrams <= 0 || newDoseGrams <= 0) return recipe;

  const scale = newDoseGrams / recipe.coffeeDoseGrams;
  const newWaterAmount = Math.round(recipe.waterAmountGrams * scale);

  const rescaledStages: BrewStage[] = recipe.stages.map((stage) => ({
    ...stage,
    targetWaterWeightGrams: Math.round(stage.targetWaterWeightGrams * scale),
  }));

  return {
    ...recipe,
    coffeeDoseGrams: newDoseGrams,
    waterAmountGrams: newWaterAmount,
    stages: rescaledStages,
  };
}

export function calculateScaScore(scores: CuppingAttributes): number {
  const sum =
    scores.fragranceAroma +
    scores.acidity +
    scores.sweetness +
    scores.body +
    scores.clarity +
    scores.aftertaste +
    scores.balance +
    scores.overall;

  const score = Math.round((sum / 80) * 100 * 10) / 10;
  return Math.min(100, Math.max(0, score));
}

export function calculateDaysOffRoast(
  roastDateStr: string,
  referenceDate: Date = new Date()
): number {
  try {
    if (!roastDateStr || typeof roastDateStr !== "string") return 0;

    // Match calendar year, month, and day from YYYY-MM-DD (or ISO strings)
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(roastDateStr.trim());
    let roastUtcMidnight: number;

    if (match) {
      const year = parseInt(match[1], 10);
      const monthIndex = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      roastUtcMidnight = Date.UTC(year, monthIndex, day);
    } else {
      const parsed = new Date(roastDateStr);
      if (isNaN(parsed.getTime())) return 0;
      roastUtcMidnight = Date.UTC(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate()
      );
    }

    // Normalize reference date (local today) to UTC midnight for exact calendar day comparison
    const refUtcMidnight = Date.UTC(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate()
    );

    const diffDays = Math.round(
      (refUtcMidnight - roastUtcMidnight) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}

export function getRestingStatus(daysOffRoast: number): {
  status: "resting" | "peak" | "aging" | "past-peak";
  label: string;
  color: string;
} {
  if (daysOffRoast < 5) {
    return {
      status: "resting",
      label: "Needs Rest (De-gassing)",
      color: "#eab308",
    };
  }
  if (daysOffRoast <= 28) {
    return {
      status: "peak",
      label: "Peak Flavor Window",
      color: "#22c55e",
    };
  }
  if (daysOffRoast <= 60) {
    return {
      status: "aging",
      label: "Good (Drink Soon)",
      color: "#f97316",
    };
  }
  return {
    status: "past-peak",
    label: "Past Peak",
    color: "#94a3b8",
  };
}
