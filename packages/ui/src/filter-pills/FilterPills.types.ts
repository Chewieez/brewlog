export interface FilterPillsOption<T extends string = string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  testID?: string;
}

export interface FilterPillsProps<T extends string = string> {
  options: FilterPillsOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  ariaLabel?: string;
  testID?: string;
}
