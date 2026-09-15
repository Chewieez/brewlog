import React, { useState, useEffect, useRef } from 'react';
import { BrewRecipe, Bean, rescaleRecipeDose } from '@brewlog/core';
import { useBrewTimer } from './useBrewTimer';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Coffee } from 'lucide-react';

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
    toggleTimer,
    reset: resetTimer,
    toggleMute,
  } = useBrewTimer(recipe);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const [isResetting, setIsResetting] = useState(false);
  const handleReset = () => {
    resetTimer();
    setIsResetting(true);
    setTimeout(() => setIsResetting(false), 500);
  };

  // Linear extraction progress calculation
  const totalProgressPercent = Math.min(100, Math.round((elapsedSeconds / recipe.totalTimeSeconds) * 100));

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Top Device Context Bar — Clean, borderless header with hairline divider */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-6 mb-8 border-b border-border-subtle">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="font-mono uppercase px-2 py-0.5 text-xs text-text-secondary border border-border-subtle rounded">
              {recipe.brewMethod}
            </span>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">{recipe.name}</h2>
          </div>
          <p className="text-xs text-text-muted mt-1.5">{recipe.description}</p>

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
                className="bg-panel border border-border-subtle rounded px-2.5 py-1 text-xs font-mono font-medium text-text-primary focus:outline-none focus:border-accent cursor-pointer"
              >
                {beans.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.roaster})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-text-secondary font-mono">
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
              value={doseGrams}
              onChange={(e) => setDoseGrams(Math.max(5, Math.min(100, Number(e.target.value) || 0)))}
              className="w-10 bg-transparent text-sm font-['Outfit'] font-light tabular-nums text-text-primary focus:outline-none text-right"
              aria-label="Coffee dose in grams"
            />
            <span className="text-xs text-text-muted font-['Outfit'] font-light">g</span>
          </div>

          <button
            onClick={onSelectOtherRecipe}
            className="px-3.5 py-1.5 rounded border border-border-subtle hover:border-border-active hover:bg-panel text-xs font-mono text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Change Recipe
          </button>
        </div>
      </div>

      {/* Main Open Instrument Faceplate (2 Columns, NO Outer Card Wrappers) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        
        {/* Left Column: Direct Instrument Readouts (Timer + Metrics + Hardware Controls) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          
          {/* Active Stage & Linear Progress */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-accent font-bold tracking-widest uppercase">
                {currentStage.name}
              </span>
              <span className="text-text-muted">
                {totalProgressPercent}% · Target: {formatTime(recipe.totalTimeSeconds)}
              </span>
            </div>
            
            {/* Sleek linear progress line on chassis */}
            <div className="w-full h-1 bg-panel-recessed overflow-hidden rounded-full">
              <div
                className="h-full bg-accent transition-all duration-300 ease-out"
                style={{ width: `${totalProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Oversized Tabular Digital Time Readout — Appliance Light with vertically centered colon */}
          <div className="py-2 select-none flex justify-center sm:justify-start">
            <div className="text-8xl sm:text-9xl font-['Outfit'] font-light tabular-nums text-text-primary leading-none tracking-tight flex items-center justify-center sm:justify-start">
              <span>{Math.floor(elapsedSeconds / 60)}</span>
              <span className="inline-block px-1 text-text-muted/80 select-none" style={{ transform: 'translateY(-0.137em)' }}>:</span>
              <span>{String(elapsedSeconds % 60).padStart(2, '0')}</span>
            </div>
          </div>

          {/* Hairline Divider */}
          <div className="h-px bg-border-subtle" />

          {/* Primary Hardware Metrics Grid — Directly on Chassis (No mini-cards) */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase">
                COFFEE DOSE
              </div>
              <div className="text-2xl sm:text-3xl font-['Outfit'] font-light text-text-primary tabular-nums mt-1">
                {doseGrams}g
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase">
                WATER TARGET
              </div>
              <div className="text-2xl sm:text-3xl font-['Outfit'] font-light text-text-primary tabular-nums mt-1">
                {recipe.waterAmountGrams}g
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase">
                POUR TO
              </div>
              <div className="text-2xl sm:text-3xl font-['Outfit'] font-light text-accent tabular-nums mt-1">
                {currentStage.targetWaterWeightGrams}g
              </div>
            </div>
          </div>

          {/* Hairline Divider */}
          <div className="h-px bg-border-subtle" />

          {/* Method / Ratio Specs & Tactile Physical Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="flex items-center space-x-6 text-xs font-mono text-text-muted uppercase tracking-wider">
              <div>METHOD: <span className="text-text-primary font-bold">{recipe.brewMethod}</span></div>
              <div>RATIO: <span className="text-text-primary font-bold">1:{recipe.ratio}</span></div>
            </div>

            <div className="flex items-center space-x-3">
              <button
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
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>{elapsedSeconds > 0 ? 'Resume' : 'Start Brew'}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className="p-3 rounded border border-border-subtle hover:border-border-active bg-panel hover:bg-panel-recessed text-text-secondary hover:text-text-primary cursor-pointer transition-all active:scale-95"
                title="Reset Timer"
                aria-label="Reset Timer"
              >
                <RotateCcw className={`w-4 h-4 transition-transform duration-300 ${isResetting ? "-rotate-180 text-accent" : ""}`} />
              </button>

              <button
                onClick={toggleMute}
                className="p-3 rounded border border-border-subtle hover:border-border-active bg-panel hover:bg-panel-recessed cursor-pointer transition-colors active:scale-95"
                title={isMuted ? "Unmute Audio Chimes" : "Mute Audio Chimes"}
                aria-label={isMuted ? "Unmute Audio Chimes" : "Mute Audio Chimes"}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-text-muted" />
                ) : (
                  <Volume2 className="w-4 h-4 text-accent" />
                )}
              </button>
            </div>
          </div>

          {isFinished && (
            <div className="pt-4 animate-fade-in">
              <button
                onClick={() => onLogCompletedBrew(recipe, elapsedSeconds, selectedBean || null)}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase tracking-wider font-bold shadow-md cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Brew Complete! Rate & Log to Cupping Sheet</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Open Linear Pour Timeline (No Card Enclosures) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-border-subtle">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted font-mono">
              POUR TIMELINE
            </h3>
            <span className="text-xs font-mono text-accent font-semibold">
              {recipe.stages.length} Stages
            </span>
          </div>

          {/* Continuous linear stage rows (No nested card boxes) */}
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
                      <span className={`text-sm font-semibold tracking-tight ${isCurrent ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {stage.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-text-muted font-mono">
                        {formatTime(stage.startSecond)} ({stage.durationSeconds}s)
                      </span>
                      <span className="font-['Outfit'] font-light text-sm text-text-primary tabular-nums">
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
            <span className="text-text-primary font-['Outfit'] font-light text-sm tabular-nums">
              {formatTime(recipe.totalTimeSeconds)}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
