import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react-native';
import { INDUSTRIAL_PRECISION_THEME, BrewRecipe } from '@brewlog/core';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export interface TimerHeroProps {
  recipe: BrewRecipe;
  elapsedSeconds: number;
  isRunning: boolean;
  isMuted: boolean;
  currentStageTargetWater: number;
  doseGrams: number;
  onToggleTimer: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  totalProgress: number;
}

export const TimerHero: React.FC<TimerHeroProps> = ({
  recipe,
  elapsedSeconds,
  isRunning,
  isMuted,
  currentStageTargetWater,
  doseGrams,
  onToggleTimer,
  onReset,
  onToggleMute,
  totalProgress,
}) => {
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <View style={styles.chassis}>
      {/* Recipe Title & Specs Header */}
      <View style={styles.recipeHeader}>
        <View style={styles.recipeHeaderTitles}>
          <Text style={styles.recipeSubtitle}>
            {recipe.brewMethod.toUpperCase()} · 1:{recipe.ratio}
          </Text>
          <Text style={styles.recipeTitle}>{recipe.name}</Text>
        </View>
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

      {/* Linear Progress Line */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${totalProgress}%` }]} />
      </View>

      {/* Oversized Tabular Digital Clock */}
      <View style={styles.clockContainer}>
        <Text style={styles.clockText}>{timeFormatted}</Text>
      </View>

      {/* Hairline Divider */}
      <View style={styles.hairline} />

      {/* 3-Column Chassis Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>COFFEE DOSE</Text>
          <Text style={styles.metricValue}>{doseGrams}g</Text>
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
          onPress={onToggleTimer}
          style={[
            styles.primaryButton,
            isRunning ? styles.primaryButtonRunning : styles.primaryButtonIdle,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            isRunning
              ? 'Pause timer'
              : elapsedSeconds > 0
                ? 'Resume timer'
                : 'Start brew timer'
          }
        >
          {isRunning ? (
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
          accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recipeHeaderTitles: {
    flex: 1,
    paddingRight: 12,
  },
  recipeSubtitle: {
    color: colors.accent,
    fontSize: 10,
    fontFamily: 'Courier',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  recipeTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  clockText: {
    fontSize: 72,
    fontFamily: 'Courier',
    fontWeight: '300',
    color: colors.textPrimary,
    letterSpacing: -2,
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
    fontSize: 9,
    fontFamily: 'Courier',
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  metricValue: {
    fontSize: 22,
    fontFamily: 'Courier',
    fontWeight: '300',
    color: colors.textPrimary,
    marginTop: 2,
  },
  metricValueAccent: {
    color: colors.accent,
    fontWeight: '600',
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
    fontFamily: 'Courier',
    fontWeight: '800',
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
