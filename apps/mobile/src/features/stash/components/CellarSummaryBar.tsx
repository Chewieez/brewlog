import React from 'react';
import { View, Text } from 'react-native';
import { makeStyles } from '@brewlog/ui';
import { FONTS } from '../../../theme/fonts';

export interface CellarSummaryBarProps {
  totalBags: number;
  peakBags: number;
  totalRemainingGrams: number;
}

export const CellarSummaryBar: React.FC<CellarSummaryBarProps> = ({
  totalBags,
  peakBags,
  totalRemainingGrams,
}) => {
  const styles = useStyles();
  return (
    <View
      style={styles.chassis}
      accessibilityRole="summary"
      accessibilityLabel={`Cellar summary: ${totalBags} active bags, ${peakBags} at peak, ${totalRemainingGrams}g total stash`}
    >
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>ACTIVE BAGS</Text>
          <Text style={styles.metricValue}>{totalBags}</Text>
        </View>

        <View style={[styles.metricItem, styles.metricItemBorder]}>
          <Text style={styles.metricLabel}>AT PEAK</Text>
          <Text
            style={[
              styles.metricValue,
              peakBags > 0 && styles.metricValuePeak,
            ]}
          >
            {peakBags}
          </Text>
        </View>

        <View style={[styles.metricItem, styles.metricItemBorder]}>
          <Text style={styles.metricLabel}>TOTAL STASH</Text>
          <Text style={styles.metricValue}>{totalRemainingGrams}g</Text>
        </View>
      </View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  chassis: {
    backgroundColor: colors.panel,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricItemBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.borderSubtle,
  },
  metricLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: FONTS.displayLight,
    fontSize: 24,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  metricValuePeak: {
    color: colors.statusSuccess,
  },
}));
