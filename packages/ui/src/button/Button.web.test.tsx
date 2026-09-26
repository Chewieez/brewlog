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

  it('renders secondary button with panel-recessed and text-primary', () => {
    render(<Button label="CANCEL" variant="secondary" />);
    const btn = screen.getByRole('button', { name: 'CANCEL' });
    expect(btn.className).toContain('bg-panel-recessed');
    expect(btn.className).toContain('hover:bg-panel');
    expect(btn.className).toContain('text-text-primary');
    expect(btn.className).toContain('border-border-subtle');
  });

  it('renders ghost button with transparent background and text-secondary', () => {
    render(<Button label="MORE" variant="ghost" />);
    const btn = screen.getByRole('button', { name: 'MORE' });
    expect(btn.className).toContain('bg-transparent');
    expect(btn.className).toContain('hover:bg-panel-recessed');
    expect(btn.className).toContain('text-text-secondary');
  });

  it('renders string children correctly', () => {
    render(<Button><span>START BREW</span></Button>);
    expect(screen.getByText('START BREW')).toBeInTheDocument();
  });
});
