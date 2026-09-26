import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Card } from './Card.web';

describe('Card (web)', () => {
  it('renders children with default panel styling and subtle border', () => {
    render(<Card><span>Panel Content</span></Card>);
    const card = screen.getByText('Panel Content').parentElement;
    expect(card).toBeInTheDocument();
    expect(card?.className).toContain('bg-panel');
    expect(card?.className).toContain('border-border-subtle');
  });

  it('renders recessed variant with panel-recessed class', () => {
    render(<Card variant="recessed"><span>Recessed Content</span></Card>);
    const card = screen.getByText('Recessed Content').parentElement;
    expect(card?.className).toContain('bg-panel-recessed');
  });

  it('triggers onPress when clicked in interactive mode', () => {
    const handlePress = vi.fn();
    render(<Card variant="interactive" onPress={handlePress}><span>Click Me</span></Card>);
    fireEvent.click(screen.getByText('Click Me'));
    expect(handlePress).toHaveBeenCalledTimes(1);
  });
});
