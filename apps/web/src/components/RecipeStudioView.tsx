import React, { useState } from 'react';
import { BrewRecipe, DEFAULT_PRESET_RECIPES, rescaleRecipeDose } from '@brewlog/core';
import { Play, Sparkles, BookOpen, Clock, Droplets, Thermometer, Plus, Check } from 'lucide-react';

interface RecipeStudioProps {
  recipes: BrewRecipe[];
  onSelectRecipeForTimer: (recipe: BrewRecipe) => void;
  onAddCustomRecipe: (recipe: BrewRecipe) => void;
}

export const RecipeStudioView: React.FC<RecipeStudioProps> = ({
  recipes,
  onSelectRecipeForTimer,
  onAddCustomRecipe,
}) => {
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('all');
  const [activeRecipeId, setActiveRecipeId] = useState<string>(recipes[0]?.id || 'preset-v60-hoffmann');
  const [customDose, setCustomDose] = useState<number>(20);

  const activeRecipe = recipes.find((r) => r.id === activeRecipeId) || recipes[0] || DEFAULT_PRESET_RECIPES[0];
  const scaledRecipe = rescaleRecipeDose(activeRecipe, customDose);

  const filteredRecipes = recipes.filter((r) => {
    return selectedMethodFilter === 'all' || r.brewMethod === selectedMethodFilter;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-100">Recipe Studio</h2>
          <p className="text-sm text-stone-400 mt-0.5">
            World Champion & Expert brew profiles for V60, AeroPress, Flair Espresso, and Chemex.
          </p>
        </div>

        {/* Method Filter */}
        <div className="flex flex-wrap gap-2">
          {['all', 'v60', 'aeropress', 'flair', 'chemex', 'french-press'].map((method) => (
            <button
              key={method}
              onClick={() => setSelectedMethodFilter(method)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                selectedMethodFilter === method
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                  : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {method.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recipe Selector List */}
        <div className="lg:col-span-5 space-y-3">
          {filteredRecipes.map((r) => {
            const isSelected = r.id === activeRecipeId;
            return (
              <div
                key={r.id}
                onClick={() => {
                  setActiveRecipeId(r.id);
                  setCustomDose(r.coffeeDoseGrams);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'bg-stone-900/60 border-stone-800/80 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-800 text-amber-400 border border-amber-500/20">
                    {r.brewMethod}
                  </span>
                  {r.author && <span className="text-xs text-stone-400">{r.author}</span>}
                </div>

                <h3 className="text-base font-bold text-stone-100 mt-2">{r.name}</h3>
                <p className="text-xs text-stone-400 mt-1 line-clamp-2">{r.description}</p>

                <div className="mt-3 flex items-center space-x-4 text-xs font-mono text-stone-300">
                  <span>1:{r.ratio}</span>
                  <span>•</span>
                  <span>{r.coffeeDoseGrams}g : {r.waterAmountGrams}g</span>
                  <span>•</span>
                  <span>{Math.floor(r.totalTimeSeconds / 60)}m {r.totalTimeSeconds % 60}s</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Recipe Details & Auto-Scaler */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-stone-900/80 border border-stone-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {activeRecipe.brewMethod}
                </span>
                <h3 className="text-xl font-bold text-stone-100">{activeRecipe.name}</h3>
              </div>
              <p className="text-xs text-stone-400 mt-1">{activeRecipe.description}</p>
            </div>

            <button
              onClick={() => onSelectRecipeForTimer(scaledRecipe)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-bold shadow-lg shadow-amber-500/25 transition-all transform hover:scale-105"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Load in Timer</span>
            </button>
          </div>

          {/* Quick Metrics & Live Auto-Scaler */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-stone-950/70 border border-stone-800">
            <div>
              <span className="text-[11px] text-stone-400 font-medium">Coffee Dose</span>
              <div className="flex items-center space-x-1 mt-1">
                <input
                  type="number"
                  min="5"
                  max="100"
                  step="0.5"
                  value={customDose}
                  onChange={(e) => setCustomDose(Number(e.target.value))}
                  className="w-14 bg-stone-900 px-2 py-0.5 rounded text-sm font-bold text-amber-400 border border-stone-700 focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-stone-400">g</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-stone-400 font-medium">Target Water</span>
              <div className="text-base font-bold font-mono text-amber-300 mt-1">
                {scaledRecipe.waterAmountGrams}g
              </div>
            </div>

            <div>
              <span className="text-[11px] text-stone-400 font-medium">Grind Size</span>
              <div className="text-xs font-semibold text-stone-200 mt-1 truncate">
                {activeRecipe.grindSize}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-stone-400 font-medium">Water Temp</span>
              <div className="text-base font-bold font-mono text-stone-200 mt-1">
                {activeRecipe.waterTempCelsius}°C
              </div>
            </div>
          </div>

          {/* Scaled Pour Stages Timeline */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
              Multi-Stage Pour Breakdown (Auto-scaled for {customDose}g coffee)
            </h4>

            <div className="space-y-2.5">
              {scaledRecipe.stages.map((stage, i) => (
                <div
                  key={stage.id}
                  className="p-3 rounded-xl bg-stone-950/50 border border-stone-800/70 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start space-x-3">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-mono font-bold flex items-center justify-center border border-amber-500/20 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <h5 className="text-sm font-bold text-stone-200">{stage.name}</h5>
                      <p className="text-xs text-stone-400 mt-0.5">{stage.instruction}</p>
                    </div>
                  </div>

                  <div className="text-right whitespace-nowrap font-mono">
                    <div className="text-xs font-bold text-amber-400">
                      Pour to {stage.targetWaterWeightGrams}g
                    </div>
                    <div className="text-[11px] text-stone-500">
                      {stage.durationSeconds}s duration
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
