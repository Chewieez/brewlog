import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BrewRecipe, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface RecipeCardProps {
  recipe: BrewRecipe;
  onPress: (recipe: BrewRecipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onPress }) => {
  const isCustom = !recipe.isPreset && !recipe.id.startsWith('preset-');
  const minutes = Math.floor(recipe.totalTimeSeconds / 60);
  const seconds = recipe.totalTimeSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds > 0 ? `${seconds}s` : ''}`.trim();

  return (
    <Pressable
      onPress={() => onPress(recipe)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`View recipe ${recipe.name}`}
    >
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
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
              <Text style={styles.presetBadgeText}>PRESET</Text>
            </View>
          )}
        </View>
        {recipe.author ? (
          <Text style={styles.authorText}>by {recipe.author}</Text>
        ) : null}
      </View>

      <Text style={styles.nameText}>{recipe.name}</Text>
      {recipe.description ? (
        <Text style={styles.descriptionText} numberOfLines={2}>
          {recipe.description}
        </Text>
      ) : null}

      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>DOSE</Text>
          <Text style={styles.metricValue}>{recipe.coffeeDoseGrams}g</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>RATIO</Text>
          <Text style={styles.metricValue}>1:{recipe.ratio}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>WATER</Text>
          <Text style={styles.metricValue}>{recipe.waterAmountGrams}g</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>TIME</Text>
          <Text style={styles.metricValue}>{timeFormatted}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
    minHeight: 44,
  },
  cardPressed: {
    opacity: 0.85,
    borderColor: colors.accent,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeGroup: {
    flexDirection: 'row',
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
  nameText: {
    fontFamily: FONTS.sansBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  descriptionText: {
    fontFamily: FONTS.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.panelRecessed,
    borderRadius: 6,
    padding: 10,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: FONTS.monoRegular,
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 2,
    letterSpacing: 0.8,
  },
  metricValue: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
});
