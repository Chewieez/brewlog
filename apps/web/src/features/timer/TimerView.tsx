import React, { useState, useEffect, useRef } from 'react';
import {
  BrewRecipe,
  Bean,
  TimerMode,
  SplitTag,
  WeightUnit,
  rescaleRecipeDose,
  splitsToRecipeStages,
  DEFAULT_USER_SETTINGS,
  DEFAULT_FREE_BREW_RECIPE,
  DEFAULT_FREE_BREW_DOSE,
  formatWeight,
  calculateRatio,
  calculateCoffeeDose,
  gramsToOz,
  ozToGrams,
} from '@brewlog/core';
import { useSettings, useOptionalSettings } from '../settings/SettingsContext';
import { useBrewTimer } from './useBrewTimer';
import { WebRatioTranslator } from './WebRatioTranslator';
import { coffeeAudio } from '../../lib/audio';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Coffee,
  Flag,
  BookmarkPlus,
  Trash2,
  Check,
  Plus,
} from 'lucide-react';

export interface TimerViewProps {
  recipe: BrewRecipe;
  selectedBean?: Bean | null;
  beans?: Bean[];
  initialMode?: TimerMode;
  weightUnit?: WeightUnit;
  onSelectBean?: (bean: Bean) => void;
  onSelectOtherRecipe: () => void;
  onLogCompletedBrew: (recipe: BrewRecipe, actualTimeSeconds: number, bean: Bean | null) => void;
  onSaveAsRecipe?: (recipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => void;
}

export const TimerView: React.FC<TimerViewProps> = ({
  recipe: initialRecipe,
  selectedBean,
  beans = [],
  initialMode,
  weightUnit,
  onSelectBean,
  onSelectOtherRecipe,
  onLogCompletedBrew,
  onSaveAsRecipe,
}) => {
  const settingsContext = useOptionalSettings();
  const settings = settingsContext?.settings ?? DEFAULT_USER_SETTINGS;
  const currentWeightUnit = weightUnit ?? settings.weightUnit;

  const initialRecipeRef = useRef(initialRecipe);
  const doseInputRef = useRef<HTMLInputElement>(null);
  const waterInputRef = useRef<HTMLInputElement>(null);
  const ratioInputRef = useRef<HTMLInputElement>(null);

  const getQueryMode = (): TimerMode | null => {
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const sp = new URLSearchParams(window.location.search);
      const m = sp.get('mode');
      if (m === 'recipe' || m === 'free_brew') return m;
    }
    return null;
  };

  const [mode, setMode] = useState<TimerMode>(() => {
    if (initialMode) return initialMode;
    const q = getQueryMode();
    if (q) return q;
    return settings.defaultTimerMode;
  });

  const [freeBrewRecipe, setFreeBrewRecipe] = useState<BrewRecipe>(DEFAULT_FREE_BREW_RECIPE);
  const [freeBrewDose, setFreeBrewDose] = useState<number>(DEFAULT_FREE_BREW_DOSE);

  const [recipeModeDose, setRecipeModeDose] = useState<number>(initialRecipe.coffeeDoseGrams);
  const [recipeModeRecipe, setRecipeModeRecipe] = useState<BrewRecipe>(initialRecipe);

  const currentRecipe = mode === 'free_brew' ? freeBrewRecipe : recipeModeRecipe;
  const currentDose = mode === 'free_brew' ? freeBrewDose : recipeModeDose;

