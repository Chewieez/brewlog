import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface ReviewsSummaryBarProps {
  totalReviews: number;
  averageScaScore: number;
  topFlavorNote?: string;
}

export const ReviewsSummaryBar: React.FC<ReviewsSummaryBarProps> = ({
  totalReviews,
  averageScaScore,
  topFlavorNote = '--',
}) => {
  return (
    <View
      style={styles.chassis}
      accessibilityRole="summary"
      accessibilityLabel={`Reviews summary: ${totalReviews} total reviews, ${averageScaScore.toFixed(1)} average SCA score, top flavor note is ${topFlavorNote}`}
    >
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>TOTAL REVIEWS</Text>
          <Text style={styles.metricValue}>{totalReviews}</Text>
        </View>

        <View style={[styles.metricItem, styles.metricItemBorder]}>
          <Text style={styles.metricLabel}>AVG SCA SCORE</Text>
          <Text
            style={[
              styles.metricValue,
              averageScaScore >= 85 && styles.metricValueHigh,
            ]}
          >
            {totalReviews > 0 ? averageScaScore.toFixed(1) : '--'}
          </Text>
        </View>

        <View style={[styles.metricItem, styles.metricItemBorder]}>
          <Text style={styles.metricLabel}>TOP NOTE</Text>
          <Text style={styles.metricValueNote} numberOfLines={1}>
            {topFlavorNote}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  metricValueHigh: {
    color: colors.accent,
  },
  metricValueNote: {
    fontFamily: FONTS.monoBold,
    fontSize: 14,
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
});
