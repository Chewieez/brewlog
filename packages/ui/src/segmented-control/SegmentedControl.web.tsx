import React from 'react';
import type { SegmentedControlProps } from './SegmentedControl.types';

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  testID,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const containerSizeClasses = size === 'sm' ? 'h-9 text-[10px]' : 'h-11 text-[11px]';
  const widthClasses = fullWidth ? 'w-full' : 'w-80 max-w-full';

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-testid={testID}
      className={`inline-grid grid-flow-col auto-cols-fr p-[3px] bg-panel-recessed border border-border-active rounded-lg select-none ${containerSizeClasses} ${widthClasses}`}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            aria-label={option.accessibilityLabel || option.label}
            data-testid={option.testID}
            onClick={() => onChange(option.value)}
            className={`flex items-center justify-center h-full rounded-md font-mono uppercase tracking-[0.12em] font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              isSelected
                ? 'bg-accent text-canvas shadow-xs'
                : 'text-text-muted hover:text-text-primary hover:bg-panel/40'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
