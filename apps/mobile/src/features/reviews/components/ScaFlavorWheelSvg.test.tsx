/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { SCA_FLAVOR_WHEEL } from '@brewlog/core';
import { ScaFlavorWheelSvg } from './ScaFlavorWheelSvg';

vi.mock('react-native', () => ({
  View: ({ children, style: _style, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, style: _style, numberOfLines: _n, ...props }: any) => <span {...props}>{children}</span>,
  Pressable: ({ children, onPress, accessibilityLabel, accessibilityRole, style: _style, hitSlop: _hitSlop, ...props }: any) => (
    <div
      role={accessibilityRole || 'button'}
      aria-label={accessibilityLabel}
      onClick={() => onPress?.()}
      {...props}
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </div>
  ),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}));

vi.mock('react-native-svg', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
  G: ({ children, ...props }: any) => <g {...props}>{children}</g>,
  Circle: (props: any) => <circle {...props} />,
  Path: ({ onPress, ...props }: any) => (
    <path
      data-interactive={onPress ? 'true' : 'false'}
      onClick={() => onPress?.()}
      {...props}
    />
  ),
}));

const firstCategory = SCA_FLAVOR_WHEEL[0];
const firstDescriptor = firstCategory.subcategories?.[0]?.descriptors?.[0] ?? '';

describe('ScaFlavorWheelSvg (mobile)', () => {
  afterEach(cleanup);

  it('inspects slice without showing ADD/REMOVE or calling onToggleTag when readOnly is true', () => {
    const onToggleTag = vi.fn();
    const { container, getByText, queryByText } = render(
      <ScaFlavorWheelSvg
        selectedTags={[firstDescriptor]}
        onToggleTag={onToggleTag}
        readOnly={true}
      />
    );

    const interactiveSlices = container.querySelectorAll('path[data-interactive="true"]');
    expect(interactiveSlices.length).toBeGreaterThan(0);

    fireEvent.click(interactiveSlices[0]);

    expect(getByText(firstCategory.name)).toBeTruthy();
    expect(getByText(firstDescriptor)).toBeTruthy();
    expect(queryByText('ADD')).toBeNull();
    expect(queryByText('REMOVE')).toBeNull();
    expect(onToggleTag).not.toHaveBeenCalled();
  });

  it('shows ADD/REMOVE button and calls onToggleTag when readOnly is false', () => {
    const onToggleTag = vi.fn();
    const { container, getByText } = render(
      <ScaFlavorWheelSvg
        selectedTags={[]}
        onToggleTag={onToggleTag}
      />
    );

    const interactiveSlices = container.querySelectorAll('path[data-interactive="true"]');
    fireEvent.click(interactiveSlices[0]);

    const addBtn = getByText('ADD');
    expect(addBtn).toBeTruthy();
    fireEvent.click(addBtn);
    expect(onToggleTag).toHaveBeenCalledWith(firstDescriptor);
  });
});
