import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { makeStyles } from '@brewlog/ui';
import { FONTS } from '../../theme/fonts';

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
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {methods.map((method) => {
          const isSelected = selectedMethod.toLowerCase() === method.toLowerCase();
          const displayName = method.replace(/-/g, ' ').toUpperCase();
          return (
            <Pressable
              key={method}
              onPress={() => onSelectMethod(method)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={[
                styles.pill,
                isSelected ? styles.pillActive : styles.pillInactive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${displayName} brew method`}
            >
              <Text
                style={[
                  styles.pillText,
                  isSelected ? styles.pillTextActive : styles.pillTextInactive,
                ]}
              >
                {displayName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
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
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.2,
  },
  pillTextActive: {
    color: colors.canvas,
  },
  pillTextInactive: {
    color: colors.textMuted,
  },
}));

export default MethodPills;
