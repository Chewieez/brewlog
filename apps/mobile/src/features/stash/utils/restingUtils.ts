import { Bean, calculateDaysOffRoast, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface BeanRestingInfo {
  effectiveDays: number;
  status: 'resting' | 'peak' | 'aging' | 'past-peak';
  label: string;
  stageLabel: string;
  isFrozen: boolean;
  badgeLabel: string;
  badgeColor: string;
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

export function calculateBeanRestingInfo(
  bean: Bean,
  referenceDate: Date = new Date()
): BeanRestingInfo {
  const restDays = bean.recommendedRestDays && bean.recommendedRestDays > 0 ? bean.recommendedRestDays : 5;
  const isFrozen = Boolean(bean.isFrozen);

  if (!bean.roastDate) {
    return {
      effectiveDays: 0,
      status: 'resting',
      label: 'Unknown',
      stageLabel: 'No Date Specified',
      isFrozen,
      badgeLabel: 'Unspecified Roast Date',
      badgeColor: colors.textMuted,
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

  let status: 'resting' | 'peak' | 'aging' | 'past-peak';
  let stageLabel: string;
  let badgeColor: string;

  if (effectiveDays < restDays) {
    status = 'resting';
    stageLabel = 'Needs Rest (De-gassing)';
    badgeColor = colors.statusWarning || '#eab308';
  } else if (effectiveDays <= restDays + 25) {
    status = 'peak';
    stageLabel = 'Peak Flavor Window';
    badgeColor = colors.statusSuccess || '#22c55e';
  } else if (effectiveDays <= restDays + 55) {
    status = 'aging';
    stageLabel = 'Good (Drink Soon)';
    badgeColor = colors.accent || '#f97316';
  } else {
    status = 'past-peak';
    stageLabel = 'Past Peak';
    badgeColor = colors.textMuted || '#94a3b8';
  }

  let badgeLabel = '';
  if (isFrozen) {
    badgeLabel = `❄️ Frozen at Day ${effectiveDays} (${status === 'peak' ? 'Peak Window' : stageLabel})`;
    badgeColor = '#38bdf8'; // Ice Cyan
  } else {
    if (status === 'resting') {
      badgeLabel = `Needs Rest • Day ${effectiveDays} of ${restDays}`;
    } else if (status === 'peak') {
      badgeLabel = `Peak Window • Day ${effectiveDays}`;
    } else if (status === 'aging') {
      badgeLabel = `Good (Drink Soon) • Day ${effectiveDays}`;
    } else {
      badgeLabel = `Past Peak • Day ${effectiveDays}`;
    }
  }

  const maxTrackedDays = restDays + 25;
  const progressPercent = Math.min(100, Math.max(0, Math.round((effectiveDays / maxTrackedDays) * 100)));

  return {
    effectiveDays,
    status,
    label: stageLabel,
    stageLabel,
    isFrozen,
    badgeLabel,
    badgeColor,
    progressPercent,
    recommendedRestDays: restDays,
  };
}
