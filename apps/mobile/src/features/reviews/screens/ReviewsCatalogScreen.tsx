import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search, X } from 'lucide-react-native';
import { TastingLog, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';
import { useReviews } from '../ReviewsContext';
import { ReviewsSummaryBar } from '../components/ReviewsSummaryBar';
import { ReviewCard } from '../components/ReviewCard';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export type MethodFilter = 'all' | 'v60' | 'espresso' | 'aeropress' | 'french-press' | 'chemex' | 'pour-over' | 'cold-brew';
export type RatingFilter = 'all' | '5' | '4+' | 'sca80+';

interface FilterOption<T> {
  id: T;
  label: string;
}

const METHOD_OPTIONS: FilterOption<MethodFilter>[] = [
  { id: 'all', label: 'All Methods' },
  { id: 'v60', label: 'V60' },
  { id: 'espresso', label: 'Espresso' },
  { id: 'aeropress', label: 'AeroPress' },
  { id: 'french-press', label: 'French Press' },
  { id: 'chemex', label: 'Chemex' },
  { id: 'pour-over', label: 'Pour Over' },
  { id: 'cold-brew', label: 'Cold Brew' },
];

const RATING_OPTIONS: FilterOption<RatingFilter>[] = [
  { id: 'all', label: 'All Ratings' },
  { id: '5', label: '5 Stars' },
  { id: '4+', label: '4+ Stars' },
  { id: 'sca80+', label: 'Specialty (80+)' },
];

export const ReviewsCatalogScreen: React.FC = () => {
  const router = useRouter();
  const { reviews } = useReviews();

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
      if (selectedMethod !== 'all') {
        if (r.brewMethod.toLowerCase() !== selectedMethod.toLowerCase()) {
          return false;
        }
      }

      // Rating match
      if (selectedRating === '5' && r.rating < 5) return false;
      if (selectedRating === '4+' && r.rating < 4) return false;
      if (selectedRating === 'sca80+' && (Number(r.calculatedScaScore) || 0) < 80) return false;

      return true;
    });
  }, [reviews, searchQuery, selectedMethod, selectedRating]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Title & Action Row */}
      <View style={styles.titleRow}>
        <View style={styles.titleCol}>
          <Text style={styles.eyebrow}>TASTING JOURNAL</Text>
          <Text style={styles.title}>Brew Reviews</Text>
          <Text style={styles.subtitle}>
            SCA scores, flavor profiles & sensory logs
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={handleAddReview}
          accessibilityRole="button"
          accessibilityLabel="Add Review"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Plus size={16} color={colors.canvas} />
          <Text style={styles.addButtonText}>ADD REVIEW</Text>
        </Pressable>
      </View>

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsRow}
      >
        {METHOD_OPTIONS.map((opt) => {
          const isActive = selectedMethod === opt.id;
          return (
            <Pressable
              key={`method-${opt.id}`}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedMethod(opt.id)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by method ${opt.label}`}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Rating Filter Row */}
      <View style={styles.ratingChipsRow}>
        {RATING_OPTIONS.map((opt) => {
          const isActive = selectedRating === opt.id;
          return (
            <Pressable
              key={`rating-${opt.id}`}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedRating(opt.id)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by rating ${opt.label}`}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
        data={filteredReviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ReviewCard review={item} onPress={handleReviewPress} />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  headerContainer: {
    gap: 14,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleCol: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 26,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  addButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.canvas,
    letterSpacing: 1,
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
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  ratingChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.panel,
    borderColor: colors.accent,
  },
  filterChipText: {
    fontFamily: FONTS.monoMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.accent,
    fontFamily: FONTS.monoBold,
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
});
