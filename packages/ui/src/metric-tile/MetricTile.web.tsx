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
    default: 'text-text-primary',
    accent: 'text-accent',
    muted: 'text-text-muted',
  }[variant];

  return (
    <div data-testid={testID} className="flex flex-col">
      <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase">
        {label}
      </span>
      <div className="flex items-baseline mt-1">
        <span className={`font-['Outfit'] font-light tabular-nums ${valueSizeClasses} ${colorClasses}`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs text-text-muted font-['Outfit'] font-light ml-1">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};
