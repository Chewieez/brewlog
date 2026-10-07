import React, { useState, useEffect, useMemo } from 'react';
import {
  TastingLog,
  CuppingAttributes,
  calculateScaScore,
  SCA_FLAVOR_WHEEL,
  Bean,
  Equipment,
  BrewRecipe,
  BrewMethodType,
} from '@brewlog/core';
import {
  Plus,
  Search,
  Star,
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
  CheckCircle2,
  Save,
  X,
  RotateCcw,
} from 'lucide-react';
import { ScaFlavorWheelSvg } from './ScaFlavorWheelSvg';
import { ReviewDetailPane, getScaTier } from './ReviewDetailPane';

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

export interface ReviewsViewProps {
  logs: TastingLog[];
  beans?: Bean[];
  equipment?: Equipment[];
  pendingBrewSession?: PendingBrewSession | null;
  onClearPendingSession?: () => void;
  onAddTastingLog: (log: Omit<TastingLog, 'id' | 'createdAt'>) => Promise<any> | void;
  onUpdateTastingLog?: (id: string, updates: Partial<TastingLog>) => Promise<any> | void;
  onDeleteTastingLog?: (id: string) => Promise<any> | void;
  onBrewAgain?: (log: TastingLog) => void;
}

export type CuppingViewProps = ReviewsViewProps;

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

const BREW_METHODS: { value: BrewMethodType; label: string }[] = [
  { value: 'v60', label: 'Hario V60' },
  { value: 'aeropress', label: 'AeroPress' },
  { value: 'chemex', label: 'Chemex' },
  { value: 'flair', label: 'Flair Espresso' },
  { value: 'espresso', label: 'Espresso' },
  { value: 'french-press', label: 'French Press' },
  { value: 'kalita-wave', label: 'Kalita Wave' },
  { value: 'custom', label: 'Tasting Bowl / Other' },
];

const METHOD_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'v60', label: 'V60' },
  { id: 'aeropress', label: 'AeroPress' },
  { id: 'chemex', label: 'Chemex' },
  { id: 'espresso', label: 'Espresso' },
  { id: 'french-press', label: 'French Press' },
  { id: 'kalita-wave', label: 'Kalita Wave' },
  { id: 'other', label: 'Other' },
] as const;

