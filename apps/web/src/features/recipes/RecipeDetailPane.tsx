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
import { ConfirmationModal } from '../../components/shared/ConfirmationModal';

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Sync dose when recipe changes
  useEffect(() => {
    setCustomDose(recipe.coffeeDoseGrams);
  }, [recipe.id, recipe.coffeeDoseGrams]);

  const scaledRecipe = rescaleRecipeDose(recipe, customDose);
  const isCustom = !recipe.isPreset && !recipe.id.startsWith('preset-');
  const stages = scaledRecipe.stages || (scaledRecipe as unknown as { steps: typeof scaledRecipe.stages }).steps || [];

  return (
    <div className="p-6 rounded-2xl bg-panel border border-border-subtle space-y-6">
      {/* Mobile Back Button */}
      {showMobileBackButton && (
        <div className="lg:hidden pb-2 border-b border-zinc-800">
          <Link
            to="/recipes"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
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
            <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
              {recipe.brewMethod}
            </span>
            {isCustom ? (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono uppercase tracking-wider bg-accent/10 text-accent border border-accent/30">
                Custom
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                Official Preset
              </span>
            )}
            {recipe.author && (
              <span className="text-xs text-zinc-400 font-mono">by {recipe.author}</span>
            )}
          </div>

          <h3 className="text-2xl font-bold text-zinc-100 mt-2">{recipe.name}</h3>
          <p className="text-sm text-zinc-400 mt-1 max-w-xl">
            {recipe.description || 'No description provided.'}
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {isCustom && onDeleteRecipe && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-zinc-800 border border-transparent hover:border-red-500/30 transition-colors cursor-pointer"
              title="Delete Recipe"
              aria-label={`Delete custom recipe ${recipe.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectRecipeForTimer(scaledRecipe)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold transition-all cursor-pointer text-sm shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Brew with this Recipe</span>
          </button>
        </div>
      </div>

      {/* Dose Rescaler Slider */}
      <div className="p-4 rounded-xl bg-panel-recessed border border-border-subtle space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-medium font-mono uppercase tracking-wider text-[11px]">Coffee Dose</span>
          <span className="text-zinc-100 font-light text-lg tabular-nums">
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
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent focus:outline-none"
        />
        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
          <span>10g</span>
          <span>Single cup (15-18g)</span>
          <span>Server (30g)</span>
          <span>60g</span>
        </div>
      </div>

      {/* Specifications Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-panel border border-border-subtle flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-panel-recessed text-accent border border-border-subtle">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-medium">Total Water</div>
            <div className="text-base font-light text-zinc-100 tabular-nums">
              {scaledRecipe.waterAmountGrams}g
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-panel border border-border-subtle flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-panel-recessed text-accent border border-border-subtle">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-medium">Brew Ratio</div>
            <div className="text-base font-light text-zinc-100 tabular-nums">
              1:{recipe.ratio}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-panel border border-border-subtle flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-panel-recessed text-accent border border-border-subtle">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-medium">Target Time</div>
            <div className="text-base font-light text-zinc-100 tabular-nums">
              {`${Math.floor(recipe.totalTimeSeconds / 60)}m ${(recipe.totalTimeSeconds % 60).toString().padStart(2, '0')}s`}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-panel border border-border-subtle flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-panel-recessed text-accent border border-border-subtle">
            <Thermometer className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-medium">Water Temp</div>
            <div className="text-base font-light text-zinc-100 tabular-nums">
              {recipe.waterTempCelsius ? `${recipe.waterTempCelsius}°C` : '93-96°C'}
            </div>
          </div>
        </div>
      </div>

      {/* Steps Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-zinc-200">Brew Steps</h4>
        <div className="space-y-2.5">
          {stages.map((step, idx) => {
            const stepAny = step as unknown as { title?: string; targetWeightGrams?: number; description?: string };
            const title = step.name || stepAny.title;
            const targetWeight = step.targetWaterWeightGrams !== undefined ? step.targetWaterWeightGrams : stepAny.targetWeightGrams;
            const description = step.instruction || stepAny.description;

            return (
              <div
                key={step.id || idx}
                className="p-3.5 rounded-xl bg-panel-recessed border border-border-subtle flex items-start space-x-3"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono font-bold shrink-0 border border-zinc-700">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-200">{title}</span>
                    <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400 shrink-0">
                      {targetWeight !== undefined && (
                        <span className="text-zinc-100 font-light text-sm tabular-nums">
                          {targetWeight}g
                        </span>
                      )}
                      <span>{step.durationSeconds}s</span>
                    </div>
                  </div>
                  {description && (
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Custom Recipe?"
        message={
          <>
            Are you sure you want to delete{' '}
            <strong className="text-zinc-200">"{recipe.name}"</strong>? This action
            cannot be undone.
          </>
        }
        confirmLabel="Delete Recipe"
        variant="danger"
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          setIsDeleteModalOpen(false);
          onDeleteRecipe?.(recipe);
        }}
      />
    </div>
  );
};
