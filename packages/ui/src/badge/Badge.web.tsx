import React from 'react';
import type { BadgeProps } from './Badge.types';

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  testID,
}) => {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  let variantClasses = 'bg-panel-recessed border border-border-subtle text-text-secondary font-sans';
  if (variant === 'mono') {
    variantClasses = 'bg-panel-recessed border border-border-subtle text-text-secondary font-mono uppercase font-bold tracking-wider';
  } else if (variant === 'accent') {
    variantClasses = 'bg-accent/10 border border-accent text-accent font-mono uppercase font-bold tracking-wider';
  } else if (variant === 'success') {
    variantClasses = 'bg-status-success/10 border border-status-success/40 text-status-success font-sans font-medium';
  } else if (variant === 'warning') {
    variantClasses = 'bg-status-warning/10 border border-status-warning/40 text-status-warning font-sans font-medium';
  } else if (variant === 'error') {
    variantClasses = 'bg-status-error/10 border border-status-error/40 text-status-error font-sans font-medium';
  }

  return (
    <span
      data-testid={testID}
      className={`inline-flex items-center justify-center rounded transition-colors ${sizeClasses} ${variantClasses}`}
    >
      {label}
    </span>
  );
};
