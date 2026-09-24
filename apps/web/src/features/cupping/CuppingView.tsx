import { ScrollFadeContainer } from '../../components/shared/ScrollFadeContainer';
import React, { useState, useEffect } from 'react';
import {
  TastingLog,
  CuppingAttributes,
  calculateScaScore,
  SCA_FLAVOR_WHEEL,
  Bean,
  BrewRecipe,
  BrewMethodType,
} from '@brewlog/core';
import {
  Award,
  Cherry,
  Flower2,
  Flame,
  Coffee,
  Candy,
  Sun,
  Wine,
  PieChart,
  ListFilter,
  Star,
  CheckCircle2,
  Save,
  RotateCcw,
} from 'lucide-react';
import { ScaFlavorWheelSvg } from './ScaFlavorWheelSvg';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Fruity': Cherry,
  'Floral': Flower2,
  'Sweet': Candy,
  'Nutty / Cocoa': Coffee,
  'Spices': Flame,
  'Roasted': Sun,
  'Fermented / Sour': Wine,
};

export interface PendingBrewSession {
  bean: Bean | null;
  recipe: BrewRecipe;
  actualTimeSeconds: number;
}

interface CuppingViewProps {
  logs: TastingLog[];
  beans?: Bean[];
  pendingBrewSession?: PendingBrewSession | null;
  onClearPendingSession?: () => void;
  onAddTastingLog: (log: Omit<TastingLog, 'id' | 'createdAt'>) => Promise<any> | void;
}

export const SPECIALTY_BASELINE_SCORES: CuppingAttributes = {
  fragranceAroma: 7.5,
  flavor: 7.5,
  aftertaste: 7.5,
  acidity: 7.5,
  body: 7.5,
  balance: 7.5,
  uniformity: 10.0,
  cleanCup: 10.0,
  sweetness: 10.0,
  overall: 7.5,
};

export const ZERO_SCORES: CuppingAttributes = {
  fragranceAroma: 0,
  flavor: 0,
  aftertaste: 0,
  acidity: 0,
  body: 0,
  balance: 0,
  uniformity: 0,
  cleanCup: 0,
  sweetness: 0,
  overall: 0,
};

const DEFAULT_SCORES: CuppingAttributes = SPECIALTY_BASELINE_SCORES;

export const getScaClassification = (score: number) => {
  if (score >= 90) return { label: 'Outstanding (Specialty)', color: 'text-emerald-300 bg-emerald-950/50 border-emerald-800' };
  if (score >= 85) return { label: 'Excellent (Specialty)', color: 'text-accent bg-panel-recessed border-accent/50' };
  if (score >= 80) return { label: 'Very Good (Specialty)', color: 'text-zinc-200 bg-panel-recessed border-zinc-700' };
  return { label: 'Commercial / Below Specialty (<80)', color: 'text-zinc-400 bg-zinc-900 border-zinc-800' };
};

const BREW_METHODS: { value: BrewMethodType; label: string }[] = [
  { value: 'v60', label: 'Hario V60' },
  { value: 'aeropress', label: 'AeroPress' },
  { value: 'chemex', label: 'Chemex' },
  { value: 'flair', label: 'Flair Espresso' },
  { value: 'espresso', label: 'Espresso' },
  { value: 'french-press', label: 'French Press' },
  { value: 'kalita-wave', label: 'Kalita Wave' },
  { value: 'custom', label: 'Cupping / Bowl' },
];

