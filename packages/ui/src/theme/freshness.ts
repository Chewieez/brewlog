import type { ThemeColors } from './theme';
import type { BeanRestingInfo } from '@brewlog/core';
import type { BadgeProps } from '../badge/Badge.types';

export interface FreshnessPresentationInput {
  status: BeanRestingInfo['status'];
  isFrozen?: boolean;
  hasRoastDate?: boolean;
}

export function resolveFreshnessColor(
  input: FreshnessPresentationInput,
  colors: ThemeColors
): string {
  if (input.hasRoastDate === false) return colors.textMuted;
  if (input.isFrozen) return colors.statusInfo;
  switch (input.status) {
    case 'peak': return colors.statusSuccess;
    case 'resting': return colors.statusWarning;
    case 'aging': return colors.accent;
    case 'past-peak': return colors.textMuted;
  }
}

export function resolveFreshnessBadgeVariant(
  input: FreshnessPresentationInput
): NonNullable<BadgeProps['variant']> {
  if (input.hasRoastDate === false) return 'default';
  if (input.isFrozen) return 'info';
  switch (input.status) {
    case 'peak': return 'success';
    case 'resting': return 'warning';
    case 'aging': return 'accent';
    case 'past-peak': return 'default';
  }
}
