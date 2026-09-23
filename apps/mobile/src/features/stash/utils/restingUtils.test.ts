import { describe, it, expect } from 'vitest';
import { calculateBeanRestingInfo } from './restingUtils';
import { Bean, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';

describe('calculateBeanRestingInfo', () => {
  const baseBean: Bean = {
    id: 'b-1',
    name: 'Worka',
    roaster: 'Sey',
    flavorNotes: [],
    createdAt: '2026-09-01T00:00:00Z',
  };

  it('calculates default 5-day resting status on shelf', () => {
    // 3 days off roast -> Needs Rest
    const bean1: Bean = { ...baseBean, roastDate: '2026-09-19' };
    const today = new Date('2026-09-22T12:00:00Z');
    const info1 = calculateBeanRestingInfo(bean1, today);

    expect(info1.effectiveDays).toBe(3);
    expect(info1.status).toBe('resting');
    expect(info1.stageLabel).toBe('Needs Rest (De-gassing)');
    expect(info1.label).toBe('Needs Rest (De-gassing)');
    expect(info1.badgeLabel).toBe('Needs Rest • Day 3 of 5');
    expect(info1.isFrozen).toBe(false);
    expect(info1.badgeColor).toBe(INDUSTRIAL_PRECISION_THEME.colors.statusWarning);
    expect(info1.progressPercent).toBe(10); // 3 / (5 + 25) * 100 = 10%
    expect(info1.recommendedRestDays).toBe(5);

    // 10 days off roast -> Peak Window
    const bean2: Bean = { ...baseBean, roastDate: '2026-09-12' };
    const info2 = calculateBeanRestingInfo(bean2, today);
    expect(info2.effectiveDays).toBe(10);
    expect(info2.status).toBe('peak');
    expect(info2.stageLabel).toBe('Peak Flavor Window');
    expect(info2.badgeLabel).toBe('Peak Window • Day 10');
    expect(info2.badgeColor).toBe(INDUSTRIAL_PRECISION_THEME.colors.statusSuccess);
    expect(info2.progressPercent).toBe(33); // 10 / 30 * 100 = 33%
  });

  it('handles roast date matching today (day 0)', () => {
    const today = new Date('2026-09-22T12:00:00Z');
    const bean: Bean = { ...baseBean, roastDate: '2026-09-22' };
    const info = calculateBeanRestingInfo(bean, today);

    expect(info.effectiveDays).toBe(0);
    expect(info.status).toBe('resting');
    expect(info.badgeLabel).toBe('Needs Rest • Day 0 of 5');
    expect(info.progressPercent).toBe(0);
  });

  it('adapts resting window when custom recommendedRestDays is provided', () => {
    // Roaster suggests 14 days rest
    const bean: Bean = { ...baseBean, roastDate: '2026-09-12', recommendedRestDays: 14 };
    const today = new Date('2026-09-22T12:00:00Z'); // 10 days off roast
    const info = calculateBeanRestingInfo(bean, today);

    expect(info.effectiveDays).toBe(10);
    expect(info.recommendedRestDays).toBe(14);
    expect(info.status).toBe('resting');
    expect(info.badgeLabel).toBe('Needs Rest • Day 10 of 14');

    // 15 days off roast -> Now Peak Window for 14-day bean
    const pastRestBean: Bean = { ...baseBean, roastDate: '2026-09-07', recommendedRestDays: 14 };
    const pastRestInfo = calculateBeanRestingInfo(pastRestBean, today);
    expect(pastRestInfo.effectiveDays).toBe(15);
    expect(pastRestInfo.status).toBe('peak');
    expect(pastRestInfo.badgeLabel).toBe('Peak Window • Day 15');
  });

  it('calculates aging (good - drink soon) status correctly', () => {
    // Default restDays = 5. Peak ends at 5 + 25 = 30. Aging is up to 5 + 55 = 60.
    // 40 days off roast -> aging
    const bean: Bean = { ...baseBean, roastDate: '2026-08-13' };
    const today = new Date('2026-09-22T12:00:00Z'); // 40 days off roast
    const info = calculateBeanRestingInfo(bean, today);

    expect(info.effectiveDays).toBe(40);
    expect(info.status).toBe('aging');
    expect(info.stageLabel).toBe('Good (Drink Soon)');
    expect(info.badgeLabel).toBe('Good (Drink Soon) • Day 40');
    expect(info.badgeColor).toBe(INDUSTRIAL_PRECISION_THEME.colors.accent);
    expect(info.progressPercent).toBe(100); // capped at 100% (40 / 30 > 1)
  });

  it('calculates past-peak status correctly', () => {
    // Default restDays = 5. Aging ends at 60. Past-peak is > 60.
    // 70 days off roast -> past-peak
    const bean: Bean = { ...baseBean, roastDate: '2026-07-14' };
    const today = new Date('2026-09-22T12:00:00Z'); // 70 days off roast
    const info = calculateBeanRestingInfo(bean, today);

    expect(info.effectiveDays).toBe(70);
    expect(info.status).toBe('past-peak');
    expect(info.stageLabel).toBe('Past Peak');
    expect(info.badgeLabel).toBe('Past Peak • Day 70');
    expect(info.badgeColor).toBe(INDUSTRIAL_PRECISION_THEME.colors.textMuted);
    expect(info.progressPercent).toBe(100);
  });

  it('halts aging and produces frozen badge when bean is in freezer vault', () => {
    // Roast date was 30 days ago, but frozen at day 12
    const frozenBean: Bean = {
      ...baseBean,
      roastDate: '2026-08-23',
      isFrozen: true,
      frozenDate: '2026-09-04', // 12 days after roast
    };
    const today = new Date('2026-09-22T12:00:00Z');
    const info = calculateBeanRestingInfo(frozenBean, today);

    expect(info.isFrozen).toBe(true);
    expect(info.effectiveDays).toBe(12);
    expect(info.status).toBe('peak');
    expect(info.badgeLabel).toBe('❄️ Frozen at Day 12 (Peak Window)');
    expect(info.badgeColor).toBe(INDUSTRIAL_PRECISION_THEME.colors.statusInfo);
  });

  it('handles frozen beans frozen at non-peak stages', () => {
    // Frozen during resting stage
    const frozenRestingBean: Bean = {
      ...baseBean,
      roastDate: '2026-09-20',
      isFrozen: true,
      frozenDate: '2026-09-22', // 2 days after roast
    };
    const today = new Date('2026-09-22T12:00:00Z');
    const restingInfo = calculateBeanRestingInfo(frozenRestingBean, today);

    expect(restingInfo.isFrozen).toBe(true);
    expect(restingInfo.effectiveDays).toBe(2);
    expect(restingInfo.status).toBe('resting');
    expect(restingInfo.badgeLabel).toBe('❄️ Frozen at Day 2 (Needs Rest (De-gassing))');
    expect(restingInfo.badgeColor).toBe(INDUSTRIAL_PRECISION_THEME.colors.statusInfo);

    // Frozen during aging stage
    const frozenAgingBean: Bean = {
      ...baseBean,
      roastDate: '2026-08-01',
      isFrozen: true,
      frozenDate: '2026-09-10', // 40 days after roast
    };
    const agingInfo = calculateBeanRestingInfo(frozenAgingBean, today);

    expect(agingInfo.isFrozen).toBe(true);
    expect(agingInfo.effectiveDays).toBe(40);
    expect(agingInfo.status).toBe('aging');
    expect(agingInfo.badgeLabel).toBe('❄️ Frozen at Day 40 (Good (Drink Soon))');

    // Frozen during past-peak stage
    const frozenPastPeakBean: Bean = {
      ...baseBean,
      roastDate: '2026-06-01',
      isFrozen: true,
      frozenDate: '2026-08-15', // 75 days after roast
    };
    const pastPeakInfo = calculateBeanRestingInfo(frozenPastPeakBean, today);
    expect(pastPeakInfo.isFrozen).toBe(true);
    expect(pastPeakInfo.status).toBe('past-peak');
    expect(pastPeakInfo.badgeLabel).toBe('❄️ Frozen at Day 75 (Past Peak)');

    // Frozen without frozenDate falls back to referenceDate
    const frozenNoDateField: Bean = {
      ...baseBean,
      roastDate: '2026-09-12',
      isFrozen: true,
      frozenDate: undefined,
    };
    const fallbackInfo = calculateBeanRestingInfo(frozenNoDateField, today);
    expect(fallbackInfo.isFrozen).toBe(true);
    expect(fallbackInfo.effectiveDays).toBe(10);
    expect(fallbackInfo.badgeLabel).toBe('❄️ Frozen at Day 10 (Peak Window)');

    // Non-standard date string format in frozenDate
    const nonStandardDateBean: Bean = {
      ...baseBean,
      roastDate: '2026-09-01',
      isFrozen: true,
      frozenDate: 'InvalidDateString',
    };
    const nonStandardInfo = calculateBeanRestingInfo(nonStandardDateBean, today);
    expect(nonStandardInfo.effectiveDays).toBe(21);
  });

  it('handles edge cases (missing roast date, invalid or zero recommendedRestDays)', () => {
    const noDateBean: Bean = { ...baseBean, roastDate: undefined };
    const info = calculateBeanRestingInfo(noDateBean);
    expect(info.effectiveDays).toBe(0);
    expect(info.status).toBe('resting');
    expect(info.label).toBe('Unknown');
    expect(info.stageLabel).toBe('No Date Specified');
    expect(info.isFrozen).toBe(false);
    expect(info.badgeLabel).toBe('Unspecified Roast Date');
    expect(info.badgeColor).toBe(INDUSTRIAL_PRECISION_THEME.colors.textMuted);
    expect(info.progressPercent).toBe(0);
    expect(info.recommendedRestDays).toBe(5);

    // Preserves isFrozen = true when roastDate is undefined
    const noDateFrozenBean: Bean = { ...baseBean, roastDate: undefined, isFrozen: true };
    const noDateFrozenInfo = calculateBeanRestingInfo(noDateFrozenBean);
    expect(noDateFrozenInfo.isFrozen).toBe(true);
    expect(noDateFrozenInfo.badgeLabel).toBe('Unspecified Roast Date');

    // Empty string roastDate
    const emptyDateBean: Bean = { ...baseBean, roastDate: '' };
    const emptyDateInfo = calculateBeanRestingInfo(emptyDateBean);
    expect(emptyDateInfo.effectiveDays).toBe(0);
    expect(emptyDateInfo.badgeLabel).toBe('Unspecified Roast Date');

    // 0 or negative recommendedRestDays defaults to 5
    const zeroRestBean: Bean = { ...baseBean, roastDate: '2026-09-19', recommendedRestDays: 0 };
    const today = new Date('2026-09-22T12:00:00Z');
    const zeroInfo = calculateBeanRestingInfo(zeroRestBean, today);
    expect(zeroInfo.recommendedRestDays).toBe(5);

    const negativeRestBean: Bean = { ...baseBean, roastDate: '2026-09-19', recommendedRestDays: -3 };
    const negativeInfo = calculateBeanRestingInfo(negativeRestBean, today);
    expect(negativeInfo.recommendedRestDays).toBe(5);
  });

  it('uses current date as default referenceDate when omitted', () => {
    const bean: Bean = { ...baseBean, roastDate: '2026-09-10' };
    const info = calculateBeanRestingInfo(bean);
    expect(info.effectiveDays).toBeGreaterThanOrEqual(0);
  });
});
