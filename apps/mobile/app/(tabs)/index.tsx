import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  INDUSTRIAL_PRECISION_THEME,
  DEFAULT_PRESET_RECIPES,
  rescaleRecipeDose,
  TimerMode,
  SplitTag,
  splitsToRecipeStages,
} from '@brewlog/core';
import { useRecipes } from '../../src/features/recipes/RecipeContext';
import { useOptionalStash } from '../../src/features/stash/StashContext';
import { ActiveBeanPill } from '../../src/features/stash/components/ActiveBeanPill';
import { useMobileBrewTimer } from '../../src/hooks/useMobileBrewTimer';
import { MethodPills } from '../../src/components/timer/MethodPills';
import { CollapsibleCalculator } from '../../src/components/timer/CollapsibleCalculator';
import { TimerHero } from '../../src/components/timer/TimerHero';
import { ActiveStageCard } from '../../src/components/timer/ActiveStageCard';
import { StageTimeline } from '../../src/components/timer/StageTimeline';
import { FreeBrewSplitTimeline } from '../../src/components/timer/FreeBrewSplitTimeline';
import { FONTS } from '../../src/theme/fonts';
import { AVAILABLE_METHODS } from '../../src/utils/recipeUtils';
import { mobileFeedback } from '../../src/lib/mobileFeedback';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export default function TimerScreen() {
  const router = useRouter();
  const { activeTimerRecipe, activeTimerDose, setActiveTimerRecipe } = useRecipes();

  const stash = useOptionalStash();
  const activeBrewBean = stash?.activeBrewBean ?? null;
  const setActiveBrewBean = stash?.setActiveBrewBean ?? (() => {});
  const deductBeanDose = stash?.deductBeanDose ?? (async () => {});

  const [timerMode, setTimerMode] = useState<TimerMode>('recipe');
  const [isFreeBrewFinished, setIsFreeBrewFinished] = useState<boolean>(false);
  const [isDeducted, setIsDeducted] = useState<boolean>(false);
  const [isDeducting, setIsDeducting] = useState<boolean>(false);

  const activeRecipe = rescaleRecipeDose(activeTimerRecipe, activeTimerDose);

  const {
    elapsedSeconds,
    isRunning,
    isFinished: timerIsFinished,
    isMuted,
    currentStageIndex,
    currentStage,
    totalProgress,
    splits = [],
    recordSplit = () => {},
    removeSplit = () => {},
    toggleTimer,
    reset: baseReset,
    toggleMute,
    pause,
  } = useMobileBrewTimer(activeRecipe, timerMode);

  const isFinished = timerIsFinished || isFreeBrewFinished;

  const reset = useCallback(() => {
    baseReset();
    setIsFreeBrewFinished(false);
  }, [baseReset]);

  useEffect(() => {
    if (!isFinished) {
      setIsDeducted(false);
    }
  }, [isFinished]);

  useEffect(() => {
    setIsDeducted(false);
  }, [activeBrewBean?.id]);

  const currentBeanRemaining = activeBrewBean
    ? activeBrewBean.remainingGrams !== undefined
      ? activeBrewBean.remainingGrams
      : activeBrewBean.bagWeightGrams ?? 0
    : 0;

  const handleDeductDose = async () => {
    if (!activeBrewBean || isDeducted || isDeducting) return;
    setIsDeducting(true);
    try {
      await deductBeanDose(activeBrewBean.id, activeTimerDose);
      mobileFeedback.triggerHapticTap();
      setIsDeducted(true);
    } catch (err) {
      console.error('Failed to deduct dose from stash:', err);
    } finally {
      setIsDeducting(false);
    }
  };

  const handleSwitchMode = (newMode: TimerMode) => {
    if (timerMode === newMode) return;

    const isBrewActive = isRunning || (elapsedSeconds > 0 && !isFinished);

    if (isBrewActive) {
      Alert.alert(
        'Switch Timer Mode?',
        'A brew is currently in progress. Switching modes will reset your timer.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset & Switch',
            style: 'destructive',
            onPress: () => {
              reset();
              setTimerMode(newMode);
            },
          },
        ]
      );
      return;
    }

    reset();
    setTimerMode(newMode);
  };

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

  const handleApplyDose = (newDose: number, newRatio?: number, newWater?: number) => {
    if (isRunning || isFinished) return;
    if (newDose > 0) {
      const roundedDose = Math.round(newDose * 10) / 10;
      if (newRatio !== undefined || newWater !== undefined) {
        const scaled = rescaleRecipeDose(activeTimerRecipe, roundedDose, newRatio, newWater);
        setActiveTimerRecipe(scaled, roundedDose);
      } else {
        setActiveTimerRecipe(activeTimerRecipe, roundedDose);
      }
    }
  };

  const handleFinishBrew = () => {
    pause?.();
    mobileFeedback.triggerHapticBrewComplete();
    setIsFreeBrewFinished(true);
  };

  const handleTagSplit = (tag: SplitTag, label: string) => {
    recordSplit(label, tag);
  };

  const handleSaveAsRecipe = () => {
    const generatedStages = splitsToRecipeStages(
      splits,
      elapsedSeconds,
      activeRecipe.waterAmountGrams
    );

    router.push({
      pathname: '/recipe/builder',
      params: {
        stages: JSON.stringify(generatedStages),
        initialDose: String(activeTimerDose),
        initialWater: String(activeRecipe.waterAmountGrams),
        initialMethod: activeRecipe.brewMethod,
      },
    });
  };

  const handleLogCupping = () => {
    let notes: string | undefined;
    if (splits.length > 0) {
      const formattedSplits = splits
        .map(
          (s) =>
            `• ${s.label}: ${Math.floor(s.second / 60)}:${String(s.second % 60).padStart(2, '0')} (+${s.intervalSeconds}s)`
        )
        .join('\n');
      notes = `Free Brew Splits:\n${formattedSplits}`;
    }

    if (notes) {
      router.push({
        pathname: '/cupping',
        params: { notes },
      });
    } else {
      router.push('/cupping');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Segmented Mode Switcher */}
      <View style={styles.modeToggleContainer}>
        <Pressable
          onPress={() => handleSwitchMode('recipe')}
          style={[styles.modeButton, timerMode === 'recipe' && styles.modeButtonActive]}
          accessibilityRole="button"
          accessibilityLabel="Guided Recipe mode"
        >
          <Text style={[styles.modeButtonText, timerMode === 'recipe' && styles.modeButtonTextActive]}>
            GUIDED RECIPE
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleSwitchMode('free_brew')}
          style={[styles.modeButton, timerMode === 'free_brew' && styles.modeButtonActive]}
          accessibilityRole="button"
          accessibilityLabel="Free Brew mode"
        >
          <Text style={[styles.modeButtonText, timerMode === 'free_brew' && styles.modeButtonTextActive]}>
            FREE BREW
          </Text>
        </Pressable>
      </View>

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
        initialWater={activeRecipe.waterAmountGrams}
        onApplyDose={handleApplyDose}
      />

      {/* Active Bean Pill */}
      {activeBrewBean ? (
        <ActiveBeanPill
          bean={activeBrewBean}
          onDetach={() => setActiveBrewBean(null)}
        />
      ) : null}

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
        mode={timerMode}
        onSplit={() => recordSplit()}
        onTagSplit={handleTagSplit}
        splitsCount={splits.length}
        onFinish={handleFinishBrew}
      />

      {/* Finished Banner or Timeline View */}
      {isFinished ? (
        <>
          <View style={styles.finishedBanner}>
          <Text style={styles.finishedTitle}>BREW COMPLETE</Text>
          <Text style={styles.finishedSubtitle}>
            Completed in {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
          </Text>

          {/* 1-Tap Stash Deduction Card */}
          {activeBrewBean ? (
            <View style={styles.deductCard}>
              {!isDeducted ? (
                <Pressable
                  onPress={handleDeductDose}
                  disabled={isDeducting}
                  style={({ pressed }) => [
                    styles.deductButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Deduct ${activeTimerDose}g from stash`}
                >
                  <Text style={styles.deductButtonText}>
                    DEDUCT {activeTimerDose}g FROM STASH
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.deductedBanner}>
                  <Text style={styles.deductedText}>
                    ✓ DEDUCTED {activeTimerDose}g • Updated: {currentBeanRemaining}g left
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Save as Custom Recipe CTA (Free Brew Mode Only) */}
          {timerMode === 'free_brew' && (
            <Pressable
              onPress={handleSaveAsRecipe}
              style={styles.saveRecipeButton}
              accessibilityRole="button"
              accessibilityLabel="Save as Custom Recipe"
            >
              <Text style={styles.saveRecipeButtonText}>SAVE AS CUSTOM RECIPE</Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleLogCupping}
            style={styles.logButton}
            accessibilityRole="button"
            accessibilityLabel="Log to Cupping Journal"
          >
            <Text style={styles.logButtonText}>LOG TO CUPPING JOURNAL</Text>
          </Pressable>
        </View>

        {/* Free Brew Finished Review: Read-only split timeline */}
        {timerMode === 'free_brew' && (
          <FreeBrewSplitTimeline
            splits={splits}
            readOnly={true}
          />
        )}
      </>
      ) : timerMode === 'free_brew' ? (
        <FreeBrewSplitTimeline
          splits={splits}
          onRemoveSplit={removeSplit}
        />
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
  modeToggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: colors.panelRecessed,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: colors.accent,
  },
  modeButtonText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.2,
  },
  modeButtonTextActive: {
    color: colors.canvas,
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
  saveRecipeButton: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 6,
    minHeight: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  saveRecipeButtonText: {
    color: colors.accent,
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.2,
  },
  logButton: {
    marginTop: 8,
    backgroundColor: colors.accent,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logButtonText: {
    color: colors.canvas,
    fontSize: 11,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.2,
  },
  deductCard: {
    width: '100%',
    marginVertical: 4,
    alignItems: 'center',
  },
  deductButton: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: 6,
    minHeight: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  deductButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontFamily: FONTS.monoBold,
    letterSpacing: 1.2,
  },
  deductedBanner: {
    backgroundColor: colors.panelRecessed,
    borderColor: colors.statusSuccess,
    borderWidth: 1,
    borderRadius: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  deductedText: {
    color: colors.statusSuccess,
    fontSize: 12,
    fontFamily: FONTS.monoBold,
    letterSpacing: 0.8,
  },
});
