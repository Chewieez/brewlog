import React, { useState } from 'react';
import { Bean, calculateDaysOffRoast, getRestingStatus, ProcessMethod, RoastLevel } from '@brewlog/core';
import { Plus, Search, Star, Calendar, Flame, MapPin, Tag, Sparkles, Filter } from 'lucide-react';

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
  const [bagWeightGrams, setBagWeightGrams] = useState(250);

  const filteredBeans = beans.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.roaster.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.originCountry.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProcess = selectedProcess === 'all' || b.process === selectedProcess;
    return matchesSearch && matchesProcess;
  });

  const handleSubmitNewBean = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !roaster || !originCountry) return;

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
      bagWeightGrams,
      remainingGrams: bagWeightGrams,
      createdAt: new Date().toISOString(),
    };

    onAddBean(newBean);
    setIsModalOpen(false);
    // Reset
    setName('');
    setRoaster('');
    setOriginCountry('');
    setRegion('');
    setFlavorNotesStr('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-100">Coffee Bean Stash</h2>
          <p className="text-sm text-stone-400 mt-0.5">
            Track origins, roast dates, and peak resting windows for your whole beans.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Coffee Bean</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder="Search by coffee name, roaster, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-900/80 border border-stone-800 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <select
          value={selectedProcess}
          onChange={(e) => setSelectedProcess(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-stone-900/80 border border-stone-800 text-sm text-stone-300 focus:outline-none focus:border-amber-500/50"
        >
          <option value="all">All Processes</option>
          <option value="washed">Washed</option>
          <option value="natural">Natural</option>
          <option value="honey">Honey</option>
          <option value="anaerobic-natural">Anaerobic Natural</option>
          <option value="experimental">Experimental</option>
        </select>
      </div>

      {/* Beans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBeans.map((bean) => {
          const daysOffRoast = calculateDaysOffRoast(bean.roastDate);
          const restInfo = getRestingStatus(daysOffRoast);

          return (
            <div
              key={bean.id}
              className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800/80 hover:border-amber-500/40 backdrop-blur-md transition-all duration-200 flex flex-col justify-between group shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      {bean.roaster}
                    </span>
                    <h3 className="text-lg font-bold text-stone-100 group-hover:text-amber-200 transition-colors mt-0.5">
                      {bean.name}
                    </h3>
                  </div>

                  {bean.rating && (
                    <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{bean.rating}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-xs text-stone-400 mt-2">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-500" />
                    <span>{bean.originCountry}{bean.region ? `, ${bean.region}` : ''}</span>
                  </div>
                  <span>•</span>
                  <span className="capitalize">{bean.process.replace('-', ' ')}</span>
                </div>

                {/* Resting Status Badge */}
                <div className="mt-4 p-2.5 rounded-xl bg-stone-950/70 border border-stone-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-xs text-stone-300">
                      {daysOffRoast} days off roast
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${restInfo.color}20`, color: restInfo.color }}
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
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-800/80 text-stone-300 border border-stone-700/50"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Card Action */}
              <div className="mt-5 pt-3 border-t border-stone-800/60 flex items-center justify-between">
                <span className="text-xs text-stone-400">
                  {bean.remainingGrams || bean.bagWeightGrams || 250}g left
                </span>

                <button
                  onClick={() => onSelectBeanForBrew(bean)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors"
                >
                  Brew This Bean →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Bean Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-100">Add New Whole Bean</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewBean} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Roaster Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sey Coffee, Onyx, Tim Wendelboe"
                  value={roaster}
                  onChange={(e) => setRoaster(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Coffee / Lot Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Worka Sakaro, Southern Weather"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Origin Country *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ethiopia, Colombia"
                    value={originCountry}
                    onChange={(e) => setOriginCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Process Method</label>
                  <select
                    value={process}
                    onChange={(e) => setProcess(e.target.value as ProcessMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="washed">Washed</option>
                    <option value="natural">Natural</option>
                    <option value="honey">Honey</option>
                    <option value="anaerobic-natural">Anaerobic Natural</option>
                    <option value="experimental">Experimental</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Roast Date</label>
                  <input
                    type="date"
                    value={roastDate}
                    onChange={(e) => setRoastDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Bag Weight (g)</label>
                  <input
                    type="number"
                    value={bagWeightGrams}
                    onChange={(e) => setBagWeightGrams(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Flavor Notes (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Jasmine, Peach, Bergamot, Honey"
                  value={flavorNotesStr}
                  onChange={(e) => setFlavorNotesStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-md shadow-amber-500/20"
                >
                  Save Bean
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
