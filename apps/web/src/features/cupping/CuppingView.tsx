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
  Sparkles,
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
  Check,
  RotateCcw,
  Clock,
  Droplets,
  Sliders,
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

const DEFAULT_SCORES: CuppingAttributes = {
  fragranceAroma: 0,
  acidity: 0,
  sweetness: 0,
  body: 0,
  clarity: 0,
  aftertaste: 0,
  balance: 0,
  overall: 0,
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
          <h2 className="text-2xl font-bold tracking-tight text-stone-100">Cupping & Sensory Log</h2>
          <p className="text-sm text-stone-400 mt-0.5">
            Specialty Coffee Association (SCA) 0–100 cupping scoring sheet & interactive sensory flavor wheel.
          </p>
        </div>

        <button
          type="button"
          onClick={resetForm}
          className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 text-xs transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Form</span>
        </button>
      </div>

      {/* Pending Session Alert Banner */}
      {pendingBrewSession && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Completed Brew Loaded
              </div>
              <div className="text-sm font-bold text-stone-100 mt-0.5">
                {pendingBrewSession.bean?.name || 'Specialty Coffee'} • {pendingBrewSession.recipe.name} ({pendingBrewSession.actualTimeSeconds}s)
              </div>
            </div>
          </div>
          {onClearPendingSession && (
            <button
              onClick={onClearPendingSession}
              className="text-xs text-stone-400 hover:text-stone-200 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Form and Wheel Grid */}
      <form onSubmit={handleSaveTastingLog} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Session Details, SCA Sliders, Notes & Save Action */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-stone-900/80 border border-stone-800 shadow-xl space-y-6">
          {/* Card Header: Score Badge */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                SCA Cupping Matrix
              </span>
              <h3 className="text-lg font-bold text-stone-100 mt-0.5">Calculated Cup Score</h3>
            </div>

            <div className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-2xl font-extrabold">{scaScore.toFixed(1)}</span>
              <span className="text-xs text-stone-400">/ 100</span>
            </div>
          </div>

          {/* Coffee & Brew Parameters */}
          <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800/80 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Coffee className="w-4 h-4" />
              <span>Coffee & Brew Parameters</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 mb-1">Select Coffee from Stash</label>
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
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
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
                    <label className="block text-stone-400 mb-1">Coffee Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Worka Sakaro"
                      value={customBeanName}
                      onChange={(e) => setCustomBeanName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-400 mb-1">Roaster *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sey Coffee"
                      value={customRoaster}
                      onChange={(e) => setCustomRoaster(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-100"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-stone-400 mb-1">Brew Method</label>
                  <select
                    value={brewMethod}
                    onChange={(e) => setBrewMethod(e.target.value as BrewMethodType)}
                    className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-200 font-medium"
                  >
                    {BREW_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">Actual Brew Time (s)</label>
                  <input
                    type="number"
                    min="10"
                    max="1800"
                    value={actualTimeSeconds}
                    onChange={(e) => setActualTimeSeconds(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-amber-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1">Coffee Dose (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="150"
                    value={coffeeDoseGrams}
                    onChange={(e) => setCoffeeDoseGrams(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">Water Amount (g)</label>
                  <input
                    type="number"
                    min="20"
                    max="2000"
                    value={waterAmountGrams}
                    onChange={(e) => setWaterAmountGrams(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-200 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 8 Attribute Sliders */}
          <div className="space-y-3.5">
            <div className="text-xs font-bold text-stone-300 uppercase tracking-wider pb-1 border-b border-stone-800/80">
              Sensory Attribute Scoring (0.0 – 10.0)
            </div>

            {(
              [
                { key: 'fragranceAroma', label: 'Fragrance / Aroma' },
                { key: 'acidity', label: 'Acidity (Brightness)' },
                { key: 'sweetness', label: 'Sweetness' },
                { key: 'clarity', label: 'Clarity / Clean Cup' },
                { key: 'body', label: 'Body (Mouthfeel)' },
                { key: 'aftertaste', label: 'Aftertaste / Finish' },
                { key: 'balance', label: 'Balance' },
                { key: 'overall', label: 'Overall Impression' },
              ] as { key: keyof CuppingAttributes; label: string }[]
            ).map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-stone-300">{label}</span>
                  <span className="font-mono font-bold text-amber-400">
                    {scores[key].toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={scores[key]}
                  onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                  className="w-full accent-amber-500 bg-stone-950 h-2 rounded-lg cursor-pointer"
                />
              </div>
            ))}
          </div>

          {/* Tasting Notes & Quick Rating */}
          <div className="space-y-3 pt-2 border-t border-stone-800">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Cupping Impressions & Brew Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Vibrant peach and white tea notes, crisp malic acidity, silky finish..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              {/* Star Rating */}
              <div className="flex items-center space-x-1">
                <span className="text-xs text-stone-400 mr-1.5">Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-4 h-4 ${rating >= star
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-stone-700'
                        }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-mono font-bold text-amber-400 ml-1">
                  {rating.toFixed(1)}
                </span>
              </div>

              {/* Would Brew Again */}
              <label className="flex items-center space-x-2 text-xs text-stone-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={wouldBrewAgain}
                  onChange={(e) => setWouldBrewAgain(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span>Would brew again</span>
              </label>
            </div>
          </div>

          {/* Save Button & Feedback Banner */}
          <div className="pt-2">
            {saveSuccess ? (
              <div className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center space-x-2 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Tasting Log Saved to Book!</span>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-bold text-sm shadow-xl shadow-amber-500/20 cursor-pointer transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Tasting Log...' : 'Save Tasting Log to Book'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Interactive SCA Sensory Wheel & Tag Selector */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-stone-900/80 border border-stone-800 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                SCA Sensory Wheel
              </span>
              <h3 className="text-lg font-bold text-stone-100 mt-0.5">Tasting Descriptors</h3>
            </div>

            {/* Segmented View Mode Toggle */}
            <div className="flex items-center space-x-1 p-1 rounded-xl bg-stone-950 border border-stone-800">
              <button
                type="button"
                onClick={() => setFlavorViewMode('wheel')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${flavorViewMode === 'wheel'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                  }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>Wheel</span>
              </button>

              <button
                type="button"
                onClick={() => setFlavorViewMode('tags')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${flavorViewMode === 'tags'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                  }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Tag List</span>
              </button>
            </div>
          </div>

          {/* Active Selected Tags Bar */}
          <div className="min-h-11 p-2 rounded-xl bg-stone-950/80 border border-stone-800 flex flex-wrap gap-1.5 items-center">
            {selectedTags.length === 0 && (
              <span className="text-xs text-stone-500 italic pl-1">
                Select notes on the wheel or list to tag this cup...
              </span>
            )}
            {selectedTags.map((tag) => (
              <span
                key={tag}
                onClick={() => toggleFlavorTag(tag)}
                className="inline-flex items-center space-x-2.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-colors select-none group"
              >
                <span>{tag}</span>
                <span className="text-[11px] font-bold text-amber-400/80 group-hover:text-red-300 transition-colors pl-1">
                  ✕
                </span>
              </span>
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
              <ScrollFadeContainer className="w-full max-h-[440px] space-y-4 divide-y divide-stone-800/50 pr-1">
                {SCA_FLAVOR_WHEEL.map((cat) => {
                  const CatIcon = CATEGORY_ICONS[cat.name] || Sparkles;
                  return (
                    <div key={cat.name} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          <CatIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-200">
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
                                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                                  : 'bg-stone-950/80 border border-stone-800 text-stone-300 hover:border-stone-600 hover:text-stone-100 hover:bg-stone-900'
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
          <h3 className="text-lg font-bold text-stone-200">Past Brew Sessions & Cupping Notes</h3>
          <span className="text-xs font-mono text-stone-400">{logs.length} logged sessions</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 rounded-2xl bg-stone-900/40 border border-stone-800 text-center text-stone-400 text-sm">
            No tasting logs recorded yet. Score your first brew above!
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      {log.brewMethod}
                    </span>
                    <span className="text-xs text-stone-500">•</span>
                    <span className="text-xs text-stone-400">
                      {new Date(log.brewDate).toLocaleDateString()}
                    </span>
                    {log.rating && (
                      <>
                        <span className="text-xs text-stone-500">•</span>
                        <div className="flex items-center text-amber-400 text-xs font-mono">
                          <Star className="w-3 h-3 fill-current mr-0.5" />
                          <span>{log.rating}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-stone-100 mt-1">
                    {log.beanNameSnapshot}{' '}
                    <span className="text-xs font-normal text-stone-400">
                      by {log.roasterSnapshot}
                    </span>
                  </h4>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {log.flavorTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[11px] rounded bg-stone-800 text-stone-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {log.notes && (
                    <p className="text-xs text-stone-300 mt-2 italic">"{log.notes}"</p>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-800">
                  <div className="text-xl font-extrabold font-mono text-amber-400">
                    {log.calculatedScaScore}{' '}
                    <span className="text-xs text-stone-400 font-sans">SCA pts</span>
                  </div>
                  <div className="text-xs font-mono text-stone-400 mt-0.5">
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
