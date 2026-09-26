import React from 'react';
import type { InputProps } from './Input.types';

export const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  label,
  placeholder,
  variant = 'default',
  unit,
  error,
  disabled = false,
  testID,
  accessibilityLabel,
}) => {
  const generatedId = React.useId();
  const inputId = testID || generatedId;
  const isNumeric = variant === 'numeric';
  const borderClasses = error
    ? 'border-status-error focus-within:border-status-error'
    : 'border-border-subtle focus-within:border-accent';

  return (
    <div className="flex flex-col space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[10px] font-mono tracking-widest text-text-muted uppercase cursor-pointer"
        >
          {label}
        </label>
      )}
      <div className={`relative flex items-center bg-panel-recessed border rounded-md px-3 py-2 transition-colors ${borderClasses}`}>
        <input
          id={inputId}
          data-testid={testID}
          aria-label={accessibilityLabel || label}
          disabled={disabled}
          type="text"
          inputMode={isNumeric ? 'decimal' : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChangeText(e.target.value)}
          className={`bg-transparent text-text-primary focus:outline-none w-full ${
            isNumeric
              ? "font-['Outfit'] font-light tabular-nums text-lg text-right pr-1"
              : 'font-sans text-sm text-left'
          }`}
        />
        {unit && (
          <span className="font-['Outfit'] font-light text-text-muted text-sm ml-1 select-none">
            {unit}
          </span>
        )}
      </div>
      {error && <span className="text-[11px] text-status-error font-sans">{error}</span>}
    </div>
  );
};
