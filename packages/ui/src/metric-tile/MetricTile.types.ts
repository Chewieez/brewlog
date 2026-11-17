export interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  variant?: 'default' | 'accent' | 'muted' | 'success';
  size?: 'sm' | 'md' | 'lg';
  testID?: string;
}
