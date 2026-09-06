import { ScrollFadeContainer } from '../../components/shared/ScrollFadeContainer';
import React, { useState, useEffect, useRef } from 'react';
import { BrewRecipe, Bean, rescaleRecipeDose } from '@brewlog/core';
import { useBrewTimer } from './useBrewTimer';
import { Play, Pause, RotateCcw, Volume2, VolumeX, CheckCircle2, Droplets, Sparkles, Coffee } from 'lucide-react';

interface TimerViewProps {
  recipe: BrewRecipe;
  selectedBean?: Bean | null;
  beans?: Bean[];
  onSelectBean?: (bean: Bean) => void;
  onSelectOtherRecipe: () => void;
  onLogCompletedBrew: (recipe: BrewRecipe, actualTimeSeconds: number, bean: Bean | null) => void;
}

export const TimerView: React.FC<TimerViewProps> = ({
  recipe: initialRecipe,
  selectedBean,
  beans = [],
  onSelectBean,
  onSelectOtherRecipe,
  onLogCompletedBrew,
}) => {
  const [doseGrams, setDoseGrams] = useState(initialRecipe.coffeeDoseGrams);
  const [recipe, setRecipe] = useState<BrewRecipe>(initialRecipe);

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
    totalProgress,
    toggleTimer,
    reset: resetTimer,
    toggleMute,
    startTimeRef,
    accumulatedMsRef,
  } = useBrewTimer(recipe);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // SVG Circle calculation
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const circleRef = useRef<SVGCircleElement | null>(null);

  // 15% Orbital Tracer Sweep state on Reset
  const [isResetting, setIsResetting] = useState(false);
  const tracerRef = useRef<SVGCircleElement | null>(null);

  const handleReset = () => {
    resetTimer();
    setIsResetting(true);
  };

  // Precise 800ms reset sweep animation: sweeps 360° and collapses into the exact 0 (12 o'clock) mark
  useEffect(() => {
    if (!isResetting) return;

    const startTime = performance.now();
    const duration = 800; // Slower, relaxed, buttery smooth
    const maxArc = circumference * 0.06; // 6% of circle
    const totalDistance = circumference + maxArc;

    let animId: number;

    const sweep = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      // Smooth ease-in-out cubic curve
      const u = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const head = Math.min(circumference, u * totalDistance);
      const tail = Math.max(0, u * totalDistance - maxArc);
      const arcLength = Math.max(0, head - tail);

      if (tracerRef.current) {
        tracerRef.current.style.strokeDasharray = `${arcLength} ${circumference}`;
        tracerRef.current.style.strokeDashoffset = `${-tail}`;
        // Fade out smoothly during the final 15% as the tail collapses into 0
        const opacity = t > 0.82 ? (1 - t) / 0.18 : 1;
        tracerRef.current.style.opacity = `${opacity}`;
      }

      if (t < 1) {
        animId = requestAnimationFrame(sweep);
      } else {
        setIsResetting(false);
      }
    };

    animId = requestAnimationFrame(sweep);
    return () => cancelAnimationFrame(animId);
  }, [isResetting, circumference]);

  // Continuous 60fps/120fps display loop via requestAnimationFrame
  // Eliminates backward jump on pause by locking to exact accumulated milliseconds
  useEffect(() => {
    if (!circleRef.current) return;

    if (!isRunning) {
      // Freeze or reset to exact elapsed position with zero rewind jump
      const currentMs = accumulatedMsRef.current;
      const progress = Math.min(1, currentMs / (recipe.totalTimeSeconds * 1000));
      circleRef.current.style.strokeDashoffset = `${circumference * (1 - progress)}`;
      return;
    }

    let animationFrameId: number;
    const updateCircle = () => {
      const now = performance.now();
      const elapsedMs = now - startTimeRef.current;
      const progress = Math.min(1, elapsedMs / (recipe.totalTimeSeconds * 1000));
      if (circleRef.current) {
        circleRef.current.style.strokeDashoffset = `${circumference * (1 - progress)}`;
      }
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCircle);
      }
    };

    animationFrameId = requestAnimationFrame(updateCircle);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning, elapsedSeconds === 0, recipe.totalTimeSeconds, circumference, startTimeRef, accumulatedMsRef]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner & Recipe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-stone-900/60 border border-stone-800/80 backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              {recipe.brewMethod}
            </span>
            <h2 className="text-xl font-bold text-stone-100">{recipe.name}</h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">{recipe.description}</p>

          {/* Active Bean Indicator / Selector */}
          <div className="mt-2.5 flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1.5 text-amber-400 font-medium">
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
                className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1 text-xs font-semibold text-stone-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {beans.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.roaster})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-stone-300 font-medium">
                {selectedBean ? `${selectedBean.name} (${selectedBean.roaster})` : "Specialty Blend"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Dose Scaler */}
          <div className="flex items-center space-x-2 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
            <span className="text-xs text-stone-400">Coffee:</span>
            <input
              type="number"
              min="5"
              max="100"
              value={doseGrams}
              onChange={(e) => setDoseGrams(Math.max(5, Math.min(100, Number(e.target.value) || 0)))}
              className="w-12 bg-transparent text-sm font-bold text-amber-400 focus:outline-none text-right"
            />
            <span className="text-xs text-stone-500 font-medium">g</span>
          </div>

          <button
            onClick={onSelectOtherRecipe}
            className="px-3 py-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700 text-xs font-medium text-stone-300 transition-colors cursor-pointer"
          >
            Change Recipe
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Big Interactive Timer Circle & Controls */}
        <div className="lg:col-span-7 flex flex-col items-center justify-between p-6 sm:p-8 rounded-3xl bg-stone-900/40 border border-stone-800/80 backdrop-blur-md relative overflow-hidden min-h-[520px] lg:min-h-[560px]">
          {/* Recipe Method & Ratio Stats */}
          <div className="flex items-center space-x-6 text-xs font-mono text-stone-400 uppercase tracking-wider">
            <div>METHOD: <span className="text-stone-200 font-bold">{recipe.brewMethod}</span></div>
            <div>RATIO: <span className="text-stone-200 font-bold">1:{recipe.ratio}</span></div>
          </div>

          {/* Circular Progress Display */}
          <div className="relative flex items-center justify-center my-auto">
            <svg className="w-72 h-72 transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r={radius}
                className="stroke-stone-800/60"
                strokeWidth="12"
                fill="transparent"
              />
              <circle
                ref={circleRef}
                cx="50%"
                cy="50%"
                r={radius}
                className="stroke-amber-500"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
                strokeLinecap="round"
                fill="transparent"
              />
              {/* 6% Orbital Reset Tracer Sweep */}
              {isResetting && (
                <circle
                  ref={tracerRef}
                  cx="50%"
                  cy="50%"
                  r={radius}
                  className="stroke-amber-500"
                  strokeWidth="12"
                  strokeDasharray={`0 ${circumference}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  fill="transparent"
                />
              )}
            </svg>

            {/* Inner Timer Digits */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs uppercase font-mono tracking-widest text-amber-400/80">
                {currentStage.name}
              </span>
              <div className="text-5xl sm:text-6xl font-extrabold tracking-tight font-mono text-stone-100 mt-1">
                {formatTime(elapsedSeconds)}
              </div>
              <div className="text-xs text-stone-400 mt-1">
                Target: {formatTime(recipe.totalTimeSeconds)}
              </div>

              {/* Target Grams Badge */}
              <div className="mt-3 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-sm font-semibold">
                <Droplets className="w-3.5 h-3.5" />
                <span>Pour to {currentStage.targetWaterWeightGrams}g</span>
              </div>
            </div>
          </div>

          {/* Primary Controls */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTimer}
              className={`flex items-center space-x-2 px-8 py-3.5 rounded-2xl font-bold shadow-lg cursor-pointer transition-all transform active:scale-95 ${isRunning
                ? 'bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-amber-500/20'
                : 'bg-stone-100 text-stone-950 hover:bg-white shadow-stone-100/10'
                }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>{elapsedSeconds > 0 ? 'Resume' : 'Start Brew'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              className="p-3.5 rounded-2xl bg-stone-800/80 hover:bg-stone-700/80 border border-stone-800 text-stone-300 hover:text-stone-100 cursor-pointer transition-all"
              title="Reset Timer"
              aria-label="Reset Timer"
            >
              <RotateCcw className={`w-5 h-5 transition-transform duration-300 ${isResetting ? "-rotate-180 text-amber-400" : ""}`} />
            </button>

            <button
              onClick={toggleMute}
              className="p-3.5 rounded-2xl bg-stone-800/80 hover:bg-stone-700/80 border border-stone-800 cursor-pointer transition-colors"
              title={isMuted ? "Unmute Audio Chimes" : "Mute Audio Chimes"}
              aria-label={isMuted ? "Unmute Audio Chimes" : "Mute Audio Chimes"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-stone-500 hover:text-stone-400 transition-colors" />
              ) : (
                <Volume2 className="w-5 h-5 text-amber-400 transition-colors" />
              )}
            </button>
          </div>

          {isFinished && (
            <div className="mt-6 w-full animate-fade-in">
              <button
                onClick={() => onLogCompletedBrew(recipe, elapsedSeconds, selectedBean || null)}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Brew Complete! Rate & Log to Cupping Sheet</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Stage Timeline & Step Guide Panel */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-stone-900/60 border border-stone-800/80 backdrop-blur-md flex flex-col min-h-[520px] lg:min-h-[560px] overflow-hidden">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-800 flex-shrink-0">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
              Pour Timeline
            </h3>
            <span className="text-xs font-mono text-amber-400">
              {recipe.stages.length} Stages
            </span>
          </div>

          <ScrollFadeContainer className="flex-1 min-h-0 space-y-3 pr-1">
            {recipe.stages.map((stage, idx) => {
              const isCurrent = idx === currentStageIndex && elapsedSeconds > 0;
              const isPast = elapsedSeconds >= stage.startSecond + stage.durationSeconds;

              return (
                <div
                  key={stage.id}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 ${isCurrent
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                    : isPast
                      ? 'bg-stone-950/40 border-stone-800/40 opacity-60'
                      : 'bg-stone-950/70 border-stone-800/60'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {isPast ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-stone-700" />
                      )}
                      <span className={`text-sm font-semibold ${isCurrent ? 'text-amber-300' : 'text-stone-200'}`}>
                        {stage.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-stone-400">
                      {formatTime(stage.startSecond)} ({stage.durationSeconds}s)
                    </span>
                  </div>

                  <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                    {stage.instruction}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-stone-400 font-mono">
                    <span>Target Weight:</span>
                    <span className="text-amber-300 font-bold">{stage.targetWaterWeightGrams}g</span>
                  </div>
                </div>
              );
            })}
          </ScrollFadeContainer>

          <div className="mt-3 pt-3 border-t border-stone-800/60 text-center text-xs text-stone-500 flex-shrink-0">
            Total Target Extraction: {formatTime(recipe.totalTimeSeconds)}
          </div>
        </div>
      </div>
    </div>
  );
};
