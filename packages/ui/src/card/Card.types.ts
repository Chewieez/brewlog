import type React from 'react';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'recessed' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}
