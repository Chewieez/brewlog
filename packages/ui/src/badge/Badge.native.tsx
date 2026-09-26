import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import type { BadgeProps } from './Badge.types';

const colors = INDUSTRIAL_PRECISION_THEME.colors;

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  testID,
}) => {
  const isMono = variant === 'mono' || variant === 'accent';
  const isSm = size === 'sm';

  const containerStyles = [
    styles.base,
    isSm ? styles.smContainer : styles.mdContainer,
    variant === 'accent' && styles.accentContainer,
    variant === 'success' && styles.successContainer,
    variant === 'warning' && styles.warningContainer,
    variant === 'error' && styles.errorContainer,
  ];

  const textStyles = [
    styles.baseText,
    isSm ? styles.smText : styles.mdText,
    isMono ? styles.monoText : styles.sansText,
    variant === 'accent' && styles.accentText,
    variant === 'success' && styles.successText,
    variant === 'warning' && styles.warningText,
    variant === 'error' && styles.errorText,
  ];

  return (
    <View testID={testID} style={containerStyles}>
      <Text style={textStyles}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 4,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smContainer: { paddingHorizontal: 6, paddingVertical: 2 },
  mdContainer: { paddingHorizontal: 8, paddingVertical: 3 },
  accentContainer: { backgroundColor: `${colors.accent}15`, borderColor: colors.accent },
  successContainer: { backgroundColor: `${colors.statusSuccess}15`, borderColor: `${colors.statusSuccess}60` },
  warningContainer: { backgroundColor: `${colors.statusWarning}15`, borderColor: `${colors.statusWarning}60` },
  errorContainer: { backgroundColor: `${colors.statusError}15`, borderColor: `${colors.statusError}60` },
  baseText: { color: colors.textSecondary },
  smText: { fontSize: 9 },
  mdText: { fontSize: 10 },
  monoText: { fontFamily: 'JetBrainsMono_700Bold', letterSpacing: 0.8, textTransform: 'uppercase' },
  sansText: { fontFamily: 'Outfit_500Medium' },
  accentText: { color: colors.accent },
  successText: { color: colors.statusSuccess },
  warningText: { color: colors.statusWarning },
  errorText: { color: colors.statusError },
});
