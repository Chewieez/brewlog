export interface BadgeProps {
  label: string;
  variant?: 'mono' | 'default' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  testID?: string;
}
