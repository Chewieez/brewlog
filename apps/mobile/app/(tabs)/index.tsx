import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  INDUSTRIAL_PRECISION_THEME,
  DEFAULT_PRESET_RECIPES,
  BrewRecipe,
  rescaleRecipeDose,
} from '@brewlog/core';
import { useMobileBrewTimer } from '../../src/hooks/useMobileBrewTimer';
import { MethodPills } from '../../src/components/timer/MethodPills';
import { CollapsibleCalculator } from '../../src/components/timer/CollapsibleCalculator';
import { TimerHero } from '../../src/components/timer/TimerHero';
import { ActiveStageCard } from '../../src/components/timer/ActiveStageCard';
import { StageTimeline } from '../../src/components/timer/StageTimeline';
import { FONTS } from '../../src/theme/fonts';

const { colors } = INDUSTRIAL_PRECISION_THEME;

const AVAILABLE_METHODS = ['V60', 'Chemex', 'Aeropress', 'French Press'];

export default function TimerScreen() {
  const router = useRouter();
  const [selectedRecipe, setSelectedRecipe] = useState<BrewRecipe>(
    DEFAULT_PRESET_RECIPES[0]
  );
  const [doseGrams, setDoseGrams] = useState(
    DEFAULT_PRESET_RECIPES[0].coffeeDoseGrams
  );

  const activeRecipe = rescaleRecipeDose(selectedRecipe, doseGrams);

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
    const match = DEFAULT_PRESET_RECIPES.find(
      (r) => r.brewMethod.toLowerCase() === methodName.toLowerCase()
    );
    if (match) {
      reset();
      setSelectedRecipe(match);
      setDoseGrams(match.coffeeDoseGrams);
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

      {/* Standalone Collapsible Calculator (Default Collapsed) */}
      <CollapsibleCalculator
        initialDose={doseGrams}
        initialRatio={activeRecipe.ratio}
      />

      {/* Web-Parity Instrument Faceplate */}
      <TimerHero
        recipe={activeRecipe}
        elapsedSeconds={elapsedSeconds}
        isRunning={isRunning}
        isMuted={isMuted}
        currentStageTargetWater={currentStage.targetWaterWeightGrams}
        doseGrams={doseGrams}
        onToggleTimer={toggleTimer}
        onReset={reset}
        onToggleMute={toggleMute}
        totalProgress={totalProgress}
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
          <ActiveStageCard
            stage={currentStage}
            stageIndex={currentStageIndex}
            totalStages={activeRecipe.stages.length}
            elapsedSeconds={elapsedSeconds}
          />

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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  logButtonText: {
    color: colors.canvas,
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.2,
  },
});
