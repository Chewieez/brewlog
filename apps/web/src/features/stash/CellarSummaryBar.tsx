import React from 'react';
import { MetricTile } from '@brewlog/ui';

export interface CellarSummaryBarProps {
  totalBags: number;
  peakBags: number;
  totalRemainingGrams: number;
}

/**
 * Summary chassis displaying active cellar bag counts, peak readiness, and remaining weight.
 */
export const CellarSummaryBar: React.FC<CellarSummaryBarProps> = ({
  totalBags,
  peakBags,
  totalRemainingGrams,
}) => {
  return (
    <section
      data-testid="cellar-summary-bar"
      aria-label={`Cellar summary: ${totalBags} active bags, ${peakBags} at peak, ${totalRemainingGrams}g total stash`}
      className="rounded-xl bg-panel border border-border-subtle p-3 sm:p-4"
    >
      <div className="grid grid-cols-3 divide-x divide-border-subtle">
        <div className="flex justify-center px-1.5 sm:px-2">
          <MetricTile label="ACTIVE BAGS" value={totalBags} size="sm" />
        </div>
        <div className="flex justify-center px-1.5 sm:px-2">
          <MetricTile
            label="AT PEAK"
            value={peakBags}
            size="sm"
            variant={peakBags > 0 ? 'success' : 'default'}
          />
        </div>
        <div className="flex justify-center px-1.5 sm:px-2">
          <MetricTile
            label="TOTAL STASH"
            value={totalRemainingGrams}
            unit="g"
            size="sm"
          />
        </div>
      </div>
    </section>
  );
};
