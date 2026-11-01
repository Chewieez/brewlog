import React from 'react';
import type { MetricTileProps } from './MetricTile.types';

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  unit,
  variant = 'default',
  size = 'md',
  testID,
}) => {
  const valueSizeClasses = {
    sm: 'text-xl sm:text-2xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
  }[size];

  const colorClasses = {
    default: 'text-foreground',
    accent: 'text-accent',
    muted: 'text-foreground-muted',
  }[variant];

  return (
    <div data-testid={testID} className="flex flex-col">
      <span className="text-[10px] font-mono tracking-widest text-foreground-muted uppercase">
        {label}
      </span>
      <div className="flex items-baseline mt-1">
        <span className={`font-['Outfit'] font-light tabular-nums ${valueSizeClasses} ${colorClasses}`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs text-foreground-muted font-['Outfit'] font-light ml-1">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};
