import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ListRenderItemInfo,
} from 'react-native';
import { useRouter, useScrollToTop } from 'expo-router';
import { Plus, Search, X, Bean as BeanIcon, Archive, Snowflake } from 'lucide-react-native';
import { Bean } from '@brewlog/core';
import {
  makeStyles,
  useTheme,
  SegmentedControl,
  FilterPills,
  type FilterPillsOption,
} from '@brewlog/ui';
import { FONTS } from '../../../theme/fonts';
import { useStash } from '../StashContext';
import { BeanCard } from '../components/BeanCard';
import { CellarSummaryBar } from '../components/CellarSummaryBar';
import { calculateBeanRestingInfo } from '../utils/restingUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabScreenHeader } from '../../../components/navigation/TabScreenHeader';
import { getTabScreenBottomPadding } from '../../../components/navigation/tabBarConstants';

export type ShelfType = 'active' | 'frozen' | 'archived';
export type ProcessFilter = 'all' | 'washed' | 'natural' | 'honey' | 'anaerobic';

interface ShelfOption {
  id: ShelfType;
  label: string;
}

const SHELVES: ShelfOption[] = [
  { id: 'active', label: 'Active Cellar' },
  { id: 'frozen', label: 'Freezer Vault' },
  { id: 'archived', label: 'Archived' },
];

const PROCESS_FILTER_OPTIONS: { id: Exclude<ProcessFilter, 'all'>; label: string }[] = [
  { id: 'washed', label: 'Washed' },
  { id: 'natural', label: 'Natural' },
  { id: 'honey', label: 'Honey' },
  { id: 'anaerobic', label: 'Anaerobic' },
];

function matchesProcessFilter(
  bean: Bean,
  filter: Exclude<ProcessFilter, 'all'>
): boolean {
  const proc = bean.process?.toLowerCase() ?? '';
  if (filter === 'anaerobic') {
    return proc === 'anaerobic' || proc.includes('anaerobic');
  }
  return proc === filter;
}

