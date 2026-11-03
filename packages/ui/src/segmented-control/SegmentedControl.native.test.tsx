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
    Text: ({ children, testID, style, numberOfLines, ...props }: any) => (
      <span data-testid={testID} data-style={JSON.stringify(style)} {...props}>
        {children}
      </span>
    ),
    Pressable: ({
      children,
      testID,
      onPress,
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
          onClick={onPress}
          role={accessibilityRole}
          aria-label={accessibilityLabel}
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
import { SegmentedControl } from './SegmentedControl.native';

describe('SegmentedControl (native)', () => {
  const options = [
    { value: 'recipe', label: 'GUIDED RECIPE' },
    { value: 'free_brew', label: 'FREE BREW' },
  ];

  it('renders all options with text and buttons', () => {
    render(<SegmentedControl options={options} value="recipe" onChange={() => {}} />);
    expect(screen.getByText('GUIDED RECIPE')).toBeInTheDocument();
    expect(screen.getByText('FREE BREW')).toBeInTheDocument();
  });

  it('calls onChange with selected value when an option is pressed', () => {
    const handleChange = vi.fn();
    render(<SegmentedControl options={options} value="recipe" onChange={handleChange} />);
    fireEvent.click(screen.getByText('FREE BREW'));
    expect(handleChange).toHaveBeenCalledWith('free_brew');
  });

  it('applies active styling to the selected option', () => {
    render(<SegmentedControl options={options} value="recipe" onChange={() => {}} />);
    const guidedButton = screen.getByText('GUIDED RECIPE').closest('button');
    const freeBrewButton = screen.getByText('FREE BREW').closest('button');

    expect(guidedButton?.getAttribute('data-style')).toContain('#24201c');
    expect(freeBrewButton?.getAttribute('data-style')).not.toContain('#24201c');
  });

  it('supports fullWidth prop styling', () => {
    const { rerender } = render(
      <SegmentedControl testID="segmented-control" options={options} value="recipe" onChange={() => {}} fullWidth={true} />
    );
    const container = screen.getByTestId('segmented-control');
    expect(container.getAttribute('data-style')).toContain('100%');

    rerender(
      <SegmentedControl testID="segmented-control" options={options} value="recipe" onChange={() => {}} fullWidth={false} />
    );
    expect(container.getAttribute('data-style')).toContain('320');
  });

  it('defaults fullWidth to false with maxWidth constraint', () => {
    render(<SegmentedControl testID="segmented-control-default" options={options} value="recipe" onChange={() => {}} />);
    const container = screen.getByTestId('segmented-control-default');
    const style = container.getAttribute('data-style');
    expect(style).toContain('320');
    expect(style).toContain('"maxWidth":"100%"');
  });

  it('maps native accessibility roles correctly without passing invalid "group" role', () => {
    const { rerender } = render(
      <SegmentedControl testID="segmented-group" options={options} value="recipe" onChange={() => {}} />
    );
    // group should not set native accessibilityRole to "group"
    const groupContainer = screen.getByTestId('segmented-group');
    expect(groupContainer.getAttribute('data-accessibility-role')).toBeNull();

    rerender(
      <SegmentedControl testID="segmented-tablist" role="tablist" options={options} value="recipe" onChange={() => {}} />
    );
    const tablistContainer = screen.getByTestId('segmented-tablist');
    expect(tablistContainer.getAttribute('data-accessibility-role')).toBe('tablist');

    rerender(
      <SegmentedControl testID="segmented-radiogroup" role="radiogroup" options={options} value="recipe" onChange={() => {}} />
    );
    const radiogroupContainer = screen.getByTestId('segmented-radiogroup');
    expect(radiogroupContainer.getAttribute('data-accessibility-role')).toBe('radiogroup');
  });
});
