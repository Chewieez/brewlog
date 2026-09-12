import React, { useState, useEffect } from "react";
import {
  BrewRecipe,
  BrewStage,
  BrewMethodType,
  StageType,
  calculateWaterAmount,
  calculateRatio,
} from "@brewlog/core";
import { useAuth } from "../auth/AuthContext";
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlertCircle,
  Clock,
  Droplets,
  Coffee,
} from "lucide-react";

interface RecipeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRecipe: (recipe: Omit<BrewRecipe, "id" | "createdAt">) => Promise<void> | void;
}

const BREW_METHODS: { value: BrewMethodType; label: string }[] = [
  { value: "v60", label: "Hario V60" },
  { value: "aeropress", label: "AeroPress" },
  { value: "chemex", label: "Chemex" },
  { value: "french-press", label: "French Press" },
  { value: "flair", label: "Flair / Manual Espresso" },
  { value: "espresso", label: "Commercial Espresso" },
  { value: "kalita-wave", label: "Kalita Wave" },
  { value: "origami", label: "Origami Dripper" },
  { value: "clever-dripper", label: "Clever Dripper" },
  { value: "moka-pot", label: "Moka Pot" },
  { value: "cold-brew", label: "Cold Brew" },
  { value: "custom", label: "Custom Method" },
];

const STAGE_TYPES: { value: StageType; label: string }[] = [
  { value: "bloom", label: "Bloom" },
  { value: "pour", label: "Pour" },
  { value: "agitation", label: "Agitation / Stir" },
  { value: "drawdown", label: "Drawdown" },
  { value: "press", label: "Press / Plunge" },
  { value: "other", label: "Other" },
];

const DEFAULT_STAGES: BrewStage[] = [
  {
    id: "stage-1",
    name: "Bloom",
    stageType: "bloom",
    startSecond: 0,
    durationSeconds: 45,
    targetWaterWeightGrams: 50,
    instruction: "Pour 50g water and swirl gently to saturate grounds completely.",
  },
  {
    id: "stage-2",
    name: "Main Pour",
    stageType: "pour",
    startSecond: 45,
    durationSeconds: 45,
    targetWaterWeightGrams: 250,
    instruction: "Pour steadily in gentle spiral circles from center outward.",
  },
  {
    id: "stage-3",
    name: "Drawdown",
    stageType: "drawdown",
    startSecond: 90,
    durationSeconds: 60,
    targetWaterWeightGrams: 250,
    instruction: "Give one gentle swirl and allow the bed to drain completely flat.",
  },
];

const recalculateTiming = (stagesList: BrewStage[]): BrewStage[] => {
  let currentStart = 0;
  return stagesList.map((st) => {
    const duration = Math.max(0, Number(st.durationSeconds) || 0);
    const updated = {
      ...st,
      startSecond: currentStart,
      durationSeconds: duration,
    };
    currentStart += duration;
    return updated;
  });
};

