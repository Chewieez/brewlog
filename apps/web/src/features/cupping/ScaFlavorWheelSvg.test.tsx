import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScaFlavorWheelSvg } from './ScaFlavorWheelSvg';

describe('ScaFlavorWheelSvg', () => {
  it('renders SVG with accessible region role, title, and initial active count', () => {
    render(<ScaFlavorWheelSvg selectedTags={['Blackberry', 'Peach']} onToggleTag={vi.fn()} />);

    // Check SVG region
    const svgRegion = screen.getByRole('region', { name: /SCA Coffee Taster's Flavor Wheel/i });
    expect(svgRegion).toBeDefined();

    // Check initial center display
    expect(screen.getByText('Sensory Wheel')).toBeDefined();
    expect(screen.getByText('2 active')).toBeDefined();
  });

  it('renders outer descriptors with role="checkbox" and correct aria-checked state', () => {
    render(<ScaFlavorWheelSvg selectedTags={['Blackberry']} onToggleTag={vi.fn()} />);

    const blackberrySlice = screen.getByRole('checkbox', {
      name: /Blackberry, category Fruity, Selected/i,
    });
    expect(blackberrySlice).toBeDefined();
    expect(blackberrySlice.getAttribute('aria-checked')).toBe('true');

    const peachSlice = screen.getByRole('checkbox', {
      name: /Peach, category Fruity, Not selected/i,
    });
    expect(peachSlice).toBeDefined();
    expect(peachSlice.getAttribute('aria-checked')).toBe('false');
  });

  it('calls onToggleTag when clicking on an outer descriptor slice', () => {
    const handleToggle = vi.fn();
    render(<ScaFlavorWheelSvg selectedTags={[]} onToggleTag={handleToggle} />);

    const peachSlice = screen.getByRole('checkbox', {
      name: /Peach/i,
    });

    fireEvent.click(peachSlice);
    expect(handleToggle).toHaveBeenCalledWith('Peach');
  });

  it('updates center hub preview and live region on hover over descriptor', () => {
    render(<ScaFlavorWheelSvg selectedTags={[]} onToggleTag={vi.fn()} />);

    const peachSlice = screen.getByRole('checkbox', {
      name: /Peach/i,
    });

    fireEvent.mouseEnter(peachSlice);

    // Center hub should now display descriptor info
    expect(screen.getByText('Fruity')).toBeDefined();
    expect(screen.getByText('Peach')).toBeDefined();
    expect(screen.getByRole('button', { name: /Add Peach/i })).toBeDefined();
  });

  it('allows toggling descriptor via the center hub action button', () => {
    const handleToggle = vi.fn();
    render(<ScaFlavorWheelSvg selectedTags={['Peach']} onToggleTag={handleToggle} />);

    const peachSlice = screen.getByRole('checkbox', { name: /Peach/i });
    fireEvent.mouseEnter(peachSlice);

    const centerButton = screen.getByRole('button', { name: /Remove Peach/i });
    fireEvent.click(centerButton);

    expect(handleToggle).toHaveBeenCalledWith('Peach');
  });

  it('inspects parent category when clicking on an inner category slice', () => {
    render(<ScaFlavorWheelSvg selectedTags={['Peach']} onToggleTag={vi.fn()} />);

    const fruityCategory = screen.getByRole('button', {
      name: /Category Fruity/i,
    });

    fireEvent.click(fruityCategory);

    // Center hub should show category inspection
    expect(screen.getByText('Category')).toBeDefined();
    expect(screen.getByText('Fruity')).toBeDefined();
    expect(screen.getByText('1/22 selected')).toBeDefined();
  });

  it('implements roving tabindex: only one slice has tabindex="0"', () => {
    render(<ScaFlavorWheelSvg selectedTags={['Peach']} onToggleTag={vi.fn()} />);

    const allCheckboxes = screen.getAllByRole('checkbox');
    const tabIndexZero = allCheckboxes.filter((el) => el.getAttribute('tabindex') === '0');
    const tabIndexMinusOne = allCheckboxes.filter((el) => el.getAttribute('tabindex') === '-1');

    expect(tabIndexZero.length).toBe(1);
    expect(tabIndexMinusOne.length).toBe(allCheckboxes.length - 1);
  });

  it('navigates through descriptors using keyboard arrow keys', () => {
    render(<ScaFlavorWheelSvg selectedTags={[]} onToggleTag={vi.fn()} />);

    const allCheckboxes = screen.getAllByRole('checkbox');
    const initialFocused = allCheckboxes[0];

    fireEvent.focus(initialFocused);

    // Press ArrowRight to move to next slice
    fireEvent.keyDown(initialFocused, { key: 'ArrowRight' });

    const newZero = screen.getAllByRole('checkbox').filter((el) => el.getAttribute('tabindex') === '0');
    expect(newZero.length).toBe(1);
    expect(newZero[0]).toBe(allCheckboxes[1]);

    // Press ArrowLeft to move back
    fireEvent.keyDown(allCheckboxes[1], { key: 'ArrowLeft' });
    const backZero = screen.getAllByRole('checkbox').filter((el) => el.getAttribute('tabindex') === '0');
    expect(backZero[0]).toBe(allCheckboxes[0]);
  });

  it('toggles selection with Space and Enter keys', () => {
    const handleToggle = vi.fn();
    render(<ScaFlavorWheelSvg selectedTags={[]} onToggleTag={handleToggle} />);

    const firstCheckbox = screen.getAllByRole('checkbox')[0];

    // Press Space
    fireEvent.keyDown(firstCheckbox, { key: ' ' });
    expect(handleToggle).toHaveBeenCalledTimes(1);

    // Press Enter
    fireEvent.keyDown(firstCheckbox, { key: 'Enter' });
    expect(handleToggle).toHaveBeenCalledTimes(2);
  });

  it('jumps to first and last descriptors with Home and End keys', () => {
    render(<ScaFlavorWheelSvg selectedTags={[]} onToggleTag={vi.fn()} />);

    const allCheckboxes = screen.getAllByRole('checkbox');
    const middleCheckbox = allCheckboxes[5];

    fireEvent.focus(middleCheckbox);

    // Press End
    fireEvent.keyDown(middleCheckbox, { key: 'End' });
    const endZero = screen.getAllByRole('checkbox').filter((el) => el.getAttribute('tabindex') === '0');
    expect(endZero[0]).toBe(allCheckboxes[allCheckboxes.length - 1]);

    // Press Home
    fireEvent.keyDown(endZero[0], { key: 'Home' });
    const homeZero = screen.getAllByRole('checkbox').filter((el) => el.getAttribute('tabindex') === '0');
    expect(homeZero[0]).toBe(allCheckboxes[0]);
  });
});
