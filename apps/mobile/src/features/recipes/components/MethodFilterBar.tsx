import React, { useMemo } from 'react';
import { ScrollView, Pressable, Text } from 'react-native';
import { BrewRecipe } from '@brewlog/core';
import { makeStyles } from '@brewlog/ui';
import { FONTS } from '../../../theme/fonts';

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
  const styles = useStyles();
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

const useStyles = makeStyles((colors) => ({
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
    backgroundColor: colors.accent,
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
    color: colors.canvas,
  },
  pillTextInactive: {
    color: colors.textMuted,
  },
}));
