import React, { useState, useEffect } from "react";
import { Equipment, EquipmentType, GrinderSettingScale } from "@brewlog/core";
import { Sliders, Plus, Coffee, Scale, Flame, Trash2, Search, X, Star, Layers } from "lucide-react";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal";

export type CategoryFilter = "all" | EquipmentType;

interface CategoryOption {
  id: CategoryFilter;
  label: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: "all", label: "All" },
  { id: "grinder", label: "Grinders" },
  { id: "brewer", label: "Brewers" },
  { id: "scale", label: "Scales" },
  { id: "kettle", label: "Kettles" },
  { id: "other", label: "Other" },
];

interface EquipmentViewProps {
  equipment: Equipment[];
  onAddEquipment: (item: Omit<Equipment, "id" | "createdAt">) => Promise<Equipment> | Promise<void> | void;
  onUpdateEquipment?: (id: string, updates: Partial<Equipment>) => Promise<Equipment> | Promise<void> | void;
  onDeleteEquipment?: (id: string) => Promise<void> | void;
  onToggleFavorite?: (id: string) => Promise<void> | void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  equipment,
  onAddEquipment,
  onUpdateEquipment,
  onDeleteEquipment,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<EquipmentType>("grinder");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [subType, setSubType] = useState("");
  const [settingScaleType, setSettingScaleType] = useState<GrinderSettingScale>("stepped-numbers");
  const [notes, setNotes] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDeleteConfirmOpen) return;
      if (e.key === "Escape") {
        setIsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isDeleteConfirmOpen]);

  const resetForm = () => {
    setType("grinder");
    setBrand("");
    setModel("");
    setSubType("");
    setSettingScaleType("stepped-numbers");
    setNotes("");
    setIsFavorite(false);
    setErrorMessage(null);
    setIsDeleteConfirmOpen(false);
  };

  const handleOpenAddModal = () => {
    setEditingEquipment(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Equipment) => {
    setEditingEquipment(item);
    setType(item.type);
    setBrand(item.brand);
    setModel(item.model);
    setSubType(item.subType || "");
    setSettingScaleType(item.settingScaleType || "stepped-numbers");
    setNotes(item.notes || "");
    setIsFavorite(Boolean(item.isFavorite));
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const filterItems = (items: Equipment[]) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const matchBrand = item.brand.toLowerCase().includes(q);
      const matchModel = item.model.toLowerCase().includes(q);
      const matchSubType = item.subType?.toLowerCase().includes(q) ?? false;
      const matchNotes = item.notes?.toLowerCase().includes(q) ?? false;
      return matchBrand || matchModel || matchSubType || matchNotes;
    });
  };

  const filteredEquipment = filterItems(equipment);
  const grinders = filteredEquipment.filter((e) => e.type === "grinder");
  const brewers = filteredEquipment.filter((e) => e.type === "brewer");
  const scales = filteredEquipment.filter((e) => e.type === "scale");
  const kettles = filteredEquipment.filter((e) => e.type === "kettle");
  const other = filteredEquipment.filter((e) => e.type === "other");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !model.trim()) return;

    const payload = {
      type,
      brand: brand.trim(),
      model: model.trim(),
      subType: subType.trim() || undefined,
      settingScaleType: type === "grinder" ? settingScaleType : undefined,
      notes: notes.trim() || undefined,
      isFavorite,
    };

    try {
      if (editingEquipment && onUpdateEquipment) {
        await onUpdateEquipment(editingEquipment.id, payload);
      } else {
        await onAddEquipment(payload);
      }
      setIsModalOpen(false);
      setEditingEquipment(null);
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save equipment.";
      setErrorMessage(msg);
    }
  };

  const handleDelete = async () => {
    if (!editingEquipment || !onDeleteEquipment) return;
    try {
      await onDeleteEquipment(editingEquipment.id);
      setIsDeleteConfirmOpen(false);
      setIsModalOpen(false);
      setEditingEquipment(null);
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete equipment.";
      setErrorMessage(msg);
      setIsDeleteConfirmOpen(false);
    }
  };

  const renderCard = (item: Equipment) => (
    <div
      key={item.id}
      onClick={() => handleOpenEditModal(item)}
      className="relative group p-4 rounded-2xl bg-panel border border-border-subtle hover:border-zinc-700 transition-colors shadow-sm cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-accent uppercase tracking-wider font-mono">
          {item.brand}
        </span>
        <div className="flex items-center space-x-2">
          {item.settingScaleType && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
              {item.settingScaleType}
            </span>
          )}
          {item.subType && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
              {item.subType}
            </span>
          )}
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.id);
              }}
              className={`p-1 cursor-pointer transition-colors ${
                item.isFavorite
                  ? "text-accent"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title={item.isFavorite ? `Unfavorite ${item.model}` : `Favorite ${item.model}`}
              aria-label={item.isFavorite ? `Unfavorite ${item.model}` : `Favorite ${item.model}`}
            >
              <Star className={`w-3.5 h-3.5 ${item.isFavorite ? "fill-accent text-accent" : ""}`} />
            </button>
          )}
          {onDeleteEquipment && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteEquipment(item.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
              title={`Delete ${item.model}`}
              aria-label={`Delete ${item.model}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <h4 className="text-base font-bold text-zinc-100 mt-1">{item.model}</h4>
      {item.notes && <p className="text-xs text-zinc-400 mt-2">{item.notes}</p>}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-accent font-semibold block mb-1">
            BREW GEAR
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Equipment</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your grinders, brewers, scales, and kettles to pair with dial-in recipes and tasting logs.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-mono text-xs uppercase tracking-wider font-bold shadow-sm cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>ADD EQUIPMENT</span>
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search brand, model, features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-panel border border-border-subtle text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-accent/60 transition-colors"
            aria-label="Search equipment"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap border ${
                  isSelected
                    ? "bg-accent text-zinc-950 font-bold border-accent"
                    : "bg-panel border-border-subtle text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grinders Section */}
      {(selectedCategory === "all" || selectedCategory === "grinder") && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Sliders className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-zinc-100">Grinders ({grinders.length})</h3>
          </div>

          {grinders.length === 0 ? (
            <div className="p-6 rounded-2xl bg-panel/50 border border-dashed border-border-subtle text-center text-xs text-zinc-500">
              {searchQuery ? "No grinders matching your search." : "No grinders logged yet."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grinders.map(renderCard)}
            </div>
          )}
        </div>
      )}

      {/* Brewers Section */}
      {(selectedCategory === "all" || selectedCategory === "brewer") && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Coffee className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-zinc-100">Brewers & Drippers ({brewers.length})</h3>
          </div>

          {brewers.length === 0 ? (
            <div className="p-6 rounded-2xl bg-panel/50 border border-dashed border-border-subtle text-center text-xs text-zinc-500">
              {searchQuery ? "No brewers matching your search." : "No brewers logged yet."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brewers.map(renderCard)}
            </div>
          )}
        </div>
      )}

      {/* Scales Section */}
      {(selectedCategory === "all" || selectedCategory === "scale") && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Scale className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-zinc-100">Precision Scales ({scales.length})</h3>
          </div>

          {scales.length === 0 ? (
            <div className="p-6 rounded-2xl bg-panel/50 border border-dashed border-border-subtle text-center text-xs text-zinc-500">
              {searchQuery
                ? "No scales matching your search."
                : "No scales logged yet. Add your brew scale to track 0.1g dose and flow rate."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scales.map(renderCard)}
            </div>
          )}
        </div>
      )}

      {/* Kettles Section */}
      {(selectedCategory === "all" || selectedCategory === "kettle") && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Flame className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-zinc-100">Kettles & Water Gear ({kettles.length})</h3>
          </div>

          {kettles.length === 0 ? (
            <div className="p-6 rounded-2xl bg-panel/50 border border-dashed border-border-subtle text-center text-xs text-zinc-500">
              {searchQuery
                ? "No kettles matching your search."
                : "No kettles logged yet. Add your gooseneck or temperature kettle."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kettles.map(renderCard)}
            </div>
          )}
        </div>
      )}

      {/* Other Equipment Section */}
      {(selectedCategory === "all" || selectedCategory === "other") && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Layers className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-zinc-100">Other Equipment & Accessories ({other.length})</h3>
          </div>

          {other.length === 0 ? (
            <div className="p-6 rounded-2xl bg-panel/50 border border-dashed border-border-subtle text-center text-xs text-zinc-500">
              {searchQuery
                ? "No other equipment matching your search."
                : "No other equipment logged yet. Add accessories, WDT tools, or custom gear."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {other.map(renderCard)}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="equipment-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleteConfirmOpen) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md p-6 rounded-2xl bg-panel border border-border-subtle shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
              <h3 id="equipment-modal-title" className="text-lg font-bold text-zinc-100">
                {editingEquipment ? "Edit Equipment" : "Add Equipment"}
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

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Equipment Category
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as EquipmentType)}
                  className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 text-sm focus:outline-none focus:border-accent transition-colors cursor-pointer"
                >
                  <option value="grinder" className="bg-panel-recessed text-zinc-100">Grinder</option>
                  <option value="brewer" className="bg-panel-recessed text-zinc-100">Brewer / Dripper</option>
                  <option value="scale" className="bg-panel-recessed text-zinc-100">Precision Scale</option>
                  <option value="kettle" className="bg-panel-recessed text-zinc-100">Kettle</option>
                  <option value="other" className="bg-panel-recessed text-zinc-100">Other Equipment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Brand Name <span className="text-accent font-bold">*</span>
                </label>
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
                          : type === "kettle"
                            ? "e.g. Fellow, Bonavita, Brewista, Hario"
                            : "e.g. Subminimal, SworksDesign, Normcore"
                  }
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Model Name <span className="text-accent font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    type === "grinder"
                      ? "e.g. Ode Gen 2, C40 MK4, Encore ESP"
                      : type === "brewer"
                        ? "e.g. V60 02, Aeropress, Kalita Wave"
                        : type === "scale"
                          ? "e.g. Lunar, Black Mirror Basic 2, Arc"
                          : type === "kettle"
                            ? "e.g. Stagg EKG (0.9L), Artisan Gooseneck"
                            : "e.g. Flick WDT, Dipper, Blind Shaker"
                  }
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  {type === "grinder"
                    ? "Burr / Mechanism Type"
                    : type === "brewer"
                      ? "Brewing Method / Category"
                      : type === "scale"
                        ? "Features / Resolution"
                        : type === "kettle"
                          ? "Kettle Features / Spout"
                          : "Equipment Type / Features"}
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
                          : type === "kettle"
                            ? "e.g. Variable Temp Gooseneck, Stovetop"
                            : "e.g. WDT Tool, Refractometer, RDT Spray"
                  }
                  value={subType}
                  onChange={(e) => setSubType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {type === "grinder" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Dial Setting Format
                  </label>
                  <select
                    value={settingScaleType}
                    onChange={(e) => setSettingScaleType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 text-sm focus:outline-none focus:border-accent transition-colors cursor-pointer"
                  >
                    <option value="stepped-numbers" className="bg-panel-recessed text-zinc-100">Stepped Numbers (e.g. 4.1, 5.2)</option>
                    <option value="clicks" className="bg-panel-recessed text-zinc-100">Clicks from Zero (e.g. 24 clicks)</option>
                    <option value="stepless" className="bg-panel-recessed text-zinc-100">Stepless Dial</option>
                    <option value="microns" className="bg-panel-recessed text-zinc-100">Microns (µm)</option>
                  </select>
                </div>
              )}

              {/* Favorite checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="equipment-favorite"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="w-4 h-4 rounded bg-panel-recessed border-border-subtle text-accent focus:ring-accent accent-accent cursor-pointer"
                />
                <label htmlFor="equipment-favorite" className="text-xs text-zinc-300 cursor-pointer select-none">
                  Mark as Favorite (pinned in dial-in pickers)
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Preferred settings, accessories, or calibration notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-panel-recessed border border-border-subtle text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                {editingEquipment && onDeleteEquipment ? (
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-950/30 text-xs font-mono uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                  >
                    DELETE
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-zinc-100 font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-zinc-950 font-mono text-xs uppercase tracking-wider font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    {editingEquipment ? "SAVE CHANGES" : "SAVE EQUIPMENT"}
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
        title="Delete Equipment"
        message={`Are you sure you want to delete "${editingEquipment?.brand} ${editingEquipment?.model}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};
