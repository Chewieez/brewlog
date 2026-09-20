/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';

vi.mock('react-native', () => {
  return {
    View: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
    Text: ({ children, style, ...props }: any) => <span {...props}>{children}</span>,
    ScrollView: ({ children, style, ...props }: any) => <div {...props}>{children}</div>,
    Pressable: ({
      children,
      onPress,
      accessibilityLabel,
      accessibilityRole,
      accessibilityState,
      hitSlop,
      style,
      ...props
    }: any) => (
      <button
        type="button"
        onClick={onPress}
        role={accessibilityRole}
        aria-label={accessibilityLabel}
        aria-selected={accessibilityState?.selected}
        {...props}
      >
        {children}
      </button>
    ),
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

import { render, fireEvent, cleanup } from '@testing-library/react';
import { MethodPills } from './MethodPills';

describe('MethodPills Component', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders pills with formatted display names and handles selection', () => {
    const onSelect = vi.fn();
    const methods = ['v60', 'aeropress', 'flair'];

    const { getByText, getByLabelText } = render(
      <MethodPills
        selectedMethod="v60"
        onSelectMethod={onSelect}
        methods={methods}
      />
    );

    // Verify display names are rendered in uppercase
    expect(getByText('V60')).toBeDefined();
    expect(getByText('AEROPRESS')).toBeDefined();
    expect(getByText('FLAIR')).toBeDefined();

    // Verify accessibility labels
    expect(getByLabelText('V60 brew method')).toBeDefined();
    expect(getByLabelText('AEROPRESS brew method')).toBeDefined();
    expect(getByLabelText('FLAIR brew method')).toBeDefined();

    // Tapping Flair calls onSelectMethod with 'flair'
    fireEvent.click(getByText('FLAIR'));
    expect(onSelect).toHaveBeenCalledWith('flair');

    // Tapping AeroPress calls onSelectMethod with 'aeropress'
    fireEvent.click(getByText('AEROPRESS'));
    expect(onSelect).toHaveBeenCalledWith('aeropress');
  });

  it('formats hyphenated brew methods with spaces (e.g. french-press -> FRENCH PRESS)', () => {
    const onSelect = vi.fn();
    const { getByText, getByLabelText } = render(
      <MethodPills
        selectedMethod="french-press"
        onSelectMethod={onSelect}
        methods={['french-press', 'kalita-wave']}
      />
    );

    expect(getByText('FRENCH PRESS')).toBeDefined();
    expect(getByText('KALITA WAVE')).toBeDefined();
    expect(getByLabelText('FRENCH PRESS brew method')).toBeDefined();
    expect(getByLabelText('KALITA WAVE brew method')).toBeDefined();

    fireEvent.click(getByText('FRENCH PRESS'));
    expect(onSelect).toHaveBeenCalledWith('french-press');
  });

  it('performs case-insensitive active state matching', () => {
    const onSelect = vi.fn();
    const { getByLabelText } = render(
      <MethodPills
        selectedMethod="V60"
        onSelectMethod={onSelect}
        methods={['v60', 'aeropress']}
      />
    );

    const v60Button = getByLabelText('V60 brew method');
    expect(v60Button.getAttribute('aria-selected')).toBe('true');
  });
});
