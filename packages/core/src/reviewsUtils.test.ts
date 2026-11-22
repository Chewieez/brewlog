import { describe, it, expect } from 'vitest';
import type { TastingLog } from './types';
import {
  getScaTierInfo,
  formatReviewMethodLabel,
  getAvailableReviewMethodOptions,
  matchesReviewMethodFilter,
  getAvailableRatingFilterOptions,
  matchesReviewRatingFilter,
  matchesReviewSearch,
} from './reviewsUtils';

const makeLog = (overrides: Partial<TastingLog> = {}): TastingLog => ({
  id: 'log-1',
  beanNameSnapshot: 'Worka Sakaro',
  roasterSnapshot: 'Sey Coffee',
  recipeNameSnapshot: 'V60 Standard',
  brewMethod: 'v60',
  brewDate: '2026-10-04T12:00:00Z',
  coffeeDoseGrams: 20,
  waterAmountGrams: 300,
  actualTimeSeconds: 210,
  grindSetting: '18 clicks',
  waterTempCelsius: 94,
  scores: {
    fragranceAroma: 8.5,
    flavor: 8.5,
    aftertaste: 8.0,
    acidity: 8.5,
    body: 8.0,
    balance: 8.0,
    cleanCup: 10,
    sweetness: 10,
    uniformity: 10,
    overall: 8.5,
  },
  calculatedScaScore: 88.0,
  rating: 5,
  flavorTags: ['Jasmine', 'Peach'],
  notes: 'Floral sweetness and clean finish.',
  wouldBrewAgain: true,
  createdAt: '2026-10-04T12:00:00Z',
  ...overrides,
});

describe('reviewsUtils', () => {
  describe('getScaTierInfo', () => {
    it('classifies SCA score boundaries consistently', () => {
      expect(getScaTierInfo(90.0)).toEqual({ key: 'outstanding', label: 'Outstanding' });
      expect(getScaTierInfo(89.9)).toEqual({ key: 'excellent', label: 'Excellent' });
      expect(getScaTierInfo(85.0)).toEqual({ key: 'excellent', label: 'Excellent' });
      expect(getScaTierInfo(84.9)).toEqual({ key: 'very-good', label: 'Very Good' });
      expect(getScaTierInfo(80.0)).toEqual({ key: 'very-good', label: 'Very Good' });
      expect(getScaTierInfo(79.9)).toEqual({ key: 'commercial', label: 'Commercial' });
      expect(getScaTierInfo(0)).toEqual({ key: 'commercial', label: 'Commercial' });
    });
  });

  describe('formatReviewMethodLabel & getAvailableReviewMethodOptions', () => {
    it('returns only All when logs is empty', () => {
      expect(getAvailableReviewMethodOptions([])).toEqual([{ value: 'all', label: 'All' }]);
    });

    it('returns curated labels for present methods in canonical order plus formatted fallbacks', () => {
      const logs = [
        makeLog({ id: '1', brewMethod: 'custom' }),
        makeLog({ id: '2', brewMethod: 'v60' }),
        makeLog({ id: '3', brewMethod: 'flair' }),
        makeLog({ id: '4', brewMethod: 'aeropress' }),
        makeLog({ id: '5', brewMethod: 'cold-brew' }),
        makeLog({ id: '6', brewMethod: 'origami-dripper' as TastingLog['brewMethod'] }),
      ];

      expect(getAvailableReviewMethodOptions(logs)).toEqual([
        { value: 'all', label: 'All' },
        { value: 'v60', label: 'V60' },
        { value: 'aeropress', label: 'AeroPress' },
        { value: 'cold-brew', label: 'Cold Brew' },
        { value: 'flair', label: 'Flair' },
        { value: 'custom', label: 'Custom' },
        { value: 'origami-dripper', label: 'Origami Dripper' },
      ]);
      expect(formatReviewMethodLabel('french-press')).toBe('French Press');
      expect(formatReviewMethodLabel('origami-dripper')).toBe('Origami Dripper');
    });
  });

  describe('matchesReviewMethodFilter', () => {
    it('matches all or exact method case-insensitively', () => {
      const log = makeLog({ brewMethod: 'v60' });
      expect(matchesReviewMethodFilter(log, 'all')).toBe(true);
      expect(matchesReviewMethodFilter(log, 'V60')).toBe(true);
      expect(matchesReviewMethodFilter(log, 'espresso')).toBe(false);
    });
  });

  describe('rating filter helpers', () => {
    it('hides higher rating options when no logs qualify', () => {
      const lowRated = [makeLog({ rating: 3 }), makeLog({ id: '2', rating: 2 })];
      expect(getAvailableRatingFilterOptions(lowRated)).toEqual([
        { value: 'all', label: 'All Ratings' },
      ]);
    });

    it('includes 4+ Stars without 5 Stars when max rating is 4', () => {
      const fourStar = [makeLog({ rating: 4 })];
      expect(getAvailableRatingFilterOptions(fourStar)).toEqual([
        { value: 'all', label: 'All Ratings' },
        { value: '4+', label: '4+ Stars' },
      ]);
    });

    it('includes 5 Stars and 4+ Stars when a 5-star log exists and filters accurately', () => {
      const five = makeLog({ id: '5', rating: 5 });
      const four = makeLog({ id: '4', rating: 4 });
      const three = makeLog({ id: '3', rating: 3 });

      expect(getAvailableRatingFilterOptions([five, four, three])).toEqual([
        { value: 'all', label: 'All Ratings' },
        { value: '5', label: '5 Stars' },
        { value: '4+', label: '4+ Stars' },
      ]);

      expect(matchesReviewRatingFilter(five, 'all')).toBe(true);
      expect(matchesReviewRatingFilter(five, '5')).toBe(true);
      expect(matchesReviewRatingFilter(four, '5')).toBe(false);
      expect(matchesReviewRatingFilter(four, '4+')).toBe(true);
      expect(matchesReviewRatingFilter(three, '4+')).toBe(false);
    });
  });

  describe('matchesReviewSearch', () => {
    it('matches empty queries and searches bean, roaster, notes, and tags case-insensitively', () => {
      const log = makeLog({
        beanNameSnapshot: 'Worka Sakaro',
        roasterSnapshot: 'Sey Coffee',
        notes: 'Vibrant bergamot tea',
        flavorTags: ['Jasmine', 'Peach'],
      });

      expect(matchesReviewSearch(log, '')).toBe(true);
      expect(matchesReviewSearch(log, '   ')).toBe(true);
      expect(matchesReviewSearch(log, 'worka')).toBe(true);
      expect(matchesReviewSearch(log, 'SEY')).toBe(true);
      expect(matchesReviewSearch(log, 'bergamot')).toBe(true);
      expect(matchesReviewSearch(log, 'peach')).toBe(true);
      expect(matchesReviewSearch(log, 'chocolate')).toBe(false);
    });
  });
});
