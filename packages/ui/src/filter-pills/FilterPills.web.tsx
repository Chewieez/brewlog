import React, { useRef } from 'react';
import type { FilterPillsProps } from './FilterPills.types';
import { handleHorizontalOptionKeyDown } from '../utils/keyboardNavigation';

/**
 * Horizontal pill bar for single-select filtering with arrow-key focus parity.
 */
export function FilterPills<T extends string = string>({
  options,
  value,
  onChange,
  size = 'sm',
  ariaLabel,
  testID,
}: FilterPillsProps<T>) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (options.length === 0) {
    buttonRefs.current.length = 0;
    return null;
  }

  buttonRefs.current.length = options.length;
  const sizeClasses = size === 'md' ? 'h-10 px-4 text-xs' : 'h-8 px-3 text-xs';
  const disabledStates = options.map((opt) => Boolean(opt.disabled));

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-testid={testID}
      className="flex items-center gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap p-1 -m-1 pb-2 sm:pb-1"
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const isDisabled = Boolean(option.disabled);

        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            disabled={isDisabled}
            aria-pressed={isSelected}
            aria-label={option.accessibilityLabel || option.label}
            data-testid={option.testID}
            onClick={() => {
              if (!isDisabled) {
                onChange(option.value);
              }
            }}
            onKeyDown={(e) =>
              handleHorizontalOptionKeyDown(e, index, buttonRefs, disabledStates)
            }
            className={`inline-flex items-center justify-center rounded-lg font-mono uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-canvas active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${
              isSelected
                ? 'btn-tactile-primary font-bold'
                : 'btn-tactile-secondary font-medium text-foreground-secondary hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
