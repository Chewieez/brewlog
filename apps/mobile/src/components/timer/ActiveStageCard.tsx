import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { INDUSTRIAL_PRECISION_THEME, BrewStage } from '@brewlog/core';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface ActiveStageCardProps {
  stage: BrewStage;
  stageIndex: number;
  totalStages: number;
  elapsedSeconds: number;
}

export const ActiveStageCard: React.FC<ActiveStageCardProps> = ({
  stage,
  stageIndex,
  totalStages,
  elapsedSeconds,
}) => {
  const stageEndSecond = stage.startSecond + stage.durationSeconds;
  const secondsLeftInStage = Math.max(0, stageEndSecond - elapsedSeconds);
  const descriptionText =
    stage.instruction ||
    (stage as unknown as { description?: string }).description;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.stepBadge}>
          STAGE {stageIndex + 1} OF {totalStages}
        </Text>
        <Text style={styles.countdownText}>
          {secondsLeftInStage}S REMAINING
        </Text>
      </View>

      <Text style={styles.stageName}>{stage.name}</Text>

      <View style={styles.targetRow}>
        <Text style={styles.targetWaterLabel}>POUR TARGET</Text>
        <Text style={styles.targetWaterValue}>{stage.targetWaterWeightGrams}g</Text>
      </View>

      {descriptionText ? (
        <Text style={styles.description}>{descriptionText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: colors.panel,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepBadge: {
    color: colors.accent,
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  countdownText: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 1,
  },
  stageName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    backgroundColor: colors.panelRecessed,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
  },
  targetWaterLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 1,
  },
  targetWaterValue: {
    color: colors.accent,
    fontSize: 18,
    fontFamily: 'Courier',
    fontWeight: '700',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default ActiveStageCard;
