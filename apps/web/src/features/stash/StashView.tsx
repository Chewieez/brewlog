import React, { useState, useEffect, useMemo } from 'react';
import { Button, SegmentedControl, FilterPills } from '@brewlog/ui';
import {
  Bean,
  ProcessMethod,
  RoastLevel,
  calculateBeanRestingInfo,
  offsetRoastDateForThaw,
} from '@brewlog/core';
import { Plus, Search, Star, Calendar, MapPin, Snowflake, X, Archive, Coffee } from 'lucide-react';
import { ConfirmationModal } from '../../components/shared/ConfirmationModal';
import { ModalShell } from '../../components/shared/ModalShell';
import { CellarSummaryBar } from './CellarSummaryBar';

export type ShelfType = 'active' | 'frozen' | 'archived';
export type ProcessFilter = 'all' | 'washed' | 'natural' | 'honey' | 'anaerobic';

const SHELVES: { id: ShelfType; label: string }[] = [
  { id: 'active', label: 'Active Cellar' },
  { id: 'frozen', label: 'Freezer Vault' },
  { id: 'archived', label: 'Archived' },
];

const MOBILE_PROCESS_FILTERS: { id: Exclude<ProcessFilter, 'all'>; label: string }[] = [
  { id: 'washed', label: 'Washed' },
  { id: 'natural', label: 'Natural' },
  { id: 'honey', label: 'Honey' },
  { id: 'anaerobic', label: 'Anaerobic' },
];

function matchesProcessFilter(bean: Bean, filter: Exclude<ProcessFilter, 'all'>): boolean {
  const proc = bean.process?.toLowerCase() ?? '';
  if (filter === 'anaerobic') {
    return proc === 'anaerobic' || proc.includes('anaerobic');
  }
  return proc === filter;
}

interface StashViewProps {
  beans: Bean[];
  onAddBean: (bean: Bean) => Promise<void> | void;
  onUpdateBean?: (bean: Bean) => Promise<void> | void;
  onDeleteBean?: (id: string) => Promise<void> | void;
  onSelectBeanForBrew: (bean: Bean) => void;
}

const PROCESS_OPTIONS: { label: string; value: ProcessMethod }[] = [
  { label: 'Washed', value: 'washed' },
  { label: 'Natural', value: 'natural' },
  { label: 'Honey', value: 'honey' },
  { label: 'Anaerobic Natural', value: 'anaerobic-natural' },
  { label: 'Anaerobic Washed', value: 'anaerobic-washed' },
  { label: 'Carbonic Maceration', value: 'carbonic-maceration' },
  { label: 'Wet Hulled', value: 'wet-hulled' },
  { label: 'Experimental', value: 'experimental' },
  { label: 'Other', value: 'other' },
];

const ROAST_LEVEL_OPTIONS: { label: string; value: RoastLevel }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Light-Medium', value: 'light-medium' },
  { label: 'Medium', value: 'medium' },
  { label: 'Medium-Dark', value: 'medium-dark' },
  { label: 'Dark', value: 'dark' },
];

const BAG_PRESETS = [
  { label: '250g', grams: 250 },
  { label: '340g (12oz)', grams: 340 },
  { label: '1kg', grams: 1000 },
];

