import { BrewRecipe, BrewSplit, BrewStage, CuppingAttributes } from "./types";

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

export function calculateTargetWater(coffeeDoseGrams: number, ratio: number): number {
  if (coffeeDoseGrams <= 0 || ratio <= 0) return 0;
  return Math.round(coffeeDoseGrams * ratio);
}

export function calculateTargetCoffee(waterAmountGrams: number, ratio: number): number {
  if (waterAmountGrams <= 0 || ratio <= 0) return 0;
  return Number((waterAmountGrams / ratio).toFixed(1));
}

export interface ProportionalScaleParams {
  sourceCoffee: number;
  sourceWater: number;
  targetCoffee?: number;
  targetWater?: number;
}

export interface ProportionalScaleResult {
  ratio: number;
  targetCoffee: number;
  targetWater: number;
}

export function solveProportionalScale(params: ProportionalScaleParams): ProportionalScaleResult {
  const { sourceCoffee, sourceWater, targetCoffee, targetWater } = params;
  if (sourceCoffee <= 0 || sourceWater <= 0) {
    return {
      ratio: 0,
      targetCoffee: targetCoffee ?? 0,
      targetWater: targetWater ?? 0,
    };
  }

  const ratio = Number((sourceWater / sourceCoffee).toFixed(1));

  if (targetCoffee !== undefined && targetCoffee > 0) {
    const calculatedWater = Math.round(targetCoffee * ratio);
    return {
      ratio,
      targetCoffee,
      targetWater: calculatedWater,
    };
  }

  if (targetWater !== undefined && targetWater > 0) {
    const calculatedCoffee = Number((targetWater / ratio).toFixed(1));
    return {
      ratio,
      targetCoffee: calculatedCoffee,
      targetWater,
    };
  }

  return {
    ratio,
    targetCoffee: sourceCoffee,
    targetWater: sourceWater,
  };
}

export function splitsToRecipeStages(
  splits: BrewSplit[],
  totalElapsedSeconds: number,
  totalWaterAmountGrams: number
): BrewStage[] {
  const safeTotalTime = Math.max(1, totalElapsedSeconds);

  if (!splits || splits.length === 0) {
    return [
      {
        id: 'stage-1',
        name: 'Full Extraction',
        startSecond: 0,
        durationSeconds: safeTotalTime,
        targetWaterWeightGrams: totalWaterAmountGrams,
        instruction: 'Pour total water and allow drawdown.',
        stageType: 'pour',
      },
    ];
  }

  const sortedSplits = [...splits].sort((a, b) => a.second - b.second);
  const stages: BrewStage[] = [];
  let prevSecond = 0;

  sortedSplits.forEach((split, idx) => {
    const startSecond = prevSecond;
    const duration = Math.max(1, split.second - startSecond);
    const stageWater = split.waterWeightGrams !== undefined
      ? split.waterWeightGrams
      : Math.round(((idx + 1) / (sortedSplits.length + 1)) * totalWaterAmountGrams);

    stages.push({
      id: `stage-${idx + 1}`,
      name: split.label || `Stage ${idx + 1}`,
      startSecond,
      durationSeconds: duration,
      targetWaterWeightGrams: stageWater,
      instruction: `Execute ${split.label.toLowerCase()} phase.`,
      stageType: split.tag === 'bloom' ? 'bloom' : split.tag === 'drawdown' ? 'wait' : 'pour',
    });

    prevSecond = split.second;
  });

  if (safeTotalTime > prevSecond) {
    stages.push({
      id: `stage-${stages.length + 1}`,
      name: 'Finish & Drain',
      startSecond: prevSecond,
      durationSeconds: safeTotalTime - prevSecond,
      targetWaterWeightGrams: totalWaterAmountGrams,
      instruction: 'Final drawdown and decant.',
      stageType: 'wait',
    });
  }

  return stages;
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

export function calculateScaScore(scores: CuppingAttributes, defects: number = 0): number {
  // Backward compatibility: If evaluating an older legacy log with only the 8 original attributes
  if (scores.flavor === undefined && scores.uniformity === undefined && scores.clarity !== undefined) {
    const legacySum =
      (scores.fragranceAroma || 0) +
      (scores.acidity || 0) +
      (scores.sweetness || 0) +
      (scores.body || 0) +
      (scores.clarity || 0) +
      (scores.aftertaste || 0) +
      (scores.balance || 0) +
      (scores.overall || 0);
    const legacyScore = Math.round(((legacySum / 80) * 100 - defects) * 10) / 10;
    return Math.min(100, Math.max(0, legacyScore));
  }

  // Official SCA 100-point cupping protocol: sum of 10 attributes (each up to 10 points) minus defects
  const cleanCup = scores.cleanCup !== undefined ? scores.cleanCup : (scores.clarity ?? 0);
  const sum =
    (scores.fragranceAroma || 0) +
    (scores.flavor || 0) +
    (scores.aftertaste || 0) +
    (scores.acidity || 0) +
    (scores.body || 0) +
    (scores.balance || 0) +
    (scores.uniformity || 0) +
    cleanCup +
    (scores.sweetness || 0) +
    (scores.overall || 0);

  const score = Math.round((sum - defects) * 10) / 10;
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