export const RecipeBuilderModal: React.FC<RecipeBuilderModalProps> = ({
  isOpen,
  onClose,
  onSaveRecipe,
}) => {
  const { user } = useAuth();

  // Form State
  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [brewMethod, setBrewMethod] = useState<BrewMethodType>("v60");
  const [grindSize, setGrindSize] = useState("Medium-Fine (20 clicks)");
  const [waterTempCelsius, setWaterTempCelsius] = useState(93);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Dose & Ratio
  const [coffeeDoseGrams, setCoffeeDoseGrams] = useState(15);
  const [ratio, setRatio] = useState(16.67);
  const [waterAmountGrams, setWaterAmountGrams] = useState(250);

  // Stages
  const [stages, setStages] = useState<BrewStage[]>(DEFAULT_STAGES);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize author on open
  useEffect(() => {
    if (isOpen) {
      const defaultAuthor =
        user?.user_metadata?.display_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "";
      if (defaultAuthor && !author) {
        setAuthor(defaultAuthor);
      }
    }
  }, [isOpen, user, author]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Dose & Ratio updates
  const handleDoseChange = (newDose: number) => {
    setCoffeeDoseGrams(newDose);
    if (ratio > 0) {
      setWaterAmountGrams(calculateWaterAmount(newDose, ratio));
    }
  };

  const handleRatioChange = (newRatio: number) => {
    setRatio(newRatio);
    if (coffeeDoseGrams > 0) {
      setWaterAmountGrams(calculateWaterAmount(coffeeDoseGrams, newRatio));
    }
  };

  const handleWaterChange = (newWater: number) => {
    setWaterAmountGrams(newWater);
    if (coffeeDoseGrams > 0) {
      setRatio(calculateRatio(coffeeDoseGrams, newWater));
    }
  };

  // Stage Manipulation
  const handleUpdateStage = (
    index: number,
    field: keyof BrewStage,
    value: any
  ) => {
    const updated = [...stages];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setStages(recalculateTiming(updated));
  };

  const handleAddStage = () => {
    const lastStage = stages[stages.length - 1];
    const newStage: BrewStage = {
      id: `stage-${Date.now()}`,
      name: "Pour",
      stageType: "pour",
      startSecond: lastStage
        ? lastStage.startSecond + lastStage.durationSeconds
        : 0,
      durationSeconds: 30,
      targetWaterWeightGrams: waterAmountGrams,
      instruction: "Pour steadily up to target water weight.",
    };
    setStages(recalculateTiming([...stages, newStage]));
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) return;
    const filtered = stages.filter((_, i) => i !== index);
    setStages(recalculateTiming(filtered));
  };

  const handleMoveStage = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const reordered = [...stages];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    setStages(recalculateTiming(reordered));
  };

  const totalTimeSeconds = stages.reduce(
    (acc, stage) => acc + (Number(stage.durationSeconds) || 0),
    0
  );

  const lastStage = stages[stages.length - 1];
  const hasWaterMismatch =
    lastStage &&
    waterAmountGrams > 0 &&
    Number(lastStage.targetWaterWeightGrams) !== Number(waterAmountGrams);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError("Recipe name is required.");
      return;
    }

    if (coffeeDoseGrams <= 0) {
      setValidationError("Coffee dose must be greater than 0g.");
      return;
    }

    if (waterAmountGrams <= 0) {
      setValidationError("Water amount must be greater than 0g.");
      return;
    }

    if (stages.length === 0) {
      setValidationError("At least one brew stage is required.");
      return;
    }

    setIsSaving(true);
    try {
      await onSaveRecipe({
        name: name.trim(),
        author: author.trim() || undefined,
        brewMethod,
        coffeeDoseGrams,
        waterAmountGrams,
        ratio,
        grindSize: grindSize.trim() || "Medium",
        waterTempCelsius,
        totalTimeSeconds,
        description: description.trim() || "",
        notes: notes.trim() || undefined,
        stages,
        isPreset: false,
        isFavorite: false,
      });
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || "Failed to save recipe.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-builder-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl my-8 p-6 sm:p-8 rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="recipe-builder-title"
                className="text-xl font-bold tracking-tight text-stone-100"
              >
                Custom Recipe Studio
              </h2>
              <p className="text-xs text-stone-400">
                Design custom brew profiles with multi-stage pour timelines.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {validationError && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Metadata */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <Coffee className="w-4 h-4" />
              <span>Recipe Profile & Gear</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="recipe-name"
                  className="block text-xs font-medium text-stone-300 mb-1"
                >
                  Recipe Name *
                </label>
                <input
                  id="recipe-name"
                  type="text"
                  required
                  placeholder="e.g. Lance Hedrick 1-2-1 V60"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="recipe-author"
                  className="block text-xs font-medium text-stone-300 mb-1"
                >
                  Author / Barista Tag
                </label>
                <input
                  id="recipe-author"
                  type="text"
                  placeholder="e.g. James Hoffmann, or your name"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="recipe-brew-method"
                  className="block text-xs font-medium text-stone-300 mb-1"
                >
                  Brew Method
                </label>
                <select
                  id="recipe-brew-method"
                  value={brewMethod}
                  onChange={(e) => setBrewMethod(e.target.value as BrewMethodType)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500 text-sm cursor-pointer"
                >
                  {BREW_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="recipe-grind-size"
                  className="block text-xs font-medium text-stone-300 mb-1"
                >
                  Grind Setting
                </label>
                <input
                  id="recipe-grind-size"
                  type="text"
                  placeholder="e.g. 24 clicks / Ode 4.1"
                  value={grindSize}
                  onChange={(e) => setGrindSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="recipe-water-temp"
                  className="block text-xs font-medium text-stone-300 mb-1"
                >
                  Water Temp (°C)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="recipe-water-temp"
                    type="number"
                    min="50"
                    max="100"
                    step="1"
                    value={waterTempCelsius}
                    onChange={(e) => setWaterTempCelsius(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500 text-sm"
                  />
                  <span className="text-xs text-stone-400">°C</span>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="recipe-description"
                className="block text-xs font-medium text-stone-300 mb-1"
              >
                Description / Profile Notes
              </label>
              <textarea
                id="recipe-description"
                rows={2}
                placeholder="High clarity technique emphasizing bright floral acidity and clean finish..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>
          </div>

          {/* Section 2: Dose & Ratio Calculator */}
          <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800/80 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <Droplets className="w-4 h-4" />
              <span>Dose, Ratio & Water Calculator</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="recipe-dose"
                  className="block text-[11px] text-stone-400 mb-1"
                >
                  Coffee Dose (g)
                </label>
                <input
                  id="recipe-dose"
                  type="number"
                  min="5"
                  max="120"
                  step="0.5"
                  value={coffeeDoseGrams}
                  onChange={(e) => handleDoseChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-amber-300 font-bold focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="recipe-ratio"
                  className="block text-[11px] text-stone-400 mb-1"
                >
                  Brew Ratio (1 : X)
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-stone-400">1:</span>
                  <input
                    id="recipe-ratio"
                    type="number"
                    min="1"
                    max="30"
                    step="0.1"
                    value={ratio}
                    onChange={(e) => handleRatioChange(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 font-bold focus:outline-none focus:border-amber-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="recipe-water-amount"
                  className="block text-[11px] text-stone-400 mb-1"
                >
                  Target Water (g)
                </label>
                <input
                  id="recipe-water-amount"
                  type="number"
                  min="50"
                  max="2000"
                  step="1"
                  value={waterAmountGrams}
                  onChange={(e) => handleWaterChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-amber-300 font-bold focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-400 pt-1 border-t border-stone-800/60 font-mono">
              <span>
                Computed Brew Ratio: 1:{ratio} ({coffeeDoseGrams}g : {waterAmountGrams}g)
              </span>
              <span className="flex items-center space-x-1 text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Est. Total Time: {Math.floor(totalTimeSeconds / 60)}m{" "}
                  {totalTimeSeconds % 60}s
                </span>
              </span>
            </div>
          </div>

          {/* Section 3: Multi-Stage Pour Timeline Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <Clock className="w-4 h-4" />
                <span>Multi-Stage Pour Timeline ({stages.length} stages)</span>
              </h3>

              <button
                type="button"
                onClick={handleAddStage}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stage</span>
              </button>
            </div>

            {hasWaterMismatch && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Notice: Final stage water target ({lastStage?.targetWaterWeightGrams}g)
                  does not equal total recipe water ({waterAmountGrams}g).
                </span>
              </div>
            )}

            <div className="space-y-3">
              {stages.map((stage, index) => (
                <div
                  key={stage.id || index}
                  className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-3 relative group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center border border-amber-500/30 font-mono">
                        {index + 1}
                      </span>
                      <input
                        id={`stage-name-${index}`}
                        aria-label={`Stage ${index + 1} Name`}
                        type="text"
                        placeholder="Stage Name"
                        value={stage.name}
                        onChange={(e) =>
                          handleUpdateStage(index, "name", e.target.value)
                        }
                        className="font-bold text-sm text-stone-100 bg-transparent border-b border-stone-700 focus:border-amber-500 focus:outline-none px-1"
                      />
                    </div>

                    <div className="flex items-center space-x-1 self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveStage(index, "up")}
                        className="p-1 rounded text-stone-400 hover:text-stone-200 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                        aria-label={`Move stage ${index + 1} up`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === stages.length - 1}
                        onClick={() => handleMoveStage(index, "down")}
                        className="p-1 rounded text-stone-400 hover:text-stone-200 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                        aria-label={`Move stage ${index + 1} down`}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={stages.length <= 1}
                        onClick={() => handleRemoveStage(index)}
                        className="p-1 rounded text-red-400 hover:text-red-300 disabled:opacity-30 cursor-pointer"
                        title="Remove Stage"
                        aria-label={`Remove stage ${index + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor={`stage-type-${index}`}
                        className="block text-[11px] text-stone-400 mb-1"
                      >
                        Stage Type
                      </label>
                      <select
                        id={`stage-type-${index}`}
                        value={stage.stageType}
                        onChange={(e) =>
                          handleUpdateStage(index, "stageType", e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-200 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        {STAGE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor={`stage-duration-${index}`}
                        className="block text-[11px] text-stone-400 mb-1"
                      >
                        Duration (seconds)
                      </label>
                      <input
                        id={`stage-duration-${index}`}
                        type="number"
                        min="1"
                        max="600"
                        value={stage.durationSeconds}
                        onChange={(e) =>
                          handleUpdateStage(
                            index,
                            "durationSeconds",
                            Number(e.target.value)
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-200 text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`stage-water-${index}`}
                        className="block text-[11px] text-stone-400 mb-1"
                      >
                        Cumulative Water Target (g)
                      </label>
                      <input
                        id={`stage-water-${index}`}
                        type="number"
                        min="0"
                        max="3000"
                        value={stage.targetWaterWeightGrams}
                        onChange={(e) =>
                          handleUpdateStage(
                            index,
                            "targetWaterWeightGrams",
                            Number(e.target.value)
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-amber-300 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor={`stage-instruction-${index}`}
                      className="block text-[11px] text-stone-400 mb-1"
                    >
                      Barista Cues / Instructions
                    </label>
                    <input
                      id={`stage-instruction-${index}`}
                      type="text"
                      placeholder="e.g. Pour in concentric circles; pause at 45s"
                      value={stage.instruction}
                      onChange={(e) =>
                        handleUpdateStage(index, "instruction", e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="text-[11px] text-stone-500 font-mono flex items-center justify-between pt-1">
                    <span>
                      Timeline Window: {Math.floor(stage.startSecond / 60)}:
                      {String(stage.startSecond % 60).padStart(2, "0")} –{" "}
                      {Math.floor((stage.startSecond + stage.durationSeconds) / 60)}:
                      {String((stage.startSecond + stage.durationSeconds) % 60).padStart(2, "0")}
                    </span>
                    <span>Target: {stage.targetWaterWeightGrams}g</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              onClick={handleSubmit}
              className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-sm shadow-md shadow-amber-500/20 transition-all flex items-center space-x-2 cursor-pointer"
            >
              {isSaving ? (
                <span>Saving Profile...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save Recipe</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

