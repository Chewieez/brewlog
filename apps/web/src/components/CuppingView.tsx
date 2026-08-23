import { ScrollFadeContainer } from './ScrollFadeContainer';
import React, { useState } from 'react';
import { TastingLog, CuppingAttributes, calculateScaScore, SCA_FLAVOR_WHEEL } from '@brewlog/core';
import { Sparkles, Award, Cherry, Flower2, Flame, Coffee, Candy, Sun, Wine, PieChart, ListFilter } from 'lucide-react';
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

interface CuppingViewProps {
  logs: TastingLog[];
  onAddTastingLog: (log: TastingLog) => void;
}

export const CuppingView: React.FC<CuppingViewProps> = ({ logs, onAddTastingLog }) => {
  const [selectedTags, setSelectedTags] = useState<string[]>(['Peach', 'Jasmine']);
  const [flavorViewMode, setFlavorViewMode] = useState<'wheel' | 'tags'>('tags');
  const [scores, setScores] = useState<CuppingAttributes>({
    fragranceAroma: 8.5,
    acidity: 8.5,
    sweetness: 9.0,
    body: 8.0,
    clarity: 9.0,
    aftertaste: 8.5,
    balance: 8.8,
    overall: 8.8,
  });

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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-100">Cupping & Sensory Log</h2>
        <p className="text-sm text-stone-400 mt-0.5">
          Specialty Coffee Association (SCA) 0–100 cupping scoring sheet & interactive sensory flavor wheel.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: SCA Live Cupping Score Form (605px) */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-stone-900/80 border border-stone-800 shadow-xl space-y-5 h-[605px]">
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

          {/* 8 Attribute Sliders */}
          <div className="space-y-4">
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
                  <span className="font-mono font-bold text-amber-400">{scores[key].toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="10"
                  step="0.1"
                  value={scores[key]}
                  onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                  className="w-full accent-amber-500 bg-stone-950 h-2 rounded-lg cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Interactive SCA Sensory Wheel & Tag Selector (605px) */}
        <div className="lg:col-span-6 p-6 rounded-3xl bg-stone-900/80 border border-stone-800 shadow-xl flex flex-col h-[605px] space-y-4">
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
                onClick={() => setFlavorViewMode('wheel')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  flavorViewMode === 'wheel'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>Wheel</span>
              </button>

              <button
                onClick={() => setFlavorViewMode('tags')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  flavorViewMode === 'tags'
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
          <ScrollFadeContainer className="flex-1 pr-1">
            {flavorViewMode === 'wheel' ? (
              <ScaFlavorWheelSvg
                selectedTags={selectedTags}
                onToggleTag={toggleFlavorTag}
              />
            ) : (
              <div className="space-y-4 divide-y divide-stone-800/50">
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
                              onClick={() => toggleFlavorTag(desc)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                                isSelected
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
              </div>
            )}
          </ScrollFadeContainer>
        </div>
      </div>

      {/* Past Tasting Logs History */}
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-bold text-stone-200">Past Brew Sessions & Cupping Notes</h3>

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
                </div>

                <h4 className="text-base font-bold text-stone-100 mt-1">
                  {log.beanNameSnapshot} <span className="text-xs font-normal text-stone-400">by {log.roasterSnapshot}</span>
                </h4>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {log.flavorTags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 text-[11px] rounded bg-stone-800 text-stone-300">
                      {tag}
                    </span>
                  ))}
                </div>

                {log.notes && <p className="text-xs text-stone-300 mt-2 italic">"{log.notes}"</p>}
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-800">
                <div className="text-xl font-extrabold font-mono text-amber-400">
                  {log.calculatedScaScore} <span className="text-xs text-stone-400 font-sans">SCA pts</span>
                </div>
                <div className="text-xs font-mono text-stone-400 mt-0.5">
                  {log.coffeeDoseGrams}g : {log.waterAmountGrams}g ({log.actualTimeSeconds}s)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
