import React from 'react';
import type { ButtonProps } from './Button.types';

export const Button: React.FC<ButtonProps> = ({
  label,
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  onClick,
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
    md: 'h-10 px-4 text-xs gap-2',
    lg: 'h-12 px-6 text-sm gap-2.5',
  }[size];

  let variantClasses = 'btn-tactile-primary border-0 font-mono font-bold uppercase tracking-wider';
  if (variant === 'secondary') {
    variantClasses = 'btn-tactile-secondary border-0 font-mono font-bold uppercase tracking-wider';
  } else if (variant === 'ghost') {
    variantClasses = 'bg-transparent hover:bg-panel-recessed text-foreground-secondary hover:text-foreground uppercase font-medium active:scale-[0.98] transition-all border-0';
  } else if (variant === 'danger') {
    variantClasses = 'bg-status-error/10 hover:bg-status-error/20 text-status-error border border-status-error/40 font-mono font-bold uppercase tracking-wider active:scale-[0.98] transition-all';
  }

  const content = children ?? label;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    onPress?.();
  };

  return (
    <button
      type={type}
      data-testid={testID}
      aria-label={accessibilityLabel || (typeof label === 'string' ? label : undefined)}
      disabled={disabled || loading}
      onClick={handleClick}
      className={`inline-flex items-center justify-center rounded-md transition-colors select-none focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
    >
      {loading ? (
        <span className="animate-spin" data-testid="button-spinner">⟳</span>
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}
      <span>{content}</span>
      {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};
