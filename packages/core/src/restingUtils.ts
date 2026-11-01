import { Bean } from "./types";
import { calculateDaysOffRoast } from "./calculator";

export interface BeanRestingInfo {
  effectiveDays: number;
  status: "resting" | "peak" | "aging" | "past-peak";
  label: string;
  stageLabel: string;
  isFrozen: boolean;
  badgeLabel: string;
  progressPercent: number;
  recommendedRestDays: number;
}

function parseFrozenDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (match) {
    return new Date(
      parseInt(match[1], 10),
      parseInt(match[2], 10) - 1,
      parseInt(match[3], 10),
      12,
      0,
      0
    );
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Offsets a roast date forward by the number of days spent in the freezer.
 * When a bag frozen at day N is thawed, shifting roastDate forward by the duration
 * in the freezer allows calculateDaysOffRoast to resume natural aging starting from day N.
 */
export function offsetRoastDateForThaw(
  roastDateStr: string,
  frozenDateStr: string,
  referenceDate: Date = new Date()
): string {
  const frozenDate = parseFrozenDate(frozenDateStr);
  if (!frozenDate) return roastDateStr;

  const freezerDays = Math.max(
    0,
    calculateDaysOffRoast(frozenDateStr, referenceDate)
  );
  if (freezerDays <= 0) return roastDateStr;

  const roastMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(roastDateStr.trim());
  if (!roastMatch) return roastDateStr;

  const originalRoast = new Date(
    parseInt(roastMatch[1], 10),
    parseInt(roastMatch[2], 10) - 1,
    parseInt(roastMatch[3], 10),
    12,
    0,
    0
  );

  const newRoastTime = originalRoast.getTime() + freezerDays * 86400000;
  const newRoast = new Date(newRoastTime);

  const year = newRoast.getFullYear();
  const month = String(newRoast.getMonth() + 1).padStart(2, "0");
  const day = String(newRoast.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateBeanRestingInfo(
  bean: Bean,
  referenceDate: Date = new Date()
): BeanRestingInfo {
  const restDays =
    bean.recommendedRestDays && bean.recommendedRestDays > 0
      ? bean.recommendedRestDays
      : 5;
  const isFrozen = Boolean(bean.isFrozen);

  if (!bean.roastDate) {
    return {
      effectiveDays: 0,
      status: "resting",
      label: "Unknown",
      stageLabel: "No Date Specified",
      isFrozen,
      badgeLabel: "Unspecified Roast Date",
      progressPercent: 0,
      recommendedRestDays: restDays,
    };
  }

  // If frozen and has frozenDate, calculate days off roast up to frozenDate
  let effectiveDays = 0;
  if (isFrozen && bean.frozenDate) {
    const frozenTargetDate = parseFrozenDate(bean.frozenDate);
    effectiveDays = frozenTargetDate
      ? calculateDaysOffRoast(bean.roastDate, frozenTargetDate)
      : calculateDaysOffRoast(bean.roastDate, referenceDate);
  } else {
    effectiveDays = calculateDaysOffRoast(bean.roastDate, referenceDate);
  }

  if (isNaN(effectiveDays) || effectiveDays < 0) {
    effectiveDays = 0;
  }

  let status: "resting" | "peak" | "aging" | "past-peak";
  let stageLabel: string;

  if (effectiveDays < restDays) {
    status = "resting";
    stageLabel = "Needs Rest (De-gassing)";
  } else if (effectiveDays <= restDays + 25) {
    status = "peak";
    stageLabel = "Peak Flavor Window";
  } else if (effectiveDays <= restDays + 55) {
    status = "aging";
    stageLabel = "Good (Drink Soon)";
  } else {
    status = "past-peak";
    stageLabel = "Past Peak";
  }

  let badgeLabel = "";
  if (isFrozen) {
    badgeLabel = `Frozen at Day ${effectiveDays} (${
      status === "peak" ? "Peak Window" : stageLabel
    })`;
  } else {
    if (status === "resting") {
      badgeLabel = `Needs Rest • Day ${effectiveDays} of ${restDays}`;
    } else if (status === "peak") {
      badgeLabel = `Peak Window • Day ${effectiveDays}`;
    } else if (status === "aging") {
      badgeLabel = `Good (Drink Soon) • Day ${effectiveDays}`;
    } else {
      badgeLabel = `Past Peak • Day ${effectiveDays}`;
    }
  }

  const maxTrackedDays = restDays + 25;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((effectiveDays / maxTrackedDays) * 100))
  );

  return {
    effectiveDays,
    status,
    label: stageLabel,
    stageLabel,
    isFrozen,
    badgeLabel,
    progressPercent,
    recommendedRestDays: restDays,
  };
}
