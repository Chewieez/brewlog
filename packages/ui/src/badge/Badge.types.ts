export interface BadgeProps {
  label: string;
  variant?: 'mono' | 'default' | 'accent' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  testID?: string;
}
