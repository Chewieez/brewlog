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
        <Text style={styles.label}>TOTAL WATER</Text>
        <Text style={styles.value}>{totalWater}g</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <BookOpen size={16} color={colors.accent} />
        </View>
        <Text style={styles.label}>BREW RATIO</Text>
        <Text style={styles.value}>{ratioFormatted}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Clock size={16} color={colors.accent} />
        </View>
        <Text style={styles.label}>TARGET TIME</Text>
        <Text style={styles.value}>{timeFormatted}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Thermometer size={16} color={colors.accent} />
        </View>
        <Text style={styles.label}>WATER TEMP</Text>
        <Text style={styles.value}>
          {waterTempCelsius ? `${waterTempCelsius}°C` : '93-96°C'}
        </Text>
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
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.panelRecessed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    fontFamily: FONTS.monoRegular,
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
