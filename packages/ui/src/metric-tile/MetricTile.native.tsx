import React from 'react';
import { View, Text } from 'react-native';
import { makeStyles } from '../theme';
import type { MetricTileProps } from './MetricTile.types';

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  variant = 'default',
  size = 'md',
  testID,
}) => {
  const styles = useStyles();
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

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
  },
  label: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: colors.foregroundMuted,
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
    color: colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  smValue: { fontSize: 20 },
  mdValue: { fontSize: 26 },
  lgValue: { fontSize: 32 },
  accentValue: { color: colors.accent },
  mutedValue: { color: colors.foregroundMuted },
  unit: {
    fontFamily: 'Outfit_300Light',
    fontSize: 14,
    color: colors.foregroundMuted,
    marginLeft: 2,
  },
}));
