import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { BrewRecipe, rescaleRecipeDose } from '@brewlog/core';
import {
  Play,
  BookOpen,
  Clock,
  Droplets,
  Thermometer,
  Trash2,
  ArrowLeft,
} from 'lucide-react';

export interface RecipeDetailPaneProps {
  recipe: BrewRecipe;
  onSelectRecipeForTimer: (recipe: BrewRecipe) => void;
  onDeleteRecipe?: (recipe: BrewRecipe) => void;
  showMobileBackButton?: boolean;
}

export const RecipeDetailPane: React.FC<RecipeDetailPaneProps> = ({
  recipe,
  onSelectRecipeForTimer,
  onDeleteRecipe,
  showMobileBackButton = false,
}) => {
  const [customDose, setCustomDose] = useState<number>(recipe.coffeeDoseGrams);

  // Sync dose when recipe changes
  useEffect(() => {
    setCustomDose(recipe.coffeeDoseGrams);
  }, [recipe.id, recipe.coffeeDoseGrams]);

  const scaledRecipe = rescaleRecipeDose(recipe, customDose);
  const isCustom = !recipe.isPreset && !recipe.id.startsWith('preset-');
  const stages = scaledRecipe.stages || (scaledRecipe as unknown as { steps: typeof scaledRecipe.stages }).steps || [];

  return (
    <div className="p-6 rounded-3xl bg-stone-900/60 border border-stone-800/80 backdrop-blur-xl shadow-xl space-y-6">
      {/* Mobile Back Button */}
      {showMobileBackButton && (
        <div className="lg:hidden pb-2 border-b border-stone-800/60">
          <Link
            to="/recipes"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Recipes</span>
          </Link>
        </div>
      )}

      {/* Detail Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {recipe.brewMethod}
            </span>
            {isCustom ? (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Custom
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Official Preset
              </span>
            )}
            {recipe.author && (
              <span className="text-xs text-stone-400">by {recipe.author}</span>
            )}
          </div>

          <h3 className="text-2xl font-bold text-stone-100 mt-2">{recipe.name}</h3>
          <p className="text-sm text-stone-400 mt-1 max-w-xl">
            {recipe.description || 'No description provided.'}
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {isCustom && onDeleteRecipe && (
            <button
              type="button"
              onClick={() => onDeleteRecipe(recipe)}
              className="p-2 rounded-xl text-stone-500 hover:text-red-400 hover:bg-stone-800/80 border border-transparent hover:border-red-500/30 transition-colors cursor-pointer"
              title="Delete Recipe"
              aria-label={`Delete custom recipe ${recipe.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectRecipeForTimer(scaledRecipe)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer text-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Brew with this Recipe</span>
          </button>
        </div>
      </div>

      {/* Dose Rescaler Slider */}
      <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-400 font-medium">Coffee Dose</span>
          <span className="text-amber-400 font-mono font-bold text-sm">
            {customDose}g
          </span>
        </div>
        <input
          type="range"
          aria-label="Coffee Dose"
          min={10}
          max={60}
          step={0.5}
          value={customDose}
          onChange={(e) => setCustomDose(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <div className="flex justify-between text-[10px] text-stone-600 font-mono">
          <span>10g</span>
          <span>Single cup (15-18g)</span>
          <span>Server (30g)</span>
          <span>60g</span>
        </div>
      </div>

      {/* Specifications Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-stone-950/40 border border-stone-800/60 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-stone-900 text-amber-400 border border-stone-800">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-stone-400 uppercase font-medium">Total Water</div>
            <div className="text-sm font-bold font-mono text-stone-100">
              {scaledRecipe.waterAmountGrams}g
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-stone-950/40 border border-stone-800/60 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-stone-900 text-amber-400 border border-stone-800">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-stone-400 uppercase font-medium">Brew Ratio</div>
            <div className="text-sm font-bold font-mono text-stone-100">
              1:{recipe.ratio}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-stone-950/40 border border-stone-800/60 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-stone-900 text-amber-400 border border-stone-800">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-stone-400 uppercase font-medium">Target Time</div>
            <div className="text-sm font-bold font-mono text-stone-100">
              {Math.floor(recipe.totalTimeSeconds / 60)}m {recipe.totalTimeSeconds % 60}s
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-stone-950/40 border border-stone-800/60 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-stone-900 text-amber-400 border border-stone-800">
            <Thermometer className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-stone-400 uppercase font-medium">Water Temp</div>
            <div className="text-sm font-bold font-mono text-stone-100">
              {recipe.waterTempCelsius ? `${recipe.waterTempCelsius}°C` : '93-96°C'}
            </div>
          </div>
        </div>
      </div>

      {/* Steps Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-stone-200">Brew Steps</h4>
        <div className="space-y-2.5">
          {stages.map((step, idx) => {
            const stepAny = step as unknown as { title?: string; targetWeightGrams?: number; description?: string };
            const title = step.name || stepAny.title;
            const targetWeight = step.targetWaterWeightGrams !== undefined ? step.targetWaterWeightGrams : stepAny.targetWeightGrams;
            const description = step.instruction || stepAny.description;

            return (
              <div
                key={step.id || idx}
                className="p-3.5 rounded-xl bg-stone-950/50 border border-stone-800/60 flex items-start space-x-3"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-stone-900 text-amber-400 text-xs font-mono font-bold shrink-0 border border-stone-800">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-200">{title}</span>
                    <div className="flex items-center space-x-2 text-xs font-mono text-stone-400 shrink-0">
                      {targetWeight !== undefined && (
                        <span className="text-amber-400/90 font-bold">
                          {targetWeight}g
                        </span>
                      )}
                      <span>{step.durationSeconds}s</span>
                    </div>
                  </div>
                  {description && (
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