  const [isFreeBrewFinished, setIsFreeBrewFinished] = useState(false);
  const [isRecipeSaved, setIsRecipeSaved] = useState(false);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    } else {
      const q = getQueryMode();
      if (q) setMode(q);
    }
  }, [initialMode]);

  useEffect(() => {
    if (initialRecipe !== initialRecipeRef.current) {
      setMode('recipe');
      initialRecipeRef.current = initialRecipe;
    }
  }, [initialRecipe]);

  // Reset dose and recipe when initial recipe changes
  useEffect(() => {
    setRecipeModeDose(initialRecipe.coffeeDoseGrams);
    setRecipeModeRecipe(initialRecipe);
  }, [initialRecipe.id, initialRecipe.coffeeDoseGrams]);

  // Hook into precision brew timer engine
  const {
    elapsedSeconds,
    isRunning,
    isFinished,
    isMuted,
    currentStageIndex,
    currentStage,
    splits,
    recordSplit,
    removeSplit,
    toggleTimer,
    reset: resetTimer,
    toggleMute,
    startTimeRef,
    accumulatedMsRef,
  } = useBrewTimer(currentRecipe, mode);

  const isMetricEditable = !isRunning && elapsedSeconds === 0 && !isFinished && !isFreeBrewFinished;

  const handleApplyDose = (newDose: number, newRatio?: number, newWater?: number) => {
    if (isRunning || elapsedSeconds > 0 || isFinished || isFreeBrewFinished) return;
    if (newDose > 0) {
      const roundedDose = Math.round(newDose * 10) / 10;
      if (mode === 'free_brew') {
        setFreeBrewDose(roundedDose);
        setFreeBrewRecipe((prev) => rescaleRecipeDose(prev, roundedDose, newRatio, newWater));
      } else {
        setRecipeModeDose(roundedDose);
        setRecipeModeRecipe((prev) => rescaleRecipeDose(prev, roundedDose, newRatio, newWater));
      }
    }
  };

  const handleApplyWater = (newWater: number) => {
    if (isRunning || elapsedSeconds > 0 || isFinished || isFreeBrewFinished) return;
    if (newWater > 0) {
      const roundedWater = Math.round(newWater);
      if (mode === 'free_brew') {
        const newRatio = calculateRatio(freeBrewDose, roundedWater);
        setFreeBrewRecipe((prev) => rescaleRecipeDose(prev, freeBrewDose, newRatio, roundedWater));
      } else {
        const newDose = calculateCoffeeDose(roundedWater, recipeModeRecipe.ratio);
        setRecipeModeDose(newDose);
        setRecipeModeRecipe((prev) => rescaleRecipeDose(prev, newDose, recipeModeRecipe.ratio, roundedWater));
      }
    }
  };

  const handleApplyRatio = (newRatio: number) => {
    if (isRunning || elapsedSeconds > 0 || isFinished || isFreeBrewFinished) return;
    if (newRatio > 0) {
      const roundedRatio = Math.round(newRatio * 10) / 10;
      if (mode === 'free_brew') {
        const targetWater = freeBrewRecipe.waterAmountGrams;
        const newDose = calculateCoffeeDose(targetWater, roundedRatio);
        const clampedDose = Math.max(1, Math.min(200, Math.round(newDose * 10) / 10));
        setFreeBrewDose(clampedDose);
        setFreeBrewRecipe((prev) => rescaleRecipeDose(prev, clampedDose, roundedRatio, targetWater));
      }
    }
  };

  const getDisplayDose = (grams: number, unit: WeightUnit) =>
    unit === 'imperial' ? String(gramsToOz(grams)) : String(grams);

  const getDisplayWater = (grams: number, unit: WeightUnit) =>
    unit === 'imperial' ? String(gramsToOz(grams)) : String(Math.round(grams));

  const getDisplayRatio = (ratioVal: number) => String(Number(ratioVal.toFixed(1)));

  const [textDose, setTextDose] = useState(() => getDisplayDose(currentDose, currentWeightUnit));
  const [textWater, setTextWater] = useState(() => getDisplayWater(currentRecipe.waterAmountGrams, currentWeightUnit));
  const [textRatio, setTextRatio] = useState(() => getDisplayRatio(currentRecipe.ratio));

  useEffect(() => {
    setTextDose(getDisplayDose(currentDose, currentWeightUnit));
  }, [currentDose, currentWeightUnit]);

  useEffect(() => {
    setTextWater(getDisplayWater(currentRecipe.waterAmountGrams, currentWeightUnit));
  }, [currentRecipe.waterAmountGrams, currentWeightUnit]);

  useEffect(() => {
    setTextRatio(getDisplayRatio(currentRecipe.ratio));
  }, [currentRecipe.ratio]);

  const handleCommitDose = (e?: React.FocusEvent<HTMLInputElement>) => {
    const currentDisplay = currentWeightUnit === 'imperial' ? gramsToOz(currentDose) : currentDose;

    if (!isMetricEditable) {
      setTextDose(String(currentDisplay));
      return;
    }

    const rawVal = e?.target ? e.target.value : textDose;
    const parsed = parseFloat(rawVal);

    if (isNaN(parsed) || parsed <= 0) {
      setTextDose(String(currentDisplay));
      return;
    }

    if (parsed === currentDisplay) {
      setTextDose(String(currentDisplay));
      return;
    }

    if (currentWeightUnit === 'imperial') {
      const rawGrams = ozToGrams(parsed);
      const clampedGrams = Math.max(1, Math.min(200, Math.round(rawGrams * 10) / 10));
      setTextDose(String(gramsToOz(clampedGrams)));
      if (clampedGrams !== currentDose) {
        handleApplyDose(clampedGrams);
      }
    } else {
      const clampedGrams = Math.max(1, Math.min(200, Math.round(parsed * 10) / 10));
      setTextDose(String(clampedGrams));
      if (clampedGrams !== currentDose) {
        handleApplyDose(clampedGrams);
      }
    }
  };

  const handleCommitWater = (e?: React.FocusEvent<HTMLInputElement>) => {
    const currentDisplay = currentWeightUnit === 'imperial'
      ? gramsToOz(currentRecipe.waterAmountGrams)
      : Math.round(currentRecipe.waterAmountGrams);

    if (!isMetricEditable) {
      setTextWater(String(currentDisplay));
      return;
    }

    const rawVal = e?.target ? e.target.value : textWater;
    const parsed = parseFloat(rawVal);

    if (isNaN(parsed) || parsed <= 0) {
      setTextWater(String(currentDisplay));
      return;
    }

    if (parsed === currentDisplay) {
      setTextWater(String(currentDisplay));
      return;
    }

    if (currentWeightUnit === 'imperial') {
      const rawGrams = ozToGrams(parsed);
      const clampedGrams = Math.max(10, Math.min(3000, Math.round(rawGrams)));
      setTextWater(String(gramsToOz(clampedGrams)));
      if (clampedGrams !== currentRecipe.waterAmountGrams) {
        handleApplyWater(clampedGrams);
      }
    } else {
      const clampedGrams = Math.max(10, Math.min(3000, Math.round(parsed)));
      setTextWater(String(clampedGrams));
      if (clampedGrams !== currentRecipe.waterAmountGrams) {
        handleApplyWater(clampedGrams);
      }
    }
  };

  const handleCommitRatio = (e?: React.FocusEvent<HTMLInputElement>) => {
    const currentDisplay = Number(currentRecipe.ratio.toFixed(1));

    if (!isMetricEditable) {
      setTextRatio(String(currentDisplay));
      return;
    }

    const rawVal = e?.target ? e.target.value : textRatio;
    const parsed = parseFloat(rawVal);

    if (isNaN(parsed) || parsed <= 0) {
      setTextRatio(String(currentDisplay));
      return;
    }

    if (parsed === currentDisplay) {
      setTextRatio(String(currentDisplay));
      return;
    }

    const clampedRatio = Math.max(1, Math.min(30, Math.round(parsed * 10) / 10));
    setTextRatio(String(clampedRatio));
    if (clampedRatio !== currentRecipe.ratio) {
      handleApplyRatio(clampedRatio);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = () => {
    resetTimer();
    setIsFreeBrewFinished(false);
    setIsRecipeSaved(false);
    setIsResetting(true);
    if (progressBarRef.current) {
      progressBarRef.current.style.width = '0%';
    }
    setTimeout(() => setIsResetting(false), 500);
  };

  const handleSwitchMode = (newMode: TimerMode) => {
    if (mode === newMode) return;

    const isBrewActive = isRunning || (elapsedSeconds > 0 && !isFinished && !isFreeBrewFinished);
    if (isBrewActive) {
      const confirmed = window.confirm(
        'A brew is currently in progress. Switching modes will reset your timer.'
      );
      if (!confirmed) return;
    }

    handleReset();
    setMode(newMode);
  };

  const handleFinishFreeBrew = () => {
    if (isRunning) {
      toggleTimer();
    }
    if (!isMuted) {
      coffeeAudio.playCompletionFanfare();
    }
    setIsFreeBrewFinished(true);
  };

  const handleSaveFreeBrewRecipe = () => {
    const generatedStages = splitsToRecipeStages(
      splits,
      elapsedSeconds,
      currentRecipe.waterAmountGrams
    );

    const customRecipe: Omit<BrewRecipe, 'id' | 'createdAt'> = {
      name: `Free Brew ${currentRecipe.brewMethod.toUpperCase()}`,
      brewMethod: currentRecipe.brewMethod,
      description: `Extracted via Free Brew stopwatch (${splits.length} splits)`,
      coffeeDoseGrams: currentDose,
      waterAmountGrams: currentRecipe.waterAmountGrams,
      ratio: currentRecipe.ratio,
      grindSize: currentRecipe.grindSize,
      waterTempCelsius: currentRecipe.waterTempCelsius,
      totalTimeSeconds: Math.max(1, elapsedSeconds),
      isPreset: false,
      stages: generatedStages,
    };

    onSaveAsRecipe?.(customRecipe);
    setIsRecipeSaved(true);
  };

  const handleAddReview = () => {
    const generatedStages = splitsToRecipeStages(
      splits,
      elapsedSeconds,
      currentRecipe.waterAmountGrams
    );

    const completedRecipe: BrewRecipe = {
      ...currentRecipe,
      id: `free-brew-${Date.now()}`,
      name: `Free Brew (${currentRecipe.brewMethod.toUpperCase()})`,
      coffeeDoseGrams: currentDose,
      totalTimeSeconds: Math.max(1, elapsedSeconds),
      stages: generatedStages,
    };

    onLogCompletedBrew(completedRecipe, elapsedSeconds, selectedBean || null);
  };

  // Continuous 60fps/120fps progress bar animation via requestAnimationFrame (Recipe Mode only)
  useEffect(() => {
    if (mode === 'free_brew' || !progressBarRef.current) return;

    const totalMs = currentRecipe.totalTimeSeconds * 1000;
    if (totalMs <= 0) {
      progressBarRef.current.style.width = '0%';
      return;
    }

    if (!isRunning) {
      const currentMs = accumulatedMsRef.current;
      const progress = Math.min(100, Math.max(0, (currentMs / totalMs) * 100));
      progressBarRef.current.style.width = `${progress}%`;
      return;
    }

    let animationFrameId: number;
    const updateBar = () => {
      const now = performance.now();
      const elapsedMs = now - startTimeRef.current;
      const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progress}%`;
      }
      if (progress < 100) {
        animationFrameId = requestAnimationFrame(updateBar);
      }
    };

    animationFrameId = requestAnimationFrame(updateBar);
    return () => cancelAnimationFrame(animationFrameId);
  }, [mode, isRunning, elapsedSeconds === 0, currentRecipe.totalTimeSeconds, startTimeRef, accumulatedMsRef]);

  // Linear extraction progress calculation
  const totalProgressPercent = currentRecipe.totalTimeSeconds > 0
    ? Math.min(100, Math.round((elapsedSeconds / currentRecipe.totalTimeSeconds) * 100))
    : 0;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Top Segmented Mode Switcher */}
      <div className="flex items-center justify-between gap-4 pb-4 mb-6 border-b border-border-subtle">
        <div className="inline-flex p-1 bg-panel border border-border-subtle rounded space-x-1">
          <button
            type="button"
            onClick={() => handleSwitchMode('recipe')}
            aria-label="Guided Recipe mode"
            className={`px-4 py-1.5 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              mode === 'recipe'
                ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-panel-recessed'
            }`}
          >
            GUIDED RECIPE
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('free_brew')}
            aria-label="Free Brew mode"
            className={`px-4 py-1.5 rounded font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              mode === 'free_brew'
                ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-panel-recessed'
            }`}
          >
            FREE BREW
          </button>
        </div>
      </div>

      {/* Top Device Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-6 mb-8 border-b border-border-subtle">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="font-mono uppercase px-2 py-0.5 text-xs text-text-secondary border border-border-subtle rounded">
              {currentRecipe.brewMethod}
            </span>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">
              {mode === 'free_brew' ? 'Free Brew Stopwatch' : currentRecipe.name}
            </h2>
          </div>
          <p className="text-xs text-text-muted mt-1.5">
            {mode === 'free_brew'
              ? 'Precision manual split tracking & custom extraction stopwatch.'
              : currentRecipe.description}
          </p>

          {/* Active Bean Indicator / Inline Selector */}
          <div className="mt-3 flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1.5 text-accent font-medium font-mono uppercase tracking-wider text-[11px]">
              <Coffee className="w-3.5 h-3.5" />
              <span>Bean:</span>
            </div>
            {beans.length > 0 ? (
              <select
                value={selectedBean?.id || ''}
                onChange={(e) => {
                  const b = beans.find((item) => item.id === e.target.value);
                  if (b && onSelectBean) onSelectBean(b);
                }}
                className="bg-panel border border-border-subtle rounded px-2.5 py-1 text-xs font-medium text-text-primary focus:outline-none focus:border-accent cursor-pointer"
              >
                {beans.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.roaster})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-text-secondary text-xs">
                {selectedBean ? `${selectedBean.name} (${selectedBean.roaster})` : "Specialty Blend"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <button
            type="button"
            onClick={onSelectOtherRecipe}
            className="px-3.5 py-1.5 rounded border border-border-subtle hover:border-border-active hover:bg-panel text-xs font-mono uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            CHANGE RECIPE
          </button>
        </div>
      </div>

      {/* Main Open Instrument Faceplate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        
        {/* Left Column: Direct Instrument Readouts (Timer + Metrics + Hardware Controls) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          
          {/* Integrated Ratio Translator Collapsible Drawer */}
          <WebRatioTranslator
            currentDose={currentDose}
            baseCoffee={currentDose}
            baseWater={currentRecipe.waterAmountGrams}
            onApplyDose={handleApplyDose}
          />

          {/* Active Stage & Progress Header */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-accent font-bold tracking-widest uppercase font-mono">
                {mode === 'free_brew' ? 'MANUAL STOPWATCH' : currentStage.name}
              </span>
              <span className="text-text-muted tabular-nums">
                {mode === 'free_brew'
                  ? `${splits.length} Splits Recorded`
                  : `${totalProgressPercent}% · Target: ${formatTime(currentRecipe.totalTimeSeconds)}`}
              </span>
            </div>
            
            {/* Sleek linear progress line on chassis */}
            <div className="w-full h-1 bg-panel-recessed overflow-hidden rounded-full">
              {mode === 'recipe' ? (
                <div
                  ref={progressBarRef}
                  className={`h-full bg-accent ${isResetting ? 'transition-all duration-300 ease-out' : ''}`}
                />
              ) : (
                <div
                  className={`h-full bg-accent/60 ${isRunning ? 'animate-pulse' : ''}`}
                  style={{ width: isRunning || elapsedSeconds > 0 ? '100%' : '0%' }}
                />
              )}
            </div>
          </div>

          {/* Oversized Tabular Digital Time Readout */}
          <div className="py-2 select-none flex justify-center sm:justify-start">
            <div className="text-8xl sm:text-9xl font-light tabular-nums text-text-primary leading-none tracking-tight flex items-center justify-center sm:justify-start">
              <span>{Math.floor(elapsedSeconds / 60)}</span>
              <span className="inline-block px-1 text-text-muted/80 select-none" style={{ transform: 'translateY(-0.137em)' }}>:</span>
              <span>{String(elapsedSeconds % 60).padStart(2, '0')}</span>
            </div>
          </div>

          {/* Hairline Divider */}
          <div className="h-px bg-border-subtle" />

          {/* Primary Hardware Metrics Grid */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase">
                COFFEE DOSE
              </div>
              {isMetricEditable ? (
                <label
                  htmlFor="timer-coffee-dose-input"
                  onClick={() => doseInputRef.current?.focus()}
                  className="flex items-baseline border-b border-border-subtle focus-within:border-accent transition-colors mt-1 w-fit cursor-text"
                >
                  {/* Note: explicit onClick ensures focus delegation in simulated environments like JSDOM / RTL while htmlFor provides native browser label behavior */}
                  <input
                    id="timer-coffee-dose-input"
                    ref={doseInputRef}
                    type="number"
                    step={currentWeightUnit === 'imperial' ? '0.01' : '0.1'}
                    min={currentWeightUnit === 'imperial' ? '0.05' : '1'}
                    max={currentWeightUnit === 'imperial' ? '7' : '200'}
                    value={textDose}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setTextDose(e.target.value)}
                    onBlur={handleCommitDose}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      } else if (e.key === 'Escape') {
                        const revert = getDisplayDose(currentDose, currentWeightUnit);
                        setTextDose(revert);
                        (e.target as HTMLInputElement).value = revert;
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    style={{ width: `${Math.max(1, (textDose || '').length)}ch` }}
                    className="bg-transparent text-2xl sm:text-3xl font-light text-text-primary tabular-nums focus:outline-none p-0 text-left [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                    aria-label={`Timer coffee dose in ${currentWeightUnit === 'imperial' ? 'ounces' : 'grams'}`}
                  />
                  <span className="text-xl sm:text-2xl font-light text-text-muted select-none ml-1 cursor-text">
                    {currentWeightUnit === 'imperial' ? 'oz' : 'g'}
                  </span>
                </label>
              ) : (
                <div className="text-2xl sm:text-3xl font-light text-text-primary tabular-nums mt-1">
                  {formatWeight(currentDose, currentWeightUnit)}
                </div>
              )}
            </div>

            <div>
              <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase">
                WATER TARGET
              </div>
              {isMetricEditable ? (
                <label
                  htmlFor="timer-water-target-input"
                  onClick={() => waterInputRef.current?.focus()}
                  className="flex items-baseline border-b border-border-subtle focus-within:border-accent transition-colors mt-1 w-fit cursor-text"
                >
                  {/* Note: explicit onClick ensures focus delegation in simulated environments like JSDOM / RTL while htmlFor provides native browser label behavior */}
                  <input
                    id="timer-water-target-input"
                    ref={waterInputRef}
                    type="number"
                    step={currentWeightUnit === 'imperial' ? '0.1' : '1'}
                    min={currentWeightUnit === 'imperial' ? '1' : '10'}
                    max={currentWeightUnit === 'imperial' ? '100' : '3000'}
                    value={textWater}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setTextWater(e.target.value)}
                    onBlur={handleCommitWater}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      } else if (e.key === 'Escape') {
                        const revert = getDisplayWater(currentRecipe.waterAmountGrams, currentWeightUnit);
                        setTextWater(revert);
                        (e.target as HTMLInputElement).value = revert;
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    style={{ width: `${Math.max(1, (textWater || '').length)}ch` }}
                    className="bg-transparent text-2xl sm:text-3xl font-light text-text-primary tabular-nums focus:outline-none p-0 text-left [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                    aria-label={`Timer water target in ${currentWeightUnit === 'imperial' ? 'ounces' : 'grams'}`}
                  />
                  <span className="text-xl sm:text-2xl font-light text-text-muted select-none ml-1 cursor-text">
                    {currentWeightUnit === 'imperial' ? 'oz' : 'g'}
                  </span>
                </label>
              ) : (
                <div className="text-2xl sm:text-3xl font-light text-text-primary tabular-nums mt-1">
                  {formatWeight(currentRecipe.waterAmountGrams, currentWeightUnit)}
                </div>
              )}
            </div>

            <div>
              <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase">
                {mode === 'free_brew' ? 'RATIO' : 'POUR TO'}
              </div>
              {mode === 'free_brew' ? (
                isMetricEditable ? (
                  <label
                    htmlFor="timer-brew-ratio-input"
                    onClick={() => ratioInputRef.current?.focus()}
                    className="flex items-baseline border-b border-border-subtle focus-within:border-accent transition-colors mt-1 w-fit cursor-text"
                  >
                    {/* Note: explicit onClick ensures focus delegation in simulated environments like JSDOM / RTL while htmlFor provides native browser label behavior */}
                    <span className="text-2xl sm:text-3xl font-light text-text-primary tabular-nums select-none cursor-text">
                      1:
                    </span>
                    <input
                      id="timer-brew-ratio-input"
                      ref={ratioInputRef}
                      type="number"
                      step="0.1"
                      min="1"
                      max="30"
                      value={textRatio}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setTextRatio(e.target.value)}
                      onBlur={handleCommitRatio}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur();
                        } else if (e.key === 'Escape') {
                          const revert = getDisplayRatio(currentRecipe.ratio);
                          setTextRatio(revert);
                          (e.target as HTMLInputElement).value = revert;
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      style={{ width: `${Math.max(1, (textRatio || '').length)}ch` }}
                      className="bg-transparent text-2xl sm:text-3xl font-light text-text-primary tabular-nums focus:outline-none p-0 text-left [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                      aria-label="Timer brew ratio"
                    />
                  </label>
                ) : (
                  <div className="text-2xl sm:text-3xl font-light text-text-primary tabular-nums mt-1">
                    1:{currentRecipe.ratio}
                  </div>
                )
              ) : (
                <div className="text-2xl sm:text-3xl font-light text-text-primary tabular-nums mt-1">
                  {formatWeight(currentStage.targetWaterWeightGrams, currentWeightUnit)}
                </div>
              )}
            </div>
          </div>

          {/* Hairline Divider */}
          <div className="h-px bg-border-subtle" />

          {/* Controls & Quick Tag Actions */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 pt-1">
              <button
                type="button"
                onClick={toggleTimer}
                  disabled={isFreeBrewFinished}
                  className={`flex items-center space-x-2 px-8 py-3 rounded font-mono text-xs uppercase tracking-wider font-bold transition-all ${
                    isFreeBrewFinished
                      ? 'bg-panel-recessed text-text-muted border border-border-subtle cursor-not-allowed opacity-60'
                      : isRunning
                        ? 'bg-accent text-zinc-950 hover:bg-accent-hover cursor-pointer active:scale-95'
                        : 'bg-text-primary text-zinc-950 hover:bg-white cursor-pointer active:scale-95'
                  }`}
                >
                  {isFreeBrewFinished ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>BREW COMPLETE</span>
                    </>
                  ) : isRunning ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>PAUSE</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>{elapsedSeconds > 0 ? 'RESUME' : 'START BREW'}</span>
                    </>
                  )}
                </button>

                {/* Free Brew Specific SPLIT button (only visible while timer is running) */}
                {mode === 'free_brew' && isRunning && (
                  <button
                    type="button"
                    onClick={() => recordSplit()}
                    className="flex items-center space-x-1.5 px-4 py-3 rounded border border-accent bg-accent/10 hover:bg-accent/20 text-accent font-mono text-xs uppercase tracking-wider font-bold cursor-pointer transition-all active:scale-95"
                    title="Record Split"
                    aria-label="SPLIT"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>SPLIT</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-3 rounded border border-border-subtle hover:border-border-active bg-panel hover:bg-panel-recessed text-text-secondary hover:text-text-primary cursor-pointer transition-all active:scale-95"
                  title="Reset Timer"
                  aria-label="Reset Timer"
                >
                  <RotateCcw
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isResetting ? '-rotate-180 text-accent' : ''
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-3 rounded border border-border-subtle hover:border-border-active bg-panel hover:bg-panel-recessed cursor-pointer transition-colors active:scale-95"
                  title={isMuted ? 'Unmute Audio Chimes' : 'Mute Audio Chimes'}
                  aria-label={isMuted ? 'Unmute Audio Chimes' : 'Mute Audio Chimes'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-text-muted" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-accent" />
                  )}
                </button>
              </div>

            {/* Quick Tag Chips (Free Brew Mode) */}
            {mode === 'free_brew' && !isFreeBrewFinished && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider mr-1">
                  TAGS:
                </span>
                <button
                  type="button"
                  onClick={() => recordSplit('Bloom', 'bloom')}
                  className="px-2.5 py-1 rounded border border-border-subtle hover:border-accent hover:bg-panel bg-panel-recessed text-xs font-mono uppercase tracking-wider text-text-secondary hover:text-accent cursor-pointer transition-colors"
                  aria-label="+ BLOOM"
                >
                  + BLOOM
                </button>
                <button
                  type="button"
                  onClick={() => recordSplit('Pour 1', 'pour')}
                  className="px-2.5 py-1 rounded border border-border-subtle hover:border-accent hover:bg-panel bg-panel-recessed text-xs font-mono uppercase tracking-wider text-text-secondary hover:text-accent cursor-pointer transition-colors"
                  aria-label="+ POUR 1"
                >
                  + POUR 1
                </button>
                <button
                  type="button"
                  onClick={() => recordSplit('Pour 2', 'pour')}
                  className="px-2.5 py-1 rounded border border-border-subtle hover:border-accent hover:bg-panel bg-panel-recessed text-xs font-mono uppercase tracking-wider text-text-secondary hover:text-accent cursor-pointer transition-colors"
                  aria-label="+ POUR 2"
                >
                  + POUR 2
                </button>
                <button
                  type="button"
                  onClick={() => recordSplit('Drawdown', 'drawdown')}
                  className="px-2.5 py-1 rounded border border-border-subtle hover:border-accent hover:bg-panel bg-panel-recessed text-xs font-mono uppercase tracking-wider text-text-secondary hover:text-accent cursor-pointer transition-colors"
                  aria-label="+ DRAWDOWN"
                >
                  + DRAWDOWN
                </button>
              </div>
            )}

            {/* Free Brew Dedicated Finish Action Button */}
            {mode === 'free_brew' && (isRunning || elapsedSeconds > 0) && !isFreeBrewFinished && (
              <button
                type="button"
                onClick={handleFinishFreeBrew}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded border border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-900/40 text-emerald-400 font-mono text-xs uppercase tracking-wider font-bold cursor-pointer transition-all active:scale-95 shadow-sm"
                aria-label="FINISH BREW"
              >
                <span>FINISH BREW</span>
              </button>
            )}
          </div>

          {/* Guided Recipe Finish Banner */}
          {mode === 'recipe' && isFinished && (
            <div className="pt-4 animate-fade-in">
              <button
                type="button"
                onClick={() => onLogCompletedBrew(currentRecipe, elapsedSeconds, selectedBean || null)}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase tracking-wider font-bold shadow-md cursor-pointer transition-all"
                aria-label="ADD REVIEW"
              >
                <Plus className="w-4 h-4" />
                <span>ADD REVIEW</span>
              </button>
            </div>
          )}

          {/* Free Brew Finish Banner with Review and Custom Recipe Actions */}
          {mode === 'free_brew' && isFreeBrewFinished && (
            <div className="p-4 rounded border border-emerald-500/30 bg-emerald-950/20 space-y-3 animate-fade-in">
              <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>FREE BREW COMPLETE · {formatTime(elapsedSeconds)} · {splits.length} SPLITS</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleAddReview}
                  className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase tracking-wider font-bold cursor-pointer transition-all"
                  aria-label="ADD REVIEW"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD REVIEW</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveFreeBrewRecipe}
                  disabled={isRecipeSaved}
                  className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded border border-border-subtle bg-panel hover:bg-panel-recessed text-text-primary font-mono text-xs uppercase tracking-wider font-bold cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="SAVE AS CUSTOM RECIPE"
                >
                  {isRecipeSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-accent" />
                      <span>RECIPE SAVED!</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5 text-accent" />
                      <span>SAVE AS CUSTOM RECIPE</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pour Timeline (Guided Recipe) OR Split Log Table (Free Brew) */}
        <div className="lg:col-span-5 flex flex-col">
          {mode === 'recipe' ? (
            <>
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-border-subtle">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted font-mono">
                  POUR TIMELINE
                </h3>
                <span className="text-xs text-accent font-semibold tabular-nums">
                  {currentRecipe.stages.length} Stages
                </span>
              </div>

              {/* Continuous linear stage rows */}
              <div className="divide-y divide-border-subtle/40">
                {currentRecipe.stages.map((stage, idx) => {
                  const isCurrent = idx === currentStageIndex && elapsedSeconds > 0;
                  const isPast = elapsedSeconds >= stage.startSecond + stage.durationSeconds;

                  return (
                    <div
                      key={stage.id}
                      className={`py-3.5 transition-all duration-200 ${
                        isCurrent
                          ? 'opacity-100'
                          : isPast
                          ? 'opacity-35'
                          : 'opacity-65'
                      }`}
                    >
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-2 h-2 rounded-full transition-all ${
                              isCurrent
                                ? 'bg-accent ring-4 ring-accent/25 scale-110'
                                : isPast
                                ? 'bg-emerald-500'
                                : 'bg-zinc-700'
                            }`}
                          />
                          <span
                            className={`text-sm font-semibold tracking-tight ${
                              isCurrent ? 'text-text-primary' : 'text-text-secondary'
                            }`}
                          >
                            {stage.name}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 text-xs">
                          <span className="text-text-muted tabular-nums">
                            {formatTime(stage.startSecond)} ({stage.durationSeconds}s)
                          </span>
                          <span className="font-light text-sm text-text-primary tabular-nums">
                            {formatWeight(stage.targetWaterWeightGrams, currentWeightUnit)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-text-secondary mt-1.5 pl-4.5 leading-relaxed">
                        {stage.instruction}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
                <span className="font-mono text-[11px] uppercase tracking-wider">TOTAL EXTRACTION TARGET</span>
                <span className="text-text-primary font-light text-sm tabular-nums">
                  {formatTime(currentRecipe.totalTimeSeconds)}
                </span>
              </div>
            </>
          ) : (
            /* Free Brew Split Log Table */
            <>
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-border-subtle">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted font-mono">
                  SPLIT LOG
                </h3>
                <span className="text-xs text-accent font-semibold tabular-nums">
                  {splits.length} {splits.length === 1 ? 'Split' : 'Splits'}
                </span>
              </div>

              {splits.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-border-subtle rounded-md my-4">
                  <Flag className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-mono text-text-muted max-w-xs mx-auto">
                    No splits recorded yet. Tap SPLIT or a quick tag while brewing.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle/40 overflow-hidden">
                  <div className="grid grid-cols-12 py-2 text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    <span className="col-span-1">#</span>
                    <span className="col-span-5">TAG / LABEL</span>
                    <span className="col-span-3 text-right">INTERVAL</span>
                    <span className="col-span-2 text-right">TIME</span>
                    <span className="col-span-1 text-right"></span>
                  </div>

                  {splits.map((s, idx) => (
                    <div
                      key={s.id}
                      className="grid grid-cols-12 py-3 items-center text-xs font-mono hover:bg-panel/40 transition-colors"
                    >
                      <span className="col-span-1 text-text-muted tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="col-span-5 flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        <span className="font-semibold text-text-primary truncate">
                          {s.label}
                        </span>
                      </div>
                      <span className="col-span-3 text-right text-text-secondary tabular-nums">
                        +{s.intervalSeconds}s
                      </span>
                      <span className="col-span-2 text-right text-accent tabular-nums font-semibold">
                        {formatTime(s.second)}
                      </span>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeSplit(s.id)}
                          className="p-1 rounded text-text-muted hover:text-red-400 hover:bg-panel transition-colors cursor-pointer"
                          aria-label={`Remove split ${s.label}`}
                          title={`Remove split ${s.label}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
                <span className="font-mono text-[11px] uppercase tracking-wider">TOTAL ELAPSED</span>
                <span className="text-text-primary font-light text-sm tabular-nums">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
