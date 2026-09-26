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
  const isNumeric = variant === 'numeric';

  return (
    <div className="flex flex-col space-y-1">
      {label && (
        <label className="text-[10px] font-mono tracking-widest text-text-muted uppercase">
          {label}
        </label>
      )}
      <div className="relative flex items-center bg-panel-recessed border border-border-subtle focus-within:border-accent rounded-md px-3 py-2 transition-colors">
        <input
          data-testid={testID}
          aria-label={accessibilityLabel || label}
          disabled={disabled}
          type={isNumeric ? 'text' : 'text'}
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