export const StashView: React.FC<StashViewProps> = ({
  beans,
  onAddBean,
  onUpdateBean,
  onDeleteBean,
  onSelectBeanForBrew,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeShelf, setActiveShelf] = useState<ShelfType>('active');
  const [selectedProcess, setSelectedProcess] = useState<ProcessFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBean, setEditingBean] = useState<Bean | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [roaster, setRoaster] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [region, setRegion] = useState('');
  const [farm, setFarm] = useState('');
  const [varietyStr, setVarietyStr] = useState('');
  const [altitudeMeters, setAltitudeMeters] = useState<number | ''>('');
  const [process, setProcess] = useState<ProcessMethod>('washed');
  const [roastLevel, setRoastLevel] = useState<RoastLevel>('light');
  const [roastDate, setRoastDate] = useState(new Date().toISOString().split('T')[0]);
  const [recommendedRestDays, setRecommendedRestDays] = useState<number | ''>(5);
  const [bagWeightGrams, setBagWeightGrams] = useState<number | ''>(340);
  const [remainingGrams, setRemainingGrams] = useState<number | ''>(340);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [flavorNotesStr, setFlavorNotesStr] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDeleteConfirmOpen) return;
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isDeleteConfirmOpen]);

  const resetForm = () => {
    setName('');
    setRoaster('');
    setOriginCountry('');
    setRegion('');
    setFarm('');
    setVarietyStr('');
    setAltitudeMeters('');
    setProcess('washed');
    setRoastLevel('light');
    setRoastDate(new Date().toISOString().split('T')[0]);
    setRecommendedRestDays(5);
    setBagWeightGrams(340);
    setRemainingGrams(340);
    setIsFrozen(false);
    setIsArchived(false);
    setFlavorNotesStr('');
    setPrice('');
    setNotes('');
    setErrorMessage(null);
    setIsDeleteConfirmOpen(false);
  };

  const handleOpenAddModal = () => {
    setEditingBean(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (bean: Bean) => {
    setEditingBean(bean);
    setErrorMessage(null);
    setName(bean.name);
    setRoaster(bean.roaster);
    setOriginCountry(bean.originCountry ?? '');
    setRegion(bean.region ?? '');
    setFarm(bean.farm ?? '');
    setVarietyStr(bean.variety ? bean.variety.join(', ') : '');
    setAltitudeMeters(bean.altitudeMeters ?? '');
    setProcess(bean.process ?? 'washed');
    setRoastLevel(bean.roastLevel ?? 'light');
    setRoastDate(bean.roastDate ?? new Date().toISOString().split('T')[0]);
    setRecommendedRestDays(bean.recommendedRestDays ?? 5);
    setBagWeightGrams(bean.bagWeightGrams ?? 340);
    setRemainingGrams(bean.remainingGrams ?? 340);
    setIsFrozen(Boolean(bean.isFrozen));
    setIsArchived(Boolean(bean.isArchived));
    setFlavorNotesStr(bean.flavorNotes ? bean.flavorNotes.join(', ') : '');
    setPrice(bean.price ?? '');
    setNotes(bean.notes ?? '');
    setIsModalOpen(true);
  };

  const handleSelectPreset = (grams: number) => {
    setBagWeightGrams(grams);
    setRemainingGrams(grams);
  };

  const activeBeans = useMemo(
    () => beans.filter((b) => !b.isArchived && !b.isFrozen),
    [beans]
  );

  const frozenBeans = useMemo(
    () => beans.filter((b) => !b.isArchived && Boolean(b.isFrozen)),
    [beans]
  );

  const archivedBeans = useMemo(
    () => beans.filter((b) => Boolean(b.isArchived)),
    [beans]
  );

  const summaryMetrics = useMemo(() => {
    const totalBags = activeBeans.length;
    const peakBags = activeBeans.filter(
      (b) => calculateBeanRestingInfo(b).status === 'peak'
    ).length;
    const totalRemainingGrams = activeBeans.reduce(
      (sum, b) => sum + (b.remainingGrams ?? b.bagWeightGrams ?? 0),
      0
    );
    return { totalBags, peakBags, totalRemainingGrams };
  }, [activeBeans]);

  const currentShelfBeans = useMemo(() => {
    switch (activeShelf) {
      case 'frozen':
        return frozenBeans;
      case 'archived':
        return archivedBeans;
      case 'active':
      default:
        return activeBeans;
    }
  }, [activeShelf, activeBeans, frozenBeans, archivedBeans]);

  const availableProcessOptions = useMemo(() => {
    const present = MOBILE_PROCESS_FILTERS.filter((proc) =>
      currentShelfBeans.some((bean) => matchesProcessFilter(bean, proc.id))
    );
    return [
      { value: 'all' as ProcessFilter, label: 'All' },
      ...present.map((proc) => ({
        value: proc.id as ProcessFilter,
        label: proc.label,
      })),
    ];
  }, [currentShelfBeans]);

  const effectiveProcess: ProcessFilter = useMemo(
    () =>
      availableProcessOptions.some((opt) => opt.value === selectedProcess)
        ? selectedProcess
        : 'all',
    [availableProcessOptions, selectedProcess]
  );

  useEffect(() => {
    if (selectedProcess !== effectiveProcess) {
      setSelectedProcess(effectiveProcess);
    }
  }, [selectedProcess, effectiveProcess]);

  const filteredBeans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return currentShelfBeans.filter((b) => {
      if (effectiveProcess !== 'all' && !matchesProcessFilter(b, effectiveProcess)) {
        return false;
      }

      if (!q) return true;

      const matchesName = b.name.toLowerCase().includes(q);
      const matchesRoaster = b.roaster.toLowerCase().includes(q);
      const matchesOrigin = (b.originCountry || '').toLowerCase().includes(q);
      const matchesRegion = (b.region || '').toLowerCase().includes(q);
      const matchesFarm = (b.farm || '').toLowerCase().includes(q);
      const matchesNotes =
        b.flavorNotes?.some((n) => n.toLowerCase().includes(q)) ?? false;
      const matchesVariety = Array.isArray(b.variety)
        ? b.variety.some((v) => v.toLowerCase().includes(q))
        : false;

      return (
        matchesName ||
        matchesRoaster ||
        matchesOrigin ||
        matchesRegion ||
        matchesFarm ||
        matchesNotes ||
        matchesVariety
      );
    });
  }, [currentShelfBeans, effectiveProcess, searchQuery]);

  const handleSubmitBean = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roaster.trim()) return;
    setIsSaving(true);
    setErrorMessage(null);

    const parsedBagWeight = bagWeightGrams !== '' ? Number(bagWeightGrams) : 340;
    const parsedRemaining = remainingGrams !== '' ? Number(remainingGrams) : parsedBagWeight;
    const parsedAltitude = altitudeMeters !== '' ? Number(altitudeMeters) : undefined;
    const parsedPrice = price !== '' ? Number(price) : undefined;
    const parsedRestDays = recommendedRestDays !== '' ? Number(recommendedRestDays) : 5;

    const isUnfreezing = Boolean(editingBean?.isFrozen && !isFrozen);
    const computedRoastDate =
      isUnfreezing && editingBean?.roastDate && editingBean?.frozenDate
        ? offsetRoastDateForThaw(editingBean.roastDate, editingBean.frozenDate)
        : (roastDate || undefined);

    const beanData: Bean = {
      id: editingBean ? editingBean.id : 'bean-' + Date.now(),
      userId: editingBean?.userId,
      name: name.trim(),
      roaster: roaster.trim(),
      originCountry: originCountry.trim() || undefined,
      region: region.trim() || undefined,
      farm: farm.trim() || undefined,
      variety: varietyStr.split(',').map((v) => v.trim()).filter(Boolean),
      altitudeMeters: parsedAltitude,
      process: process || undefined,
      roastLevel: roastLevel || undefined,
      roastDate: computedRoastDate,
      recommendedRestDays: parsedRestDays,
      bagWeightGrams: parsedBagWeight,
      bagWeightOz: Number((parsedBagWeight / 28.3495).toFixed(1)),
      remainingGrams: parsedRemaining,
      isFrozen,
      frozenDate: isFrozen
        ? (editingBean?.frozenDate || new Date().toISOString().split('T')[0])
        : undefined,
      flavorNotes: flavorNotesStr.split(',').map((s) => s.trim()).filter(Boolean),
      price: parsedPrice,
      notes: notes.trim() || undefined,
      rating: editingBean?.rating,
      isFavorite: editingBean?.isFavorite ?? false,
      isArchived,
      createdAt: editingBean ? editingBean.createdAt : new Date().toISOString(),
    };

    try {
      if (editingBean && onUpdateBean) {
        await onUpdateBean(beanData);
      } else {
        await onAddBean(beanData);
      }
      setIsModalOpen(false);
      setEditingBean(null);
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save bean.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBean || !onDeleteBean) return;
    setIsDeleting(true);
    try {
      await onDeleteBean(editingBean.id);
      setIsDeleteConfirmOpen(false);
      setIsModalOpen(false);
      setEditingBean(null);
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete bean.';
      setErrorMessage(msg);
      setIsDeleteConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const getRestingStatusBadgeClass = (
    status: 'resting' | 'peak' | 'aging' | 'past-peak',
    frozen: boolean,
    hasRoastDate: boolean = true
  ) => {
    if (!hasRoastDate) {
      return 'bg-panel-recessed text-foreground-muted border border-border-subtle';
    }
    if (frozen) {
      return 'bg-sky-100 dark:bg-sky-950/70 text-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30';
    }
    switch (status) {
      case 'peak':
        return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30';
      case 'resting':
        return 'bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30';
      case 'aging':
        return 'bg-orange-100 dark:bg-orange-950/70 text-orange-950 dark:text-orange-300 border border-orange-300 dark:border-orange-500/30';
      case 'past-peak':
      default:
        return 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700';
    }
  };

  const renderEmptyState = () => {
    if (searchQuery.trim().length > 0 || effectiveProcess !== 'all') {
      return (
        <div className="p-8 rounded-xl bg-panel border border-dashed border-border-subtle text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-panel-recessed border border-border-subtle flex items-center justify-center">
            <Search className="w-5 h-5 text-foreground-muted" />
          </div>
          <p className="text-xs text-foreground-muted font-mono">
            No coffee beans found matching your search.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedProcess('all');
            }}
            label="CLEAR FILTERS"
          />
        </div>
      );
    }

    if (activeShelf === 'frozen') {
      return (
        <div className="p-8 rounded-xl bg-panel border border-dashed border-border-subtle text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-panel-recessed border border-border-subtle flex items-center justify-center">
            <Snowflake className="w-5 h-5 text-accent" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-foreground">Freezer Vault is Empty</h2>
            <p className="text-xs text-foreground-muted max-w-sm">
              Freeze coffees at their peak resting window to preserve freshness and halt oxidation.
            </p>
          </div>
        </div>
      );
    }

    if (activeShelf === 'archived') {
      return (
        <div className="p-8 rounded-xl bg-panel border border-dashed border-border-subtle text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-panel-recessed border border-border-subtle flex items-center justify-center">
            <Archive className="w-5 h-5 text-foreground-muted" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-foreground">No Archived Coffees</h2>
            <p className="text-xs text-foreground-muted max-w-sm">
              Finished bags and past coffees you archive will be preserved here for reference.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8 rounded-xl bg-panel border border-dashed border-border-subtle text-center flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-panel-recessed border border-border-subtle flex items-center justify-center">
          <Coffee className="w-5 h-5 text-accent" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-foreground">Cellar is Empty</h2>
          <p className="text-xs text-foreground-muted max-w-sm">
            Add a bag of coffee to track roast date, resting curve, and remaining gram weight.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenAddModal}
          label="ADD YOUR FIRST BEAN"
        />
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Coffee Bean Stash</h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            Track origins, roast dates, and peak resting windows for your whole beans.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenAddModal}
          label="ADD BEAN"
        />
      </div>

      {/* Cellar Metrics Summary */}
      <CellarSummaryBar
        totalBags={summaryMetrics.totalBags}
        peakBags={summaryMetrics.peakBags}
        totalRemainingGrams={summaryMetrics.totalRemainingGrams}
      />

      {/* Search, Shelf Selector & Process Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Search by coffee name, roaster, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search coffees"
            className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-panel border border-border-subtle text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent/60 transition-colors"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-panel-recessed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <SegmentedControl<ShelfType>
          fullWidth
          size="sm"
          role="tablist"
          value={activeShelf}
          onChange={setActiveShelf}
          ariaLabel="Shelf selector"
          testID="stash-shelf-selector"
          options={SHELVES.map((shelf) => ({
            value: shelf.id,
            label: shelf.label,
          }))}
        />

        {availableProcessOptions.length > 1 && (
          <FilterPills<ProcessFilter>
            size="sm"
            value={effectiveProcess}
            onChange={setSelectedProcess}
            options={availableProcessOptions}
            ariaLabel="Filter by process method"
            testID="stash-process-filters"
          />
        )}
      </div>

      {/* Beans Grid */}
      {filteredBeans.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBeans.map((bean) => {
            const restInfo = calculateBeanRestingInfo(bean);

            return (
              <div
                key={bean.id}
                data-testid="stash-bean-card"
                className="p-5 rounded-xl bg-panel border border-border-subtle hover:border-border-active transition-all duration-200 flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-accent uppercase tracking-wider font-mono">
                          {bean.roaster}
                        </span>
                        {bean.isFrozen && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/30">
                            <Snowflake className="w-3 h-3" />
                            FROZEN
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-foreground group-hover:text-accent transition-colors mt-0.5 tracking-tight">
                        {bean.name}
                      </h3>
                    </div>

                    {bean.rating && (
                      <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-panel-recessed text-accent text-xs font-mono font-bold border border-border-subtle">
                        <Star className="w-3 h-3 fill-accent text-accent" />
                        <span>{bean.rating}</span>
                      </div>
                    )}
                  </div>

                  {/* Origin & Specs */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground-secondary mt-2">
                    {(bean.originCountry || bean.region) && (
                      <div className="flex items-center space-x-1" data-testid="bean-origin">
                        <MapPin className="w-3.5 h-3.5 text-foreground-secondary" />
                        <span>{[bean.originCountry, bean.region].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {bean.process && (
                      <>
                        <span className="text-foreground-muted">•</span>
                        <span className="capitalize font-mono text-[11px] text-foreground-secondary">
                          {bean.process.replace('-', ' ')}
                        </span>
                      </>
                    )}
                    {bean.roastLevel && (
                      <>
                        <span className="text-foreground-muted">•</span>
                        <span className="capitalize font-mono text-[11px] text-foreground-secondary">
                          {bean.roastLevel}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Resting Status Badge */}
                  <div
                    data-testid="stash-resting-panel"
                    className="mt-4 p-2.5 rounded-lg bg-panel-recessed border border-border-subtle flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2 tabular-nums text-xs font-mono">
                      {bean.isFrozen ? (
                        <Snowflake className="w-3.5 h-3.5 text-sky-500" />
                      ) : (
                        <Calendar className="w-3.5 h-3.5 text-foreground-secondary" />
                      )}
                      <span>
                        {!bean.roastDate ? (
                          <span className="text-foreground-muted">No roast date</span>
                        ) : bean.isFrozen ? (
                          <span className="font-bold text-foreground">
                            Frozen at Day {restInfo.effectiveDays}
                          </span>
                        ) : (
                          <>
                            <span className="font-bold text-foreground">{restInfo.effectiveDays}</span>
                            <span className="text-foreground-secondary"> days off roast</span>
                          </>
                        )}
                      </span>
                    </div>
                    <span
                      data-testid="stash-resting-badge"
                      className={`text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md ${getRestingStatusBadgeClass(
                        restInfo.status,
                        Boolean(bean.isFrozen),
                        Boolean(bean.roastDate)
                      )}`}
                    >
                      {restInfo.stageLabel}
                    </span>
                  </div>

                  {/* Flavor Notes */}
                  {bean.flavorNotes && bean.flavorNotes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {bean.flavorNotes.map((note, i) => (
                        <span
                          key={i}
                          className="bg-panel-recessed border border-border-subtle px-2.5 py-0.5 rounded-md text-[11px] font-medium text-foreground-secondary"
                        >
                          {note}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Card Action & Weight */}
                <div className="mt-5 pt-3 border-t border-border-subtle flex items-center justify-between">
                  <span className="text-xs tabular-nums text-foreground-secondary">
                    {bean.remainingGrams !== undefined
                      ? `${bean.remainingGrams}g remaining`
                      : bean.bagWeightGrams !== undefined
                      ? `${bean.bagWeightGrams}g`
                      : bean.bagWeightOz !== undefined
                      ? `${bean.bagWeightOz} oz`
                      : '12 oz'}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(bean)}
                      aria-label={`Edit ${bean.name}`}
                      className="btn-tactile-secondary h-8 px-3 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold inline-flex items-center justify-center cursor-pointer"
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => onSelectBeanForBrew(bean)}
                      aria-label={`Brew with ${bean.name}`}
                      className="btn-tactile-primary h-8 px-3 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold inline-flex items-center justify-center cursor-pointer"
                    >
                      BREW →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Bean Modal */}
      <ModalShell
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBean ? 'Edit Coffee Bean' : 'Add New Whole Bean'}
        subtitle={
          editingBean
            ? 'Update coffee origin, resting window, and remaining bag inventory.'
            : 'Track roast date, origin terroir, resting window, and bag inventory.'
        }
        icon={<Coffee className="w-5 h-5" />}
        titleId="add-bean-modal-title"
        headingLevel={3}
        closeButtonLabel="Close dialog"
        maxWidthClassName="max-w-xl"
        bodyClassName="space-y-4"
        formClassName="text-sm"
        footerClassName="justify-between"
        testIdPrefix="stash-bean-modal"
        onSubmit={handleSubmitBean}
        alert={
          errorMessage ? (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {errorMessage}
            </div>
          ) : undefined
        }
        footer={
          <>
            {editingBean && onDeleteBean ? (
              <Button
                type="button"
                variant="danger"
                size="md"
                disabled={isDeleting || isSaving}
                loading={isDeleting}
                onClick={() => setIsDeleteConfirmOpen(true)}
                label={isDeleting ? 'DELETING...' : 'DELETE BEAN'}
              />
            ) : (
              <div />
            )}

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsModalOpen(false)}
                label="CANCEL"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSaving || isDeleting}
                loading={isSaving}
                label={isSaving ? 'SAVING...' : editingBean ? 'SAVE CHANGES' : 'SAVE BEAN'}
              />
            </div>
          </>
        }
      >
              {/* Section 1: Coffee Identity */}
              <div className="space-y-3">
                <span className="text-[11px] font-mono font-bold text-accent tracking-wider uppercase">
                  COFFEE IDENTITY
                </span>
                <div>
                  <label htmlFor="add-bean-roaster" className="block text-xs font-medium text-foreground-secondary mb-1">
                    Roaster Name <span className="text-accent font-bold">*</span>
                  </label>
                  <input
                    id="add-bean-roaster"
                    type="text"
                    required
                    placeholder="e.g. Sey Coffee, Onyx, Tim Wendelboe"
                    value={roaster}
                    onChange={(e) => setRoaster(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground placeholder:text-foreground-muted text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="add-bean-name" className="block text-xs font-medium text-foreground-secondary mb-1">
                    Coffee / Lot Name <span className="text-accent font-bold">*</span>
                  </label>
                  <input
                    id="add-bean-name"
                    type="text"
                    required
                    placeholder="e.g. Worka Sakaro, Southern Weather"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground placeholder:text-foreground-muted text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              {/* Section 2: Origin & Terroir */}
              <div className="space-y-3 pt-2 border-t border-border-subtle">
                <span className="text-[11px] font-mono font-bold text-accent tracking-wider uppercase">
                  ORIGIN & TERROIR
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="add-bean-origin-country" className="block text-xs font-medium text-foreground-secondary mb-1">
                      Origin Country
                    </label>
                    <input
                      id="add-bean-origin-country"
                      type="text"
                      placeholder="e.g. Ethiopia, Colombia"
                      value={originCountry}
                      onChange={(e) => setOriginCountry(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground placeholder:text-foreground-muted text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-bean-region" className="block text-xs font-medium text-foreground-secondary mb-1">
                      Region
                    </label>
                    <input
                      id="add-bean-region"
                      type="text"
                      placeholder="e.g. Yirgacheffe, Huila"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground placeholder:text-foreground-muted text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="add-bean-farm" className="block text-xs font-medium text-foreground-secondary mb-1">
                      Farm / Producer
                    </label>
                    <input
                      id="add-bean-farm"
                      type="text"
                      placeholder="e.g. Finca El Paraiso"
                      value={farm}
                      onChange={(e) => setFarm(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground placeholder:text-foreground-muted text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-bean-variety" className="block text-xs font-medium text-foreground-secondary mb-1">
                      Variety
                    </label>
                    <input
                      id="add-bean-variety"
                      type="text"
                      placeholder="e.g. Gesha, Bourbon"
                      value={varietyStr}
                      onChange={(e) => setVarietyStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground placeholder:text-foreground-muted text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-bean-altitude" className="block text-xs font-medium text-foreground-secondary mb-1">
                      Altitude (m)
                    </label>
                    <input
                      id="add-bean-altitude"
                      type="number"
                      min="0"
                      placeholder="e.g. 1950"
                      value={altitudeMeters}
                      onChange={(e) =>
                        setAltitudeMeters(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground placeholder:text-foreground-muted text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Processing & Roast */}
              <div className="space-y-3 pt-2 border-t border-border-subtle">
                <span className="text-[11px] font-mono font-bold text-accent tracking-wider uppercase">
                  PROCESSING & ROAST
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="add-bean-process" className="block text-xs font-medium text-foreground-secondary mb-1">
                      Process Method
                    </label>
                    <select
                      id="add-bean-process"
                      value={process}
                      onChange={(e) => setProcess(e.target.value as ProcessMethod)}
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground text-sm focus:outline-none focus:border-accent transition-colors cursor-pointer"
                    >
                      {PROCESS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-panel-recessed text-foreground">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="add-bean-roast-level" className="block text-xs font-medium text-foreground-secondary mb-1">
                      Roast Level
                    </label>
                    <select
                      id="add-bean-roast-level"
                      value={roastLevel}
                      onChange={(e) => setRoastLevel(e.target.value as RoastLevel)}
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground text-sm focus:outline-none focus:border-accent transition-colors cursor-pointer"
                    >
                      {ROAST_LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-panel-recessed text-foreground">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="add-bean-roast-date" className="block text-xs font-medium text-foreground-secondary mb-1">
                      Roast Date
                    </label>
                    <input
                      id="add-bean-roast-date"
                      type="date"
                      value={roastDate}
                      onChange={(e) => setRoastDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-bean-rest-days" className="block text-xs font-medium text-foreground-secondary mb-1">
                      Recommended Rest Days
                    </label>
                    <input
                      id="add-bean-rest-days"
                      type="number"
                      placeholder="5"
                      min="0"
                      value={recommendedRestDays}
                      onChange={(e) =>
                        setRecommendedRestDays(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground placeholder:text-foreground-muted text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Inventory & Freezer */}
              <div className="space-y-3 pt-2 border-t border-border-subtle">
                <span className="text-[11px] font-mono font-bold text-accent tracking-wider uppercase">
                  INVENTORY & CELLAR
                </span>

                <div>
                  <label className="block text-xs font-medium text-foreground-secondary mb-1">
                    Bag Presets
                  </label>
                  <div className="flex gap-2">
                    {BAG_PRESETS.map((preset) => (
                      <button
                        key={preset.grams}
                        type="button"
                        onClick={() => handleSelectPreset(preset.grams)}
                        className={`h-8 px-3 rounded-lg text-xs font-mono font-medium inline-flex items-center justify-center transition-colors cursor-pointer ${
                          bagWeightGrams === preset.grams
                            ? 'btn-tactile-primary font-bold'
                            : 'btn-tactile-secondary text-foreground-secondary'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="add-bean-bag-weight" className="block text-xs font-medium text-foreground-secondary mb-1">
                      Bag Weight (grams)
                    </label>
                    <input
                      id="add-bean-bag-weight"
                      type="number"
                      min="0"
                      aria-label="Bag Weight (grams)"
                      placeholder="340"
                      value={bagWeightGrams}
                      onChange={(e) =>
                        setBagWeightGrams(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground placeholder:text-foreground-muted text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-bean-remaining-weight" className="block text-xs font-medium text-foreground-secondary mb-1">
                      Remaining Weight (grams)
                    </label>
                    <input
                      id="add-bean-remaining-weight"
                      type="number"
                      min="0"
                      aria-label="Remaining Weight (grams)"
                      placeholder="340"
                      value={remainingGrams}
                      onChange={(e) =>
                        setRemainingGrams(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground placeholder:text-foreground-muted text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                {/* Freezer Vault Toggle */}
                <label htmlFor="add-bean-is-frozen" className="flex items-center space-x-3 p-3 rounded-lg bg-panel-recessed border border-border-subtle cursor-pointer hover:border-accent/40 transition-colors">
                  <input
                    id="add-bean-is-frozen"
                    type="checkbox"
                    checked={isFrozen}
                    onChange={(e) => setIsFrozen(e.target.checked)}
                    className="w-4 h-4 rounded text-accent focus:ring-accent bg-panel border-border-subtle"
                  />
                  <div className="flex items-center space-x-2">
                    <Snowflake className={`w-4 h-4 ${isFrozen ? 'text-sky-500' : 'text-foreground-muted'}`} />
                    <div>
                      <span className="block text-xs font-bold text-foreground uppercase font-mono">
                        Freezer Vault Storage
                      </span>
                      <span className="block text-[11px] text-foreground-secondary">
                        Pauses aging degradation while preserved at sub-zero temperatures.
                      </span>
                    </div>
                  </div>
                </label>

                {editingBean && (
                  <label htmlFor="add-bean-is-archived" className="flex items-center space-x-3 p-3 rounded-lg bg-panel-recessed border border-border-subtle cursor-pointer hover:border-accent/40 transition-colors">
                    <input
                      id="add-bean-is-archived"
                      type="checkbox"
                      checked={isArchived}
                      onChange={(e) => setIsArchived(e.target.checked)}
                      className="w-4 h-4 rounded text-accent focus:ring-accent bg-panel border-border-subtle"
                    />
                    <div className="flex items-center space-x-2">
                      <Archive className={`w-4 h-4 ${isArchived ? 'text-accent' : 'text-foreground-muted'}`} />
                      <div>
                        <span className="block text-xs font-bold text-foreground uppercase font-mono">
                          Archive Bean
                        </span>
                        <span className="block text-[11px] text-foreground-secondary">
                          Move finished or past coffees out of the active cellar into the Archived shelf.
                        </span>
                      </div>
                    </div>
                  </label>
                )}
              </div>

              {/* Section 5: Tasting Notes & Price */}
              <div className="space-y-3 pt-2 border-t border-border-subtle">
                <span className="text-[11px] font-mono font-bold text-accent tracking-wider uppercase">
                  TASTING & NOTES
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="add-bean-flavor-notes" className="block text-xs font-medium text-foreground-secondary mb-1">
                      Flavor Notes (Comma separated)
                    </label>
                    <input
                      id="add-bean-flavor-notes"
                      type="text"
                      placeholder="e.g. Jasmine, Peach, Bergamot, Honey"
                      value={flavorNotesStr}
                      onChange={(e) => setFlavorNotesStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground placeholder:text-foreground-muted text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-bean-price" className="block text-xs font-medium text-foreground-secondary mb-1">
                      Price ($)
                    </label>
                    <input
                      id="add-bean-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="24.00"
                      value={price}
                      onChange={(e) =>
                        setPrice(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground placeholder:text-foreground-muted text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="add-bean-notes" className="block text-xs font-medium text-foreground-secondary mb-1">
                    Notes & Impressions
                  </label>
                  <textarea
                    id="add-bean-notes"
                    rows={2}
                    placeholder="Tasting impressions, brew ratio recommendations, grinder settings..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-panel-recessed border border-border-subtle text-foreground placeholder:text-foreground-muted text-sm focus:outline-none focus:border-accent transition-colors resize-none"
                  />
                </div>
              </div>
      </ModalShell>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        title="Delete Coffee Bean?"
        message={
          <>
            Are you sure you want to delete{' '}
            <strong className="text-foreground">"{editingBean?.name}"</strong> from your stash? This action cannot be undone.
          </>
        }
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Bean'}
        variant="danger"
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};
