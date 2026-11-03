import React from 'react';
import { View, Pressable } from 'react-native';
import { makeStyles } from '../theme';
import type { CardProps } from './Card.types';

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  testID,
  accessibilityLabel,
}) => {
  const styles = useStyles();

  const paddingStyles = {
    none: styles.padNone,
    sm: styles.padSm,
    md: styles.padMd,
    lg: styles.padLg,
  }[padding];

  const surfaceStyles = [
    styles.base,
    paddingStyles,
    variant === 'recessed' ? styles.recessed : styles.panel,
  ];

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          ...surfaceStyles,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel} style={surfaceStyles}>
      {children}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  base: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  panel: { backgroundColor: colors.panel },
  recessed: { backgroundColor: colors.panelRecessed },
  padNone: { padding: 0 },
  padSm: { padding: 12 },
  padMd: { padding: 16 },
  padLg: { padding: 24 },
  pressed: {
    borderColor: colors.borderActive,
    opacity: 0.85,
  },
}));
