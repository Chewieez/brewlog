import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('react-native', () => {
  return {
    View: ({ children, testID, ...props }: any) => <div data-testid={testID} {...props}>{children}</div>,
    Text: ({ children, testID, style, ...props }: any) => (
      <span data-testid={testID} data-style={JSON.stringify(style)} {...props}>
        {children}
      </span>
    ),
    Pressable: ({ children, testID, onPress, disabled, accessibilityRole, accessibilityLabel, style, ...props }: any) => {
      const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style;
      return (
        <button
          type="button"
          data-testid={testID}
          onClick={disabled ? undefined : onPress}
          disabled={disabled}
          role={accessibilityRole}
          aria-label={accessibilityLabel}
          data-style={JSON.stringify(resolvedStyle)}
          {...props}
        >
          {children}
        </button>
      );
    },
    ActivityIndicator: ({ testID }: any) => <div data-testid={testID || 'loading-indicator'}>Loading...</div>,
    StyleSheet: {
      create: (styles: any) => styles,
    },
  };
});

import { render, screen } from '@testing-library/react';
import { Button } from './Button.native';

describe('Button (native)', () => {
  it('wraps string children in a Text element to prevent runtime invariant crash', () => {
    render(<Button>START BREW</Button>);
    const textElement = screen.getByText('START BREW');
    expect(textElement.tagName.toLowerCase()).toBe('span'); // Rendered via Text mock
    expect(textElement.getAttribute('data-style')).toContain('JetBrainsMono_700Bold');
  });

  it('renders label as Text when children are omitted', () => {
    render(<Button label="PAUSE" />);
    const textElement = screen.getByText('PAUSE');
    expect(textElement.tagName.toLowerCase()).toBe('span');
    expect(textElement.getAttribute('data-style')).toContain('JetBrainsMono_700Bold');
  });

  it('renders custom element children directly without double-wrapping', () => {
    render(
      <Button>
        <div data-testid="custom-child">Custom Element</div>
      </Button>
    );
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });
});
