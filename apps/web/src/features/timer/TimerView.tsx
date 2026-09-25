import React, { useState, useEffect, useRef } from 'react';
import { BrewRecipe, Bean, TimerMode, SplitTag, rescaleRecipeDose, splitsToRecipeStages } from '@brewlog/core';
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
} from 'lucide-react';

export interface TimerViewProps {
  recipe: BrewRecipe;
  selectedBean?: Bean | null;
  beans?: Bean[];
  initialMode?: TimerMode;
  onSelectBean?: (bean: Bean) => void;
  onSelectOtherRecipe: () => void;
  onLogCompletedBrew: (recipe: BrewRecipe, actualTimeSeconds: number, bean: Bean | null) => void;
  onSaveAsRecipe?: (recipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => void;
}

export const TimerView: React.FC<TimerViewProps> = ({
  recipe: initialRecipe,
  selectedBean,
  beans = [],
  initialMode = 'recipe',
  onSelectBean,
  onSelectOtherRecipe,
  onLogCompletedBrew,
  onSaveAsRecipe,
}) => {
  const [mode, setMode] = useState<TimerMode>(initialMode);
  const [doseGrams, setDoseGrams] = useState(initialRecipe.coffeeDoseGrams);
  const [recipe, setRecipe] = useState<BrewRecipe>(initialRecipe);
  const [isFreeBrewFinished, setIsFreeBrewFinished] = useState(false);
  const [isRecipeSaved, setIsRecipeSaved] = useState(false);

  // Reset dose when initial recipe changes
  useEffect(() => {
    setDoseGrams(initialRecipe.coffeeDoseGrams);
  }, [initialRecipe.id, initialRecipe.coffeeDoseGrams]);

  // Sync recipe when initial recipe or dose changes
  useEffect(() => {
    setRecipe(rescaleRecipeDose(initialRecipe, doseGrams));
  }, [initialRecipe, doseGrams]);

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
  } = useBrewTimer(recipe, mode);

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
      recipe.waterAmountGrams
    );

    const customRecipe: Omit<BrewRecipe, 'id' | 'createdAt'> = {
      name: `Free Brew ${recipe.brewMethod.toUpperCase()}`,
      brewMethod: recipe.brewMethod,
      description: `Extracted via Free Brew stopwatch (${splits.length} splits)`,
      coffeeDoseGrams: doseGrams,
      waterAmountGrams: recipe.waterAmountGrams,
      ratio: recipe.ratio,
      grindSize: recipe.grindSize,
      waterTempCelsius: recipe.waterTempCelsius,
      totalTimeSeconds: Math.max(1, elapsedSeconds),
      isPreset: false,
      stages: generatedStages,
    };

    onSaveAsRecipe?.(customRecipe);
    setIsRecipeSaved(true);
  };

  const handleLogFreeBrewCupping = () => {
    const generatedStages = splitsToRecipeStages(
      splits,
      elapsedSeconds,
      recipe.waterAmountGrams
    );

    const completedRecipe: BrewRecipe = {
      ...recipe,
      id: `free-brew-${Date.now()}`,
      name: `Free Brew (${recipe.brewMethod.toUpperCase()})`,
      totalTimeSeconds: Math.max(1, elapsedSeconds),
      stages: generatedStages,
    };

    onLogCompletedBrew(completedRecipe, elapsedSeconds, selectedBean || null);
  };

  // Continuous 60fps/120fps progress bar animation via requestAnimationFrame (Recipe Mode only)
  useEffect(() => {
    if (mode === 'free_brew' || !progressBarRef.current) return;

    const totalMs = recipe.totalTimeSeconds * 1000;
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
  }, [mode, isRunning, elapsedSeconds === 0, recipe.totalTimeSeconds, startTimeRef, accumulatedMsRef]);

  // Linear extraction progress calculation
  const totalProgressPercent = recipe.totalTimeSeconds > 0
    ? Math.min(100, Math.round((elapsedSeconds / recipe.totalTimeSeconds) * 100))
    : 0;

  return (
    <div className="max-w-6xl mx-auto pb-12">
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

        <div className="text-right">
          <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
            {mode === 'recipe' ? 'Stage Engine' : 'Stopwatch Mode'}
          </span>
        </div>
      </div>

      {/* Top Device Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-6 mb-8 border-b border-border-subtle">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="font-mono uppercase px-2 py-0.5 text-xs text-text-secondary border border-border-subtle rounded">
              {recipe.brewMethod}
            </span>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">
              {mode === 'free_brew' ? 'Free Brew Stopwatch' : recipe.name}
            </h2>
          </div>
          <p className="text-xs text-text-muted mt-1.5">
            {mode === 'free_brew'
              ? 'Precision manual split tracking & custom extraction stopwatch.'
              : recipe.description}
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

        <div className="flex items-center space-x-4">
          {/* Dose Scaler */}
          <div className="flex items-center space-x-2 px-3 py-1.5 border border-border-subtle rounded">
            <span className="text-xs text-text-muted font-mono uppercase text-[11px] tracking-wider">Coffee:</span>
            <input
              type="number"
              min="5"
              max="100"
              step="1"
              value={doseGrams}
              onChange={(e) => setDoseGrams(Math.max(5, Math.min(100, Math.round(Number(e.target.value)) || 0)))}
              className="w-10 bg-transparent text-sm font-light tabular-nums text-text-primary focus:outline-none text-right"
              aria-label="Coffee dose in grams"
            />
            <span className="text-xs text-text-muted font-light">g</span>
          </div>

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
          
          {/* Active Stage & Progress Header */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-accent font-bold tracking-widest uppercase font-mono">
                {mode === 'free_brew' ? 'FREE BREW · MANUAL STOPWATCH' : currentStage.name}
              </span>
              <span className="text-text-muted tabular-nums">
                {mode === 'free_brew'
                  ? `${splits.length} Splits Recorded`
                  : `${totalProgressPercent}% · Target: ${formatTime(recipe.totalTimeSeconds)}`}
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
              <div className="text-2xl sm:text-3xl font-light text-text-primary tabular-nums mt-1">
                {doseGrams}g
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase">
                WATER TARGET
              </div>
              <div className="text-2xl sm:text-3xl font-light text-text-primary tabular-nums mt-1">
                {recipe.waterAmountGrams}g
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase">
                {mode === 'free_brew' ? 'SPLITS' : 'POUR TO'}
              </div>
              <div className="text-2xl sm:text-3xl font-light text-accent tabular-nums mt-1">
                {mode === 'free_brew' ? splits.length : `${currentStage.targetWaterWeightGrams}g`}
              </div>
            </div>
          </div>

          {/* Hairline Divider */}
          <div className="h-px bg-border-subtle" />

          {/* Controls & Quick Tag Actions */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="flex items-center space-x-6 text-xs font-mono text-text-muted uppercase tracking-wider">
                <div>METHOD: <span className="text-text-primary font-bold">{recipe.brewMethod}</span></div>
                <div>RATIO: <span className="text-text-primary font-bold">1:{recipe.ratio}</span></div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={toggleTimer}
                  className={`flex items-center space-x-2 px-8 py-3 rounded font-mono text-xs uppercase tracking-wider font-bold cursor-pointer transition-all active:scale-95 ${
                    isRunning
                      ? 'bg-accent text-zinc-950 hover:bg-accent-hover'
                      : 'bg-text-primary text-zinc-950 hover:bg-white'
                  }`}
                >
                  {isRunning ? (
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

                {/* Free Brew Specific SPLIT button */}
                {mode === 'free_brew' && (
                  <button
                    type="button"
                    onClick={() => recordSplit()}
                    disabled={(!isRunning && elapsedSeconds === 0) || isFreeBrewFinished}
                    className="flex items-center space-x-1.5 px-4 py-3 rounded border border-accent bg-accent/10 hover:bg-accent/20 text-accent font-mono text-xs uppercase tracking-wider font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Record Split"
                    aria-label="SPLIT"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>SPLIT</span>
                  </button>
                )}

                {/* Free Brew Finish Button */}
                {mode === 'free_brew' && (isRunning || elapsedSeconds > 0) && !isFreeBrewFinished && (
                  <button
                    type="button"
                    onClick={handleFinishFreeBrew}
                    className="px-4 py-3 rounded border border-emerald-600 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 font-mono text-xs uppercase tracking-wider font-bold cursor-pointer transition-all active:scale-95"
                    aria-label="FINISH BREW"
                  >
                    FINISH BREW
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
                  className="px-2.5 py-1 rounded border border-border-subtle hover:border-accent hover:bg-panel bg-panel-recessed text-xs font-mono text-text-secondary hover:text-accent cursor-pointer transition-colors"
                  aria-label="+ Bloom"
                >
                  + Bloom
                </button>
                <button
                  type="button"
                  onClick={() => recordSplit('Pour 1', 'pour')}
                  className="px-2.5 py-1 rounded border border-border-subtle hover:border-accent hover:bg-panel bg-panel-recessed text-xs font-mono text-text-secondary hover:text-accent cursor-pointer transition-colors"
                  aria-label="+ Pour 1"
                >
                  + Pour 1
                </button>
                <button
                  type="button"
                  onClick={() => recordSplit('Pour 2', 'pour')}
                  className="px-2.5 py-1 rounded border border-border-subtle hover:border-accent hover:bg-panel bg-panel-recessed text-xs font-mono text-text-secondary hover:text-accent cursor-pointer transition-colors"
                  aria-label="+ Pour 2"
                >
                  + Pour 2
                </button>
                <button
                  type="button"
                  onClick={() => recordSplit('Drawdown', 'drawdown')}
                  className="px-2.5 py-1 rounded border border-border-subtle hover:border-accent hover:bg-panel bg-panel-recessed text-xs font-mono text-text-secondary hover:text-accent cursor-pointer transition-colors"
                  aria-label="+ Drawdown"
                >
                  + Drawdown
                </button>
              </div>
            )}
          </div>

          {/* Integrated Ratio Translator Collapsible Drawer */}
          <WebRatioTranslator
            currentDose={doseGrams}
            onApplyDose={(d) => setDoseGrams(d)}
            className="mt-6"
          />

          {/* Guided Recipe Finish Banner */}
          {mode === 'recipe' && isFinished && (
            <div className="pt-4 animate-fade-in">
              <button
                type="button"
                onClick={() => onLogCompletedBrew(recipe, elapsedSeconds, selectedBean || null)}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase tracking-wider font-bold shadow-md cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>BREW COMPLETE! RATE & LOG TO CUPPING SHEET</span>
              </button>
            </div>
          )}

          {/* Free Brew Finish Banner with Cupping and Custom Recipe Actions */}
          {mode === 'free_brew' && isFreeBrewFinished && (
            <div className="p-4 rounded border border-emerald-500/30 bg-emerald-950/20 space-y-3 animate-fade-in">
              <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>FREE BREW COMPLETE · {formatTime(elapsedSeconds)} · {splits.length} SPLITS</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleLogFreeBrewCupping}
                  className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase tracking-wider font-bold cursor-pointer transition-all"
                  aria-label="RATE & LOG TO CUPPING SHEET"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>RATE & LOG TO CUPPING SHEET</span>
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
                  {recipe.stages.length} Stages
                </span>
              </div>

              {/* Continuous linear stage rows */}
              <div className="divide-y divide-border-subtle/40">
                {recipe.stages.map((stage, idx) => {
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
                            {stage.targetWaterWeightGrams}g
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
                  {formatTime(recipe.totalTimeSeconds)}
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
