import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
} from 'react-native';
import { useRouter, useScrollToTop } from 'expo-router';
import { Plus, Search, X } from 'lucide-react-native';
import { TastingLog } from '@brewlog/core';
import { makeStyles, useTheme, FilterPills, type FilterPillsOption } from '@brewlog/ui';
import { FONTS } from '../../../theme/fonts';
import { useReviews } from '../ReviewsContext';
import { ReviewsSummaryBar } from '../components/ReviewsSummaryBar';
import { ReviewCard } from '../components/ReviewCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabScreenHeader } from '../../../components/navigation/TabScreenHeader';
import { getTabScreenBottomPadding } from '../../../components/navigation/tabBarConstants';

export type MethodFilter = string;
export type RatingFilter = 'all' | '5' | '4+';

interface FilterOption<T> {
  id: T;
  label: string;
}

const KNOWN_METHOD_OPTIONS: FilterOption<string>[] = [
  { id: 'v60', label: 'V60' },
  { id: 'espresso', label: 'Espresso' },
  { id: 'aeropress', label: 'AeroPress' },
  { id: 'french-press', label: 'French Press' },
  { id: 'chemex', label: 'Chemex' },
  { id: 'kalita-wave', label: 'Kalita Wave' },
  { id: 'pour-over', label: 'Pour Over' },
  { id: 'cold-brew', label: 'Cold Brew' },
  { id: 'flair', label: 'Flair' },
  { id: 'custom', label: 'Custom' },
];

