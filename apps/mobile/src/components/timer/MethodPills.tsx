import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface MethodPillsProps {
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
  methods: string[];
}

export const MethodPills: React.FC<MethodPillsProps> = ({
  selectedMethod,
  onSelectMethod,
  methods,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {methods.map((method) => {
          const isSelected = selectedMethod.toLowerCase() === method.toLowerCase();
          return (
            <Pressable
              key={method}
              onPress={() => onSelectMethod(method)}
              style={[
                styles.pill,
                isSelected ? styles.pillActive : styles.pillInactive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${method.toUpperCase()} brew method`}
            >
              <Text
                style={[
                  styles.pillText,
                  isSelected ? styles.pillTextActive : styles.pillTextInactive,
                ]}
              >
                {method.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: colors.panel,
    borderColor: colors.accent,
  },
  pillInactive: {
    backgroundColor: colors.canvas,
    borderColor: colors.borderSubtle,
  },
  pillText: {
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.2,
  },
  pillTextActive: {
    color: colors.accent,
  },
  pillTextInactive: {
    color: colors.textMuted,
  },
});

export default MethodPills;
