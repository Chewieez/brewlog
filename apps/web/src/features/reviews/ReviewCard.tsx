import React from 'react';
import { Star } from 'lucide-react';
import { TastingLog, DateFormatPreference, formatDisplayDate } from '@brewlog/core';
import { getScaTier } from './ReviewDetailPane';

export interface ReviewCardProps {
  log: TastingLog;
  isSelected: boolean;
  dateFormat: DateFormatPreference;
  onSelect: (log: TastingLog) => void;
}

function formatBrewTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

function formatDate(dateStr: string, dateFormat: DateFormatPreference): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return formatDisplayDate(dateStr, dateFormat);
  } catch {
    return dateStr;
  }
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  log,
  isSelected,
  dateFormat,
  onSelect,
}) => {
  const scaScore = Number(log.calculatedScaScore ?? 0);
  const tier = getScaTier(scaScore);
  const trimmedNotes = log.notes?.trim() ?? '';

  return (
    <div
      onClick={() => onSelect(log)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.key === ' ') {
            e.preventDefault();
          }
          onSelect(log);
        }
      }}
      className={`p-4 rounded-xl border cursor-pointer transition-all text-left relative ${
        isSelected
          ? 'bg-panel-recessed border-accent shadow-sm'
          : 'bg-panel border-border-subtle hover:border-border-active'
      }`}
    >
      {/* 1. Header: Star Rating & SCA Score + Tier Badge */}
      <div
        data-testid="review-card-header"
        className="flex items-center justify-between gap-2 mb-2"
      >
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-semibold text-foreground-secondary tabular-nums">
            {log.rating || '—'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {scaScore.toFixed(1)}
          </span>
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${tier.classes}`}
          >
            {tier.label}
          </span>
        </div>
      </div>

      {/* 2. Identity: Coffee Name & Roaster */}
      <div data-testid="review-card-identity">
        <h2 className="text-sm font-bold text-foreground leading-snug">
          {log.beanNameSnapshot}
        </h2>
        <p className="text-xs text-foreground-secondary mt-0.5">
          {log.roasterSnapshot}
        </p>
      </div>

      {/* 3. Flavor Tags */}
      {log.flavorTags && log.flavorTags.length > 0 && (
        <div data-testid="review-card-tags" className="flex flex-wrap gap-1 mt-2.5">
          {log.flavorTags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md text-[11px] font-sans font-medium bg-accent/10 text-accent border border-accent/20"
            >
              {tag}
            </span>
          ))}
          {log.flavorTags.length > 3 && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] text-foreground-secondary">
              +{log.flavorTags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 4. Notes Snippet */}
      {trimmedNotes && (
        <p
          data-testid="review-card-notes"
          className="text-xs text-foreground-secondary italic line-clamp-2 mt-2.5 leading-relaxed"
        >
          {trimmedNotes}
        </p>
      )}

      {/* 5. Telemetry Footer */}
      <div
        data-testid="review-card-footer"
        className="flex items-center justify-between text-[11px] text-foreground-secondary mt-3 pt-2 border-t border-border-subtle/60"
      >
        <div className="flex items-center gap-2">
          <span className="uppercase font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md badge-artisan border">
            {log.brewMethod}
          </span>
          <span>•</span>
          <span className="tabular-nums">
            {log.coffeeDoseGrams}g:{log.waterAmountGrams}g
          </span>
          {log.actualTimeSeconds ? (
            <>
              <span>•</span>
              <span className="tabular-nums">
                {formatBrewTime(log.actualTimeSeconds)}
              </span>
            </>
          ) : null}
        </div>
        <span className="tabular-nums">{formatDate(log.brewDate, dateFormat)}</span>
      </div>
    </div>
  );
};
