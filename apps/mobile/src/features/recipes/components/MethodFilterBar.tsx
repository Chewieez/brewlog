import React, { useMemo } from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { BrewRecipe, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface MethodFilterBarProps {
  recipes: BrewRecipe[];
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
}

export const MethodFilterBar: React.FC<MethodFilterBarProps> = ({
  recipes,
  selectedMethod,
  onSelectMethod,
}) => {
  const pills = useMemo(() => {
    const methods = Array.from(new Set(recipes.map((r) => r.brewMethod.toLowerCase())));
    return ['all', 'custom', ...methods.filter((m) => m !== 'custom')];
  }, [recipes]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {pills.map((method) => {
        const isSelected = selectedMethod.toLowerCase() === method.toLowerCase();
        return (
          <Pressable
            key={method}
            onPress={() => onSelectMethod(method)}
            style={[styles.pill, isSelected ? styles.pillActive : styles.pillInactive]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Filter by ${method}`}
          >
            <Text
              style={[
                styles.pillText,
                isSelected ? styles.pillTextActive : styles.pillTextInactive,
              ]}
            >
              {method.toUpperCase().replace('-', ' ')}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
  },
  pillInactive: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
  },
  pillText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  pillTextActive: {
    color: colors.accent,
  },
  pillTextInactive: {
    color: colors.textMuted,
  },
});
