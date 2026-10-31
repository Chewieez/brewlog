import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  BrewRecipe,
  rescaleRecipeDose,
  Equipment,
  DEFAULT_USER_SETTINGS,
  formatWeight,
  formatTemperature,
} from '@brewlog/core';
import {
  Play,
  BookOpen,
  Clock,
  Droplets,
  Thermometer,
  Trash2,
  Pencil,
  ArrowLeft,
} from 'lucide-react';
import { ConfirmationModal } from '../../components/shared/ConfirmationModal';
import { useEquipment } from '../equipment/useEquipment';
import { useOptionalSettings } from '../settings/SettingsContext';

export interface RecipeDetailPaneProps {
  recipe: BrewRecipe;
  onSelectRecipeForTimer: (recipe: BrewRecipe) => void;
  onEditRecipe?: (recipe: BrewRecipe) => void;
  onDeleteRecipe?: (recipe: BrewRecipe) => void;
  showMobileBackButton?: boolean;
  equipment?: Equipment[];
}

export const RecipeDetailPane: React.FC<RecipeDetailPaneProps> = ({
  recipe,
  onSelectRecipeForTimer,
  onEditRecipe,
  onDeleteRecipe,
  showMobileBackButton = false,
  equipment: propEquipment,
}) => {
  const { equipment: contextEquipment = [] } = useEquipment();
  const equipment = propEquipment ?? contextEquipment;
  const settingsContext = useOptionalSettings();
  const settings = settingsContext?.settings ?? DEFAULT_USER_SETTINGS;

  const [customDose, setCustomDose] = useState<number>(Math.round(recipe.coffeeDoseGrams));
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Filter recipe.grinderSettings against active equipment grinders
  const userGrinders = equipment.filter((e) => e.type === 'grinder');
  const activeGrinderSettings = (recipe.grinderSettings || []).flatMap((setting) => {
    const grinder = userGrinders.find((g) => g.id === setting.grinderId);
    if (!grinder) return [];
    return [{ setting, grinder }];
  });

  // Sync dose when recipe changes
  useEffect(() => {
    setCustomDose(Math.round(recipe.coffeeDoseGrams));
  }, [recipe.id, recipe.coffeeDoseGrams]);

  const scaledRecipe = rescaleRecipeDose(recipe, customDose);
  const isCustom = !recipe.isPreset && !recipe.id.startsWith('preset-');
  const stages = scaledRecipe.stages || (scaledRecipe as unknown as { steps: typeof scaledRecipe.stages }).steps || [];

  const minDose = Math.min(10, Math.floor(recipe.coffeeDoseGrams));
  const maxDose = Math.max(60, Math.ceil(recipe.coffeeDoseGrams));
  const scaleMarks = minDose === 10 && maxDose === 60
    ? [10, 20, 30, 40, 50, 60]
    : [
        minDose,
        Math.round(minDose + (maxDose - minDose) * 0.2),
        Math.round(minDose + (maxDose - minDose) * 0.4),
        Math.round(minDose + (maxDose - minDose) * 0.6),
        Math.round(minDose + (maxDose - minDose) * 0.8),
        maxDose,
      ];

  return (
    <div className="p-6 rounded-2xl bg-panel border border-border-subtle space-y-6">
      {/* Mobile Back Button */}
      {showMobileBackButton && (
        <div className="lg:hidden pb-2 border-b border-border-subtle">
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
            <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono uppercase tracking-wider bg-panel-recessed text-text-secondary">
              {recipe.brewMethod}
            </span>
            {isCustom ? (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono uppercase tracking-wider bg-accent/15 text-accent">
                Custom
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono uppercase tracking-wider bg-panel-recessed text-text-muted">
                Official Preset
              </span>
            )}
            {recipe.author && (
              <span className="text-xs text-text-muted font-mono">by {recipe.author}</span>
            )}
          </div>

          <h3 className="text-2xl font-bold text-text-primary mt-2">{recipe.name}</h3>
          <p className="text-sm text-text-muted mt-1 max-w-xl">
            {recipe.description || 'No description provided.'}
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {isCustom && onEditRecipe && (
            <button
              type="button"
              onClick={() => onEditRecipe(recipe)}
              className="w-8 h-8 rounded-lg btn-tactile-secondary text-text-muted hover:text-text-primary transition-colors cursor-pointer border-0 inline-flex items-center justify-center flex-shrink-0"
              title="Edit Recipe"
              aria-label={`Edit custom recipe ${recipe.name}`}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}

          {isCustom && onDeleteRecipe && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-8 h-8 rounded-lg btn-tactile-secondary text-text-muted hover:text-red-400 transition-colors cursor-pointer border-0 inline-flex items-center justify-center flex-shrink-0"
              title="Delete Recipe"
              aria-label={`Delete custom recipe ${recipe.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectRecipeForTimer(scaledRecipe)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl btn-tactile-primary font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer border-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>BREW WITH THIS RECIPE</span>
          </button>
        </div>
      </div>

      {/* Dose Rescaler Slider */}
      <div className="p-4 rounded-xl bg-panel-recessed border border-border-subtle space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted font-medium font-mono uppercase tracking-wider text-[11px]">Coffee Dose</span>
          <div className="flex items-center space-x-2">
            {customDose !== recipe.coffeeDoseGrams && (
              <button
                type="button"
                onClick={() => setCustomDose(recipe.coffeeDoseGrams)}
                className="text-[10px] font-mono text-accent hover:underline cursor-pointer"
              >
                Reset ({formatWeight(recipe.coffeeDoseGrams, settings.weightUnit)})
              </button>
            )}
            <span className="text-text-primary font-light text-lg tabular-nums">
              {formatWeight(customDose, settings.weightUnit)}
            </span>
          </div>
        </div>
        <input
          type="range"
          aria-label="Coffee Dose"
          min={minDose}
          max={maxDose}
          step={1}
          value={customDose}
          onChange={(e) => setCustomDose(Math.round(parseFloat(e.target.value)))}
          className="w-full h-2 bg-panel-recessed rounded-lg appearance-none cursor-pointer accent-accent focus:outline-none"
        />
        {/* Linear scale marks matching min and max with 20% intervals */}
        <div className="flex justify-between text-[10px] text-text-muted tabular-nums px-0.5">
          {scaleMarks.map((mark, i) => (
            <span key={i}>{mark}g</span>
          ))}
        </div>

        {/* Quick Dose Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-mono text-text-muted uppercase mr-1">Presets:</span>
          {[
            { label: 'Single (15g)', dose: 15 },
            { label: 'Standard (18g)', dose: 18 },
            { label: 'Server (30g)', dose: 30 },
            { label: 'Batch (45g)', dose: 45 },
          ].map(({ label, dose }) => {
            const isActive = customDose === dose;
            return (
              <button
                key={dose}
                type="button"
                onClick={() => setCustomDose(dose)}
                className={`px-2.5 py-1 rounded-md text-[11px] tabular-nums font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'border border-accent text-accent shadow-xs'
                    : 'bg-panel-recessed text-text-secondary border border-border-subtle hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Specifications Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-panel border border-border-subtle flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-[10px] text-text-secondary uppercase font-mono tracking-wider font-medium truncate">
              Total Water
            </span>
            <div className="p-1 rounded bg-panel-recessed text-accent border border-border-subtle shrink-0">
              <Droplets className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-light text-text-primary tabular-nums">
            {formatWeight(scaledRecipe.waterAmountGrams, settings.weightUnit)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-panel border border-border-subtle flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-[10px] text-text-secondary uppercase font-mono tracking-wider font-medium truncate">
              Brew Ratio
            </span>
            <div className="p-1 rounded bg-panel-recessed text-accent border border-border-subtle shrink-0">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-light text-text-primary tabular-nums">
            1:{recipe.ratio}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-panel border border-border-subtle flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-[10px] text-text-secondary uppercase font-mono tracking-wider font-medium truncate">
              Target Time
            </span>
            <div className="p-1 rounded bg-panel-recessed text-accent border border-border-subtle shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-light text-text-primary tabular-nums">
            {`${Math.floor(recipe.totalTimeSeconds / 60)}m ${(recipe.totalTimeSeconds % 60).toString().padStart(2, '0')}s`}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-panel border border-border-subtle flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-[10px] text-text-secondary uppercase font-mono tracking-wider font-medium truncate">
              Water Temp
            </span>
            <div className="p-1 rounded bg-panel-recessed text-accent border border-border-subtle shrink-0">
              <Thermometer className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-light text-text-primary tabular-nums">
            {recipe.waterTempCelsius
              ? formatTemperature(recipe.waterTempCelsius, settings.temperatureUnit)
              : (settings.temperatureUnit === 'fahrenheit' ? '200-205°F' : '93-96°C')}
          </div>
        </div>
      </div>

      {/* Grinder Settings Section */}
      <div className="p-4 rounded-xl bg-panel-recessed border border-border-subtle space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium font-mono uppercase tracking-wider text-text-secondary">
            Grinder Settings
          </span>
        </div>

        {activeGrinderSettings.length > 0 ? (
          <div className="space-y-2">
            {activeGrinderSettings.map(({ setting, grinder }, index) => (
              <div
                key={setting.grinderId}
                className="flex items-center justify-between p-2.5 rounded-lg bg-panel border border-border-subtle text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-text-primary font-medium">
                    {grinder.brand} {grinder.model} — {setting.setting || recipe.grindSize}
                  </span>
                  {index === 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-accent/15 text-accent">
                      Primary
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-text-secondary">
            <span className="text-text-muted">Grind Size: </span>
            <span className="font-medium text-text-primary">{recipe.grindSize}</span>
          </div>
        )}
      </div>

      {/* Steps Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-text-primary">Brew Steps</h4>
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
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-panel text-text-secondary text-xs tabular-nums font-bold shrink-0 shadow-xs">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-text-primary">{title}</span>
                    <div className="flex items-center space-x-2 text-xs tabular-nums text-text-muted shrink-0">
                      {targetWeight !== undefined && (
                        <span className="text-text-primary font-light text-sm tabular-nums">
                          {targetWeight}g
                        </span>
                      )}
                      <span>{step.durationSeconds}s</span>
                    </div>
                  </div>
                  {description && (
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
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
            <strong className="text-text-primary">"{recipe.name}"</strong>? This action
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
