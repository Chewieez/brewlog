import React from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  INDUSTRIAL_PRECISION_THEME,
  DEFAULT_PRESET_RECIPES,
  rescaleRecipeDose,
} from '@brewlog/core';
import { useRecipes } from '../../src/features/recipes/RecipeContext';
import { useMobileBrewTimer } from '../../src/hooks/useMobileBrewTimer';
import { MethodPills } from '../../src/components/timer/MethodPills';
import { CollapsibleCalculator } from '../../src/components/timer/CollapsibleCalculator';
import { TimerHero } from '../../src/components/timer/TimerHero';
import { ActiveStageCard } from '../../src/components/timer/ActiveStageCard';
import { StageTimeline } from '../../src/components/timer/StageTimeline';
import { FONTS } from '../../src/theme/fonts';
import { AVAILABLE_METHODS } from '../../src/utils/recipeUtils';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export default function TimerScreen() {
  const router = useRouter();
  const { activeTimerRecipe, activeTimerDose, setActiveTimerRecipe } = useRecipes();

  const activeRecipe = rescaleRecipeDose(activeTimerRecipe, activeTimerDose);

  const {
    elapsedSeconds,
    isRunning,
    isFinished,
    isMuted,
    currentStageIndex,
    currentStage,
    totalProgress,
    toggleTimer,
    reset,
    toggleMute,
  } = useMobileBrewTimer(activeRecipe);

  const handleSelectMethod = (methodName: string) => {
    if (activeRecipe.brewMethod.toLowerCase() === methodName.toLowerCase()) {
      return;
    }

    const match = DEFAULT_PRESET_RECIPES.find(
      (r) => r.brewMethod.toLowerCase() === methodName.toLowerCase()
    );
    if (!match) return;

    const isBrewActive = isRunning || (elapsedSeconds > 0 && !isFinished);

    if (isBrewActive) {
      Alert.alert(
        'Switch Brew Method?',
        'A brew is currently in progress. Switching methods will reset your timer.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset & Switch',
            style: 'destructive',
            onPress: () => {
              reset();
              setActiveTimerRecipe(match, match.coffeeDoseGrams);
            },
          },
        ]
      );
      return;
    }

    reset();
    setActiveTimerRecipe(match, match.coffeeDoseGrams);
  };

  const handleApplyDose = (newDose: number) => {
    if (isRunning || isFinished) return;
    if (newDose > 0) {
      setActiveTimerRecipe(activeTimerRecipe, Math.round(newDose * 10) / 10);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Quick-Start Method Pills */}
      <MethodPills
        selectedMethod={activeRecipe.brewMethod}
        onSelectMethod={handleSelectMethod}
        methods={AVAILABLE_METHODS}
      />

      {/* Standalone Collapsible Calculator */}
      <CollapsibleCalculator
        initialDose={activeTimerDose}
        initialRatio={activeRecipe.ratio}
        onApplyDose={handleApplyDose}
      />

      {/* Web-Parity Instrument Faceplate */}
      <TimerHero
        recipe={activeRecipe}
        elapsedSeconds={elapsedSeconds}
        isRunning={isRunning}
        isFinished={isFinished}
        isMuted={isMuted}
        currentStageTargetWater={currentStage?.targetWaterWeightGrams || 0}
        doseGrams={activeTimerDose}
        onToggleTimer={toggleTimer}
        onReset={reset}
        onToggleMute={toggleMute}
        totalProgress={totalProgress}
        onChangeDose={handleApplyDose}
      />

      {/* Finished Banner */}
      {isFinished ? (
        <View style={styles.finishedBanner}>
          <Text style={styles.finishedTitle}>BREW COMPLETE</Text>
          <Text style={styles.finishedSubtitle}>
            Completed in {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
          </Text>
          <Pressable
            onPress={() => router.push('/cupping')}
            style={styles.logButton}
            accessibilityRole="button"
            accessibilityLabel="Log to Cupping Journal"
          >
            <Text style={styles.logButtonText}>LOG TO CUPPING JOURNAL</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Active Pour Guidance */}
          {currentStage ? (
            <ActiveStageCard
              stage={currentStage}
              stageIndex={currentStageIndex}
              totalStages={activeRecipe.stages.length}
              elapsedSeconds={elapsedSeconds}
            />
          ) : null}

          {/* Timeline of Stages */}
          <StageTimeline
            stages={activeRecipe.stages}
            currentStageIndex={currentStageIndex}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  finishedBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: colors.panel,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  finishedTitle: {
    color: colors.accent,
    fontSize: 14,
    fontFamily: FONTS.monoBold,
    letterSpacing: 2,
  },
  finishedSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.sansRegular,
  },
  logButton: {
    marginTop: 8,
    backgroundColor: colors.accent,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonText: {
    color: colors.canvas,
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.2,
  },
});
