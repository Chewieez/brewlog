import React, { useState, useEffect } from "react";
import {
  BrewRecipe,
  BrewStage,
  BrewMethodType,
  StageType,
  calculateWaterAmount,
  calculateRatio,
  RecipeGrinderSetting,
  GrinderSettingScale,
  Equipment,
} from "@brewlog/core";
import { useAuth } from "../auth/AuthContext";
import { useEquipment } from "../equipment/useEquipment";
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
  initialRecipe?: BrewRecipe | null;
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
  initialRecipe,
}) => {
  const { user } = useAuth();
  const { equipment, addEquipment } = useEquipment();
  const [locallyAddedGrinders, setLocallyAddedGrinders] = useState<Equipment[]>([]);

  // Filter grinders
  const userGrinders = [
    ...equipment.filter((e) => e.type === "grinder"),
    ...locallyAddedGrinders.filter((lg) => !equipment.some((e) => e.id === lg.id)),
  ];

  // Grinder settings state
  const [grinderSettings, setGrinderSettings] = useState<RecipeGrinderSetting[]>([]);

  // Inline grinder creation state
  const [isAddingInlineGrinder, setIsAddingInlineGrinder] = useState(false);
  const [inlineBrand, setInlineBrand] = useState("");
  const [inlineModel, setInlineModel] = useState("");
  const [inlineScale, setInlineScale] = useState<GrinderSettingScale>("stepped-numbers");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isCreatingGrinder, setIsCreatingGrinder] = useState(false);

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

  // Initialize or populate form on open / initialRecipe change
  useEffect(() => {
    if (isOpen) {
      setValidationError(null);
      setIsAddingInlineGrinder(false);
      setInlineBrand("");
      setInlineModel("");
      setInlineScale("stepped-numbers");
      setInlineError(null);

      const availableGrinders = [
        ...equipment.filter((e) => e.type === "grinder"),
        ...locallyAddedGrinders.filter((lg) => !equipment.some((e) => e.id === lg.id)),
      ];

      if (initialRecipe) {
        setName(initialRecipe.name || "");
        setAuthor(initialRecipe.author || "");
        setBrewMethod(initialRecipe.brewMethod || "v60");
        setGrindSize(initialRecipe.grindSize || "Medium");
        setWaterTempCelsius(initialRecipe.waterTempCelsius || 93);
        setDescription(initialRecipe.description || "");
        setNotes(initialRecipe.notes || "");
        setCoffeeDoseGrams(initialRecipe.coffeeDoseGrams || 15);
        setRatio(initialRecipe.ratio || 16.67);
        setWaterAmountGrams(initialRecipe.waterAmountGrams || 250);
        setStages(
          initialRecipe.stages && initialRecipe.stages.length > 0
            ? initialRecipe.stages
            : DEFAULT_STAGES
        );
        // Filter against existing user grinders so erased grinders are excluded
        const validSettings = (initialRecipe.grinderSettings || []).filter((gs) =>
          availableGrinders.some((g) => g.id === gs.grinderId)
        );
        if (validSettings.length > 0) {
          setGrinderSettings(validSettings);
        } else if (
          initialRecipe.recommendedGrinderId &&
          availableGrinders.some((g) => g.id === initialRecipe.recommendedGrinderId)
        ) {
          setGrinderSettings([
            {
              grinderId: initialRecipe.recommendedGrinderId,
              setting: initialRecipe.grindSize || "",
            },
          ]);
        } else {
          setGrinderSettings([]);
        }
      } else {
        setName("");
        const defaultAuthor =
          user?.user_metadata?.display_name ||
          user?.user_metadata?.name ||
          user?.email?.split("@")[0] ||
          "";
        setAuthor(defaultAuthor);
        setBrewMethod("v60");
        setGrindSize("Medium-Fine (20 clicks)");
        setWaterTempCelsius(93);
        setDescription("");
        setNotes("");
        setCoffeeDoseGrams(15);
        setRatio(16.67);
        setWaterAmountGrams(250);
        setStages(DEFAULT_STAGES);

        if (availableGrinders.length > 0) {
          setGrinderSettings([{ grinderId: availableGrinders[0].id, setting: "" }]);
        } else {
          setGrinderSettings([]);
        }
      }
    }
  }, [isOpen, initialRecipe?.id]);

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

  const handleSaveInlineGrinder = async () => {
    if (!inlineBrand.trim() || !inlineModel.trim()) {
      setInlineError("Please enter both brand and model for the grinder.");
      return;
    }
    setInlineError(null);
    setIsCreatingGrinder(true);
    try {
      const created = await addEquipment({
        type: "grinder",
        brand: inlineBrand.trim(),
        model: inlineModel.trim(),
        settingScaleType: inlineScale,
      });
      setLocallyAddedGrinders((prev) => [...prev, created]);
      setGrinderSettings([{ grinderId: created.id, setting: "" }]);
      setIsAddingInlineGrinder(false);
      setInlineBrand("");
      setInlineModel("");
      setInlineScale("stepped-numbers");
    } catch (err: any) {
      setInlineError(err?.message || "Failed to add grinder.");
    } finally {
      setIsCreatingGrinder(false);
    }
  };

  const handleAddGrinderSetting = () => {
    if (userGrinders.length === 0) return;
    const unselected = userGrinders.find(
      (g) => !grinderSettings.some((gs) => gs.grinderId === g.id)
    );
    if (!unselected) return;
    setGrinderSettings((prev) => [
      ...prev,
      { grinderId: unselected.id, setting: "" },
    ]);
  };

  const handleUpdateGrinderSetting = (
    index: number,
    field: keyof RecipeGrinderSetting,
    value: string
  ) => {
    setGrinderSettings((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleRemoveGrinderSetting = (index: number) => {
    setGrinderSettings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetPrimaryGrinder = (index: number) => {
    if (index <= 0 || index >= grinderSettings.length) return;
    setGrinderSettings((prev) => {
      const selected = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [selected, ...rest];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
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
        grinderSettings: grinderSettings.map((s) => ({
          grinderId: s.grinderId,
          setting: s.setting.trim(),
        })),
        recommendedGrinderId: grinderSettings[0]?.grinderId || undefined,
        isPreset: initialRecipe ? initialRecipe.isPreset : false,
        isFavorite: initialRecipe ? initialRecipe.isFavorite : false,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-builder-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl my-8 p-6 sm:p-8 rounded-xl bg-panel border border-border-subtle shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-panel-recessed border border-border-subtle text-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="recipe-builder-title"
                className="text-xl font-bold tracking-tight text-text-primary"
              >
                {initialRecipe ? "Edit Recipe" : "Create New Custom Recipe"}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {initialRecipe
                  ? "Update brew parameters, ratio, and multi-stage pour timeline."
                  : "Design custom brew profiles with multi-stage pour timelines."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-panel-recessed transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {validationError && (
          <div className="p-3.5 rounded bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Metadata */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center space-x-1.5">
              <Coffee className="w-4 h-4" />
              <span>Recipe Profile & Gear</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="recipe-name"
                  className="block text-xs font-medium text-text-secondary mb-1.5"
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
                  className="w-full px-3 py-2 rounded bg-panel-recessed border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="recipe-author"
                  className="block text-xs font-medium text-text-secondary mb-1.5"
                >
                  Author / Barista Tag
                </label>
                <input
                  id="recipe-author"
                  type="text"
                  placeholder="e.g. James Hoffmann, or your name"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-panel-recessed border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="recipe-brew-method"
                  className="block text-xs font-medium text-text-secondary mb-1.5"
                >
                  Brew Method
                </label>
                <select
                  id="recipe-brew-method"
                  value={brewMethod}
                  onChange={(e) => setBrewMethod(e.target.value as BrewMethodType)}
                  className="w-full px-3 py-2 rounded bg-panel-recessed border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-accent transition-colors cursor-pointer"
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
                  className="block text-xs font-medium text-text-secondary mb-1.5"
                >
                  Grind Setting
                </label>
                <input
                  id="recipe-grind-size"
                  type="text"
                  placeholder="e.g. 24 clicks / Ode 4.1"
                  value={grindSize}
                  onChange={(e) => setGrindSize(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-panel-recessed border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="recipe-water-temp"
                  className="block text-xs font-medium text-text-secondary mb-1.5"
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
                    className="w-full px-3 py-2 rounded bg-panel-recessed border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                  <span className="text-xs text-text-muted">°C</span>
                </div>
              </div>
            </div>

            {/* Grinder Settings Section */}
            <div className="space-y-3 pt-2 border-t border-border-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Grinder Dial Settings
                  </h4>
                </div>
                {userGrinders.length > 0 &&
                  grinderSettings.length > 0 &&
                  grinderSettings.length < userGrinders.length && (
                    <button
                      type="button"
                      onClick={handleAddGrinderSetting}
                      aria-label="Add another grinder"
                      className="flex items-center space-x-1 px-2.5 py-1 rounded bg-panel-recessed hover:bg-panel text-accent font-mono text-xs uppercase tracking-wider font-semibold border border-accent transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ADD</span>
                    </button>
                  )}
              </div>

              {/* Case A: userGrinders.length === 0 */}
              {userGrinders.length === 0 && (
                <div className="p-4 rounded-lg bg-panel-recessed border border-border-subtle space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-text-secondary">
                        No grinders found in your equipment. Add your grinder to save specific dial settings.
                      </p>
                    </div>
                    {!isAddingInlineGrinder && (
                      <button
                        type="button"
                        onClick={() => setIsAddingInlineGrinder(true)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded bg-panel-recessed hover:bg-panel text-accent font-mono text-xs uppercase tracking-wider font-semibold border border-accent transition-colors cursor-pointer self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ADD GRINDER</span>
                      </button>
                    )}
                  </div>

                  {isAddingInlineGrinder && (
                    <div className="pt-3 border-t border-border-subtle space-y-3">
                      {inlineError && (
                        <div className="p-2 rounded bg-red-500/10 border border-red-500/25 text-red-300 text-xs">
                          {inlineError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor="inline-grinder-brand"
                            className="block text-[11px] font-medium text-text-secondary mb-1"
                          >
                            Grinder Brand *
                          </label>
                          <input
                            id="inline-grinder-brand"
                            type="text"
                            placeholder="e.g. Comandante, Fellow"
                            value={inlineBrand}
                            onChange={(e) => setInlineBrand(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded bg-panel border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent transition-colors"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="inline-grinder-model"
                            className="block text-[11px] font-medium text-text-secondary mb-1"
                          >
                            Grinder Model *
                          </label>
                          <input
                            id="inline-grinder-model"
                            type="text"
                            placeholder="e.g. C40 MK4, Ode Gen 2"
                            value={inlineModel}
                            onChange={(e) => setInlineModel(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded bg-panel border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent transition-colors"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="inline-grinder-scale"
                            className="block text-[11px] font-medium text-text-secondary mb-1"
                          >
                            Dial Format / Setting Scale
                          </label>
                          <select
                            id="inline-grinder-scale"
                            value={inlineScale}
                            onChange={(e) => setInlineScale(e.target.value as GrinderSettingScale)}
                            className="w-full px-2.5 py-1.5 rounded bg-panel border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent transition-colors cursor-pointer"
                          >
                            <option value="stepped-numbers">Stepped Numbers (e.g. 4.1, 5.2)</option>
                            <option value="clicks">Clicks from Zero (e.g. 24 clicks)</option>
                            <option value="stepless">Stepless Dial</option>
                            <option value="microns">Microns (µm)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingInlineGrinder(false);
                            setInlineError(null);
                          }}
                          className="px-3 py-1 rounded bg-panel text-text-secondary hover:text-text-primary text-xs font-mono uppercase transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isCreatingGrinder}
                          onClick={handleSaveInlineGrinder}
                          className="px-3 py-1 rounded bg-accent hover:bg-accent-hover text-zinc-950 font-mono text-xs uppercase font-bold transition-all cursor-pointer"
                        >
                          {isCreatingGrinder ? "Saving..." : "Save Grinder"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Case B: userGrinders.length > 0 */}
              {userGrinders.length > 0 && (
                <div className="space-y-2">
                  {grinderSettings.length === 0 ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-panel-recessed border border-border-subtle text-xs text-text-secondary">
                      <span>No grinder settings configured for this recipe.</span>
                      <button
                        type="button"
                        onClick={handleAddGrinderSetting}
                        aria-label="Add grinder setting"
                        className="flex items-center space-x-1 px-2.5 py-1 rounded bg-panel-recessed text-accent border border-accent hover:bg-panel transition-colors font-mono text-xs uppercase"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ADD</span>
                      </button>
                    </div>
                  ) : (
                    grinderSettings.map((row, index) => (
                      <div
                        key={row.grinderId || `grinder-row-${index}`}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-panel-recessed border border-border-subtle"
                      >
                        <div className="flex items-center space-x-2 min-w-[110px]">
                          {index === 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
                              Primary
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryGrinder(index)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase text-text-muted hover:text-accent hover:border-accent/40 border border-border-subtle transition-colors cursor-pointer"
                              title="Set as primary grinder"
                              aria-label={`Set grinder ${index + 1} as primary`}
                            >
                              Set Primary
                            </button>
                          )}
                          <span className="text-xs text-text-muted font-mono">
                            #{index + 1}
                          </span>
                        </div>

                        <div className="flex-1">
                          <label
                            htmlFor={`grinder-select-${index}`}
                            className="sr-only"
                          >
                            Grinder {index + 1}
                          </label>
                          <select
                            id={`grinder-select-${index}`}
                            aria-label={`Grinder ${index + 1}`}
                            value={row.grinderId}
                            onChange={(e) =>
                              handleUpdateGrinderSetting(index, "grinderId", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-panel border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent cursor-pointer"
                          >
                            {userGrinders.map((g) => {
                              const isSelectedElsewhere = grinderSettings.some(
                                (gs, i) => i !== index && gs.grinderId === g.id
                              );
                              return (
                                <option
                                  key={g.id}
                                  value={g.id}
                                  disabled={isSelectedElsewhere}
                                >
                                  {g.brand} {g.model}{" "}
                                  {g.settingScaleType ? `(${g.settingScaleType})` : ""}
                                  {isSelectedElsewhere ? " (Already added)" : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="flex-1">
                          <label
                            htmlFor={`grinder-setting-${index}`}
                            className="sr-only"
                          >
                            Setting for Grinder {index + 1}
                          </label>
                          <input
                            id={`grinder-setting-${index}`}
                            aria-label={`Setting for Grinder ${index + 1}`}
                            type="text"
                            placeholder="e.g. 15 clicks, 4.2..."
                            value={row.setting}
                            onChange={(e) =>
                              handleUpdateGrinderSetting(index, "setting", e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-panel border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveGrinderSetting(index)}
                          className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-panel transition-colors cursor-pointer self-end sm:self-auto"
                          aria-label={`Remove grinder ${index + 1}`}
                          title={`Remove grinder ${index + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="recipe-description"
                className="block text-xs font-medium text-text-secondary mb-1.5"
              >
                Description / Profile Notes
              </label>
              <textarea
                id="recipe-description"
                rows={2}
                placeholder="High clarity technique emphasizing bright floral acidity and clean finish..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded bg-panel-recessed border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>

          {/* Section 2: Dose & Ratio Calculator */}
          <div className="p-4 rounded-xl bg-panel-recessed border border-border-subtle space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center space-x-1.5">
              <Droplets className="w-4 h-4" />
              <span>Dose, Ratio & Water Calculator</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="recipe-dose"
                  className="block text-xs font-medium text-text-secondary mb-1.5"
                >
                  Coffee Dose (g)
                </label>
                <input
                  id="recipe-dose"
                  type="number"
                  min="5"
                  max="120"
                  step="1"
                  value={coffeeDoseGrams}
                  onChange={(e) => handleDoseChange(Math.round(Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded bg-panel border border-border-subtle text-accent text-base font-light tabular-nums focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label
                  htmlFor="recipe-ratio"
                  className="block text-xs font-medium text-text-secondary mb-1.5"
                >
                  Brew Ratio (1 : X)
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-text-muted">1:</span>
                  <input
                    id="recipe-ratio"
                    type="number"
                    min="1"
                    max="30"
                    step="any"
                    value={ratio}
                    onChange={(e) => handleRatioChange(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded bg-panel border border-border-subtle text-text-primary text-base font-light tabular-nums focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="recipe-water-amount"
                  className="block text-xs font-medium text-text-secondary mb-1.5"
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
                  className="w-full px-3 py-2 rounded bg-panel border border-border-subtle text-accent text-base font-light tabular-nums focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-text-secondary pt-1 border-t border-border-subtle">
              <span>
                Computed Brew Ratio: 1:{ratio} ({coffeeDoseGrams}g : {waterAmountGrams}g)
              </span>
              <span className="flex items-center space-x-1 text-accent font-medium">
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center space-x-1.5">
                <Clock className="w-4 h-4" />
                <span>Multi-Stage Pour Timeline ({stages.length} stages)</span>
              </h3>

              <button
                type="button"
                onClick={handleAddStage}
                className="flex items-center space-x-1 px-3 py-1.5 rounded bg-panel-recessed hover:bg-panel text-accent font-mono text-xs uppercase tracking-wider font-semibold border border-accent transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD STAGE</span>
              </button>
            </div>

            {hasWaterMismatch && (
              <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-2">
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
                  className="p-4 rounded-lg bg-panel-recessed border border-border-subtle space-y-3 relative group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded bg-panel text-accent text-xs font-bold flex items-center justify-center border border-border-subtle">
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
                        className="font-bold text-sm text-text-primary bg-transparent border-b border-border-subtle focus:border-accent focus:outline-none px-1"
                      />
                    </div>

                    <div className="flex items-center space-x-1 self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveStage(index, "up")}
                        className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                        aria-label={`Move stage ${index + 1} up`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === stages.length - 1}
                        onClick={() => handleMoveStage(index, "down")}
                        className="p-1 rounded text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer"
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
                        className="block text-[11px] font-medium text-text-secondary mb-1"
                      >
                        Stage Type
                      </label>
                      <select
                        id={`stage-type-${index}`}
                        value={stage.stageType}
                        onChange={(e) =>
                          handleUpdateStage(index, "stageType", e.target.value)
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-panel border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent cursor-pointer"
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
                        className="block text-[11px] font-medium text-text-secondary mb-1"
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
                        className="w-full px-2.5 py-1.5 rounded bg-panel border border-border-subtle text-text-primary text-sm font-light tabular-nums focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`stage-water-${index}`}
                        className="block text-[11px] font-medium text-text-secondary mb-1"
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
                        className="w-full px-2.5 py-1.5 rounded bg-panel border border-border-subtle text-accent text-sm font-light tabular-nums font-bold focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor={`stage-instruction-${index}`}
                      className="block text-[11px] font-medium text-text-secondary mb-1"
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
                      className="w-full px-2.5 py-1.5 rounded bg-panel border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="text-[11px] text-text-muted flex items-center justify-between pt-1">
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
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-panel-recessed text-text-secondary hover:text-text-primary hover:bg-panel border border-border-subtle font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 rounded bg-accent hover:bg-accent-hover disabled:opacity-50 text-zinc-950 font-mono text-xs uppercase tracking-wider font-bold shadow-md transition-all active:scale-95 flex items-center space-x-2 cursor-pointer"
            >
              {isSaving ? (
                <span>SAVING PROFILE...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{initialRecipe ? "SAVE CHANGES" : "SAVE RECIPE"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

