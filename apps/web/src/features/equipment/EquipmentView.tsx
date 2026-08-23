import React, { useState } from 'react';
import { Equipment, EquipmentType } from '@brewlog/core';
import { Sliders, Plus, Coffee, Sparkles } from 'lucide-react';

interface EquipmentViewProps {
  equipment: Equipment[];
  onAddEquipment: (item: Equipment) => void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({ equipment, onAddEquipment }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<EquipmentType>('grinder');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [subType, setSubType] = useState('');
  const [settingScaleType, setSettingScaleType] = useState<'clicks' | 'stepped-numbers' | 'stepless'>('stepped-numbers');
  const [notes, setNotes] = useState('');

  const grinders = equipment.filter((e) => e.type === 'grinder');
  const brewers = equipment.filter((e) => e.type === 'brewer');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || !model) return;

    onAddEquipment({
      id: 'eq-' + Date.now(),
      type,
      brand,
      model,
      subType,
      settingScaleType: type === 'grinder' ? settingScaleType : undefined,
      notes,
      createdAt: new Date().toISOString(),
    });

    setIsModalOpen(false);
    setBrand('');
    setModel('');
    setSubType('');
    setNotes('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-100">Gear & Equipment</h2>
          <p className="text-sm text-stone-400 mt-0.5">
            Log your grinders, burr geometry, and coffee drippers to associate with brew dial-in logs.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Equipment</span>
        </button>
      </div>

      {/* Grinders Section */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Sliders className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-stone-200">Grinders ({grinders.length})</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {grinders.map((g) => (
            <div key={g.id} className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{g.brand}</span>
                {g.settingScaleType && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-800 text-stone-300">
                    {g.settingScaleType}
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-stone-100 mt-1">{g.model}</h4>
              {g.notes && <p className="text-xs text-stone-400 mt-2">{g.notes}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Brewers Section */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Coffee className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-stone-200">Brewers & Drippers ({brewers.length})</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {brewers.map((b) => (
            <div key={b.id} className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-md">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{b.brand}</span>
              <h4 className="text-base font-bold text-stone-100 mt-1">{b.model}</h4>
              {b.notes && <p className="text-xs text-stone-400 mt-2">{b.notes}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-stone-100">Add Equipment</h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Equipment Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as EquipmentType)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="grinder">Grinder</option>
                  <option value="brewer">Brewer / Dripper</option>
                  <option value="scale">Scale</option>
                  <option value="kettle">Kettle</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fellow, Comandante, Hario, Flair"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Model Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ode Gen 2, C40 MK4, V60 02 Plastic, Flair 58"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {type === 'grinder' && (
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Dial Setting Format</label>
                  <select
                    value={settingScaleType}
                    onChange={(e) => setSettingScaleType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="stepped-numbers">Stepped Numbers (e.g. 4.1, 5.2)</option>
                    <option value="clicks">Clicks from Zero (e.g. 24 clicks)</option>
                    <option value="stepless">Stepless Dial</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 64mm SSP MP burrs installed"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  Save Equipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
