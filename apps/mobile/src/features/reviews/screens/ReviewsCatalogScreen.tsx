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
import {
  TastingLog,
  getAvailableReviewMethodOptions,
  matchesReviewMethodFilter,
  getAvailableRatingFilterOptions,
  matchesReviewRatingFilter,
  matchesReviewSearch,
  type ReviewMethodFilter,
  type ReviewRatingFilter,
} from '@brewlog/core';
import { makeStyles, useTheme, FilterPills, type FilterPillsOption } from '@brewlog/ui';
import { FONTS } from '../../../theme/fonts';
import { useReviews } from '../ReviewsContext';
import { ReviewCard } from '../components/ReviewCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabScreenHeader } from '../../../components/navigation/TabScreenHeader';
import { getTabScreenBottomPadding } from '../../../components/navigation/tabBarConstants';

export type MethodFilter = ReviewMethodFilter;
export type RatingFilter = ReviewRatingFilter;

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

  const availableMethodOptions = useMemo<FilterPillsOption<string>[]>(() => {
    return getAvailableReviewMethodOptions(reviews).map((opt) => ({
      value: opt.value,
      label: opt.label,
      accessibilityLabel: `Filter by method ${opt.label}`,
    }));
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
    return getAvailableRatingFilterOptions(reviews).map((opt) => ({
      value: opt.value,
      label: opt.label,
      accessibilityLabel: `Filter by rating ${opt.label}`,
    }));
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
    return reviews.filter(
      (r) =>
        matchesReviewSearch(r, searchQuery) &&
        matchesReviewMethodFilter(r, effectiveMethod) &&
        matchesReviewRatingFilter(r, effectiveRating)
    );
  }, [reviews, searchQuery, effectiveMethod, effectiveRating]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TabScreenHeader
        title="Reviews"
        actionLabel="ADD REVIEW"
        onActionPress={handleAddReview}
        actionAccessibilityLabel="Add Review"
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
