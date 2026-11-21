import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { BrewRecipe } from '@brewlog/core';
import { FilterPills, type FilterPillsOption, makeStyles } from '@brewlog/ui';

export interface MethodFilterBarProps {
  recipes: BrewRecipe[];
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
}

export const isCustomRecipe = (recipe: BrewRecipe): boolean =>
  !recipe.isPreset && !recipe.id.startsWith('preset-');

export function resolveEffectiveRecipeFilter(
  recipes: BrewRecipe[],
  selectedFilter: string
): string {
  const normalized = selectedFilter.toLowerCase();
  if (normalized === 'all') return 'all';
  if (normalized === 'custom') {
    return recipes.some(isCustomRecipe) ? 'custom' : 'all';
  }
  return recipes.some((r) => (r.brewMethod?.toLowerCase() ?? '') === normalized)
    ? normalized
    : 'all';
}

export const MethodFilterBar: React.FC<MethodFilterBarProps> = ({
  recipes,
  selectedMethod,
  onSelectMethod,
}) => {
  const styles = useStyles();

  const options = useMemo<FilterPillsOption<string>[]>(() => {
    const hasCustomRecipes = recipes.some(isCustomRecipe);
    const methods = Array.from(
      new Set(
        recipes
          .map((r) => r.brewMethod?.toLowerCase() ?? '')
          .filter((m) => Boolean(m) && m !== 'custom')
      )
    );

    const items: FilterPillsOption<string>[] = [
      { value: 'all', label: 'ALL', accessibilityLabel: 'Filter by all' },
    ];

    if (hasCustomRecipes) {
      items.push({
        value: 'custom',
        label: 'CUSTOM',
        accessibilityLabel: 'Filter by custom',
      });
    }

    for (const method of methods) {
      items.push({
        value: method,
        label: method.toUpperCase().replace(/-/g, ' '),
        accessibilityLabel: `Filter by ${method}`,
      });
    }

    return items;
  }, [recipes]);

  const normalizedSelected = selectedMethod.toLowerCase();
  const effectiveMethod = useMemo(
    () => resolveEffectiveRecipeFilter(recipes, selectedMethod),
    [recipes, selectedMethod]
  );

  useEffect(() => {
    if (normalizedSelected !== effectiveMethod) {
      onSelectMethod(effectiveMethod);
    }
  }, [normalizedSelected, effectiveMethod, onSelectMethod]);

  if (options.length <= 1) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FilterPills
        size="sm"
        value={effectiveMethod}
        onChange={onSelectMethod}
        options={options}
        ariaLabel="Filter recipes by brew method"
        testID="recipe-method-filters"
      />
    </View>
  );
};

const useStyles = makeStyles(() => ({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
}));