export const CuppingView: React.FC<CuppingViewProps> = ({
  logs,
  beans = [],
  pendingBrewSession,
  onClearPendingSession,
  onAddTastingLog,
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [flavorViewMode, setFlavorViewMode] = useState<'wheel' | 'tags'>('tags');
  const [scores, setScores] = useState<CuppingAttributes>(DEFAULT_SCORES);

  // Form State
  const [selectedBeanId, setSelectedBeanId] = useState<string>(
    pendingBrewSession?.bean?.id || (beans[0]?.id || 'custom')
  );
  const [customBeanName, setCustomBeanName] = useState<string>('');
  const [customRoaster, setCustomRoaster] = useState<string>('');
  const [brewMethod, setBrewMethod] = useState<BrewMethodType>('v60');
  const [coffeeDoseGrams, setCoffeeDoseGrams] = useState<number>(20);
  const [waterAmountGrams, setWaterAmountGrams] = useState<number>(300);
  const [actualTimeSeconds, setActualTimeSeconds] = useState<number>(210);
  const [grindSetting, setGrindSetting] = useState<string>('Medium-Fine');
  const [waterTempCelsius, setWaterTempCelsius] = useState<number>(93);
  const [notes, setNotes] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [wouldBrewAgain, setWouldBrewAgain] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync state when coming from completed timer session
  useEffect(() => {
    if (pendingBrewSession) {
      if (pendingBrewSession.bean) {
        setSelectedBeanId(pendingBrewSession.bean.id);
        setCustomBeanName(pendingBrewSession.bean.name);
        setCustomRoaster(pendingBrewSession.bean.roaster);
      } else {
        setSelectedBeanId('custom');
        setCustomBeanName('Specialty Coffee');
        setCustomRoaster('Local Roaster');
      }
      setBrewMethod(pendingBrewSession.recipe.brewMethod);
      setCoffeeDoseGrams(pendingBrewSession.recipe.coffeeDoseGrams);
      setWaterAmountGrams(pendingBrewSession.recipe.waterAmountGrams);
      setActualTimeSeconds(pendingBrewSession.actualTimeSeconds);
      setGrindSetting(pendingBrewSession.recipe.grindSize);
      setWaterTempCelsius(pendingBrewSession.recipe.waterTempCelsius);
      setNotes(`Brewed with ${pendingBrewSession.recipe.name}.`);
    }
  }, [pendingBrewSession]);

  const scaScore = calculateScaScore(scores);

  const toggleFlavorTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSliderChange = (key: keyof CuppingAttributes, value: number) => {
    setScores({ ...scores, [key]: value });
  };

  const handleSaveTastingLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const chosenBean = beans.find((b) => b.id === selectedBeanId);
    const beanNameSnapshot = chosenBean?.name || customBeanName.trim() || 'Specialty Blend';
    const roasterSnapshot = chosenBean?.roaster || customRoaster.trim() || 'Local Roaster';
    const recipeNameSnapshot =
      pendingBrewSession?.recipe.name || `${brewMethod.toUpperCase()} Brew`;

    const newLogPayload: Omit<TastingLog, 'id' | 'createdAt'> = {
      beanId: chosenBean?.id,
      recipeId: pendingBrewSession?.recipe.id,
      beanNameSnapshot,
      roasterSnapshot,
      recipeNameSnapshot,
      brewMethod,
      brewDate: new Date().toISOString(),
      coffeeDoseGrams: Number(coffeeDoseGrams),
      waterAmountGrams: Number(waterAmountGrams),
      actualTimeSeconds: Number(actualTimeSeconds),
      grindSetting: grindSetting || 'Medium',
      waterTempCelsius: Number(waterTempCelsius),
      scores,
      calculatedScaScore: Number(scaScore.toFixed(1)),
      rating,
      flavorTags: selectedTags,
      notes: notes.trim() || 'Evaluated on SCA cupping matrix.',
      wouldBrewAgain,
    };

    try {
      await onAddTastingLog(newLogPayload);
      setSaveSuccess(true);
      if (onClearPendingSession) {
        onClearPendingSession();
      }
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save tasting log:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setScores(DEFAULT_SCORES);
    setSelectedTags([]);
    setNotes('');
    setRating(0);
    if (onClearPendingSession) onClearPendingSession();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Cupping & Sensory Log</h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Specialty Coffee Association (SCA) 0–100 cupping scoring sheet & interactive sensory flavor wheel.
          </p>
        </div>

        <button
          type="button"
          onClick={resetForm}
          className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-zinc-100 font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET FORM</span>
        </button>
      </div>

      {/* Pending Session Alert Banner */}
      {pendingBrewSession && (
        <div className="p-4 rounded-xl bg-panel border border-border-subtle flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-panel-recessed border border-zinc-700 text-accent flex items-center justify-center font-bold flex-shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono font-semibold text-accent uppercase tracking-wider">
                Completed Brew Loaded
              </div>
              <div className="text-sm font-bold text-zinc-100 mt-0.5">
                {pendingBrewSession.bean?.name || 'Specialty Coffee'} • {pendingBrewSession.recipe.name} ({pendingBrewSession.actualTimeSeconds}s)
              </div>
            </div>
          </div>
          {onClearPendingSession && (
            <button
              onClick={onClearPendingSession}
              className="text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 cursor-pointer transition-colors"
            >
              CLEAR
            </button>
          )}
        </div>
      )}

      {/* Form and Wheel Grid */}
      <form onSubmit={handleSaveTastingLog} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Session Details, SCA Sliders, Notes & Save Action */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-panel border border-border-subtle shadow-sm space-y-6">
          {/* Card Header: Score Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent">
                Official SCA Cupping Matrix (10 Attributes)
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <h3 className="text-lg font-bold text-zinc-100">Calculated Cup Score</h3>
              </div>
            </div>

            <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-panel border border-border-subtle self-start sm:self-auto shadow-sm">
              <Award className="w-5 h-5 text-accent shrink-0" />
              <span className="text-2xl font-light text-text-primary tabular-nums">
                {scaScore.toFixed(1)}
              </span>
              <span className="text-xs font-light text-text-muted">/ 100</span>
              <span className="text-border-active">|</span>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getScaClassification(scaScore).color}`}>
                {getScaClassification(scaScore).label}
              </span>
            </div>
          </div>

          {/* Coffee & Brew Parameters */}
          <div className="p-4 rounded-xl bg-panel-recessed border border-border-subtle space-y-3">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-accent uppercase tracking-wider">
              <Coffee className="w-4 h-4" />
              <span>Coffee & Brew Parameters</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Select Coffee from Stash</label>
                <select
                  value={selectedBeanId}
                  onChange={(e) => {
                    setSelectedBeanId(e.target.value);
                    const b = beans.find((item) => item.id === e.target.value);
                    if (b) {
                      setCustomBeanName(b.name);
                      setCustomRoaster(b.roaster);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-panel border border-border-subtle text-zinc-200 font-semibold focus:outline-none focus:border-accent cursor-pointer"
                >
                  {beans.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {b.roaster}
                    </option>
                  ))}
                  <option value="custom">+ Enter Custom / Unlisted Coffee</option>
                </select>
              </div>

              {selectedBeanId === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 mb-1">Coffee Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Worka Sakaro"
                      value={customBeanName}
                      onChange={(e) => setCustomBeanName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-panel border border-border-subtle text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Roaster *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sey Coffee"
                      value={customRoaster}
                      onChange={(e) => setCustomRoaster(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-panel border border-border-subtle text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-zinc-400 mb-1">Brew Method</label>
                  <select
                    value={brewMethod}
                    onChange={(e) => setBrewMethod(e.target.value as BrewMethodType)}
                    className="w-full px-3 py-1.5 rounded-lg bg-panel border border-border-subtle text-zinc-200 font-medium focus:outline-none focus:border-accent cursor-pointer"
                  >
                    {BREW_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Actual Brew Time (s)</label>
                  <input
                    type="number"
                    min="10"
                    max="1800"
                    value={actualTimeSeconds}
                    onChange={(e) => setActualTimeSeconds(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-panel border border-border-subtle text-accent font-mono font-bold focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Coffee Dose (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="150"
                    value={coffeeDoseGrams}
                    onChange={(e) => setCoffeeDoseGrams(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-panel border border-border-subtle text-zinc-100 font-mono focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Water Amount (g)</label>
                  <input
                    type="number"
                    min="20"
                    max="2000"
                    value={waterAmountGrams}
                    onChange={(e) => setWaterAmountGrams(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-panel border border-border-subtle text-zinc-100 font-mono focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 10 Official SCA Attribute Sliders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
              <div className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
                Sensory Attribute Scoring (0.0 – 10.0)
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setScores(SPECIALTY_BASELINE_SCORES)}
                  className="text-accent hover:text-accent-hover transition-colors font-medium cursor-pointer"
                >
                  Baseline (82.5)
                </button>
                <span className="text-zinc-600">•</span>
                <button
                  type="button"
                  onClick={() => setScores(ZERO_SCORES)}
                  className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  Clear (0)
                </button>
              </div>
            </div>

            {/* Group 1: Qualitative Sensory Attributes */}
            <div className="space-y-3">
              <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                Sensory Profile (Typically 6.00 – 10.00)
              </span>

              {(
                [
                  { key: 'fragranceAroma', label: 'Fragrance / Aroma', hint: 'Dry fragrance & wet crust aroma' },
                  { key: 'flavor', label: 'Flavor', hint: 'Principal taste character & intensity' },
                  { key: 'aftertaste', label: 'Aftertaste / Finish', hint: 'Length of positive lingering aroma & taste' },
                  { key: 'acidity', label: 'Acidity (Brightness)', hint: 'Crispness, liveliness & structure' },
                  { key: 'body', label: 'Body (Mouthfeel)', hint: 'Tactile weight, texture & viscosity' },
                  { key: 'balance', label: 'Balance', hint: 'Harmony of flavor, aftertaste, acidity & body' },
                  { key: 'overall', label: 'Overall Impression', hint: 'Cupper’s holistic appraisal of the cup' },
                ] as { key: keyof CuppingAttributes; label: string; hint: string }[]
              ).map(({ key, label, hint }) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <div>
                      <span className="font-medium text-zinc-200">{label}</span>
                      <span className="text-[10px] text-zinc-500 ml-1.5 hidden sm:inline">({hint})</span>
                    </div>
                    <span className="font-light text-sm text-accent tabular-nums">
                      {(scores[key] ?? 0).toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    aria-label={`${label} score`}
                    value={scores[key] ?? 0}
                    onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent focus:outline-none"
                  />
                </div>
              ))}
            </div>

            {/* Group 2: Cup Cleanliness & Uniformity (5 Cups, 2 pts each) */}
            <div className="space-y-3 pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                  Cup Purity & Consistency (5 Cups, 2 pts / cup)
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Standard baseline: 10.0</span>
              </div>

              {(
                [
                  { key: 'cleanCup', label: 'Clean Cup', hint: 'Absence of negative taints (2 pts / cup)' },
                  { key: 'sweetness', label: 'Sweetness', hint: 'Pleasing fullness of sweetness (2 pts / cup)' },
                  { key: 'uniformity', label: 'Uniformity', hint: 'Consistency across all 5 bowls (2 pts / cup)' },
                ] as { key: keyof CuppingAttributes; label: string; hint: string }[]
              ).map(({ key, label, hint }) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <div>
                      <span className="font-medium text-zinc-200">{label}</span>
                      <span className="text-[10px] text-zinc-500 ml-1.5 hidden sm:inline">({hint})</span>
                    </div>
                    <span className="font-light text-sm text-accent tabular-nums">
                      {(scores[key] ?? 0).toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    aria-label={`${label} score`}
                    value={scores[key] ?? 0}
                    onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Tasting Notes & Quick Rating */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Cupping Impressions & Brew Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Vibrant peach and white tea notes, crisp malic acidity, silky finish..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              {/* Star Rating */}
              <div className="flex items-center space-x-1">
                <span className="text-xs text-zinc-400 mr-1.5">Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-4 h-4 ${rating >= star
                          ? 'text-accent fill-accent'
                          : 'text-zinc-700'
                        }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-light text-accent ml-1 tabular-nums">
                  {rating.toFixed(1)}
                </span>
              </div>

              {/* Would Brew Again */}
              <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={wouldBrewAgain}
                  onChange={(e) => setWouldBrewAgain(e.target.checked)}
                  className="w-4 h-4 accent-accent rounded cursor-pointer"
                />
                <span>Would brew again</span>
              </label>
            </div>
          </div>

          {/* Save Button & Feedback Banner */}
          <div className="pt-2">
            {saveSuccess ? (
              <div className="w-full py-3.5 px-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-bold text-sm flex items-center justify-center space-x-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tasting Log Saved to Book!</span>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-mono text-xs uppercase tracking-wider font-bold shadow-sm cursor-pointer transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'SAVING TASTING LOG...' : 'SAVE TASTING LOG'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Interactive SCA Sensory Wheel & Tag Selector */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-panel border border-border-subtle shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-accent">
                SCA Sensory Wheel
              </span>
              <h3 className="text-lg font-bold text-zinc-100 mt-0.5">Tasting Descriptors</h3>
            </div>

            {/* Segmented View Mode Toggle */}
            <div className="flex items-center space-x-1 p-1 rounded-xl bg-panel-recessed border border-border-subtle">
              <button
                type="button"
                onClick={() => setFlavorViewMode('wheel')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${flavorViewMode === 'wheel'
                    ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>Wheel</span>
              </button>

              <button
                type="button"
                onClick={() => setFlavorViewMode('tags')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${flavorViewMode === 'tags'
                    ? 'bg-accent text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Tag List</span>
              </button>
            </div>
          </div>

          {/* Active Selected Tags Bar */}
          <div className="min-h-11 p-2 rounded-xl bg-canvas border border-border-subtle flex flex-wrap gap-1.5 items-center">
            {selectedTags.length === 0 && (
              <span className="text-xs text-zinc-500 italic pl-1">
                Select notes on the wheel or list to tag this cup...
              </span>
            )}
            {selectedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleFlavorTag(tag)}
                aria-label={`Remove flavor tag ${tag}`}
                className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg text-xs font-semibold bg-panel-recessed text-accent border border-accent cursor-pointer hover:bg-red-950/30 hover:text-red-300 hover:border-red-500/60 transition-colors select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span>{tag}</span>
                <span className="text-[11px] font-mono group-hover:text-red-300 transition-colors pl-1" aria-hidden="true">
                  ✕
                </span>
              </button>
            ))}
          </div>

          {/* Content Container (Wheel vs Tag List) */}
          <div className="min-h-[440px] flex items-center justify-center">
            {flavorViewMode === 'wheel' ? (
              <ScaFlavorWheelSvg
                selectedTags={selectedTags}
                onToggleTag={toggleFlavorTag}
              />
            ) : (
              <ScrollFadeContainer className="w-full max-h-[440px] space-y-4 divide-y divide-zinc-800/60 pr-1">
                {SCA_FLAVOR_WHEEL.map((cat) => {
                  const CatIcon = CATEGORY_ICONS[cat.name] || Coffee;
                  return (
                    <div key={cat.name} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          <CatIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                          {cat.name}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {cat.subcategories?.flatMap((sub) => sub.descriptors || []).map((desc) => {
                          const isSelected = selectedTags.includes(desc);
                          return (
                            <button
                              key={desc}
                              type="button"
                              onClick={() => toggleFlavorTag(desc)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${isSelected
                                  ? 'bg-panel-recessed border-accent text-accent font-semibold border shadow-sm'
                                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-100'
                                }`}
                            >
                              {desc}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </ScrollFadeContainer>
            )}
          </div>
        </div>
      </form>

      {/* Past Tasting Logs History */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100">Past Brew Sessions & Cupping Notes</h3>
          <span className="text-xs font-mono text-zinc-400">{logs.length} logged sessions</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 rounded-xl bg-panel border border-border-subtle text-center text-zinc-400 text-sm">
            No tasting logs recorded yet. Score your first brew above!
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-5 rounded-xl bg-panel border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
                      {log.brewMethod}
                    </span>
                    <span className="text-xs text-zinc-600">•</span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {new Date(log.brewDate).toLocaleDateString()}
                    </span>
                    {log.rating && (
                      <>
                        <span className="text-xs text-zinc-600">•</span>
                        <div className="flex items-center text-accent text-xs font-mono">
                          <Star className="w-3 h-3 fill-current mr-0.5" />
                          <span>{log.rating}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-zinc-100 mt-1">
                    {log.beanNameSnapshot}{' '}
                    <span className="text-xs font-normal text-zinc-400">
                      by {log.roasterSnapshot}
                    </span>
                  </h4>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {log.flavorTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[11px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {log.notes && (
                    <p className="text-xs text-zinc-300 mt-2 italic">"{log.notes}"</p>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-800">
                  <div className="text-xl font-light tabular-nums text-accent">
                    {log.calculatedScaScore}{' '}
                    <span className="text-xs text-text-muted">SCA pts</span>
                  </div>
                  <div className="text-xs font-mono text-zinc-400 mt-0.5">
                    {log.coffeeDoseGrams}g : {log.waterAmountGrams}g ({log.actualTimeSeconds}s)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
