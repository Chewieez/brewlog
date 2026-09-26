import React from 'react';
import type { ButtonProps } from './Button.types';

export const Button: React.FC<ButtonProps> = ({
  label,
  children,
  variant = 'primary',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  testID,
  accessibilityLabel,
}) => {
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-11 px-4 text-xs gap-2',
    lg: 'h-12 px-6 text-sm gap-2.5',
  }[size];

  let variantClasses = 'bg-copper hover:bg-copper-hover text-canvas font-mono font-bold uppercase tracking-wider';
  if (variant === 'secondary') {
    variantClasses = 'bg-panel-recessed hover:bg-zinc-800 text-bone border border-border-subtle hover:border-border-active font-mono font-bold uppercase tracking-wider';
  } else if (variant === 'ghost') {
    variantClasses = 'bg-transparent hover:bg-panel-recessed text-bone-muted hover:text-bone uppercase font-medium';
  } else if (variant === 'danger') {
    variantClasses = 'bg-status-error/10 hover:bg-status-error/20 text-status-error border border-status-error/40 font-mono font-bold uppercase tracking-wider';
  }

  const content = children || label;

  return (
    <button
      type="button"
      data-testid={testID}
      aria-label={accessibilityLabel || (typeof label === 'string' ? label : undefined)}
      disabled={disabled || loading}
      onClick={onPress}
      className={`inline-flex items-center justify-center rounded-md transition-colors select-none focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses}`}
    >
      {loading ? (
        <span className="animate-spin mr-1">⟳</span>
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}
      <span>{content}</span>
      {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};
