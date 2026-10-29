export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
  testID?: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  testID?: string;
  ariaLabel?: string;
}