export const ReviewsView: React.FC<ReviewsViewProps> = ({
  logs,
  beans = [],
  equipment = [],
  pendingBrewSession,
  onClearPendingSession,
  onAddTastingLog,
  onUpdateTastingLog,
  onDeleteTastingLog,
  onBrewAgain,
}) => {
  // Mode state: 'view' | 'create' | 'edit'
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>(() => {
    return pendingBrewSession ? 'create' : 'view';
  });

  const [selectedLogId, setSelectedLogId] = useState<string | null>(() => {
    return logs[0]?.id || null;
  });

  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('all');

  // Form State
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [flavorViewMode, setFlavorViewMode] = useState<'tags' | 'wheel'>('tags');
  const [scores, setScores] = useState<CuppingAttributes>(DEFAULT_SCORES);
  const [selectedBeanId, setSelectedBeanId] = useState<string>(
    pendingBrewSession?.bean?.id || (beans[0]?.id || 'custom')
  );
  const [customBeanName, setCustomBeanName] = useState<string>('');
  const [customRoaster, setCustomRoaster] = useState<string>('');
  const [grinderId, setGrinderId] = useState<string>(
    pendingBrewSession?.recipe.recommendedGrinderId || ''
  );
  const [brewerId, setBrewerId] = useState<string>(
    pendingBrewSession?.recipe.recommendedBrewerId || ''
  );
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

  const grinders = (equipment || []).filter((e) => e.type === 'grinder');
  const brewers = (equipment || []).filter((e) => e.type === 'brewer');

  // Keep selectedLogId valid when logs change
  useEffect(() => {
    if (selectedLogId && !logs.some((l) => l.id === selectedLogId)) {
      setSelectedLogId(logs[0]?.id || null);
    } else if (!selectedLogId && logs.length > 0) {
      setSelectedLogId(logs[0].id);
    }
  }, [logs, selectedLogId]);

  // Sync state when coming from completed timer session
  useEffect(() => {
    if (pendingBrewSession) {
      setMode('create');
      if (pendingBrewSession.bean) {
        setSelectedBeanId(pendingBrewSession.bean.id);
        setCustomBeanName(pendingBrewSession.bean.name);
        setCustomRoaster(pendingBrewSession.bean.roaster);
      } else {
        setSelectedBeanId('custom');
        setCustomBeanName('Specialty Coffee');
        setCustomRoaster('Local Roaster');
      }
      if (pendingBrewSession.recipe.recommendedGrinderId) {
        setGrinderId(pendingBrewSession.recipe.recommendedGrinderId);
      }
      if (pendingBrewSession.recipe.recommendedBrewerId) {
        setBrewerId(pendingBrewSession.recipe.recommendedBrewerId);
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

  const resetForm = () => {
    setScores(DEFAULT_SCORES);
    setSelectedTags([]);
    setNotes('');
    setRating(0);
    setGrinderId('');
    setBrewerId('');
    setGrindSetting('Medium-Fine');
    setCoffeeDoseGrams(20);
    setWaterAmountGrams(300);
    setActualTimeSeconds(210);
    setWaterTempCelsius(93);
    setBrewMethod('v60');
    setWouldBrewAgain(true);
    setSelectedBeanId(beans[0]?.id || 'custom');
    setCustomBeanName('');
    setCustomRoaster('');
    setFlavorViewMode('tags');
    if (onClearPendingSession) onClearPendingSession();
  };

  const handleStartCreate = () => {
    resetForm();
    setEditingLogId(null);
    setMode('create');
  };

  const handleStartEdit = (log: TastingLog) => {
    setEditingLogId(log.id);
    setSelectedBeanId(log.beanId || 'custom');
    setCustomBeanName(log.beanNameSnapshot || '');
    setCustomRoaster(log.roasterSnapshot || '');
    setGrinderId(log.grinderId || '');
    setBrewerId(log.brewerId || '');
    setBrewMethod(log.brewMethod || 'v60');
    setCoffeeDoseGrams(log.coffeeDoseGrams || 20);
    setWaterAmountGrams(log.waterAmountGrams || 300);
    setActualTimeSeconds(log.actualTimeSeconds || 210);
    setGrindSetting(log.grindSetting || '');
    setWaterTempCelsius(log.waterTempCelsius || 93);
    setScores(log.scores || DEFAULT_SCORES);
    setSelectedTags(log.flavorTags || []);
    setNotes(log.notes || '');
    setRating(log.rating || 0);
    setWouldBrewAgain(log.wouldBrewAgain ?? true);
    setFlavorViewMode('tags');
    setMode('edit');
  };

  const handleCancelEditor = () => {
    resetForm();
    setEditingLogId(null);
    setMode('view');
  };

  const toggleFlavorTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSliderChange = (key: keyof CuppingAttributes, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveTastingLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const chosenBean = beans.find((b) => b.id === selectedBeanId);
    const selectedGrinder = (equipment || []).find((e) => e.id === grinderId);
    const selectedBrewer = (equipment || []).find((e) => e.id === brewerId);

    const grinderSnapshot = selectedGrinder
      ? `${selectedGrinder.brand} ${selectedGrinder.model}`
      : undefined;
    const brewerSnapshot = selectedBrewer
      ? `${selectedBrewer.brand} ${selectedBrewer.model}`
      : undefined;

    const beanNameSnapshot = chosenBean?.name || customBeanName.trim() || 'Specialty Blend';
    const roasterSnapshot = chosenBean?.roaster || customRoaster.trim() || 'Local Roaster';
    const recipeNameSnapshot =
      pendingBrewSession?.recipe.name || `${brewMethod.toUpperCase()} Brew`;

    try {
      if (mode === 'edit' && editingLogId && onUpdateTastingLog) {
        await onUpdateTastingLog(editingLogId, {
          beanId: chosenBean?.id,
          grinderId: selectedGrinder?.id,
          brewerId: selectedBrewer?.id,
          grinderSnapshot,
          brewerSnapshot,
          beanNameSnapshot,
          roasterSnapshot,
          recipeNameSnapshot,
          brewMethod,
          coffeeDoseGrams: Number(coffeeDoseGrams),
          waterAmountGrams: Number(waterAmountGrams),
          actualTimeSeconds: Number(actualTimeSeconds),
          grindSetting: grindSetting || '',
          waterTempCelsius: Number(waterTempCelsius),
          scores,
          calculatedScaScore: Number(scaScore.toFixed(1)),
          rating,
          flavorTags: selectedTags,
          notes: notes.trim(),
          wouldBrewAgain,
        });
        setSelectedLogId(editingLogId);
      } else {
        const newLogPayload: Omit<TastingLog, 'id' | 'createdAt'> = {
          beanId: chosenBean?.id,
          recipeId: pendingBrewSession?.recipe.id,
          grinderId: selectedGrinder?.id,
          brewerId: selectedBrewer?.id,
          grinderSnapshot,
          brewerSnapshot,
          beanNameSnapshot,
          roasterSnapshot,
          recipeNameSnapshot,
          brewMethod,
          brewDate: new Date().toISOString(),
          coffeeDoseGrams: Number(coffeeDoseGrams),
          waterAmountGrams: Number(waterAmountGrams),
          actualTimeSeconds: Number(actualTimeSeconds),
          grindSetting: grindSetting || '',
          waterTempCelsius: Number(waterTempCelsius),
          scores,
          calculatedScaScore: Number(scaScore.toFixed(1)),
          rating,
          flavorTags: selectedTags,
          notes: notes.trim(),
          wouldBrewAgain,
        };

        const created = await onAddTastingLog(newLogPayload);
        if (created && typeof created === 'object' && 'id' in created) {
          setSelectedLogId(created.id);
        }
      }

      setSaveSuccess(true);
      if (onClearPendingSession) {
        onClearPendingSession();
      }
      setTimeout(() => setSaveSuccess(false), 2500);
      setMode('view');
    } catch (err) {
      console.error('Failed to save tasting log:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLog = async (log: TastingLog) => {
    if (onDeleteTastingLog) {
      await onDeleteTastingLog(log.id);
      const remaining = logs.filter((l) => l.id !== log.id);
      setSelectedLogId(remaining[0]?.id || null);
    }
  };

  // Filtered reviews for Master feed
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        (log.beanNameSnapshot && log.beanNameSnapshot.toLowerCase().includes(q)) ||
        (log.roasterSnapshot && log.roasterSnapshot.toLowerCase().includes(q)) ||
        (log.notes && log.notes.toLowerCase().includes(q)) ||
        (log.flavorTags && log.flavorTags.some((tag) => tag.toLowerCase().includes(q)));

      const method = log.brewMethod?.toLowerCase() || '';
      const filter = selectedMethodFilter.toLowerCase();
      let matchesMethod = true;

      if (filter === 'all') {
        matchesMethod = true;
      } else if (filter === 'other') {
        matchesMethod = !['v60', 'aeropress', 'chemex', 'espresso', 'french-press', 'kalita-wave'].includes(
          method
        );
      } else {
        matchesMethod = method === filter;
      }

      return matchesSearch && matchesMethod;
    });
  }, [logs, searchQuery, selectedMethodFilter]);

  const activeSelectedLog = useMemo(() => {
    if (!selectedLogId) return logs[0] || null;
    return logs.find((l) => l.id === selectedLogId) || logs[0] || null;
  }, [logs, selectedLogId]);

  const formatBrewTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Reviews & Cupping Journal
          </h1>
          <p className="text-sm font-medium text-text-secondary mt-0.5">
            Specialty Coffee Association sensory logbook & cup profiles
          </p>
        </div>

        {mode === 'view' && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-zinc-950 hover:bg-accent/90 font-medium text-xs font-sans uppercase tracking-wider shadow-sm cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>LOG REVIEW</span>
          </button>
        )}
      </div>

      {/* Pending Session Alert Banner */}
      {pendingBrewSession && mode !== 'create' && (
        <div className="p-4 rounded-xl bg-panel border border-border-subtle flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-panel-recessed border border-zinc-700 text-accent flex items-center justify-center font-bold flex-shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-sans font-semibold text-accent uppercase tracking-wider">
                Completed Brew Loaded
              </div>
              <div className="text-sm font-bold text-zinc-100 mt-0.5">
                {pendingBrewSession.bean?.name || 'Specialty Coffee'} • {pendingBrewSession.recipe.name} (
                {pendingBrewSession.actualTimeSeconds}s)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('create')}
              className="text-xs font-sans uppercase tracking-wider text-accent hover:text-accent-hover px-3 py-1.5 rounded-lg bg-panel-recessed border border-accent/40 cursor-pointer transition-colors"
            >
              Resume Review
            </button>
            {onClearPendingSession && (
              <button
                onClick={onClearPendingSession}
                className="text-xs font-sans uppercase tracking-wider text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 cursor-pointer transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Master-Detail Split Grid */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT PANE: Master Cupping Feed (38% width) */}
        <div data-testid="master-feed" className="w-full lg:w-[38%] shrink-0 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search coffee, roaster, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-panel border border-border-subtle text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent"
            />
          </div>

          {/* Brew Method Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {METHOD_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedMethodFilter(item.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                  selectedMethodFilter === item.id
                    ? 'bg-panel-recessed border border-accent text-accent font-semibold shadow-xs'
                    : 'bg-panel-recessed text-text-secondary hover:text-zinc-200 border border-border-subtle'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Feed Cards List */}
          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="p-8 rounded-xl bg-panel border border-border-subtle text-center text-text-secondary text-xs">
                No cupping logs match your search.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isSelected = mode === 'view' && activeSelectedLog?.id === log.id;
                const tier = getScaTier(log.calculatedScaScore);

                return (
                  <div
                    key={log.id}
                    onClick={() => {
                      setSelectedLogId(log.id);
                      setMode('view');
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedLogId(log.id);
                        setMode('view');
                      }
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all text-left relative ${
                      isSelected
                        ? 'bg-panel-recessed border-accent shadow-sm border-l-4 border-l-accent'
                        : 'bg-panel border-border-subtle hover:border-zinc-700'
                    }`}
                  >
                    {/* Header: Star Rating & SCA Tier Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-semibold text-zinc-200 tabular-nums">
                          {log.rating || '—'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-light text-zinc-100 tabular-nums">
                          {log.calculatedScaScore.toFixed(1)}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-semibold border ${tier.classes}`}
                        >
                          {tier.label}
                        </span>
                      </div>
                    </div>

                    {/* Coffee Name & Roaster */}
                    <h2 className="text-sm font-bold text-zinc-100 leading-snug">
                      {log.beanNameSnapshot}
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {log.roasterSnapshot}
                    </p>

                    {/* Sensory Badges */}
                    {log.flavorTags && log.flavorTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {log.flavorTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full text-[11px] font-sans font-medium bg-accent/10 text-accent border border-accent/20"
                          >
                            {tag}
                          </span>
                        ))}
                        {log.flavorTags.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] text-text-secondary">
                            +{log.flavorTags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Telemetry Footer */}
                    <div className="flex items-center justify-between text-[11px] text-text-secondary mt-3 pt-2 border-t border-border-subtle/60">
                      <div className="flex items-center gap-2">
                        <span className="uppercase font-semibold text-zinc-300">
                          {log.brewMethod}
                        </span>
                        <span>•</span>
                        <span className="tabular-nums">
                          {log.coffeeDoseGrams}g:{log.waterAmountGrams}g
                        </span>
                        <span>•</span>
                        <span className="tabular-nums">
                          {formatBrewTime(log.actualTimeSeconds)}
                        </span>
                      </div>
                      <span className="tabular-nums">{formatDate(log.brewDate)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Detail / Editor Pane (62% width) */}
        <div
          data-testid="detail-pane"
          className="w-full lg:w-[62%] min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto lg:pr-1"
        >
          {mode === 'view' ? (
            activeSelectedLog ? (
              <ReviewDetailPane
                log={activeSelectedLog}
                beans={beans}
                equipment={equipment}
                onEdit={handleStartEdit}
                onDelete={handleDeleteLog}
                onBrewAgain={onBrewAgain}
              />
            ) : (
              <div className="p-12 rounded-xl bg-panel border border-border-subtle text-center space-y-4">
                <Coffee className="w-12 h-12 text-accent mx-auto stroke-1" />
                <h3 className="text-lg font-bold text-zinc-100">No Cupping Reviews Yet</h3>
                <p className="text-sm text-text-secondary max-w-sm mx-auto">
                  Log your first brew review using the official SCA 10-attribute scoring sheet and flavor wheel.
                </p>
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-zinc-950 font-semibold text-xs uppercase tracking-wider hover:bg-accent/90 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  LOG FIRST REVIEW
                </button>
              </div>
            )
          ) : (
            /* Review Editor (Create or Edit Mode) */
            <form onSubmit={handleSaveTastingLog} className="space-y-6 animate-fade-in pb-8">
              {/* Sticky In-Place Editor Header */}
              <div className="sticky top-0 z-20 bg-canvas pt-1 pb-4 -mt-1 -mb-4">
                <div className="bg-panel rounded-xl p-5 border border-border-subtle shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                      {mode === 'edit'
                        ? `Edit Review: ${customBeanName || 'Specialty Coffee'}`
                        : 'Log New Brew Review'}
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Official Specialty Coffee Association cupping protocol
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCancelEditor}
                      className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-panel-recessed text-zinc-300 hover:text-zinc-100 border border-border-subtle transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-zinc-950 text-xs font-semibold uppercase tracking-wider shadow-xs cursor-pointer transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <Save className="w-4.5 h-4.5 shrink-0" />
                      <span>
                        {isSaving
                          ? 'Saving...'
                          : mode === 'edit'
                          ? 'Save Changes'
                          : 'Save Review'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dedicated Hero Live Score Banner */}
              <div className="bg-panel rounded-xl p-5 border border-border-subtle shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div
                  data-testid="hero-score-badge"
                  className="whitespace-nowrap flex items-center gap-3"
                >
                  <div className="text-4xl font-light text-zinc-100 tabular-nums">
                    {scaScore.toFixed(1)}
                  </div>
                  <div className="text-sm text-text-secondary font-medium">/ 100</div>
                  <div className="h-6 w-px bg-zinc-800" />
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${getScaTier(scaScore).classes}`}
                  >
                    {getScaTier(scaScore).label} (SCA)
                  </span>
                </div>

                {/* 5-Star Rating Preview / Interactive Quick-Rate */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110"
                      title={`Rate ${s} stars`}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          s <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-text-secondary ml-1 tabular-nums font-medium">
                    ({rating.toFixed(1)}/5)
                  </span>
                </div>
              </div>

              {saveSuccess && (
                <div className="w-full py-3 px-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 font-semibold text-xs flex items-center justify-center space-x-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Review Saved to Journal!</span>
                </div>
              )}

              {/* Section 1: Coffee & Brew Parameters */}
              <div className="p-5 rounded-xl bg-panel border border-border-subtle space-y-4">
                <div className="flex items-center space-x-2 text-xs font-bold text-accent uppercase tracking-wider border-b border-border-subtle pb-3">
                  <Coffee className="w-4 h-4" />
                  <span>Coffee & Brew Parameters</span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-zinc-400 mb-1 font-medium">
                      Select Coffee from Stash
                    </label>
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
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-zinc-100 font-medium focus:outline-none focus:border-accent cursor-pointer"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium">
                          Coffee Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Worka Sakaro"
                          value={customBeanName}
                          onChange={(e) => setCustomBeanName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium">
                          Roaster *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sey Coffee"
                          value={customRoaster}
                          onChange={(e) => setCustomRoaster(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium">Brew Method</label>
                      <select
                        value={brewMethod}
                        onChange={(e) => setBrewMethod(e.target.value as BrewMethodType)}
                        className="w-full px-3 py-1.5 rounded-lg bg-panel-recessed border border-border-subtle text-zinc-100 font-medium focus:outline-none focus:border-accent cursor-pointer"
                      >
                        {BREW_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium">
                        Actual Brew Time (s)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="1800"
                        value={actualTimeSeconds}
                        onChange={(e) => setActualTimeSeconds(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg bg-panel-recessed border border-border-subtle text-zinc-100 font-sans font-medium tabular-nums focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium">Coffee Dose (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="5"
                        max="150"
                        value={coffeeDoseGrams}
                        onChange={(e) => setCoffeeDoseGrams(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg bg-panel-recessed border border-border-subtle text-zinc-100 font-sans font-medium tabular-nums focus:outline-none focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium">Water Amount (g)</label>
                      <input
                        type="number"
                        min="20"
                        max="2000"
                        value={waterAmountGrams}
                        onChange={(e) => setWaterAmountGrams(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg bg-panel-recessed border border-border-subtle text-zinc-100 font-sans font-medium tabular-nums focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="review-grinder-select" className="block text-zinc-400 mb-1 font-medium">
                        Grinder
                      </label>
                      <select
                        id="review-grinder-select"
                        value={grinderId}
                        onChange={(e) => setGrinderId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-panel-recessed border border-border-subtle text-zinc-100 font-sans font-medium focus:outline-none focus:border-accent cursor-pointer"
                      >
                        <option value="">None / Not Specified</option>
                        {grinders.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.brand} {g.model}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="review-grind-setting" className="block text-zinc-400 mb-1 font-medium">
                        Grind Setting
                      </label>
                      <input
                        id="review-grind-setting"
                        type="text"
                        placeholder="e.g. Medium-Fine, 14 clicks"
                        value={grindSetting}
                        onChange={(e) => setGrindSetting(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 font-sans focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="review-brewer-select" className="block text-zinc-400 mb-1 font-medium">
                        Brewer
                      </label>
                      <select
                        id="review-brewer-select"
                        value={brewerId}
                        onChange={(e) => setBrewerId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-panel-recessed border border-border-subtle text-zinc-100 font-sans font-medium focus:outline-none focus:border-accent cursor-pointer"
                      >
                        <option value="">None / Not Specified</option>
                        {brewers.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.brand} {b.model}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="review-water-temp" className="block text-zinc-400 mb-1 font-medium">
                        Water Temp (°C)
                      </label>
                      <input
                        id="review-water-temp"
                        type="number"
                        min="50"
                        max="100"
                        value={waterTempCelsius}
                        onChange={(e) => setWaterTempCelsius(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg bg-panel-recessed border border-border-subtle text-zinc-100 font-sans font-medium tabular-nums focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: SCA Sensory Wheel & Descriptors */}
              <div className="p-5 rounded-xl bg-panel border border-border-subtle space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-accent">
                      Sensory Descriptors
                    </span>
                    <h3 className="text-base font-bold text-zinc-100 mt-0.5">
                      Flavor Wheel & Notes
                    </h3>
                  </div>

                  {/* Segmented Toggle: Descriptors first, Wheel second */}
                  <div className="flex items-center space-x-1 p-1 rounded-lg bg-panel-recessed border border-border-subtle">
                    <button
                      type="button"
                      onClick={() => setFlavorViewMode('tags')}
                      className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                        flavorViewMode === 'tags'
                          ? 'bg-accent text-zinc-950 font-semibold shadow-xs'
                          : 'text-text-secondary hover:text-zinc-100'
                      }`}
                    >
                      <ListFilter className="w-3.5 h-3.5" />
                      <span>Tag List</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFlavorViewMode('wheel')}
                      className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                        flavorViewMode === 'wheel'
                          ? 'bg-accent text-zinc-950 font-semibold shadow-xs'
                          : 'text-text-secondary hover:text-zinc-100'
                      }`}
                    >
                      <PieChart className="w-3.5 h-3.5" />
                      <span>Wheel</span>
                    </button>
                  </div>
                </div>

                {/* Active Selected Tags Bar */}
                <div className="min-h-11 p-2.5 rounded-xl bg-canvas border border-border-subtle flex flex-wrap gap-1.5 items-center">
                  {selectedTags.length === 0 && (
                    <span className="text-xs text-text-secondary italic pl-1">
                      Select notes on the descriptors list or wheel to tag this cup...
                    </span>
                  )}
                  {selectedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleFlavorTag(tag)}
                      aria-label={`Remove flavor tag ${tag}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-panel-recessed text-accent border border-accent cursor-pointer hover:bg-rose-950/30 hover:text-rose-300 hover:border-rose-500/60 transition-colors select-none group focus:outline-none"
                    >
                      <span>{tag}</span>
                      <X className="w-3 h-3 text-accent group-hover:text-rose-300 transition-colors" />
                    </button>
                  ))}
                </div>

                {/* Sensory Content: Natural Height (no 440px scroll traps) */}
                <div>
                  {flavorViewMode === 'tags' ? (
                    <div className="space-y-4 pt-1">
                      {SCA_FLAVOR_WHEEL.map((cat) => {
                        const CatIcon = CATEGORY_ICONS[cat.name] || Coffee;
                        return (
                          <div key={cat.name} className="space-y-2">
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
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-accent/15 border-accent text-accent font-semibold border shadow-xs'
                                        : 'bg-panel-recessed text-zinc-300 border border-border-subtle hover:bg-zinc-800 hover:text-zinc-100'
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
                    </div>
                  ) : (
                    <div className="flex justify-center py-2">
                      <ScaFlavorWheelSvg
                        selectedTags={selectedTags}
                        onToggleTag={toggleFlavorTag}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: 10 SCA Attribute Sliders */}
              <div className="p-5 rounded-xl bg-panel border border-border-subtle space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Official SCA Scoring Matrix (0.0 – 10.0)
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
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
                      Clear
                    </button>
                  </div>
                </div>

                {/* Group 1: Qualitative Sensory Attributes */}
                <div className="space-y-3">
                  <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
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
                          <span className="text-[10px] text-zinc-500 ml-1.5 hidden sm:inline">
                            ({hint})
                          </span>
                        </div>
                        <span className="font-medium text-sm text-accent tabular-nums">
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

                {/* Group 2: Cup Cleanliness & Uniformity */}
                <div className="space-y-3 pt-3 border-t border-border-subtle">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                      Cup Purity & Consistency (5 Cups, 2 pts / cup)
                    </span>
                    <span className="text-[10px] text-text-secondary tabular-nums">
                      Standard baseline: 10.0
                    </span>
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
                          <span className="text-[10px] text-zinc-500 ml-1.5 hidden sm:inline">
                            ({hint})
                          </span>
                        </div>
                        <span className="font-medium text-sm text-accent tabular-nums">
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

              {/* Section 4: Tasting Notes & Quick Rating */}
              <div className="p-5 rounded-xl bg-panel border border-border-subtle space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                    Tasting Impressions & Cupper's Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Vibrant peach and white tea notes, crisp malic acidity, silky finish..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent resize-none font-sans"
                  />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-4 pt-1">
                  {/* Star Rating */}
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-text-secondary mr-1.5 font-medium">Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            rating >= star
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-zinc-700'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-medium text-zinc-300 ml-1 tabular-nums">
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

              {/* Bottom Action Controls */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelEditor}
                  className="px-4 py-2.5 text-xs font-medium rounded-xl bg-panel-recessed text-zinc-300 hover:text-zinc-100 border border-border-subtle transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-zinc-950 text-xs font-semibold uppercase tracking-wider shadow-sm cursor-pointer transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Save className="w-4.5 h-4.5 shrink-0" />
                  <span>
                    {isSaving
                      ? 'Saving...'
                      : mode === 'edit'
                      ? 'Save Changes'
                      : 'Save Review'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const CuppingView = ReviewsView;
