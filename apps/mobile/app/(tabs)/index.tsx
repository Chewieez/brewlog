import React from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Bean, INDUSTRIAL_PRECISION_THEME, DEFAULT_PRESET_RECIPES, rescaleRecipeDose } from '@brewlog/core';
import { useRecipes } from '../../src/features/recipes/RecipeContext';
import { useStash } from '../../src/features/stash/StashContext';
import { ActiveBeanPill } from '../../src/features/stash/components/ActiveBeanPill';
import { useMobileBrewTimer } from '../../src/hooks/useMobileBrewTimer';
import { MethodPills } from '../../src/components/timer/MethodPills';
import { CollapsibleCalculator } from '../../src/components/timer/CollapsibleCalculator';
import { TimerHero } from '../../src/components/timer/TimerHero';
import { ActiveStageCard } from '../../src/components/timer/ActiveStageCard';
import { StageTimeline } from '../../src/components/timer/StageTimeline';
import { FONTS } from '../../src/theme/fonts';
import { AVAILABLE_METHODS } from '../../src/utils/recipeUtils';
import { mobileFeedback } from '../../src/lib/mobileFeedback';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export default function TimerScreen() {
  const router = useRouter();
  const { activeTimerRecipe, activeTimerDose, setActiveTimerRecipe } = useRecipes();

  let activeBrewBean: Bean | null = null;
  let setActiveBrewBean: (bean: Bean | null) => void = () => {};
  let deductBeanDose: (id: string, doseGrams: number) => Promise<void> = async () => {};

  try {
    const stash = useStash();
    activeBrewBean = stash.activeBrewBean;
    setActiveBrewBean = stash.setActiveBrewBean;
    deductBeanDose = stash.deductBeanDose;
  } catch {
    // Gracefully handle renders outside StashProvider in unit tests
  }

  const [isDeducted, setIsDeducted] = React.useState<boolean>(false);
  const [isDeducting, setIsDeducting] = React.useState<boolean>(false);

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

  React.useEffect(() => {
    if (!isFinished) {
      setIsDeducted(false);
    }
  }, [isFinished]);

  React.useEffect(() => {
    setIsDeducted(false);
  }, [activeBrewBean?.id]);

  const currentBeanRemaining = activeBrewBean
    ? activeBrewBean.remainingGrams !== undefined
      ? activeBrewBean.remainingGrams
      : activeBrewBean.bagWeightGrams ?? 0
    : 0;

  const remainingAfterDeduction = Math.max(0, currentBeanRemaining - activeTimerDose);

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
      />

      {/* Finished Banner */}
      {isFinished ? (
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
                    ✓ DEDUCTED {activeTimerDose}g • Updated: {remainingAfterDeduction}g left
                  </Text>
                </View>
              )}
            </View>
          ) : null}

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
