export interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  variant?: 'default' | 'accent' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  testID?: string;
}
