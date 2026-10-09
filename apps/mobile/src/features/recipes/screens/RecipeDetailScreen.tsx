import React, { useState, useContext } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Copy, Edit2, Trash2 } from 'lucide-react-native';
import {
  INDUSTRIAL_PRECISION_THEME,
  rescaleRecipeDose,
  Equipment,
} from '@brewlog/core';
import { useRecipes } from '../RecipeContext';
import { EquipmentContext, useOptionalEquipment } from '../../equipment/EquipmentContext';
import { SpecsGrid } from '../components/SpecsGrid';
import { DoseRescaler } from '../components/DoseRescaler';
import { StagesTimeline } from '../components/StagesTimeline';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface RecipeDetailScreenProps {
  recipeId: string;
  equipment?: Equipment[];
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({
  recipeId,
  equipment: propEquipment,
}) => {
  const router = useRouter();
  const { recipes, deleteRecipe, setActiveTimerRecipe } = useRecipes();
  const equipmentContext = useOptionalEquipment?.() ?? useContext(EquipmentContext);

  const recipe = recipes.find((r) => r.id === recipeId);
  const [customDose, setCustomDose] = useState<number>(
    recipe ? Math.round(recipe.coffeeDoseGrams) : 15
  );

  const userGrinders = propEquipment
    ? propEquipment.filter((e) => e.type === 'grinder')
    : (equipmentContext?.grinders ?? equipmentContext?.equipment?.filter((e) => e.type === 'grinder') ?? []);

  const activeGrinderSettings = (recipe?.grinderSettings || []).flatMap((setting) => {
    const grinder = userGrinders.find((g) => g.id === setting.grinderId);
    if (!grinder) return [];
    return [{ setting, grinder }];
  });

  if (!recipe) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundTitle}>Recipe Not Found</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>RETURN TO CATALOG</Text>
        </Pressable>
      </View>
    );
  }

  const scaledRecipe = rescaleRecipeDose(recipe, customDose);
  const isCustom = !recipe.isPreset && !recipe.id.startsWith('preset-');

  const handleBrew = () => {
    setActiveTimerRecipe(scaledRecipe, customDose);
    router.replace('/(tabs)');
  };

  const handleDuplicate = () => {
    router.push({
      pathname: '/recipe/builder',
      params: { duplicateId: recipe.id },
    });
  };

  const handleEdit = () => {
    router.push({
      pathname: '/recipe/builder',
      params: { editId: recipe.id },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Recipe?',
      `Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRecipe(recipe.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={styles.methodBadge}>
            <Text style={styles.methodBadgeText}>
              {recipe.brewMethod.toUpperCase()}
            </Text>
          </View>
          {isCustom ? (
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>CUSTOM</Text>
            </View>
          ) : (
            <View style={styles.presetBadge}>
              <Text style={styles.presetBadgeText}>OFFICIAL PRESET</Text>
            </View>
          )}
          {recipe.author ? (
            <Text style={styles.authorText}>by {recipe.author}</Text>
          ) : null}
        </View>

        <Text style={styles.recipeTitle}>{recipe.name}</Text>
        {recipe.description ? (
          <Text style={styles.descriptionText}>{recipe.description}</Text>
        ) : null}
      </View>

      <Pressable
        onPress={handleBrew}
        style={({ pressed }) => [styles.brewButton, pressed && styles.brewButtonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Brew with this recipe"
      >
        <Play size={18} color={colors.canvas} fill={colors.canvas} />
        <Text style={styles.brewButtonText}>BREW WITH THIS RECIPE</Text>
      </Pressable>

      <SpecsGrid
        totalWater={scaledRecipe.waterAmountGrams}
        ratio={scaledRecipe.ratio}
        totalTimeSeconds={scaledRecipe.totalTimeSeconds}
        waterTempCelsius={scaledRecipe.waterTempCelsius}
      />

      <DoseRescaler
        currentDose={customDose}
        baseDose={Math.round(recipe.coffeeDoseGrams)}
        onDoseChange={setCustomDose}
      />

      <View style={styles.grinderCard}>
        <View style={styles.grinderCardHeader}>
          <Text style={styles.grinderCardTitle}>GRINDER SETTINGS</Text>
        </View>

        {activeGrinderSettings.length > 0 ? (
          <View style={styles.grinderList}>
            {activeGrinderSettings.map(({ setting, grinder }, index) => (
              <View key={setting.grinderId} style={styles.grinderRow}>
                <View style={styles.grinderInfo}>
                  <Text style={styles.grinderText}>
                    {grinder.brand} {grinder.model} — {setting.setting || recipe.grindSize}
                  </Text>
                  {index === 0 && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.fallbackGrindRow}>
            <Text style={styles.fallbackGrindLabel}>Grind Size: </Text>
            <Text style={styles.fallbackGrindValue}>{recipe.grindSize}</Text>
          </View>
        )}
      </View>

      <StagesTimeline stages={scaledRecipe.stages} />

      <View style={styles.actionsFooter}>
        <Pressable
          onPress={handleDuplicate}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Duplicate recipe as custom"
        >
          <Copy size={16} color={colors.textPrimary} />
          <Text style={styles.actionButtonText}>DUPLICATE AS CUSTOM</Text>
        </Pressable>

        {isCustom ? (
          <>
            <Pressable
              onPress={handleEdit}
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel="Edit recipe"
            >
              <Edit2 size={16} color={colors.textPrimary} />
              <Text style={styles.actionButtonText}>EDIT RECIPE</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={[styles.actionButton, styles.deleteButton]}
              accessibilityRole="button"
              accessibilityLabel="Delete recipe"
            >
              <Trash2 size={16} color={colors.statusError} />
              <Text style={styles.deleteButtonText}>DELETE RECIPE</Text>
            </Pressable>
          </>
        ) : null}
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
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  notFoundTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  backButton: {
    minHeight: 44,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  backButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 1,
  },
  header: {
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodBadge: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  methodBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textPrimary,
    letterSpacing: 0.8,
  },
  customBadge: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  customBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.8,
  },
  presetBadge: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  presetBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  authorText: {
    fontFamily: FONTS.monoRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  recipeTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 24,
    color: colors.textPrimary,
  },
  descriptionText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  brewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  brewButtonPressed: {
    opacity: 0.85,
  },
  brewButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
    color: colors.canvas,
    letterSpacing: 1.2,
  },
  actionsFooter: {
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  deleteButton: {
    borderColor: colors.statusError,
  },
  deleteButtonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.statusError,
    letterSpacing: 1,
  },
  grinderCard: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  grinderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grinderCardTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  grinderList: {
    gap: 8,
  },
  grinderRow: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  grinderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  grinderText: {
    flex: 1,
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  primaryBadge: {
    backgroundColor: 'rgba(212, 163, 89, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 163, 89, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  primaryBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.8,
  },
  fallbackGrindRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fallbackGrindLabel: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.textMuted,
  },
  fallbackGrindValue: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13,
    color: colors.textPrimary,
  },
});
