import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('react-native', () => {
  return {
    View: ({ children, testID, style, ...props }: any) => (
      <div data-testid={testID} data-style={JSON.stringify(style)} {...props}>
        {children}
      </div>
    ),
    Text: ({ children, testID, style, ...props }: any) => (
      <span data-testid={testID} data-style={JSON.stringify(style)} {...props}>
        {children}
      </span>
    ),
    TextInput: ({
      testID,
      value,
      onFocus,
      onBlur,
      onChangeText,
      placeholder,
      placeholderTextColor,
      keyboardType,
      editable,
      accessibilityLabel,
      style,
      ...props
    }: any) => (
      <input
        data-testid={testID}
        value={value}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onChangeText?.(e.target.value)}
        disabled={editable === false}
        aria-label={accessibilityLabel}
        placeholder={placeholder}
        data-style={JSON.stringify(style)}
        {...props}
      />
    ),
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input.native';

describe('Input (native)', () => {
  it('defensively handles null or undefined values as empty string', () => {
    render(<Input value={undefined as any} onChangeText={() => {}} testID="dose-input" />);
    const input = screen.getByTestId('dose-input') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('tracks focus and applies accent border on focus', () => {
    render(<Input value="15" onChangeText={() => {}} testID="dose-input" />);
    const input = screen.getByTestId('dose-input');
    const wrapper = input.parentElement;

    expect(wrapper?.getAttribute('data-style')).not.toContain('#d97736');

    fireEvent.focus(input);
    expect(wrapper?.getAttribute('data-style')).toContain('#d97736');

    fireEvent.blur(input);
    expect(wrapper?.getAttribute('data-style')).not.toContain('#d97736');
  });

  it('applies error border color when error prop is provided', () => {
    render(<Input value="" onChangeText={() => {}} error="Dose required" testID="dose-input" />);
    const input = screen.getByTestId('dose-input');
    const wrapper = input.parentElement;
    expect(wrapper?.getAttribute('data-style')).toContain('#ef4444');
    expect(screen.getByText('Dose required')).toBeInTheDocument();
  });

  it('renders numeric input with Outfit_300Light and tabular-nums', () => {
    render(<Input variant="numeric" value="18" onChangeText={() => {}} testID="dose-input" />);
    const input = screen.getByTestId('dose-input');
    expect(input.getAttribute('data-style')).toContain('Outfit_300Light');
    expect(input.getAttribute('data-style')).toContain('tabular-nums');
  });
});
