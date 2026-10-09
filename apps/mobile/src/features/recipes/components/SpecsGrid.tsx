import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Droplets, BookOpen, Clock, Thermometer } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface SpecsGridProps {
  totalWater: number;
  ratio: number;
  totalTimeSeconds: number;
  waterTempCelsius?: number;
}

export const SpecsGrid: React.FC<SpecsGridProps> = ({
  totalWater,
  ratio,
  totalTimeSeconds,
  waterTempCelsius,
}) => {
  const mins = Math.floor(totalTimeSeconds / 60);
  const secs = totalTimeSeconds % 60;
  const timeFormatted = `${mins}m ${String(secs).padStart(2, '0')}s`;
  const ratioFormatted = `1:${Math.round(ratio * 10) / 10}`;

  return (
    <View style={styles.grid}>
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Droplets size={16} color={colors.accent} />
        </View>
        <View style={styles.info}>
          <Text style={styles.label}>TOTAL WATER</Text>
          <Text style={styles.value}>{totalWater}g</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <BookOpen size={16} color={colors.accent} />
        </View>
        <View style={styles.info}>
          <Text style={styles.label}>BREW RATIO</Text>
          <Text style={styles.value}>{ratioFormatted}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Clock size={16} color={colors.accent} />
        </View>
        <View style={styles.info}>
          <Text style={styles.label}>TARGET TIME</Text>
          <Text style={styles.value}>{timeFormatted}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Thermometer size={16} color={colors.accent} />
        </View>
        <View style={styles.info}>
          <Text style={styles.label}>WATER TEMP</Text>
          <Text style={styles.value}>
            {waterTempCelsius ? `${waterTempCelsius}°C` : '93-96°C'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  value: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
