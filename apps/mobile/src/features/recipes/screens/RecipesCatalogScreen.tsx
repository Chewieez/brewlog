import React, { useState, useMemo, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter, useScrollToTop } from 'expo-router';
import { BrewRecipe } from '@brewlog/core';
import { makeStyles } from '@brewlog/ui';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recipes } = useRecipes();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef as any);

  const effectiveFilter = useMemo(
    () => resolveEffectiveRecipeFilter(recipes, selectedFilter),
    [recipes, selectedFilter]
  );

  const filteredRecipes = useMemo(() => {
    if (effectiveFilter === 'all') return recipes;
    if (effectiveFilter === 'custom') {
      return recipes.filter(isCustomRecipe);
    }
    return recipes.filter(
      (r) => (r.brewMethod?.toLowerCase() ?? '') === effectiveFilter.toLowerCase()
    );
  }, [recipes, effectiveFilter]);

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
      >
        <View style={styles.header}>
          <TabScreenHeader
            title="Recipes"
            actionLabel="NEW RECIPE"
            onActionPress={handleCreateNew}
            actionAccessibilityLabel="Create new custom recipe"
          />
        </View>

        <MethodFilterBar
          recipes={recipes}
          selectedMethod={selectedFilter}
          onSelectMethod={setSelectedFilter}
        />

        <View style={styles.listContainer}>
          {filteredRecipes.length === 0 ? (
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
    gap: 6,
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
}));
