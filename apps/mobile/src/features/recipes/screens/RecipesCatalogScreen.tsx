import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useScrollToTop } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { BrewRecipe, matchesRecipeSearch } from '@brewlog/core';
import { makeStyles, useTheme } from '@brewlog/ui';
import { useRecipes } from '../RecipeContext';
import {
  MethodFilterBar,
  isCustomRecipe,
  resolveEffectiveRecipeFilter,
} from '../components/MethodFilterBar';
import { RecipeCard } from '../components/RecipeCard';
import { FONTS } from '../../../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabScreenHeader } from '../../../components/navigation/TabScreenHeader';
import { getTabScreenBottomPadding } from '../../../components/navigation/tabBarConstants';

export const RecipesCatalogScreen: React.FC = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recipes, loading } = useRecipes();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef as any);

  const effectiveFilter = useMemo(
    () => resolveEffectiveRecipeFilter(recipes, selectedFilter),
    [recipes, selectedFilter]
  );

  const filteredRecipes = useMemo(() => {
    const byMethod =
      effectiveFilter === 'all'
        ? recipes
        : effectiveFilter === 'custom'
          ? recipes.filter(isCustomRecipe)
          : recipes.filter(
              (r) => (r.brewMethod?.toLowerCase() ?? '') === effectiveFilter.toLowerCase()
            );

    return byMethod.filter((r) => matchesRecipeSearch(r, searchQuery));
  }, [recipes, effectiveFilter, searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const isSearchEmpty =
    recipes.length > 0 && filteredRecipes.length === 0 && searchQuery.trim().length > 0;

  const handleSelectRecipe = (recipe: BrewRecipe) => {
    router.push(`/recipe/${recipe.id}`);
  };

  const handleCreateNew = () => {
    router.push('/recipe/builder');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getTabScreenBottomPadding(insets.bottom) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TabScreenHeader
            title="Recipes"
            actionLabel="NEW RECIPE"
            onActionPress={handleCreateNew}
            actionAccessibilityLabel="Create new custom recipe"
          />

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search name, author, method..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              accessibilityLabel="Search recipes"
              returnKeyType="search"
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
        </View>

        <MethodFilterBar
          recipes={recipes}
          selectedMethod={selectedFilter}
          onSelectMethod={setSelectedFilter}
        />

        <View style={styles.listContainer}>
          {loading &&
          (recipes.length === 0 || (selectedFilter === 'custom' && filteredRecipes.length === 0)) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} testID="recipe-catalog-loading" />
            </View>
          ) : isSearchEmpty ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Search size={24} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Recipes Found</Text>
              <Text style={styles.emptySubtitle}>
                No recipes match your search query.
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
          ) : filteredRecipes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Recipes Found</Text>
              <Text style={styles.emptySubtitle}>
                No recipes match the selected brew method filter.
              </Text>
            </View>
          ) : (
            filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onPress={handleSelectRecipe}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {},
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 14,
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
  listContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginTop: 6,
  },
  emptyActionButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.canvas,
    letterSpacing: 1,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
