import React, { useState } from 'react';
import { TastingLog, Bean, Equipment } from '@brewlog/core';
import {
  Star,
  Edit3,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  Tag,
  PieChart,
} from 'lucide-react';
import { ScaFlavorWheelSvg } from './ScaFlavorWheelSvg';

export interface ReviewDetailPaneProps {
  log: TastingLog;
  beans?: Bean[];
  equipment?: Equipment[];
  onEdit: (log: TastingLog) => void;
  onDelete: (log: TastingLog) => void;
  onBrewAgain?: (log: TastingLog) => void;
}

export const getScaTier = (score: number) => {
  if (score >= 90.0) {
    return {
      label: 'Outstanding',
      classes: 'text-emerald-300 bg-emerald-950/50 border-emerald-800',
    };
  }
  if (score >= 85.0) {
    return {
      label: 'Excellent',
      classes: 'text-accent bg-panel-recessed border-accent/50',
    };
  }
  if (score >= 80.0) {
    return {
      label: 'Very Good',
      classes: 'text-zinc-200 bg-panel-recessed border-zinc-700',
    };
  }
  return {
    label: 'Commercial',
    classes: 'text-zinc-400 bg-zinc-900 border-zinc-800',
  };
};

const ATTRIBUTES = [
  { key: 'fragranceAroma' as const, label: 'Fragrance / Aroma' },
  { key: 'flavor' as const, label: 'Flavor' },
  { key: 'aftertaste' as const, label: 'Aftertaste' },
  { key: 'acidity' as const, label: 'Acidity' },
  { key: 'body' as const, label: 'Body' },
  { key: 'balance' as const, label: 'Balance' },
  { key: 'uniformity' as const, label: 'Uniformity' },
  { key: 'cleanCup' as const, label: 'Clean Cup' },
  { key: 'sweetness' as const, label: 'Sweetness' },
  { key: 'overall' as const, label: 'Overall' },
] as const;

