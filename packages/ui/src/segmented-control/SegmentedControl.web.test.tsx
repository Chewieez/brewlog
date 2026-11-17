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

  it('highlights the selected option with active styling and role-appropriate ARIA attributes', () => {
    const { rerender } = render(<SegmentedControl options={options} value="recipe" onChange={() => {}} />);
    const activeBtn = screen.getByRole('button', { name: 'GUIDED RECIPE' });
    const inactiveBtn = screen.getByRole('button', { name: 'FREE BREW' });

    expect(activeBtn.getAttribute('aria-pressed')).toBe('true');
    expect(activeBtn.getAttribute('aria-selected')).toBe('true');
    expect(activeBtn.className).toContain('segmented-thumb-active');
    expect(inactiveBtn.getAttribute('aria-pressed')).toBe('false');
    expect(inactiveBtn.getAttribute('aria-selected')).toBe('false');

    rerender(<SegmentedControl options={options} value="recipe" onChange={() => {}} role="tablist" />);
    const activeTab = screen.getByRole('tab', { name: 'GUIDED RECIPE' });
    const inactiveTab = screen.getByRole('tab', { name: 'FREE BREW' });
    expect(activeTab.getAttribute('aria-selected')).toBe('true');
    expect(activeTab.getAttribute('aria-pressed')).toBeNull();
    expect(inactiveTab.getAttribute('aria-selected')).toBe('false');
    expect(inactiveTab.getAttribute('aria-pressed')).toBeNull();

    rerender(<SegmentedControl options={options} value="recipe" onChange={() => {}} role="radiogroup" />);
    const activeRadio = screen.getByRole('radio', { name: 'GUIDED RECIPE' });
    expect(activeRadio.getAttribute('aria-checked')).toBe('true');
    expect(activeRadio.getAttribute('aria-pressed')).toBeNull();
    expect(activeRadio.getAttribute('aria-selected')).toBeNull();
  });

  it('calls onChange with the selected value on click', () => {
    const handleChange = vi.fn();
    render(<SegmentedControl options={options} value="recipe" onChange={handleChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'FREE BREW' }));
    expect(handleChange).toHaveBeenCalledWith('free_brew');
  });

  it('uses rounded-lg on track and rounded-md on segmented thumbs', () => {
    render(<SegmentedControl options={options} value="recipe" onChange={() => {}} testID="mode-seg" />);
    const track = screen.getByTestId('mode-seg');
    const thumb = screen.getByRole('button', { name: 'GUIDED RECIPE' });
    expect(track.className).toContain('rounded-lg');
    expect(thumb.className).toContain('rounded-md');
  });

  it('supports ArrowRight, ArrowLeft, Home, and End focus navigation with wrapping', () => {
    const shelfOptions = [
      { value: 'active', label: 'Active Cellar' },
      { value: 'frozen', label: 'Freezer Vault' },
      { value: 'archived', label: 'Archived' },
    ];
    render(
      <SegmentedControl
        options={shelfOptions}
        value="active"
        onChange={() => {}}
        role="tablist"
        ariaLabel="Shelf selector"
      />
    );

    const activeTab = screen.getByRole('tab', { name: 'Active Cellar' });
    const frozenTab = screen.getByRole('tab', { name: 'Freezer Vault' });
    const archivedTab = screen.getByRole('tab', { name: 'Archived' });

    activeTab.focus();
    expect(document.activeElement).toBe(activeTab);

    fireEvent.keyDown(activeTab, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(frozenTab);

    fireEvent.keyDown(frozenTab, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(archivedTab);

    fireEvent.keyDown(archivedTab, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(activeTab);

    fireEvent.keyDown(activeTab, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(archivedTab);

    fireEvent.keyDown(archivedTab, { key: 'Home' });
    expect(document.activeElement).toBe(activeTab);

    fireEvent.keyDown(activeTab, { key: 'End' });
    expect(document.activeElement).toBe(archivedTab);

    for (const key of ['Tab', 'Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      archivedTab.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
  });
});
