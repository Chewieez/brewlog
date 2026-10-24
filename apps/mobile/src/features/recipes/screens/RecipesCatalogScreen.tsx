import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME, BrewRecipe } from '@brewlog/core';
import { useRecipes } from '../RecipeContext';
import { MethodFilterBar } from '../components/MethodFilterBar';
import { RecipeCard } from '../components/RecipeCard';
import { FONTS } from '../../../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthModal } from '../../auth/AuthModalContext';
import { ProfileHeaderButton } from '../../auth/ProfileHeaderButton';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export const RecipesCatalogScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openAuthSheet } = useAuthModal();
  const { recipes } = useRecipes();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const filteredRecipes = useMemo(() => {
    if (selectedFilter === 'all') return recipes;
    if (selectedFilter === 'custom') {
      return recipes.filter((r) => !r.isPreset && !r.id.startsWith('preset-'));
    }
    return recipes.filter(
      (r) => r.brewMethod.toLowerCase() === selectedFilter.toLowerCase()
    );
  }, [recipes, selectedFilter]);

  const handleSelectRecipe = (recipe: BrewRecipe) => {
    router.push(`/recipe/${recipe.id}`);
  };

  const handleCreateNew = () => {
    router.push('/recipe/builder');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Recipes</Text>
          <Text style={styles.headerSubtitle}>
            Specialty brew guides alongside your custom recipes.
          </Text>
        </View>
        <View style={styles.actionsContainer}>
          <Pressable
            onPress={handleCreateNew}
            style={styles.addButton}
            accessibilityRole="button"
            accessibilityLabel="Create new custom recipe"
          >
            <Plus size={18} color={colors.canvas} />
            <Text style={styles.addButtonText}>NEW</Text>
          </Pressable>
          <ProfileHeaderButton onPress={openAuthSheet} />
        </View>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FONTS.sansBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.sansRegular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    minHeight: 44,
    minWidth: 72,
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
});