function formatFallbackMethodLabel(method: string): string {
  return method
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export const ReviewsCatalogScreen: React.FC = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reviews } = useReviews();
  const flatListRef = useRef<FlatList<TastingLog>>(null);
  useScrollToTop(flatListRef);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<MethodFilter>('all');
  const [selectedRating, setSelectedRating] = useState<RatingFilter>('all');

  const handleAddReview = useCallback(() => {
    router.push('/reviews/modal');
  }, [router]);

  const handleReviewPress = useCallback(
    (review: TastingLog) => {
      router.push({
        pathname: '/reviews/[id]',
        params: { id: review.id },
      });
    },
    [router]
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedMethod('all');
    setSelectedRating('all');
  }, []);

  // Compute metrics for summary bar
  const summaryMetrics = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return { total: 0, avgScaScore: 0, topFlavor: '--' };
    }

    const scoredReviews = reviews.filter(
      (r) => (Number(r.calculatedScaScore) || 0) > 0
    );
    const avgScaScore =
      scoredReviews.length > 0
        ? scoredReviews.reduce((sum, r) => sum + Number(r.calculatedScaScore), 0) /
          scoredReviews.length
        : 0;

    // Count flavor tags
    const tagCounts = new Map<string, number>();
    for (const r of reviews) {
      if (r.flavorTags) {
        for (const tag of r.flavorTags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
    }

    let topFlavor = '--';
    let maxCount = 0;
    for (const [tag, count] of tagCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        topFlavor = tag;
      }
    }

    return { total, avgScaScore, topFlavor };
  }, [reviews]);

  const availableMethodOptions = useMemo<FilterPillsOption<string>[]>(() => {
    const presentMethods = new Set<string>(
      reviews.map((r) => r.brewMethod.toLowerCase()).filter(Boolean)
    );
    const knownOptions: FilterPillsOption<string>[] = KNOWN_METHOD_OPTIONS.filter(
      (opt) => presentMethods.has(opt.id)
    ).map((opt) => ({
      value: opt.id,
      label: opt.label,
      accessibilityLabel: `Filter by method ${opt.label}`,
    }));
    const knownIds = new Set(knownOptions.map((opt) => opt.value));
    const extraOptions: FilterPillsOption<string>[] = Array.from(presentMethods)
      .filter((method) => !knownIds.has(method))
      .map((method) => {
        const label = formatFallbackMethodLabel(method);
        return {
          value: method,
          label,
          accessibilityLabel: `Filter by method ${label}`,
        };
      });

    return [
      {
        value: 'all',
        label: 'All Methods',
        accessibilityLabel: 'Filter by method All Methods',
      },
      ...knownOptions,
      ...extraOptions,
    ];
  }, [reviews]);

  const effectiveMethod = useMemo(
    () =>
      availableMethodOptions.some((opt) => opt.value === selectedMethod)
        ? selectedMethod
        : 'all',
    [availableMethodOptions, selectedMethod]
  );

  useEffect(() => {
    if (selectedMethod !== effectiveMethod) {
      setSelectedMethod(effectiveMethod);
    }
  }, [selectedMethod, effectiveMethod]);

  const availableRatingOptions = useMemo<FilterPillsOption<RatingFilter>[]>(() => {
    const options: FilterPillsOption<RatingFilter>[] = [
      {
        value: 'all',
        label: 'All Ratings',
        accessibilityLabel: 'Filter by rating All Ratings',
      },
    ];
    if (reviews.some((r) => r.rating >= 5)) {
      options.push({
        value: '5',
        label: '5 Stars',
        accessibilityLabel: 'Filter by rating 5 Stars',
      });
    }
    if (reviews.some((r) => r.rating >= 4)) {
      options.push({
        value: '4+',
        label: '4+ Stars',
        accessibilityLabel: 'Filter by rating 4+ Stars',
      });
    }
    return options;
  }, [reviews]);

  const effectiveRating: RatingFilter = useMemo(
    () =>
      availableRatingOptions.some((opt) => opt.value === selectedRating)
        ? selectedRating
        : 'all',
    [availableRatingOptions, selectedRating]
  );

  useEffect(() => {
    if (selectedRating !== effectiveRating) {
      setSelectedRating(effectiveRating);
    }
  }, [selectedRating, effectiveRating]);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return reviews.filter((r) => {
      // Search text match
      if (q) {
        const matchCoffee = r.beanNameSnapshot.toLowerCase().includes(q);
        const matchRoaster = r.roasterSnapshot.toLowerCase().includes(q);
        const matchNotes = r.notes?.toLowerCase().includes(q) ?? false;
        const matchTags = r.flavorTags?.some((t) => t.toLowerCase().includes(q)) ?? false;
        if (!matchCoffee && !matchRoaster && !matchNotes && !matchTags) {
          return false;
        }
      }

      // Method match
      if (effectiveMethod !== 'all') {
        if (r.brewMethod.toLowerCase() !== effectiveMethod.toLowerCase()) {
          return false;
        }
      }

      // Rating match
      if (effectiveRating === '5' && r.rating < 5) return false;
      if (effectiveRating === '4+' && r.rating < 4) return false;

      return true;
    });
  }, [reviews, searchQuery, effectiveMethod, effectiveRating]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TabScreenHeader
        title="Reviews"
        actionLabel="ADD REVIEW"
        onActionPress={handleAddReview}
        actionAccessibilityLabel="Add Review"
      />

      {/* Summary Metrics Bar */}
      <ReviewsSummaryBar
        totalReviews={summaryMetrics.total}
        averageScaScore={summaryMetrics.avgScaScore}
        topFlavorNote={summaryMetrics.topFlavor}
      />

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search reviews by coffee, roaster, notes..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search reviews"
        />
        {searchQuery.length > 0 && (
          <Pressable
            style={styles.clearSearchBtn}
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Method Filter Scrollable Row */}
      {availableMethodOptions.length > 1 ? (
        <FilterPills
          size="sm"
          value={effectiveMethod}
          onChange={setSelectedMethod}
          options={availableMethodOptions}
          ariaLabel="Filter reviews by brew method"
          testID="reviews-method-filters"
        />
      ) : null}

      {/* Rating Filter Row */}
      {availableRatingOptions.length > 1 ? (
        <FilterPills<RatingFilter>
          size="sm"
          value={effectiveRating}
          onChange={setSelectedRating}
          options={availableRatingOptions}
          ariaLabel="Filter reviews by rating"
          testID="reviews-rating-filters"
        />
      ) : null}
    </View>
  );

  const renderEmptyComponent = () => {
    if (reviews.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No reviews logged yet</Text>
          <Text style={styles.emptySubtitle}>
            Capture your sensory impressions, SCA scores, and dial-in details after every brew.
          </Text>
          <Pressable
            style={styles.emptyAddButton}
            onPress={handleAddReview}
            accessibilityRole="button"
            accessibilityLabel="Add Your First Review"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={16} color={colors.canvas} />
            <Text style={styles.emptyAddButtonText}>ADD YOUR FIRST REVIEW</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No reviews match your filters</Text>
        <Text style={styles.emptySubtitle}>
          Try adjusting your search query, method filter, or rating filters.
        </Text>
        <Pressable
          style={styles.clearFiltersButton}
          onPress={handleClearFilters}
          accessibilityRole="button"
          accessibilityLabel="Clear all filters"
        >
          <Text style={styles.clearFiltersButtonText}>CLEAR FILTERS</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={filteredReviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ReviewCard review={item} onPress={handleReviewPress} />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: getTabScreenBottomPadding(insets.bottom) },
        ]}
      />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  headerContainer: {
    paddingTop: 16,
    gap: 14,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: colors.textPrimary,
    height: '100%',
  },
  clearSearchBtn: {
    padding: 4,
  },
  cardWrapper: {
    marginBottom: 10,
  },
  emptyContainer: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: FONTS.displayMedium,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    minHeight: 44,
    marginTop: 8,
  },
  emptyAddButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.canvas,
    letterSpacing: 1,
  },
  clearFiltersButton: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  clearFiltersButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1,
  },
}));
