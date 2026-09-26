import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button.web';

describe('Button (web)', () => {
  it('renders primary button with copper accent background and dark text', () => {
    render(<Button label="START BREW" variant="primary" />);
    const btn = screen.getByRole('button', { name: 'START BREW' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('bg-copper');
    expect(btn.className).toContain('text-canvas');
    expect(btn.className).toContain('font-mono');
  });

  it('triggers onPress on click when enabled', () => {
    const handlePress = vi.fn();
    render(<Button label="PAUSE" onPress={handlePress} />);
    fireEvent.click(screen.getByRole('button', { name: 'PAUSE' }));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('renders danger button with status error text and border', () => {
    render(<Button label="DELETE" variant="danger" />);
    const btn = screen.getByRole('button', { name: 'DELETE' });
    expect(btn.className).toContain('text-status-error');
    expect(btn.className).toContain('border-status-error/40');
  });

  it('renders string children correctly', () => {
    render(<Button><span>START BREW</span></Button>);
    expect(screen.getByText('START BREW')).toBeInTheDocument();
  });
});