export const StashCatalogScreen: React.FC = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Bean>>(null);
  useScrollToTop(flatListRef);
  const {
    activeBeans,
    frozenBeans,
    archivedBeans,
    setActiveBrewBean,
    toggleFavorite,
  } = useStash();

  const [activeShelf, setActiveShelf] = useState<ShelfType>('active');
  const [selectedProcess, setSelectedProcess] = useState<ProcessFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Calculate cellar-level statistics for the summary bar (active cellar bags)
  const summaryMetrics = useMemo(() => {
    const totalBags = activeBeans.length;
    const peakBags = activeBeans.filter(
      (b) => calculateBeanRestingInfo(b).status === 'peak'
    ).length;
    const totalRemainingGrams = activeBeans.reduce(
      (sum, b) => sum + (b.remainingGrams ?? b.bagWeightGrams ?? 0),
      0
    );
    return { totalBags, peakBags, totalRemainingGrams };
  }, [activeBeans]);

  // 2. Select beans according to active shelf
  const currentShelfBeans = useMemo(() => {
    switch (activeShelf) {
      case 'frozen':
        return frozenBeans;
      case 'archived':
        return archivedBeans;
      case 'active':
      default:
        return activeBeans;
    }
  }, [activeShelf, activeBeans, frozenBeans, archivedBeans]);

  const availableProcessOptions = useMemo<FilterPillsOption<ProcessFilter>[]>(() => {
    const present = PROCESS_FILTER_OPTIONS.filter((proc) =>
      currentShelfBeans.some((bean) => matchesProcessFilter(bean, proc.id))
    );
    return [
      { value: 'all', label: 'All', accessibilityLabel: 'Filter by All' },
      ...present.map((proc) => ({
        value: proc.id as ProcessFilter,
        label: proc.label,
        accessibilityLabel: `Filter by ${proc.label}`,
      })),
    ];
  }, [currentShelfBeans]);

  const effectiveProcess: ProcessFilter = useMemo(
    () =>
      availableProcessOptions.some((opt) => opt.value === selectedProcess)
        ? selectedProcess
        : 'all',
    [availableProcessOptions, selectedProcess]
  );

  useEffect(() => {
    if (selectedProcess !== effectiveProcess) {
      setSelectedProcess(effectiveProcess);
    }
  }, [selectedProcess, effectiveProcess]);

  // 3. Filter by process and search query
  const filteredBeans = useMemo(() => {
    return currentShelfBeans.filter((bean) => {
      // Process filter
      if (effectiveProcess !== 'all' && !matchesProcessFilter(bean, effectiveProcess)) {
        return false;
      }

      // Search query filter
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchName = bean.name.toLowerCase().includes(q);
        const matchRoaster = bean.roaster.toLowerCase().includes(q);
        const matchOrigin =
          bean.originCountry?.toLowerCase().includes(q) ?? false;
        const matchRegion = bean.region?.toLowerCase().includes(q) ?? false;
        const matchFarm = bean.farm?.toLowerCase().includes(q) ?? false;
        const matchNotes =
          bean.flavorNotes?.some((n) => n.toLowerCase().includes(q)) ?? false;
        const matchVariety = Array.isArray(bean.variety)
          ? bean.variety.some((v) => v.toLowerCase().includes(q))
          : typeof bean.variety === 'string'
          ? (bean.variety as string).toLowerCase().includes(q)
          : false;

        if (
          !matchName &&
          !matchRoaster &&
          !matchOrigin &&
          !matchRegion &&
          !matchFarm &&
          !matchNotes &&
          !matchVariety
        ) {
          return false;
        }
      }

      return true;
    });
  }, [currentShelfBeans, effectiveProcess, searchQuery]);

  // Handlers
  const handleAddBag = useCallback(() => {
    router.push('/stash/modal');
  }, [router]);

  const handleSelectBean = useCallback(
    (bean: Bean) => {
      router.push(`/stash/${bean.id}`);
    },
    [router]
  );

  const handleBrew = useCallback(
    (bean: Bean) => {
      setActiveBrewBean(bean);
      router.push('/(tabs)');
    },
    [router, setActiveBrewBean]
  );

  const handleToggleFavorite = useCallback(
    (bean: Bean) => {
      toggleFavorite(bean.id);
    },
    [toggleFavorite]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const renderBeanItem = useCallback(
    ({ item }: ListRenderItemInfo<Bean>) => (
      <View style={styles.cardWrapper}>
        <BeanCard
          bean={item}
          onPress={handleSelectBean}
          onBrew={handleBrew}
          onToggleFavorite={handleToggleFavorite}
        />
      </View>
    ),
    [handleSelectBean, handleBrew, handleToggleFavorite]
  );

  const renderEmptyComponent = () => {
    if (searchQuery.trim().length > 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Search size={28} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No coffees found</Text>
          <Text style={styles.emptySubtitle}>
            No coffees match your search query &ldquo;{searchQuery}&rdquo;.
          </Text>
          <Pressable
            onPress={handleClearSearch}
            style={styles.emptyActionButton}
            accessibilityRole="button"
            accessibilityLabel="Clear search input"
          >
            <Text style={styles.emptyActionButtonText}>CLEAR SEARCH</Text>
          </Pressable>
        </View>
      );
    }

    if (activeShelf === 'frozen') {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Snowflake size={28} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>Freezer Vault is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Freeze coffees at their peak resting window to preserve freshness and halt oxidation.
          </Text>
        </View>
      );
    }

    if (activeShelf === 'archived') {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Archive size={28} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Archived Coffees</Text>
          <Text style={styles.emptySubtitle}>
            Finished bags and past coffees you archive will be preserved here for reference.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <BeanIcon size={28} color={colors.accent} />
        </View>
        <Text style={styles.emptyTitle}>Cellar is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Add a bag of coffee to track roast date, resting curve, and remaining gram weight.
        </Text>
        <Pressable
          onPress={handleAddBag}
          style={styles.emptyActionButton}
          accessibilityRole="button"
          accessibilityLabel="Add your first bean"
        >
          <Plus size={16} color={colors.canvas} />
          <Text style={styles.emptyActionButtonText}>ADD YOUR FIRST BEAN</Text>
        </Pressable>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TabScreenHeader
        title="Stash"
        actionLabel="ADD BEAN"
        onActionPress={handleAddBag}
        actionAccessibilityLabel="Add new bean to stash"
      />

      {/* Summary Chassis Bar */}
      <View style={styles.summaryBarWrapper}>
        <CellarSummaryBar
          totalBags={summaryMetrics.totalBags}
          peakBags={summaryMetrics.peakBags}
          totalRemainingGrams={summaryMetrics.totalRemainingGrams}
        />
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search roaster, origin, name..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          accessibilityLabel="Search coffees"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 ? (
          <Pressable
            onPress={handleClearSearch}
            style={styles.clearSearchButton}
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Shelf Selector Segmented Control */}
      <SegmentedControl
        fullWidth
        size="sm"
        role="tablist"
        value={activeShelf}
        onChange={(val) => setActiveShelf(val as ShelfType)}
        options={SHELVES.map((shelf) => ({
          value: shelf.id,
          label: shelf.label,
          accessibilityLabel: `View ${shelf.label}`,
        }))}
        ariaLabel="Shelf selector"
      />

      {/* Process Filter Horizontal Chips */}
      {availableProcessOptions.length > 1 ? (
        <FilterPills<ProcessFilter>
          size="sm"
          value={effectiveProcess}
          onChange={setSelectedProcess}
          options={availableProcessOptions}
          ariaLabel="Filter by process method"
          testID="stash-process-filters"
        />
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={filteredBeans}
        keyExtractor={(item) => item.id}
        renderItem={renderBeanItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: getTabScreenBottomPadding(insets.bottom) },
        ]}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  listContent: {},
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 14,
  },
  summaryBarWrapper: {
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.sansRegular,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 44,
    paddingVertical: 0,
  },
  clearSearchButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  cardWrapper: {
    paddingHorizontal: 16,
  },
  itemSeparator: {
    height: 12,
  },
  emptyContainer: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 28,
    marginHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyActionButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.canvas,
    letterSpacing: 1,
  },
}));
