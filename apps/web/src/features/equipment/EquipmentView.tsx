import React, { useState } from "react";
import { Equipment, EquipmentType } from "@brewlog/core";
import { Sliders, Plus, Coffee, Scale, Flame, Trash2, Sparkles } from "lucide-react";

interface EquipmentViewProps {
  equipment: Equipment[];
  onAddEquipment: (item: Omit<Equipment, "id" | "createdAt">) => void;
  onDeleteEquipment?: (id: string) => void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  equipment,
  onAddEquipment,
  onDeleteEquipment,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<EquipmentType>("grinder");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [subType, setSubType] = useState("");
  const [settingScaleType, setSettingScaleType] = useState<"clicks" | "stepped-numbers" | "stepless">("stepped-numbers");
  const [notes, setNotes] = useState("");

  const grinders = equipment.filter((e) => e.type === "grinder");
  const brewers = equipment.filter((e) => e.type === "brewer");
  const scales = equipment.filter((e) => e.type === "scale");
  const kettles = equipment.filter((e) => e.type === "kettle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || !model) return;

    onAddEquipment({
      type,
      brand,
      model,
      subType: subType.trim() || undefined,
      settingScaleType: type === "grinder" ? settingScaleType : undefined,
      notes: notes.trim() || undefined,
    });

    setIsModalOpen(false);
    setBrand("");
    setModel("");
    setSubType("");
    setNotes("");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-2xl font-bold tracking-tight text-stone-100">Gear & Equipment</h2>
          </div>
          <p className="text-sm text-stone-400 mt-1">
            Manage your grinders, brewers, scales, and kettles to pair with dial-in recipes and tasting logs.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-lg shadow-amber-500/20 cursor-pointer transition-colors"
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

        {grinders.length === 0 ? (
          <div className="p-6 rounded-2xl bg-stone-900/40 border border-dashed border-stone-800 text-center text-xs text-stone-500">
            No grinders logged yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grinders.map((g) => (
              <div key={g.id} className="relative group p-4 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{g.brand}</span>
                  <div className="flex items-center space-x-2">
                    {g.settingScaleType && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-800 text-stone-300">
                        {g.settingScaleType}
                      </span>
                    )}
                    {g.subType && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {g.subType}
                      </span>
                    )}
                    {onDeleteEquipment && (
                      <button
                        onClick={() => onDeleteEquipment(g.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-stone-500 hover:text-red-400 cursor-pointer"
                        title="Delete gear"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <h4 className="text-base font-bold text-stone-100 mt-1">{g.model}</h4>
                {g.notes && <p className="text-xs text-stone-400 mt-2">{g.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brewers Section */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Coffee className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-stone-200">Brewers & Drippers ({brewers.length})</h3>
        </div>

        {brewers.length === 0 ? (
          <div className="p-6 rounded-2xl bg-stone-900/40 border border-dashed border-stone-800 text-center text-xs text-stone-500">
            No brewers logged yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {brewers.map((b) => (
              <div key={b.id} className="relative group p-4 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{b.brand}</span>
                  <div className="flex items-center space-x-2">
                    {b.subType && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-stone-800 text-stone-300">
                        {b.subType}
                      </span>
                    )}
                    {onDeleteEquipment && (
                      <button
                        onClick={() => onDeleteEquipment(b.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-stone-500 hover:text-red-400 cursor-pointer"
                        title="Delete gear"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <h4 className="text-base font-bold text-stone-100 mt-1">{b.model}</h4>
                {b.notes && <p className="text-xs text-stone-400 mt-2">{b.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scales Section */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Scale className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-stone-200">Precision Scales ({scales.length})</h3>
        </div>

        {scales.length === 0 ? (
          <div className="p-6 rounded-2xl bg-stone-900/40 border border-dashed border-stone-800 text-center text-xs text-stone-500">
            No scales logged yet. Add your brew scale to track 0.1g dose and flow rate.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scales.map((s) => (
              <div key={s.id} className="relative group p-4 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{s.brand}</span>
                  <div className="flex items-center space-x-2">
                    {s.subType && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-stone-800 text-stone-300">
                        {s.subType}
                      </span>
                    )}
                    {onDeleteEquipment && (
                      <button
                        onClick={() => onDeleteEquipment(s.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-stone-500 hover:text-red-400 cursor-pointer"
                        title="Delete gear"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <h4 className="text-base font-bold text-stone-100 mt-1">{s.model}</h4>
                {s.notes && <p className="text-xs text-stone-400 mt-2">{s.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kettles Section */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Flame className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-stone-200">Kettles & Water Gear ({kettles.length})</h3>
        </div>

        {kettles.length === 0 ? (
          <div className="p-6 rounded-2xl bg-stone-900/40 border border-dashed border-stone-800 text-center text-xs text-stone-500">
            No kettles logged yet. Add your gooseneck or temperature kettle.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kettles.map((k) => (
              <div key={k.id} className="relative group p-4 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{k.brand}</span>
                  <div className="flex items-center space-x-2">
                    {k.subType && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-stone-800 text-stone-300">
                        {k.subType}
                      </span>
                    )}
                    {onDeleteEquipment && (
                      <button
                        onClick={() => onDeleteEquipment(k.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-stone-500 hover:text-red-400 cursor-pointer"
                        title="Delete gear"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <h4 className="text-base font-bold text-stone-100 mt-1">{k.model}</h4>
                {k.notes && <p className="text-xs text-stone-400 mt-2">{k.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-stone-100">Add Equipment</h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Equipment Category</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as EquipmentType)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="grinder">Grinder</option>
                  <option value="brewer">Brewer / Dripper</option>
                  <option value="scale">Precision Scale</option>
                  <option value="kettle">Kettle</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder={
                    type === "grinder"
                      ? "e.g. Fellow, Comandante, Baratza"
                      : type === "brewer"
                        ? "e.g. Hario, Kalita, AeroPress, Flair"
                        : type === "scale"
                          ? "e.g. Acaia, Timemore, Felicita, Hario"
                          : "e.g. Fellow, Bonavita, Brewista, Hario"
                  }
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
                  placeholder={
                    type === "grinder"
                      ? "e.g. Ode Gen 2, C40 MK4, Encore ESP"
                      : type === "brewer"
                        ? "e.g. V60 02 Plastic, Wave 185, Flair 58"
                        : type === "scale"
                          ? "e.g. Lunar, Black Mirror Basic 2, Arc"
                          : "e.g. Stagg EKG (0.9L), Artisan Gooseneck"
                  }
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  {type === "grinder"
                    ? "Burr / Mechanism Type"
                    : type === "brewer"
                      ? "Brewing Method / Category"
                      : type === "scale"
                        ? "Features / Resolution"
                        : "Kettle Features / Spout"}
                </label>
                <input
                  type="text"
                  placeholder={
                    type === "grinder"
                      ? "e.g. 64mm Flat Burrs, Conical Burrs"
                      : type === "brewer"
                        ? "e.g. Pour-Over, Immersion, Lever Espresso"
                        : type === "scale"
                          ? "e.g. 0.1g Smart Scale, Auto-Timer"
                          : "e.g. Variable Temp Gooseneck, Stovetop"
                  }
                  value={subType}
                  onChange={(e) => setSubType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {type === "grinder" && (
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Dial Setting Format</label>
                  <select
                    value={settingScaleType}
                    onChange={(e) => setSettingScaleType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 focus:outline-none focus:border-amber-500 cursor-pointer"
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
                  placeholder="e.g. Preferred settings, accessories, or calibration notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-md shadow-amber-500/20 cursor-pointer"
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
