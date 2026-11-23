import React, { useState } from 'react';
import { Button } from '@brewlog/ui';
import { TastingLog, Bean, Equipment, formatDisplayDate, getScaTierInfo, ScaTierKey } from '@brewlog/core';
import { useSettings } from '../settings/SettingsContext';
import {
  Star,
  Edit3,
  Trash2,
  Play,
  CheckCircle2,
  Tag,
  PieChart,
} from 'lucide-react';
import { ConfirmationModal } from '../../components/shared/ConfirmationModal';
import { ScaFlavorWheelSvg } from './ScaFlavorWheelSvg';

export interface ReviewDetailPaneProps {
  log: TastingLog;
  beans?: Bean[];
  equipment?: Equipment[];
  onEdit: (log: TastingLog) => void;
  onDelete: (log: TastingLog) => void;
  onBrewAgain?: (log: TastingLog) => void;
}

const SCA_TIER_CLASSES: Record<ScaTierKey, string> = {
  outstanding: 'text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800',
  excellent: 'text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800',
  'very-good': 'text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800',
  commercial: 'text-stone-800 dark:text-stone-400 bg-stone-100 dark:bg-stone-900/60 border-stone-300 dark:border-stone-800',
};

export const getScaTier = (score: number) => {
  const info = getScaTierInfo(score);
  return {
    key: info.key,
    label: info.label,
    classes: SCA_TIER_CLASSES[info.key],
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
  const { settings } = useSettings();
  const dateFormat = settings.dateFormat;

  const [sensoryTab, setSensoryTab] = useState<'descriptors' | 'wheel'>('descriptors');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Bean resolution
  const matchedBean = log.beanId ? beans.find((b) => b.id === log.beanId) : undefined;
  const beanName = log.beanNameSnapshot || matchedBean?.name || 'Specialty Coffee';
  const roaster = log.roasterSnapshot || matchedBean?.roaster || 'Artisan Roaster';

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
      if (isNaN(d.getTime())) return dateStr;
      return formatDisplayDate(dateStr, dateFormat);
    } catch {
      return dateStr;
    }
  };

  const brewRatio =
    log.coffeeDoseGrams && log.waterAmountGrams
      ? `1:${(log.waterAmountGrams / log.coffeeDoseGrams).toFixed(1)}`
      : '—';

  return (
    <div
      data-testid="review-detail-pane"
      className="animate-fade-in text-foreground font-sans pb-8"
    >
      <div className="bg-panel rounded-xl p-6 border border-border-subtle shadow-sm space-y-6">
        {/* Header & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {beanName}
            </h1>
            <div
              data-testid="detail-header-meta-row"
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground-secondary mt-1"
            >
              <span className="font-medium">{roaster}</span>
              <span aria-hidden="true" className="text-foreground-muted">•</span>
              <span
                data-testid="method-badge"
                className="text-xs font-medium uppercase tracking-wider text-foreground-muted"
              >
                {log.brewMethod}
              </span>
              <span aria-hidden="true" className="text-foreground-muted">•</span>
              <span className="text-xs text-foreground-muted tabular-nums">
                {formatDate(log.brewDate)}
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onBrewAgain && (
              <button
                type="button"
                onClick={() => onBrewAgain(log)}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg btn-tactile-primary cursor-pointer border-0"
                title="Transfer coffee and specs to Brew Timer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Brew Again
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(log)}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg btn-tactile-secondary text-foreground-muted hover:text-foreground cursor-pointer border-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg btn-tactile-secondary text-rose-400 hover:text-rose-300 cursor-pointer border-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>

        {/* Hero Score Banner (recessed focal strip inside the unified review sheet) */}
        <div
          data-testid="hero-score-banner"
          className="bg-panel-recessed rounded-lg p-4 border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div
            data-testid="hero-score-badge"
            className="whitespace-nowrap flex items-center gap-3"
          >
            <div className="text-4xl font-light text-foreground tabular-nums">
              {log.calculatedScaScore.toFixed(1)}
            </div>
            <div className="text-sm text-foreground-secondary font-medium">/ 100</div>
            <div className="h-6 w-px bg-border-subtle" />
            <span
              className={`px-3 py-1 rounded-md text-xs font-semibold border ${tier.classes}`}
            >
              {tier.label} (SCA)
            </span>
          </div>

          {/* 5-Star Rating & Would Brew Again */}
          <div className="flex flex-col sm:items-end gap-1.5">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    s <= (log.rating || 0)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-border-subtle dark:text-zinc-700'
                  }`}
                />
              ))}
              <span className="text-xs text-foreground-secondary ml-1 tabular-nums font-medium">
                ({log.rating || 0}/5)
              </span>
            </div>
            {log.wouldBrewAgain && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-md font-medium w-fit">
                <CheckCircle2 className="w-3 h-3" /> Would Brew Again
              </span>
            )}
          </div>
        </div>

        {/* Sensory Profile: Segmented Toggle & Content */}
        <section className="border-t border-border-subtle pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground-secondary">
              Sensory Profile
            </h2>
            <div className="flex items-center p-0.5 rounded-lg segmented-track">
              <button
                onClick={() => setSensoryTab('descriptors')}
                className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-md transition-all cursor-pointer border-0 ${
                  sensoryTab === 'descriptors'
                    ? 'segmented-thumb-active font-semibold'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                Descriptors
              </button>
              <button
                onClick={() => setSensoryTab('wheel')}
                className={`h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-md transition-all cursor-pointer border-0 ${
                  sensoryTab === 'wheel'
                    ? 'segmented-thumb-active font-semibold'
                    : 'text-foreground-muted hover:text-foreground'
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
                <div className="flex flex-wrap gap-2">
                  {log.flavorTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-md text-xs font-medium bg-accent/10 text-accent border border-accent/30 shadow-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-foreground-secondary italic py-1">
                  No flavor descriptors recorded for this brew.
                </p>
              )}
            </div>
          ) : (
            <div className="flex justify-center py-2">
              <ScaFlavorWheelSvg
                selectedTags={log.flavorTags || []}
                readOnly
              />
            </div>
          )}
        </section>

        {/* 10-Attribute Score Breakdown Bars */}
        <section className="border-t border-border-subtle pt-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground-secondary">
            10-Attribute SCA Score Matrix
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {ATTRIBUTES.map((attr) => {
              const scoreValue = log.scores?.[attr.key] ?? 0;
              const percentage = Math.min(100, Math.max(0, (scoreValue / 10) * 100));

              return (
                <div key={attr.key} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-foreground-secondary">
                      {attr.label}
                    </span>
                    <span className="tabular-nums font-semibold text-foreground">
                      {scoreValue.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-border-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Brew Parameters & Equipment Specs */}
        <section className="border-t border-border-subtle pt-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground-secondary">
            Brew Parameters & Equipment
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
              <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider block">
                Dose
              </span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {log.coffeeDoseGrams}g
              </span>
            </div>

            <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
              <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider block">
                Water
              </span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {log.waterAmountGrams}g
              </span>
            </div>

            <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
              <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider block">
                Ratio
              </span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {brewRatio}
              </span>
            </div>

            <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
              <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider block">
                Actual Time
              </span>
              <span
                data-testid="brew-time-telemetry"
                className="text-sm font-semibold text-foreground tabular-nums"
              >
                {formatBrewTime(log.actualTimeSeconds)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
              <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider block">
                Grinder & Setting
              </span>
              <div className="text-xs font-medium text-foreground mt-1">
                <div>{grinderName}</div>
                {log.grindSetting && (
                  <div className="text-foreground-secondary mt-0.5">
                    Setting: {log.grindSetting}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
              <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider block">
                Brewer
              </span>
              <div className="text-xs font-medium text-foreground mt-1">
                {brewerName}
              </div>
            </div>

            <div className="bg-panel-recessed p-3 rounded-lg border border-border-subtle">
              <span className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider block">
                Water Temperature
              </span>
              <div className="text-xs font-medium text-foreground mt-1 tabular-nums">
                {log.waterTempCelsius ? `${log.waterTempCelsius}°C` : 'Not recorded'}
              </div>
            </div>
          </div>
        </section>

        {/* Cupper's Notes */}
        {log.notes && (
          <section className="border-t border-border-subtle pt-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground-secondary">
              Cupper's Tasting Notes
            </h2>
            <blockquote className="border-l-2 border-accent pl-4 py-1 text-sm text-foreground italic font-sans leading-relaxed">
              "{log.notes}"
            </blockquote>
          </section>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Tasting Log"
        titleId="delete-dialog-title"
        headingLevel={2}
        message={
          <>
            Are you sure you want to delete this tasting log for{' '}
            <strong className="text-foreground">{beanName}</strong>? This action cannot be undone.
          </>
        }
        confirmLabel="Confirm Delete"
        cancelLabel="Cancel"
        variant="danger"
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          onDelete(log);
        }}
      />
    </div>
  );
};
