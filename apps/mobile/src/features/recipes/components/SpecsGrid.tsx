import React from 'react';
import { View, Text } from 'react-native';
import { Droplets, BookOpen, Clock, Thermometer } from 'lucide-react-native';
import {
  WeightUnit,
  TemperatureUnit,
  formatWeight,
  formatTemperature,
} from '@brewlog/core';
import { makeStyles, useTheme } from '@brewlog/ui';
import { FONTS } from '../../../theme/fonts';

export interface SpecsGridProps {
  totalWater: number;
  ratio: number;
  totalTimeSeconds: number;
  waterTempCelsius?: number;
  weightUnit?: WeightUnit;
  temperatureUnit?: TemperatureUnit;
}

export const SpecsGrid: React.FC<SpecsGridProps> = ({
  totalWater,
  ratio,
  totalTimeSeconds,
  waterTempCelsius,
  weightUnit,
  temperatureUnit,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const mins = Math.floor(totalTimeSeconds / 60);
  const secs = totalTimeSeconds % 60;
  const timeFormatted = `${mins}m ${String(secs).padStart(2, '0')}s`;
  const ratioFormatted = `1:${Math.round(ratio * 10) / 10}`;

  const waterDisplay = weightUnit ? formatWeight(totalWater, weightUnit) : `${totalWater}g`;
  const tempDisplay = waterTempCelsius
    ? (temperatureUnit ? formatTemperature(waterTempCelsius, temperatureUnit) : `${waterTempCelsius}°C`)
    : (temperatureUnit === 'fahrenheit' ? '200-205°F' : '93-96°C');

  return (
    <View style={styles.grid}>
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Droplets size={16} color={colors.accent} />
        </View>
        <View style={styles.info}>
          <Text style={styles.label}>TOTAL WATER</Text>
          <Text style={styles.value}>{waterDisplay}</Text>
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
          <Text style={styles.value}>{tempDisplay}</Text>
        </View>
      </View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
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
}));
