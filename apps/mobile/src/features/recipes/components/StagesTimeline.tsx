import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrewStage, INDUSTRIAL_PRECISION_THEME } from '@brewlog/core';
import { FONTS } from '../../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface StagesTimelineProps {
  stages: BrewStage[];
}

export const StagesTimeline: React.FC<StagesTimelineProps> = ({ stages }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>BREW STEPS TIMELINE</Text>
      <View style={styles.stagesList}>
        {stages.map((stage, idx) => (
          <View key={stage.id || idx} style={styles.stageCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{idx + 1}</Text>
            </View>
            <View style={styles.stageContent}>
              <View style={styles.stageHeader}>
                <Text style={styles.stageName}>{stage.name}</Text>
                <View style={styles.stageMetrics}>
                  {stage.targetWaterWeightGrams !== undefined ? (
                    <Text style={styles.stageWater}>
                      {stage.targetWaterWeightGrams}g
                    </Text>
                  ) : null}
                  <Text style={styles.stageDuration}>
                    {stage.durationSeconds}s
                  </Text>
                </View>
              </View>
              {stage.instruction ? (
                <Text style={styles.stageInstruction}>{stage.instruction}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  stagesList: {
    gap: 8,
  },
  stageCard: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    padding: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.panelRecessed,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: colors.textPrimary,
  },
  stageContent: {
    flex: 1,
    gap: 4,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageName: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  stageMetrics: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  stageWater: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: colors.accent,
  },
  stageDuration: {
    fontFamily: FONTS.monoRegular,
    fontSize: 12,
    color: colors.textMuted,
  },
  stageInstruction: {
    fontFamily: FONTS.sansRegular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
