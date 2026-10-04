import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plus,
  Search,
  X,
  Sliders,
  Coffee,
  Scale,
  Flame,
} from 'lucide-react-native';
import { Equipment, EquipmentType, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';
import { useEquipment } from '../EquipmentContext';
import { EquipmentCard } from '../components/EquipmentCard';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export type CategoryFilter = 'all' | 'grinder' | 'brewer' | 'scale' | 'kettle';

interface CategoryOption {
  id: CategoryFilter;
  label: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'all', label: 'All' },
  { id: 'grinder', label: 'Grinders' },
  { id: 'brewer', label: 'Brewers' },
  { id: 'scale', label: 'Scales' },
  { id: 'kettle', label: 'Kettles' },
];

export const EquipmentCatalogScreen: React.FC = () => {
  const router = useRouter();
  const {
    equipment,
    grinders,
    brewers,
    scales,
    kettles,
    toggleFavorite,
  } = useEquipment();

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filterItems = useCallback(
    (items: Equipment[]) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return items;
      return items.filter((item) => {
        const matchBrand = item.brand.toLowerCase().includes(q);
        const matchModel = item.model.toLowerCase().includes(q);
        const matchSubType = item.subType?.toLowerCase().includes(q) ?? false;
        const matchNotes = item.notes?.toLowerCase().includes(q) ?? false;
        return matchBrand || matchModel || matchSubType || matchNotes;
      });
    },
    [searchQuery]
  );

  const filteredGrinders = useMemo(() => filterItems(grinders), [filterItems, grinders]);
  const filteredBrewers = useMemo(() => filterItems(brewers), [filterItems, brewers]);
  const filteredScales = useMemo(() => filterItems(scales), [filterItems, scales]);
  const filteredKettles = useMemo(() => filterItems(kettles), [filterItems, kettles]);

  const totalFilteredCount = useMemo(() => {
    if (selectedCategory === 'grinder') return filteredGrinders.length;
    if (selectedCategory === 'brewer') return filteredBrewers.length;
    if (selectedCategory === 'scale') return filteredScales.length;
    if (selectedCategory === 'kettle') return filteredKettles.length;
    return (
      filteredGrinders.length +
      filteredBrewers.length +
      filteredScales.length +
      filteredKettles.length
    );
  }, [
    selectedCategory,
    filteredGrinders.length,
    filteredBrewers.length,
    filteredScales.length,
    filteredKettles.length,
  ]);

  const handleAddEquipment = useCallback(() => {
    router.push('/equipment/modal');
  }, [router]);

  const handleSelectEquipment = useCallback(
    (item: Equipment) => {
      router.push({
        pathname: '/equipment/modal',
        params: { id: item.id },
      });
    },
    [router]
  );

  const handleToggleFavorite = useCallback(
    (item: Equipment) => {
      toggleFavorite(item.id);
    },
    [toggleFavorite]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const renderSection = (
    title: string,
    items: Equipment[],
    IconComponent: React.ComponentType<{ size: number; color: string }>,
    emptyMessage: string
  ) => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <IconComponent size={18} color={colors.accent} />
        <Text style={styles.sectionTitle}>
          {title} ({items.length})
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.sectionEmptyCard}>
          <Text style={styles.sectionEmptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <View style={styles.sectionList}>
          {items.map((item) => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onPress={handleSelectEquipment}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <View style={styles.titleTextContainer}>
              <Text style={styles.headerEyebrow}>BREW GEAR</Text>
              <Text style={styles.headerTitle}>Equipment</Text>
              <Text style={styles.headerSubtitle}>
                Manage your grinders, brewers, scales, and kettles.
              </Text>
            </View>
            <Pressable
              onPress={handleAddEquipment}
              style={styles.addButton}
              accessibilityRole="button"
              accessibilityLabel="Add new equipment"
            >
              <Plus size={16} color={colors.canvas} />
              <Text style={styles.addButtonText}>ADD EQUIPMENT</Text>
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search brand, model, features..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              accessibilityLabel="Search equipment"
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

          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterScroll}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.categoryChip,
                    isSelected
                      ? styles.categoryChipActive
                      : styles.categoryChipInactive,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Filter by ${cat.label}`}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected
                        ? styles.categoryChipTextActive
                        : styles.categoryChipTextInactive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Catalog Body */}
        {totalFilteredCount === 0 && searchQuery.trim().length > 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Search size={28} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No equipment found</Text>
            <Text style={styles.emptySubtitle}>
              No gear matches your search query &ldquo;{searchQuery}&rdquo;.
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
        ) : totalFilteredCount === 0 && equipment.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Scale size={28} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>Equipment List is Empty</Text>
            <Text style={styles.emptySubtitle}>
              Add your grinder, brewer, scale, or kettle to pair with brew recipes.
            </Text>
            <Pressable
              onPress={handleAddEquipment}
              style={styles.emptyActionButton}
              accessibilityRole="button"
              accessibilityLabel="Add your first equipment"
            >
              <Plus size={16} color={colors.canvas} />
              <Text style={styles.emptyActionButtonText}>ADD YOUR FIRST GEAR</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.sectionsWrapper}>
            {(selectedCategory === 'all' || selectedCategory === 'grinder') &&
              renderSection(
                'Grinders',
                filteredGrinders,
                Sliders,
                'No grinders logged yet.'
              )}

            {(selectedCategory === 'all' || selectedCategory === 'brewer') &&
              renderSection(
                'Brewers & Drippers',
                filteredBrewers,
                Coffee,
                'No brewers logged yet.'
              )}

            {(selectedCategory === 'all' || selectedCategory === 'scale') &&
              renderSection(
                'Precision Scales',
                filteredScales,
                Scale,
                'No scales logged yet. Add your brew scale to track 0.1g dose.'
              )}

            {(selectedCategory === 'all' || selectedCategory === 'kettle') &&
              renderSection(
                'Kettles & Water Gear',
                filteredKettles,
                Flame,
                'No kettles logged yet. Add your gooseneck kettle.'
              )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  headerEyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  addButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.canvas,
    letterSpacing: 1,
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
  categoryFilterScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
  },
  categoryChipInactive: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
  },
  categoryChipText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  categoryChipTextActive: {
    fontFamily: FONTS.monoBold,
    color: colors.accent,
  },
  categoryChipTextInactive: {
    color: colors.textSecondary,
  },
  sectionsWrapper: {
    paddingHorizontal: 16,
    gap: 20,
    marginTop: 8,
  },
  sectionContainer: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sectionList: {
    gap: 10,
  },
  sectionEmptyCard: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  sectionEmptyText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyContainer: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 28,
    marginHorizontal: 16,
    marginTop: 12,
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
});
