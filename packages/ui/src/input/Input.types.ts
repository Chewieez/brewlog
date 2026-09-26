export interface InputProps {
  value: string | number;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
  variant?: 'default' | 'numeric';
  unit?: string;
  error?: string;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}
