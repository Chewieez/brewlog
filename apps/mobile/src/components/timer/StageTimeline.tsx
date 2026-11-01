import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, CircleDot, Circle } from 'lucide-react-native';
import { BrewStage } from '@brewlog/core';
import { makeStyles, useTheme } from '@brewlog/ui';
import { FONTS } from '../../theme/fonts';

export interface StageTimelineProps {
  stages: BrewStage[];
  currentStageIndex: number;
}

export const StageTimeline: React.FC<StageTimelineProps> = ({
  stages,
  currentStageIndex,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BREW TIMELINE</Text>
      <View style={styles.timelineList}>
        {stages.map((stage, idx) => {
          const isDone = idx < currentStageIndex;
          const isActive = idx === currentStageIndex;

          const startMin = Math.floor(stage.startSecond / 60);
          const startSec = stage.startSecond % 60;
          const timeLabel = `${startMin}:${startSec < 10 ? '0' : ''}${startSec}`;

          return (
            <View key={stage.id || idx} style={styles.stepRow}>
              <View style={styles.stepIcon}>
                {isDone ? (
                  <CheckCircle2 size={14} color={colors.textMuted} />
                ) : isActive ? (
                  <CircleDot size={14} color={colors.accent} />
                ) : (
                  <Circle size={14} color={colors.borderSubtle} />
                )}
              </View>
              <View style={styles.stepInfo}>
                <Text
                  style={[
                    styles.stepName,
                    isActive && styles.stepNameActive,
                    isDone && styles.stepNameDone,
                  ]}
                >
                  {stage.name}
                </Text>
                <Text style={styles.stepMeta}>
                  {timeLabel} · {stage.targetWaterWeightGrams}g
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  title: {
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.5,
  },
  timelineList: {
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepIcon: {
    width: 18,
    alignItems: 'center',
  },
  stepInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepName: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.sansRegular,
  },
  stepNameActive: {
    color: colors.accent,
    fontFamily: FONTS.sansSemiBold,
  },
  stepNameDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  stepMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: FONTS.monoRegular,
  },
}));

export default StageTimeline;
