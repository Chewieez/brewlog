import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useScrollToTop } from 'expo-router';
import { Plus, Check } from 'lucide-react-native';
import {
  INDUSTRIAL_PRECISION_THEME,
  DEFAULT_USER_SETTINGS,
  DEFAULT_FREE_BREW_RECIPE,
  DEFAULT_FREE_BREW_DOSE,
  rescaleRecipeDose,
  calculateRatio,
  calculateCoffeeDose,
  TimerMode,
  SplitTag,
  splitsToRecipeStages,
  BrewRecipe,
} from '@brewlog/core';
import { useRecipes } from '../../src/features/recipes/RecipeContext';
import { useOptionalSettings } from '../../src/features/settings/SettingsContext';
import { useOptionalStash } from '../../src/features/stash/StashContext';
import { useOptionalEquipment } from '../../src/features/equipment/EquipmentContext';
import { ActiveBeanPill } from '../../src/features/stash/components/ActiveBeanPill';
import { useMobileBrewTimer } from '../../src/hooks/useMobileBrewTimer';
import { CollapsibleCalculator } from '../../src/components/timer/CollapsibleCalculator';
import { SegmentedControl } from '@brewlog/ui';
import { TimerHero } from '../../src/components/timer/TimerHero';
import { ActiveStageCard } from '../../src/components/timer/ActiveStageCard';
import { StageTimeline } from '../../src/components/timer/StageTimeline';
import { FreeBrewSplitTimeline } from '../../src/components/timer/FreeBrewSplitTimeline';
import { FONTS } from '../../src/theme/fonts';
import { mobileFeedback } from '../../src/lib/mobileFeedback';
import { buildTimerReviewParams } from '../../src/features/timer/buildTimerReviewParams';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthModal } from '../../src/features/auth/AuthModalContext';
import { ProfileHeaderButton } from '../../src/features/auth/ProfileHeaderButton';
import { getTabScreenBottomPadding } from '../../src/components/navigation/tabBarConstants';

const { colors } = INDUSTRIAL_PRECISION_THEME;

