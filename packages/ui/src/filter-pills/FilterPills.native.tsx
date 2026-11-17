import React from 'react';
import { ScrollView, Pressable, Text } from 'react-native';
import { makeStyles } from '../theme';
import type { FilterPillsProps } from './FilterPills.types';

/**
 * Horizontal scrollable pill bar for React Native filtering.
 */
export function FilterPills<T extends string = string>({
  options,
  value,
  onChange,
  size = 'sm',
  ariaLabel,
  testID,
}: FilterPillsProps<T>) {
  const styles = useStyles();

  if (options.length === 0) {
    return null;
  }

  const isMd = size === 'md';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}
      accessibilityLabel={ariaLabel}
      contentContainerStyle={styles.container}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        const isDisabled = Boolean(option.disabled);

        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: isDisabled }}
            accessibilityLabel={option.accessibilityLabel || option.label}
            onPress={() => {
              if (!isDisabled) {
                onChange(option.value);
              }
            }}
            style={({ pressed }) => [
              styles.chip,
              isMd && styles.chipMd,
              isSelected ? styles.chipActive : styles.chipInactive,
              pressed && !isDisabled && styles.chipPressed,
              isDisabled && styles.chipDisabled,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                isSelected ? styles.chipTextActive : styles.chipTextInactive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipMd: {
    minHeight: 48,
    paddingHorizontal: 16,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipInactive: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chipTextActive: {
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.canvas,
  },
  chipTextInactive: {
    color: colors.foregroundSecondary,
  },
}));
