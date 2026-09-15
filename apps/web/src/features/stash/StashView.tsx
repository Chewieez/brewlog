import React, { useState } from 'react';
import { Bean, calculateDaysOffRoast, getRestingStatus, ProcessMethod, RoastLevel } from '@brewlog/core';
import { Plus, Search, Star, Calendar, MapPin } from 'lucide-react';

interface StashViewProps {
  beans: Bean[];
  onAddBean: (bean: Bean) => void;
  onSelectBeanForBrew: (bean: Bean) => void;
}

export const StashView: React.FC<StashViewProps> = ({ beans, onAddBean, onSelectBeanForBrew }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProcess, setSelectedProcess] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [roaster, setRoaster] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [region, setRegion] = useState('');
  const [process, setProcess] = useState<ProcessMethod>('washed');
  const [roastLevel, setRoastLevel] = useState<RoastLevel>('light');
  const [roastDate, setRoastDate] = useState(new Date().toISOString().split('T')[0]);
  const [flavorNotesStr, setFlavorNotesStr] = useState('');
  const [bagWeightOz, setBagWeightOz] = useState<number | "">(12);
  const [isSaving, setIsSaving] = useState(false);

  const filteredBeans = beans.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.roaster.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.originCountry || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProcess = selectedProcess === 'all' || b.process === selectedProcess;
    return matchesSearch && matchesProcess;
  });

  const handleSubmitNewBean = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roaster.trim()) return;
    setIsSaving(true);

    const newBean: Bean = {
      id: 'bean-' + Date.now(),
      name,
      roaster,
      originCountry,
      region,
      process,
      roastLevel,
      roastDate,
      flavorNotes: flavorNotesStr.split(',').map((s) => s.trim()).filter(Boolean),
      bagWeightGrams: bagWeightOz ? Math.round(Number(bagWeightOz) * 28.3495) : 340,
      bagWeightOz: bagWeightOz ? Number(bagWeightOz) : 12,
      remainingGrams: bagWeightOz ? Math.round(Number(bagWeightOz) * 28.3495) : 340,
      createdAt: new Date().toISOString(),
    };

    onAddBean(newBean);
    setIsModalOpen(false);
    setIsSaving(false);
    // Reset
    setName('');
    setRoaster('');
    setOriginCountry('');
    setRegion('');
    setFlavorNotesStr('');
  };

  const getRestingStatusBadgeClass = (status: "resting" | "peak" | "aging" | "past-peak") => {
    switch (status) {
      case 'peak':
        return 'bg-emerald-500 text-zinc-950';
      case 'resting':
      case 'aging':
        return 'bg-amber-500 text-zinc-950';
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
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-[#d97736] hover:bg-[#e88344] text-zinc-950 font-bold text-sm shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Coffee Bean</span>
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
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181b] border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#d97736]/60 transition-colors"
          />
        </div>

        <select
          value={selectedProcess}
          onChange={(e) => setSelectedProcess(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-[#d97736]/60 transition-colors cursor-pointer"
        >
          <option value="all" className="bg-[#18181b] text-zinc-100">All Processes</option>
          <option value="washed" className="bg-[#18181b] text-zinc-100">Washed</option>
          <option value="natural" className="bg-[#18181b] text-zinc-100">Natural</option>
          <option value="honey" className="bg-[#18181b] text-zinc-100">Honey</option>
          <option value="anaerobic-natural" className="bg-[#18181b] text-zinc-100">Anaerobic Natural</option>
          <option value="experimental" className="bg-[#18181b] text-zinc-100">Experimental</option>
        </select>
      </div>

      {/* Beans Grid */}
      {filteredBeans.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#18181b] border border-dashed border-zinc-800 text-center text-xs text-zinc-500 font-mono">
          No coffee beans found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBeans.map((bean) => {
            const daysOffRoast = calculateDaysOffRoast(bean.roastDate || new Date().toISOString().split("T")[0]);
            const restInfo = getRestingStatus(daysOffRoast);

            return (
              <div
                key={bean.id}
                className="p-5 rounded-2xl bg-[#18181b] border border-zinc-800 hover:border-zinc-700 transition-all duration-200 flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-[#d97736] uppercase tracking-wider font-mono">
                        {bean.roaster}
                      </span>
                      <h3 className="text-lg font-bold text-zinc-100 group-hover:text-[#d97736] transition-colors mt-0.5 tracking-tight">
                        {bean.name}
                      </h3>
                    </div>

                    {bean.rating && (
                      <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#202024] text-[#d97736] text-xs font-mono font-bold border border-zinc-800">
                        <Star className="w-3 h-3 fill-[#d97736] text-[#d97736]" />
                        <span>{bean.rating}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-2">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{bean.originCountry}{bean.region ? `, ${bean.region}` : ''}</span>
                    </div>
                    <span className="text-zinc-600">•</span>
                    <span className="capitalize font-mono text-[11px] text-zinc-300">{(bean.process || "washed").replace('-', ' ')}</span>
                  </div>

                  {/* Resting Status Badge */}
                  <div className="mt-4 p-2.5 rounded-xl bg-[#202024] flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-mono text-xs text-zinc-300">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>
                        {daysOffRoast} days off roast
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${getRestingStatusBadgeClass(
                        restInfo.status
                      )}`}
                    >
                      {restInfo.label}
                    </span>
                  </div>

                  {/* Flavor Notes */}
                  {bean.flavorNotes.length > 0 && (
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

                {/* Bottom Card Action */}
                <div className="mt-5 pt-3 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400">
                    {bean.bagWeightOz ? `${bean.bagWeightOz} oz` : bean.bagWeightGrams ? `${(bean.bagWeightGrams / 28.3495).toFixed(1)} oz` : '12 oz'}
                  </span>

                  <button
                    onClick={() => onSelectBeanForBrew(bean)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    Brew This Bean →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Bean Modal */}
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
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#18181b] border border-zinc-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
              <h3 id="add-bean-modal-title" className="text-lg font-bold text-zinc-100">
                Add New Whole Bean
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

            <form onSubmit={handleSubmitNewBean} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Roaster Name <span className="text-[#d97736] font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sey Coffee, Onyx, Tim Wendelboe"
                  value={roaster}
                  onChange={(e) => setRoaster(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#202024] border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-[#d97736] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Coffee / Lot Name <span className="text-[#d97736] font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Worka Sakaro, Southern Weather"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#202024] border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-[#d97736] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Origin Country
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ethiopia, Colombia"
                    value={originCountry}
                    onChange={(e) => setOriginCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#202024] border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-[#d97736] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Process Method
                  </label>
                  <select
                    value={process}
                    onChange={(e) => setProcess(e.target.value as ProcessMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-[#202024] border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-[#d97736] transition-colors cursor-pointer"
                  >
                    <option value="" className="bg-[#202024] text-zinc-100">Select process...</option>
                    <option value="washed" className="bg-[#202024] text-zinc-100">Washed</option>
                    <option value="natural" className="bg-[#202024] text-zinc-100">Natural</option>
                    <option value="honey" className="bg-[#202024] text-zinc-100">Honey</option>
                    <option value="anaerobic-natural" className="bg-[#202024] text-zinc-100">Anaerobic Natural</option>
                    <option value="experimental" className="bg-[#202024] text-zinc-100">Experimental</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Roast Date
                  </label>
                  <input
                    type="date"
                    value={roastDate}
                    onChange={(e) => setRoastDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#202024] border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-[#d97736] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Bag Weight (oz)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="12"
                    value={bagWeightOz}
                    onChange={(e) => setBagWeightOz(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#202024] border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-[#d97736] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Flavor Notes (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jasmine, Peach, Bergamot, Honey"
                  value={flavorNotesStr}
                  onChange={(e) => setFlavorNotesStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#202024] border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-[#d97736] transition-colors"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-zinc-100 text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#d97736] hover:bg-[#e88344] text-zinc-950 font-bold text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Bean"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