export default function TimerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openAuthSheet } = useAuthModal();
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef as any);
  const params = useLocalSearchParams<{ mode?: string }>();
  const { activeTimerRecipe, activeTimerDose, setActiveTimerRecipe } = useRecipes();

  const settingsContext = useOptionalSettings();
  const settings = settingsContext?.settings ?? DEFAULT_USER_SETTINGS;

  const stash = useOptionalStash();
  const activeBrewBean = stash?.activeBrewBean ?? null;
  const setActiveBrewBean = stash?.setActiveBrewBean ?? (() => {});
  const deductBeanDose = stash?.deductBeanDose ?? (async () => {});

  const equipmentContext = useOptionalEquipment();
  const equipment = equipmentContext?.equipment;

  const [timerMode, setTimerMode] = useState<TimerMode>(() => {
    if (params?.mode === 'recipe' || params?.mode === 'free_brew') {
      return params.mode;
    }
    return settings.defaultTimerMode;
  });

  useEffect(() => {
    if (params?.mode === 'recipe' || params?.mode === 'free_brew') {
      setTimerMode(params.mode);
    }
  }, [params?.mode]);

  const [isFreeBrewFinished, setIsFreeBrewFinished] = useState<boolean>(false);
  const [isDeducted, setIsDeducted] = useState<boolean>(false);
  const [isDeducting, setIsDeducting] = useState<boolean>(false);

  const [freeBrewRecipe, setFreeBrewRecipe] = useState<BrewRecipe>(DEFAULT_FREE_BREW_RECIPE);
  const [freeBrewDose, setFreeBrewDose] = useState<number>(DEFAULT_FREE_BREW_DOSE);

  const activeRecipe = rescaleRecipeDose(activeTimerRecipe, activeTimerDose);
  const currentRecipe = timerMode === 'free_brew' ? freeBrewRecipe : activeRecipe;
  const currentDose = timerMode === 'free_brew' ? freeBrewDose : activeTimerDose;

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
  } = useMobileBrewTimer(currentRecipe, timerMode);

  const isFinished = timerIsFinished || isFreeBrewFinished;

  const hasHydratedSettingsRef = useRef(!settingsContext?.loading);

  useEffect(() => {
    if (!settingsContext?.loading && !hasHydratedSettingsRef.current) {
      hasHydratedSettingsRef.current = true;
      if (!params?.mode && elapsedSeconds === 0 && !isRunning) {
        setTimerMode(settings.defaultTimerMode);
      }
    }
  }, [settingsContext?.loading, settings.defaultTimerMode, params?.mode, elapsedSeconds, isRunning]);

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
      await deductBeanDose(activeBrewBean.id, currentDose);
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

  const handleApplyDose = (newDose: number, newRatio?: number, newWater?: number) => {
    if (isRunning || elapsedSeconds > 0 || isFinished) return;
    if (newDose > 0) {
      const roundedDose = Math.round(newDose * 10) / 10;
      if (timerMode === 'free_brew') {
        const scaled = rescaleRecipeDose(freeBrewRecipe, roundedDose, newRatio, newWater);
        setFreeBrewRecipe(scaled);
        setFreeBrewDose(roundedDose);
      } else {
        if (newRatio !== undefined || newWater !== undefined) {
          const scaled = rescaleRecipeDose(activeTimerRecipe, roundedDose, newRatio, newWater);
          setActiveTimerRecipe(scaled, roundedDose);
        } else {
          setActiveTimerRecipe(activeTimerRecipe, roundedDose);
        }
      }
    }
  };

  const handleApplyWater = (newWater: number) => {
    if (isRunning || elapsedSeconds > 0 || isFinished) return;
    if (newWater > 0) {
      const roundedWater = Math.round(newWater);
      if (timerMode === 'free_brew') {
        const newRatio = calculateRatio(freeBrewDose, roundedWater);
        const scaled = rescaleRecipeDose(freeBrewRecipe, freeBrewDose, newRatio, roundedWater);
        setFreeBrewRecipe(scaled);
      } else {
        const newDose = calculateCoffeeDose(roundedWater, activeRecipe.ratio);
        const scaled = rescaleRecipeDose(activeTimerRecipe, newDose, activeRecipe.ratio, roundedWater);
        setActiveTimerRecipe(scaled, newDose);
      }
    }
  };

  const handleApplyRatio = (newRatio: number) => {
    if (isRunning || elapsedSeconds > 0 || isFinished) return;
    if (timerMode !== 'free_brew') return;
    if (newRatio > 0) {
      const roundedRatio = Math.round(newRatio * 10) / 10;
      const targetWater = freeBrewRecipe.waterAmountGrams;
      const calculatedDose = calculateCoffeeDose(targetWater, roundedRatio);
      const clampedDose = Math.max(1, Math.min(200, Math.round(calculatedDose * 10) / 10));
      const scaled = rescaleRecipeDose(freeBrewRecipe, clampedDose, roundedRatio, targetWater);
      setFreeBrewRecipe(scaled);
      setFreeBrewDose(clampedDose);
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
      currentRecipe.waterAmountGrams
    );

    router.push({
      pathname: '/recipe/builder',
      params: {
        stages: JSON.stringify(generatedStages),
        initialDose: String(currentDose),
        initialWater: String(currentRecipe.waterAmountGrams),
        initialMethod: currentRecipe.brewMethod,
      },
    });
  };

  const handleAddReview = () => {
    const reviewParams = buildTimerReviewParams({
      activeRecipe: currentRecipe,
      activeTimerDose: currentDose,
      elapsedSeconds,
      activeBrewBean,
      splits,
      equipment,
    });

    router.push({
      pathname: '/reviews/modal',
      params: reviewParams,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: getTabScreenBottomPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top In-Screen Header */}
        <View
          style={[
            styles.headerContainer,
            { paddingTop: Math.max(insets.top, 16) },
          ]}
        >
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Timer</Text>
          </View>
          <ProfileHeaderButton onPress={openAuthSheet} />
        </View>

      {/* Top Segmented Mode Switcher */}
      <View style={styles.modeToggleContainer}>
        <SegmentedControl<TimerMode>
          value={timerMode}
          onChange={handleSwitchMode}
          ariaLabel="Timer mode switcher"
          fullWidth
          options={[
            { value: 'recipe', label: 'GUIDED RECIPE', accessibilityLabel: 'Guided Recipe mode' },
            { value: 'free_brew', label: 'FREE BREW', accessibilityLabel: 'Free Brew mode' },
          ]}
        />
      </View>

      {/* Standalone Collapsible Calculator */}
      <CollapsibleCalculator
        currentDose={currentDose}
        baseCoffee={currentDose}
        baseWater={currentRecipe.waterAmountGrams}
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
        recipe={currentRecipe}
        elapsedSeconds={elapsedSeconds}
        isRunning={isRunning}
        isFinished={isFinished}
        isMuted={isMuted}
        currentStageTargetWater={currentStage?.targetWaterWeightGrams || 0}
        doseGrams={currentDose}
        onToggleTimer={toggleTimer}
        onReset={reset}
        onToggleMute={toggleMute}
        totalProgress={totalProgress}
        onChangeDose={handleApplyDose}
        onChangeWater={handleApplyWater}
        onChangeRatio={timerMode === 'free_brew' ? handleApplyRatio : undefined}
        mode={timerMode}
        onSplit={() => recordSplit()}
        onTagSplit={handleTagSplit}
        onFinish={handleFinishBrew}
        weightUnit={settings.weightUnit}
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
                  accessibilityLabel={`Deduct ${currentDose}g from stash`}
                >
                  <Text style={styles.deductButtonText}>
                    DEDUCT {currentDose}g FROM STASH
                  </Text>
                </Pressable>
              ) : (
                <View style={[styles.deductedBanner, { flexDirection: 'row', gap: 6 }]}>
                  <Check size={14} color={colors.statusSuccess} />
                  <Text style={styles.deductedText}>
                    DEDUCTED {currentDose}g • Updated: {currentBeanRemaining}g left
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
            onPress={handleAddReview}
            style={styles.logButton}
            accessibilityRole="button"
            accessibilityLabel="Add Review"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={16} color={colors.canvas} />
            <Text style={styles.logButtonText}>ADD REVIEW</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  contentContainer: {},
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: 26,
    color: colors.textPrimary,
  },
  modeToggleContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
