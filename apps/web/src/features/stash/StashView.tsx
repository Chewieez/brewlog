import React, { useState, useEffect } from 'react';
import {
  Bean,
  ProcessMethod,
  RoastLevel,
  calculateBeanRestingInfo,
  offsetRoastDateForThaw,
} from '@brewlog/core';
import { Plus, Search, Star, Calendar, MapPin, Snowflake } from 'lucide-react';
import { ConfirmationModal } from '../../components/shared/ConfirmationModal';

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
  const [selectedProcess, setSelectedProcess] = useState<string>('all');
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
    setFlavorNotesStr(bean.flavorNotes ? bean.flavorNotes.join(', ') : '');
    setPrice(bean.price ?? '');
    setNotes(bean.notes ?? '');
    setIsModalOpen(true);
  };

  const handleSelectPreset = (grams: number) => {
    setBagWeightGrams(grams);
    setRemainingGrams(grams);
  };

  const filteredBeans = beans.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.roaster.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.originCountry || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.region || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProcess = selectedProcess === 'all' || b.process === selectedProcess;
    return matchesSearch && matchesProcess;
  });

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
      isArchived: editingBean?.isArchived ?? false,
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
      return 'bg-zinc-700 text-zinc-300';
    }
    if (frozen) {
      return 'bg-sky-500 text-zinc-950';
    }
    switch (status) {
      case 'peak':
        return 'bg-emerald-500 text-zinc-950';
      case 'resting':
        return 'bg-amber-500 text-zinc-950';
      case 'aging':
        return 'bg-orange-500 text-zinc-950';
      case 'past-peak':
      default:
        return 'bg-slate-600 text-zinc-100';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Coffee Bean Stash</h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Track origins, roast dates, and peak resting windows for your whole beans.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-mono text-xs uppercase tracking-wider font-bold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ADD BEAN</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by coffee name, roaster, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-panel border border-border-subtle text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent/60 transition-colors"
          />
        </div>

        <select
          value={selectedProcess}
          onChange={(e) => setSelectedProcess(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-panel border border-border-subtle text-sm text-zinc-100 focus:outline-none focus:border-accent/60 transition-colors cursor-pointer"
        >
          <option value="all" className="bg-panel text-zinc-100">All Processes</option>
          {PROCESS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-panel text-zinc-100">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Beans Grid */}
      {filteredBeans.length === 0 ? (
        <div className="p-8 rounded-2xl bg-panel border border-dashed border-border-subtle text-center text-xs text-zinc-500 font-mono">
          No coffee beans found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBeans.map((bean) => {
            const restInfo = calculateBeanRestingInfo(bean);

            return (
              <div
                key={bean.id}
                className="p-5 rounded-2xl bg-panel border border-border-subtle hover:border-zinc-700 transition-all duration-200 flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-accent uppercase tracking-wider font-mono">
                          {bean.roaster}
                        </span>
                        {bean.isFrozen && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                            <Snowflake className="w-3 h-3" />
                            FROZEN
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-zinc-100 group-hover:text-accent transition-colors mt-0.5 tracking-tight">
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
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400 mt-2">
                    {(bean.originCountry || bean.region) && (
                      <div className="flex items-center space-x-1" data-testid="bean-origin">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{[bean.originCountry, bean.region].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {bean.process && (
                      <>
                        <span className="text-zinc-600">•</span>
                        <span className="capitalize font-mono text-[11px] text-zinc-300">
                          {bean.process.replace('-', ' ')}
                        </span>
                      </>
                    )}
                    {bean.roastLevel && (
                      <>
                        <span className="text-zinc-600">•</span>
                        <span className="capitalize font-mono text-[11px] text-zinc-400">
                          {bean.roastLevel}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Resting Status Badge */}
                  <div className="mt-4 p-2.5 rounded-xl bg-panel-recessed flex items-center justify-between">
                    <div className="flex items-center space-x-2 tabular-nums text-xs text-zinc-300">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>
                        {!bean.roastDate
                          ? 'No roast date'
                          : bean.isFrozen
                          ? `Frozen at Day ${restInfo.effectiveDays}`
                          : `${restInfo.effectiveDays} days off roast`}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${getRestingStatusBadgeClass(
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
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700"
                        >
                          {note}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Card Action & Weight */}
                <div className="mt-5 pt-3 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-xs tabular-nums text-zinc-400">
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
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-300 hover:text-zinc-100 text-xs font-mono uppercase tracking-wider font-semibold transition-colors cursor-pointer shadow-sm"
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => onSelectBeanForBrew(bean)}
                      aria-label={`Brew with ${bean.name}`}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-mono uppercase tracking-wider font-semibold transition-colors cursor-pointer shadow-sm"
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
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-bean-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-panel border border-border-subtle shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800 sticky top-0 bg-panel z-10">
              <h3 id="add-bean-modal-title" className="text-lg font-bold text-zinc-100">
                {editingBean ? 'Edit Coffee Bean' : 'Add New Whole Bean'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitBean} className="space-y-4 text-sm">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Section 1: Coffee Identity */}
              <div className="space-y-3">
                <span className="text-[11px] font-mono font-bold text-accent tracking-wider uppercase">
                  COFFEE IDENTITY
                </span>
                <div>
                  <label htmlFor="add-bean-roaster" className="block text-xs font-medium text-zinc-300 mb-1">
                    Roaster Name <span className="text-accent font-bold">*</span>
                  </label>
                  <input
                    id="add-bean-roaster"
                    type="text"
                    required
                    placeholder="e.g. Sey Coffee, Onyx, Tim Wendelboe"
                    value={roaster}
                    onChange={(e) => setRoaster(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="add-bean-name" className="block text-xs font-medium text-zinc-300 mb-1">
                    Coffee / Lot Name <span className="text-accent font-bold">*</span>
                  </label>
                  <input
                    id="add-bean-name"
                    type="text"
                    required
                    placeholder="e.g. Worka Sakaro, Southern Weather"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>

              {/* Section 2: Origin & Terroir */}
              <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-mono font-bold text-accent tracking-wider uppercase">
                  ORIGIN & TERROIR
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="add-bean-origin-country" className="block text-xs font-medium text-zinc-300 mb-1">
                      Origin Country
                    </label>
                    <input
                      id="add-bean-origin-country"
                      type="text"
                      placeholder="e.g. Ethiopia, Colombia"
                      value={originCountry}
                      onChange={(e) => setOriginCountry(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-bean-region" className="block text-xs font-medium text-zinc-300 mb-1">
                      Region
                    </label>
                    <input
                      id="add-bean-region"
                      type="text"
                      placeholder="e.g. Yirgacheffe, Huila"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="add-bean-farm" className="block text-xs font-medium text-zinc-300 mb-1">
                      Farm / Producer
                    </label>
                    <input
                      id="add-bean-farm"
                      type="text"
                      placeholder="e.g. Finca El Paraiso"
                      value={farm}
                      onChange={(e) => setFarm(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-bean-variety" className="block text-xs font-medium text-zinc-300 mb-1">
                      Variety
                    </label>
                    <input
                      id="add-bean-variety"
                      type="text"
                      placeholder="e.g. Gesha, Bourbon"
                      value={varietyStr}
                      onChange={(e) => setVarietyStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-bean-altitude" className="block text-xs font-medium text-zinc-300 mb-1">
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
                      className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Processing & Roast */}
              <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-mono font-bold text-accent tracking-wider uppercase">
                  PROCESSING & ROAST
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="add-bean-process" className="block text-xs font-medium text-zinc-300 mb-1">
                      Process Method
                    </label>
                    <select
                      id="add-bean-process"
                      value={process}
                      onChange={(e) => setProcess(e.target.value as ProcessMethod)}
                      className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 text-sm focus:outline-none focus:border-accent transition-colors cursor-pointer"
                    >
                      {PROCESS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-panel-recessed text-zinc-100">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="add-bean-roast-level" className="block text-xs font-medium text-zinc-300 mb-1">
                      Roast Level
                    </label>
                    <select
                      id="add-bean-roast-level"
                      value={roastLevel}
                      onChange={(e) => setRoastLevel(e.target.value as RoastLevel)}
                      className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 text-sm focus:outline-none focus:border-accent transition-colors cursor-pointer"
                    >
                      {ROAST_LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-panel-recessed text-zinc-100">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="add-bean-roast-date" className="block text-xs font-medium text-zinc-300 mb-1">
                      Roast Date
                    </label>
                    <input
                      id="add-bean-roast-date"
                      type="date"
                      value={roastDate}
                      onChange={(e) => setRoastDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-bean-rest-days" className="block text-xs font-medium text-zinc-300 mb-1">
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
                      className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Inventory & Freezer */}
              <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-mono font-bold text-accent tracking-wider uppercase">
                  INVENTORY & CELLAR
                </span>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Bag Presets
                  </label>
                  <div className="flex gap-2">
                    {BAG_PRESETS.map((preset) => (
                      <button
                        key={preset.grams}
                        type="button"
                        onClick={() => handleSelectPreset(preset.grams)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                          bagWeightGrams === preset.grams
                            ? 'bg-accent text-zinc-950 border-accent font-bold'
                            : 'bg-panel-recessed text-zinc-300 border-border-subtle hover:border-zinc-600'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="add-bean-bag-weight" className="block text-xs font-medium text-zinc-300 mb-1">
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
                      className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-bean-remaining-weight" className="block text-xs font-medium text-zinc-300 mb-1">
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
                      className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                {/* Freezer Vault Toggle */}
                <label htmlFor="add-bean-is-frozen" className="flex items-center space-x-3 p-3 rounded-xl bg-panel-recessed border border-border-subtle cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    id="add-bean-is-frozen"
                    type="checkbox"
                    checked={isFrozen}
                    onChange={(e) => setIsFrozen(e.target.checked)}
                    className="w-4 h-4 rounded text-accent focus:ring-accent focus:ring-offset-zinc-900 bg-panel border-zinc-700"
                  />
                  <div className="flex items-center space-x-2">
                    <Snowflake className={`w-4 h-4 ${isFrozen ? 'text-sky-400' : 'text-zinc-500'}`} />
                    <div>
                      <span className="block text-xs font-bold text-zinc-200 uppercase font-mono">
                        Freezer Vault Storage
                      </span>
                      <span className="block text-[11px] text-zinc-400">
                        Pauses aging degradation while preserved at sub-zero temperatures.
                      </span>
                    </div>
                  </div>
                </label>
              </div>

              {/* Section 5: Tasting Notes & Price */}
              <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-mono font-bold text-accent tracking-wider uppercase">
                  TASTING & NOTES
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="add-bean-flavor-notes" className="block text-xs font-medium text-zinc-300 mb-1">
                      Flavor Notes (Comma separated)
                    </label>
                    <input
                      id="add-bean-flavor-notes"
                      type="text"
                      placeholder="e.g. Jasmine, Peach, Bergamot, Honey"
                      value={flavorNotesStr}
                      onChange={(e) => setFlavorNotesStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-bean-price" className="block text-xs font-medium text-zinc-300 mb-1">
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
                      className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="add-bean-notes" className="block text-xs font-medium text-zinc-300 mb-1">
                    Notes & Impressions
                  </label>
                  <textarea
                    id="add-bean-notes"
                    rows={2}
                    placeholder="Tasting impressions, brew ratio recommendations, grinder settings..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                {editingBean && onDeleteBean ? (
                  <button
                    type="button"
                    disabled={isDeleting || isSaving}
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? 'DELETING...' : 'DELETE BEAN'}
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-zinc-100 font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isDeleting}
                    className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-mono text-xs uppercase tracking-wider font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? 'SAVING...' : editingBean ? 'SAVE CHANGES' : 'SAVE BEAN'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        title="Delete Coffee Bean?"
        message={
          <>
            Are you sure you want to delete{' '}
            <strong className="text-zinc-200">"{editingBean?.name}"</strong> from your stash? This action cannot be undone.
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
