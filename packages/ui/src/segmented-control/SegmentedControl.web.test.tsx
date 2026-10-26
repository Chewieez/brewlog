import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl.web';

describe('SegmentedControl (web)', () => {
  const options = [
    { value: 'recipe', label: 'GUIDED RECIPE' },
    { value: 'free_brew', label: 'FREE BREW' },
  ];

  it('renders all options with button roles', () => {
    render(<SegmentedControl options={options} value="recipe" onChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toContain('GUIDED RECIPE');
    expect(buttons[1].textContent).toContain('FREE BREW');
  });

  it('highlights the selected option with active styling and aria-pressed', () => {
    render(<SegmentedControl options={options} value="recipe" onChange={() => {}} />);
    const activeBtn = screen.getByRole('button', { name: 'GUIDED RECIPE' });
    const inactiveBtn = screen.getByRole('button', { name: 'FREE BREW' });

    expect(activeBtn.getAttribute('aria-pressed')).toBe('true');
    expect(activeBtn.className).toContain('bg-accent');
    expect(inactiveBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onChange with the selected value on click', () => {
    const handleChange = vi.fn();
    render(<SegmentedControl options={options} value="recipe" onChange={handleChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'FREE BREW' }));
    expect(handleChange).toHaveBeenCalledWith('free_brew');
  });
});
