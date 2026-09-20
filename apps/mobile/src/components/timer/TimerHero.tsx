import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Minus, Plus } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME, BrewRecipe } from '@brewlog/core';
import { FONTS } from '../../theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface TimerHeroProps {
  recipe: BrewRecipe;
  elapsedSeconds: number;
  isRunning: boolean;
  isFinished?: boolean;
  isMuted: boolean;
  currentStageTargetWater: number;
  doseGrams: number;
  onToggleTimer: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  totalProgress: number;
  onIncrementDose?: () => void;
  onDecrementDose?: () => void;
}

export const TimerHero: React.FC<TimerHeroProps> = ({
  recipe,
  elapsedSeconds,
  isRunning,
  isFinished = false,
  isMuted,
  currentStageTargetWater,
  doseGrams,
  onToggleTimer,
  onReset,
  onToggleMute,
  totalProgress,
  onIncrementDose,
  onDecrementDose,
}) => {
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;

  return (
    <View style={styles.chassis}>
      {/* Recipe Title & Specs Header (Single Mute Button is below in controls, matching web) */}
      <View style={styles.recipeHeader}>
        <Text style={styles.recipeSubtitle}>
          {recipe.brewMethod.toUpperCase()} · 1:{recipe.ratio}
        </Text>
        <Text style={styles.recipeTitle}>{recipe.name}</Text>
      </View>

      {/* Linear Progress Line */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${totalProgress}%` }]} />
      </View>

      {/* Oversized Tabular Digital Clock — Appliance Light with optically centered colon */}
      <View style={styles.clockContainer}>
        <Text style={styles.clockDigit}>{mins}</Text>
        <Text style={styles.clockColon}>:</Text>
        <Text style={styles.clockDigit}>{String(secs).padStart(2, '0')}</Text>
      </View>

      {/* Hairline Divider */}
      <View style={styles.hairline} />

      {/* 3-Column Chassis Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>COFFEE DOSE</Text>
          <View style={styles.doseRow}>
            <Text style={styles.metricValue}>{doseGrams}g</Text>
            {onIncrementDose && onDecrementDose && (
              <View style={styles.stepperContainer}>
                <Pressable
                  onPress={onDecrementDose}
                  disabled={isRunning || isFinished || doseGrams <= 1}
                  hitSlop={6}
                  style={[
                    styles.stepperButton,
                    (isRunning || isFinished || doseGrams <= 1) &&
                      styles.stepperButtonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease dose"
                >
                  <Minus
                    size={11}
                    color={
                      isRunning || isFinished || doseGrams <= 1
                        ? colors.textMuted
                        : colors.textPrimary
                    }
                  />
                </Pressable>
                <Pressable
                  onPress={onIncrementDose}
                  disabled={isRunning || isFinished || doseGrams >= 100}
                  hitSlop={6}
                  style={[
                    styles.stepperButton,
                    (isRunning || isFinished || doseGrams >= 100) &&
                      styles.stepperButtonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Increase dose"
                >
                  <Plus
                    size={11}
                    color={
                      isRunning || isFinished || doseGrams >= 100
                        ? colors.textMuted
                        : colors.textPrimary
                    }
                  />
                </Pressable>
              </View>
            )}
          </View>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>WATER TARGET</Text>
          <Text style={styles.metricValue}>{recipe.waterAmountGrams}g</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>POUR TO</Text>
          <Text style={[styles.metricValue, styles.metricValueAccent]}>
            {currentStageTargetWater}g
          </Text>
        </View>
      </View>

      {/* Hairline Divider */}
      <View style={styles.hairline} />

      {/* Controls Row */}
      <View style={styles.controlsRow}>
        <Pressable
          onPress={isFinished ? onReset : onToggleTimer}
          style={[
            styles.primaryButton,
            isRunning ? styles.primaryButtonRunning : styles.primaryButtonIdle,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            isFinished
              ? 'Reset brew timer'
              : isRunning
                ? 'Pause timer'
                : elapsedSeconds > 0
                  ? 'Resume timer'
                  : 'Start brew timer'
          }
        >
          {isFinished ? (
            <>
              <RotateCcw size={16} color={colors.canvas} />
              <Text style={styles.primaryButtonText}>RESET</Text>
            </>
          ) : isRunning ? (
            <>
              <Pause size={16} color={colors.canvas} fill={colors.canvas} />
              <Text style={styles.primaryButtonText}>PAUSE</Text>
            </>
          ) : (
            <>
              <Play size={16} color={colors.canvas} fill={colors.canvas} />
              <Text style={styles.primaryButtonText}>
                {elapsedSeconds > 0 ? 'RESUME' : 'START BREW'}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={onReset}
          style={styles.hardwareIconButton}
          accessibilityRole="button"
          accessibilityLabel="Reset Timer"
        >
          <RotateCcw size={16} color={colors.textMuted} />
        </Pressable>

        <Pressable
          onPress={onToggleMute}
          style={styles.hardwareIconButton}
          accessibilityRole="button"
          accessibilityLabel={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? (
            <VolumeX size={16} color={colors.textMuted} />
          ) : (
            <Volume2 size={16} color={colors.accent} />
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chassis: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  recipeHeader: {
    gap: 2,
  },
  recipeSubtitle: {
    color: colors.accent,
    fontSize: 10,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.5,
  },
  recipeTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontFamily: FONTS.sansSemiBold,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.panelRecessed,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  clockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  clockDigit: {
    fontSize: 84,
    fontFamily: FONTS.displayLight,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  clockColon: {
    fontSize: 74,
    fontFamily: FONTS.displayLight,
    color: colors.textMuted,
    paddingHorizontal: 3,
    transform: [{ translateY: -6 }],
    includeFontPadding: false,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: FONTS.monoBold,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  metricValue: {
    fontSize: 26,
    fontFamily: FONTS.displayLight,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepperButton: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.panelRecessed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.35,
  },
  metricValueAccent: {
    color: colors.accent,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 6,
    gap: 8,
  },
  primaryButtonIdle: {
    backgroundColor: colors.textPrimary,
  },
  primaryButtonRunning: {
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    color: colors.canvas,
    fontSize: 12,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.5,
  },
  hardwareIconButton: {
    width: 48,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TimerHero;
