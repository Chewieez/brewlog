import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import type { SegmentedControlProps } from './SegmentedControl.types';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  testID,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const isSm = size === 'sm';

  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={ariaLabel}
      style={[styles.container, isSm && styles.containerSm]}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            aria-selected={isSelected}
            accessibilityLabel={option.accessibilityLabel || option.label}
            onPress={() => onChange(option.value)}
            style={[
              styles.button,
              isSm && styles.buttonSm,
              isSelected && styles.buttonActive,
            ]}
          >
            <Text
              style={[
                styles.text,
                isSm && styles.textSm,
                isSelected && styles.textActive,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.panelRecessed,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  containerSm: {
    padding: 2.5,
  },
  button: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  buttonSm: {
    minHeight: 34,
    borderRadius: 5,
    paddingHorizontal: 6,
  },
  buttonActive: {
    backgroundColor: colors.accent,
  },
  text: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'JetBrainsMono_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  textSm: {
    fontSize: 10,
    letterSpacing: 1,
  },
  textActive: {
    color: colors.canvas,
  },
});
