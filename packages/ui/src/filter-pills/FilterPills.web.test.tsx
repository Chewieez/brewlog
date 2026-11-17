import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterPills } from './FilterPills.web';

describe('FilterPills (web)', () => {
  const options = [
    { value: 'all', label: 'All' },
    { value: 'washed', label: 'Washed' },
    { value: 'natural', label: 'Natural', disabled: true },
    { value: 'anaerobic', label: 'Anaerobic' },
  ];

  it('renders all options inside a group with aria-pressed states', () => {
    render(
      <FilterPills
        options={options}
        value="washed"
        onChange={() => {}}
        ariaLabel="Filter by process"
        testID="process-pills"
      />
    );

    const group = screen.getByRole('group', { name: 'Filter by process' });
    expect(group).toBeInTheDocument();
    expect(group.getAttribute('data-testid')).toBe('process-pills');

    const allBtn = screen.getByRole('button', { name: 'All' });
    const washedBtn = screen.getByRole('button', { name: 'Washed' });
    const naturalBtn = screen.getByRole('button', { name: 'Natural' });

    expect(washedBtn.getAttribute('aria-pressed')).toBe('true');
    expect(washedBtn.className).toContain('btn-tactile-primary');
    expect(allBtn.getAttribute('aria-pressed')).toBe('false');
    expect(allBtn.className).toContain('btn-tactile-secondary');
    expect(naturalBtn).toBeDisabled();
  });

  it('calls onChange for enabled pills and ignores disabled pills', () => {
    const handleChange = vi.fn();
    render(<FilterPills options={options} value="all" onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Anaerobic' }));
    expect(handleChange).toHaveBeenCalledWith('anaerobic');

    fireEvent.click(screen.getByRole('button', { name: 'Natural' }));
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('applies sm (h-8) and md (h-10) sizing classes with rounded-lg radius', () => {
    const { rerender } = render(
      <FilterPills options={options} value="all" onChange={() => {}} size="sm" />
    );
    const smBtn = screen.getByRole('button', { name: 'All' });
    expect(smBtn.className).toContain('h-8');
    expect(smBtn.className).toContain('rounded-lg');

    rerender(
      <FilterPills options={options} value="all" onChange={() => {}} size="md" />
    );
    const mdBtn = screen.getByRole('button', { name: 'All' });
    expect(mdBtn.className).toContain('h-10');
    expect(mdBtn.className).toContain('rounded-lg');
  });

  it('returns null when options is empty', () => {
    const { container } = render(
      <FilterPills options={[]} value="" onChange={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('supports ArrowLeft, ArrowRight, Home, and End focus navigation skipping disabled pills', () => {
    render(<FilterPills options={options} value="all" onChange={() => {}} />);

    const allBtn = screen.getByRole('button', { name: 'All' });
    const washedBtn = screen.getByRole('button', { name: 'Washed' });
    const anaerobicBtn = screen.getByRole('button', { name: 'Anaerobic' });

    allBtn.focus();
    expect(document.activeElement).toBe(allBtn);

    fireEvent.keyDown(allBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(washedBtn);

    // Skips disabled Natural pill
    fireEvent.keyDown(washedBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(anaerobicBtn);

    // Wraps to first enabled pill
    fireEvent.keyDown(anaerobicBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(allBtn);

    // Wraps backward to last enabled pill
    fireEvent.keyDown(allBtn, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(anaerobicBtn);

    fireEvent.keyDown(anaerobicBtn, { key: 'Home' });
    expect(document.activeElement).toBe(allBtn);

    fireEvent.keyDown(allBtn, { key: 'End' });
    expect(document.activeElement).toBe(anaerobicBtn);
  });

  it('preserves focus-ring clearance around the container and does not block Tab, Enter, or Space', () => {
    render(
      <FilterPills
        options={options}
        value="all"
        onChange={() => {}}
        testID="process-pills"
      />
    );

    const group = screen.getByTestId('process-pills');
    expect(group.className).toContain('p-1');
    expect(group.className).toContain('-m-1');
    expect(group.className).toContain('sm:overflow-visible');

    const allBtn = screen.getByRole('button', { name: 'All' });
    for (const key of ['Tab', 'Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      allBtn.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it('trims stale button refs when options shrinks and wraps arrow navigation cleanly', () => {
    const { rerender } = render(
      <FilterPills options={options} value="all" onChange={() => {}} />
    );

    const shrunkOptions = [
      { value: 'all', label: 'All' },
      { value: 'washed', label: 'Washed' },
    ];
    rerender(<FilterPills options={shrunkOptions} value="all" onChange={() => {}} />);

    const allBtn = screen.getByRole('button', { name: 'All' });
    const washedBtn = screen.getByRole('button', { name: 'Washed' });

    allBtn.focus();
    fireEvent.keyDown(allBtn, { key: 'End' });
    expect(document.activeElement).toBe(washedBtn);

    fireEvent.keyDown(washedBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(allBtn);
  });
});
