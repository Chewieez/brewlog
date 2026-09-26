import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import type { MetricTileProps } from './MetricTile.types';

const colors = INDUSTRIAL_PRECISION_THEME.colors;

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  variant = 'default',
  size = 'md',
  testID,
}) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const valueStyles = [
    styles.value,
    isSm ? styles.smValue : isLg ? styles.lgValue : styles.mdValue,
    variant === 'accent' && styles.accentValue,
    variant === 'muted' && styles.mutedValue,
  ];

  return (
    <View testID={testID} style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={valueStyles}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  value: {
    fontFamily: 'Outfit_300Light',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  smValue: { fontSize: 20 },
  mdValue: { fontSize: 26 },
  lgValue: { fontSize: 32 },
  accentValue: { color: colors.accent },
  mutedValue: { color: colors.textMuted },
  unit: {
    fontFamily: 'Outfit_300Light',
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 2,
  },
});