export const ReviewDetailPane: React.FC<ReviewDetailPaneProps> = ({
  log,
  beans = [],
  equipment = [],
  onEdit,
  onDelete,
  onBrewAgain,
}) => {
  const [sensoryTab, setSensoryTab] = useState<'descriptors' | 'wheel'>('descriptors');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Bean resolution
  const matchedBean = log.beanId ? beans.find((b) => b.id === log.beanId) : undefined;
  const beanName = matchedBean?.name || log.beanNameSnapshot || 'Specialty Coffee';
  const roaster = matchedBean?.roaster || log.roasterSnapshot || 'Artisan Roaster';

  // Equipment resolution
  const matchedGrinder = log.grinderId
    ? equipment.find((e) => e.id === log.grinderId)
    : undefined;
  const grinderName = matchedGrinder
    ? `${matchedGrinder.brand} ${matchedGrinder.model}`
    : log.grinderSnapshot || 'Not specified';

  const matchedBrewer = log.brewerId
    ? equipment.find((e) => e.id === log.brewerId)
    : undefined;
  const brewerName = matchedBrewer
    ? `${matchedBrewer.brand} ${matchedBrewer.model}`
    : log.brewerSnapshot || 'Not specified';

  const tier = getScaTier(log.calculatedScaScore);

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
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const brewRatio =
    log.coffeeDoseGrams && log.waterAmountGrams
      ? `1:${(log.waterAmountGrams / log.coffeeDoseGrams).toFixed(1)}`
      : '—';

  return (
    <div className="animate-fade-in text-zinc-100 font-sans pb-8">
      {/* Header & Action Bar */}
      <div className="sticky top-0 z-20 bg-canvas pb-6">
        <div className="bg-panel rounded-xl p-5 border border-border-subtle shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              data-testid="method-badge"
              className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase tracking-wider"
            >
              {log.brewMethod}
            </span>
            <span className="text-xs text-text-secondary">
              {formatDate(log.brewDate)}
            </span>
            {log.wouldBrewAgain && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Would Brew Again
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {beanName}
          </h1>
          <p className="text-sm font-medium text-text-secondary mt-0.5">
            {roaster}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {onBrewAgain && (
            <button
              onClick={() => onBrewAgain(log)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-panel-recessed text-accent border border-accent/40 hover:border-accent hover:bg-accent/10 transition-colors cursor-pointer shadow-xs"
              title="Transfer coffee and specs to Brew Timer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Brew Again
            </button>
          )}
          <button
            onClick={() => onEdit(log)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-panel-recessed text-zinc-200 hover:text-zinc-100 border border-border-subtle hover:border-zinc-600 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-panel-recessed text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 border border-border-subtle hover:border-rose-900 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>

    <div className="space-y-6">
      {/* Hero Score Banner */}
      <div className="bg-panel rounded-xl p-5 border border-border-subtle shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          data-testid="hero-score-badge"
          className="whitespace-nowrap flex items-center gap-3"
        >
          <div className="text-4xl font-light text-zinc-100 tabular-nums">
            {log.calculatedScaScore.toFixed(1)}
          </div>
          <div className="text-sm text-text-secondary font-medium">/ 100</div>
          <div className="h-6 w-px bg-zinc-800" />
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${tier.classes}`}
          >
            {tier.label} (SCA)
          </span>
        </div>

        {/* 5-Star Rating Preview */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`w-4 h-4 ${
                s <= (log.rating || 0)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-zinc-700'
              }`}
            />
          ))}
          <span className="text-xs text-text-secondary ml-1 tabular-nums font-medium">
            ({log.rating || 0}/5)
          </span>
        </div>
      </div>

      {/* Sensory Profile: Segmented Toggle & Content */}
      <div className="bg-panel rounded-xl p-5 border border-border-subtle shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Sensory Profile
          </div>
          <div className="flex items-center p-0.5 rounded-lg bg-panel-recessed border border-border-subtle">
            <button
              onClick={() => setSensoryTab('descriptors')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                sensoryTab === 'descriptors'
                  ? 'bg-accent text-zinc-950 font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-zinc-100'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Descriptors
            </button>
            <button
              onClick={() => setSensoryTab('wheel')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                sensoryTab === 'wheel'
                  ? 'bg-accent text-zinc-950 font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-zinc-100'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              Wheel
            </button>
          </div>
        </div>

        {sensoryTab === 'descriptors' ? (
          <div>
            {log.flavorTags && log.flavorTags.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {log.flavorTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/30 shadow-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-secondary italic py-2">
                No flavor descriptors recorded for this brew.
              </p>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <ScaFlavorWheelSvg
              selectedTags={log.flavorTags || []}
              onToggleTag={() => {}}
            />
          </div>
        )}
      </div>

      {/* 10-Attribute Score Breakdown Bars */}
      <div className="bg-panel rounded-xl p-5 border border-border-subtle shadow-sm space-y-4">
        <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary border-b border-border-subtle pb-3">
          10-Attribute SCA Score Matrix
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {ATTRIBUTES.map((attr) => {
            const scoreValue = log.scores?.[attr.key] ?? 0;
            const percentage = Math.min(100, Math.max(0, (scoreValue / 10) * 100));

            return (
              <div key={attr.key} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-text-secondary">
                    {attr.label}
                  </span>
                  <span className="tabular-nums font-semibold text-zinc-200">
                    {scoreValue.toFixed(1)}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Brew Parameters & Equipment Specs */}
      <div className="bg-panel rounded-xl p-5 border border-border-subtle shadow-sm space-y-4">
        <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary border-b border-border-subtle pb-3">
          Brew Parameters & Equipment
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
            <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider block">
              Dose
            </span>
            <span className="text-sm font-semibold text-zinc-100 tabular-nums">
              {log.coffeeDoseGrams}g
            </span>
          </div>

          <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
            <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider block">
              Water
            </span>
            <span className="text-sm font-semibold text-zinc-100 tabular-nums">
              {log.waterAmountGrams}g
            </span>
          </div>

          <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
            <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider block">
              Ratio
            </span>
            <span className="text-sm font-semibold text-zinc-100 tabular-nums">
              {brewRatio}
            </span>
          </div>

          <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
            <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider block">
              Actual Time
            </span>
            <span
              data-testid="brew-time-telemetry"
              className="text-sm font-semibold text-zinc-100 tabular-nums"
            >
              {formatBrewTime(log.actualTimeSeconds)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
            <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider block">
              Grinder & Setting
            </span>
            <div className="text-xs font-medium text-zinc-200 mt-1">
              <div>{grinderName}</div>
              {log.grindSetting && (
                <div className="text-text-secondary mt-0.5">
                  Setting: {log.grindSetting}
                </div>
              )}
            </div>
          </div>

          <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
            <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider block">
              Brewer
            </span>
            <div className="text-xs font-medium text-zinc-200 mt-1">
              {brewerName}
            </div>
          </div>

          <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
            <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider block">
              Water Temperature
            </span>
            <div className="text-xs font-medium text-zinc-200 mt-1 tabular-nums">
              {log.waterTempCelsius ? `${log.waterTempCelsius}°C` : 'Not recorded'}
            </div>
          </div>
        </div>
      </div>

      {/* Cupper's Notes */}
      {log.notes && (
        <div className="bg-panel rounded-xl p-5 border border-border-subtle shadow-sm space-y-2">
          <div className="text-sm font-semibold uppercase tracking-wider text-text-secondary border-b border-border-subtle pb-3">
            Cupper's Tasting Notes
          </div>
          <blockquote className="border-l-2 border-accent pl-4 py-1 text-sm text-zinc-200 italic font-sans leading-relaxed">
            "{log.notes}"
          </blockquote>
        </div>
      )}
    </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-panel border border-border-subtle rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold text-zinc-100">
                Delete Tasting Log
              </h2>
            </div>
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete this tasting log for{' '}
              <strong className="text-zinc-100">{beanName}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-panel-recessed text-zinc-300 hover:text-zinc-100 border border-border-subtle hover:border-zinc-600 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  onDelete(log);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-colors cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
