import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('react-native', () => {
  return {
    View: ({ children, testID, style, accessibilityLabel, accessibilityRole, ...props }: any) => (
      <div
        data-testid={testID}
        data-accessibility-role={accessibilityRole}
        aria-label={accessibilityLabel}
        data-style={JSON.stringify(style)}
        {...props}
      >
        {children}
      </div>
    ),
    ScrollView: ({
      children,
      testID,
      contentContainerStyle,
      horizontal: _horizontal,
      showsHorizontalScrollIndicator: _showsHorizontalScrollIndicator,
      accessibilityLabel,
      ...props
    }: any) => (
      <div
        data-testid={testID}
        aria-label={accessibilityLabel}
        data-style={JSON.stringify(contentContainerStyle)}
        {...props}
      >
        {children}
      </div>
    ),
    Text: ({ children, testID, style, ...props }: any) => (
      <span data-testid={testID} data-style={JSON.stringify(style)} {...props}>
        {children}
      </span>
    ),
    Pressable: ({
      children,
      testID,
      onPress,
      disabled,
      accessibilityRole,
      accessibilityLabel,
      accessibilityState,
      style,
      ...props
    }: any) => {
      const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style;
      return (
        <button
          type="button"
          data-testid={testID}
          disabled={Boolean(disabled)}
          onClick={disabled ? undefined : onPress}
          role={accessibilityRole}
          aria-label={accessibilityLabel}
          aria-selected={accessibilityState?.selected}
          data-style={JSON.stringify(resolvedStyle)}
          {...props}
        >
          {children}
        </button>
      );
    },
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPills } from './FilterPills.native';

describe('FilterPills (native)', () => {
  const options = [
    { value: 'all', label: 'All' },
    { value: 'washed', label: 'Washed' },
    { value: 'natural', label: 'Natural', disabled: true },
  ];

  it('renders pills and marks the selected pill', () => {
    render(
      <FilterPills
        options={options}
        value="washed"
        onChange={() => {}}
        ariaLabel="Filter by process"
      />
    );

    const allBtn = screen.getByRole('button', { name: 'All' });
    const washedBtn = screen.getByRole('button', { name: 'Washed' });

    expect(washedBtn.getAttribute('aria-selected')).toBe('true');
    expect(allBtn.getAttribute('aria-selected')).toBe('false');
  });

  it('calls onChange when an enabled pill is pressed and skips disabled pills', () => {
    const handleChange = vi.fn();
    render(<FilterPills options={options} value="all" onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Washed' }));
    expect(handleChange).toHaveBeenCalledWith('washed');

    fireEvent.click(screen.getByRole('button', { name: 'Natural' }));
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('returns null when options is empty', () => {
    const { container } = render(
      <FilterPills options={[]} value="" onChange={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });
});
