import type { TastingLog } from './types';

export type ScaTierKey = 'outstanding' | 'excellent' | 'very-good' | 'commercial';

export interface ScaTierInfo {
  key: ScaTierKey;
  label: string;
}

/**
 * Classifies an SCA cupping score (0-100) into its canonical specialty tier.
 */
export function getScaTierInfo(score: number): ScaTierInfo {
  if (score >= 90.0) {
    return { key: 'outstanding', label: 'Outstanding' };
  }
  if (score >= 85.0) {
    return { key: 'excellent', label: 'Excellent' };
  }
  if (score >= 80.0) {
    return { key: 'very-good', label: 'Very Good' };
  }
  return { key: 'commercial', label: 'Commercial' };
}

export type ReviewMethodFilter = string;

export interface ReviewMethodFilterOption {
  value: ReviewMethodFilter;
  label: string;
}

const KNOWN_REVIEW_METHODS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'v60', label: 'V60' },
  { id: 'espresso', label: 'Espresso' },
  { id: 'aeropress', label: 'AeroPress' },
  { id: 'french-press', label: 'French Press' },
  { id: 'chemex', label: 'Chemex' },
  { id: 'kalita-wave', label: 'Kalita Wave' },
  { id: 'pour-over', label: 'Pour Over' },
  { id: 'cold-brew', label: 'Cold Brew' },
  { id: 'flair', label: 'Flair' },
  { id: 'origami', label: 'Origami' },
  { id: 'clever-dripper', label: 'Clever Dripper' },
  { id: 'moka-pot', label: 'Moka Pot' },
  { id: 'custom', label: 'Custom' },
];

const KNOWN_METHOD_LABELS = new Map<string, string>(
  KNOWN_REVIEW_METHODS.map((entry) => [entry.id, entry.label])
);

/**
 * Formats a brew method slug into its display label.
 */
export function formatReviewMethodLabel(method: string): string {
  const normalized = method.trim().toLowerCase();
  const known = KNOWN_METHOD_LABELS.get(normalized);
  if (known) return known;

  return normalized
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Derives dynamic method filter pills from the provided logs, prefixed with "All".
 */
export function getAvailableReviewMethodOptions(
  logs: TastingLog[]
): ReviewMethodFilterOption[] {
  const presentMethods = new Set<string>(
    logs.map((log) => log.brewMethod?.toLowerCase() ?? '').filter(Boolean)
  );

  const knownOptions: ReviewMethodFilterOption[] = KNOWN_REVIEW_METHODS.filter(
    (entry) => presentMethods.has(entry.id)
  ).map((entry) => ({
    value: entry.id,
    label: entry.label,
  }));

  const knownIds = new Set(knownOptions.map((opt) => opt.value));
  const extraOptions: ReviewMethodFilterOption[] = Array.from(presentMethods)
    .filter((method) => !knownIds.has(method))
    .map((method) => ({
      value: method,
      label: formatReviewMethodLabel(method),
    }));

  return [{ value: 'all', label: 'All' }, ...knownOptions, ...extraOptions];
}

/**
 * Returns true if the tasting log matches the selected brew method filter.
 */
export function matchesReviewMethodFilter(
  log: TastingLog,
  filter: ReviewMethodFilter
): boolean {
  const normalizedFilter = filter.toLowerCase();
  if (normalizedFilter === 'all') return true;
  return (log.brewMethod?.toLowerCase() ?? '') === normalizedFilter;
}

export type ReviewRatingFilter = 'all' | '5' | '4+';

export interface ReviewRatingFilterOption {
  value: ReviewRatingFilter;
  label: string;
}

/**
 * Derives dynamic star-rating filter pills from the provided logs.
 */
export function getAvailableRatingFilterOptions(
  logs: TastingLog[]
): ReviewRatingFilterOption[] {
  const options: ReviewRatingFilterOption[] = [{ value: 'all', label: 'All Ratings' }];
  if (logs.some((log) => log.rating >= 5)) {
    options.push({ value: '5', label: '5 Stars' });
  }
  if (logs.some((log) => log.rating >= 4)) {
    options.push({ value: '4+', label: '4+ Stars' });
  }
  return options;
}

/**
 * Returns true if the tasting log matches the selected star-rating filter.
 */
export function matchesReviewRatingFilter(
  log: TastingLog,
  filter: ReviewRatingFilter
): boolean {
  if (filter === '5') return log.rating >= 5;
  if (filter === '4+') return log.rating >= 4;
  return true;
}

/**
 * Case-insensitive keyword search across bean name, roaster, tasting notes, and flavor tags.
 */
export function matchesReviewSearch(log: TastingLog, query: string): boolean {
  const q = query.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!q) return true;

  return (
    (log.beanNameSnapshot ?? '').toLowerCase().includes(q) ||
    (log.roasterSnapshot ?? '').toLowerCase().includes(q) ||
    (log.notes ?? '').toLowerCase().includes(q) ||
    (log.flavorTags?.some((tag) => tag.toLowerCase().includes(q)) ?? false)
  );
}
