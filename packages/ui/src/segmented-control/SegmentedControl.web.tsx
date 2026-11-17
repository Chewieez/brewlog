import React, { useRef } from 'react';
import type { SegmentedControlProps } from './SegmentedControl.types';
import { handleHorizontalOptionKeyDown } from '../utils/keyboardNavigation';

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  testID,
  ariaLabel,
  role = 'group',
}: SegmentedControlProps<T>) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const buttonSizeClasses = size === 'sm' ? 'h-8 text-xs' : 'h-10 text-xs';
  const widthClasses = fullWidth ? 'w-full' : 'w-80 max-w-full';

  return (
    <div
      role={role}
      aria-label={ariaLabel}
      data-testid={testID}
      className={`inline-grid grid-flow-col auto-cols-fr p-1 segmented-track rounded-lg select-none ${widthClasses}`}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role={
              role === 'tablist' ? 'tab' :
              role === 'radiogroup' ? 'radio' :
              undefined
            }
            aria-pressed={role === 'group' ? isSelected : undefined}
            aria-selected={role === 'tablist' || role === 'group' ? isSelected : undefined}
            aria-checked={role === 'radiogroup' ? isSelected : undefined}
            aria-label={option.accessibilityLabel || option.label}
            data-testid={option.testID}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleHorizontalOptionKeyDown(e, index, buttonRefs)}
            className={`flex items-center justify-center ${buttonSizeClasses} px-3 rounded-md font-mono uppercase tracking-[0.12em] font-bold transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-canvas ${
              isSelected
                ? 'segmented-thumb-active shadow-sm'
                : 'text-foreground-muted hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
