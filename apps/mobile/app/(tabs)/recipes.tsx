import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import {
  INDUSTRIAL_PRECISION_THEME,
  DEFAULT_PRESET_RECIPES,
} from '@brewlog/core';

export default function RecipesScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>RECIPE CATALOG</Text>
        <Text style={styles.headerTitle}>Curated Brew Profiles</Text>
        <Text style={styles.headerSubtitle}>
          Industry-tested recipes synced from @brewlog/core.
        </Text>
      </View>

      {DEFAULT_PRESET_RECIPES.map((recipe) => (
        <View key={recipe.id} style={styles.recipeCard}>
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeName}>{recipe.name}</Text>
            <View style={styles.methodBadge}>
              <Text style={styles.methodBadgeText}>
                {recipe.brewMethod.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.recipeDescription}>{recipe.description}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>DOSE</Text>
              <Text style={styles.metaValue}>{recipe.coffeeDoseGrams}g</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>RATIO</Text>
              <Text style={styles.metaValue}>1:{recipe.ratio}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>WATER</Text>
              <Text style={styles.metaValue}>{recipe.waterAmountGrams}g</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>TEMP</Text>
              <Text style={styles.metaValue}>{recipe.waterTempCelsius}°C</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const { colors } = INDUSTRIAL_PRECISION_THEME;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  recipeCard: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 16,
    gap: 12,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipeName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
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
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.8,
  },
  recipeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.panelRecessed,
    borderRadius: 6,
    padding: 10,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
