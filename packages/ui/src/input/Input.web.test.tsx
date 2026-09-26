import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './Input.web';

describe('Input (web)', () => {
  it('renders numeric input in Outfit light tabular-nums without font-mono', () => {
    render(<Input variant="numeric" value="15.0" onChangeText={() => {}} unit="g" label="COFFEE DOSE" />);
    const input = screen.getByLabelText('COFFEE DOSE');
    expect(input).toBeInTheDocument();
    expect(input.className).toContain("font-['Outfit']");
    expect(input.className).toContain('font-light');
    expect(input.className).toContain('tabular-nums');
    expect(input.className).not.toContain('font-mono');
  });

  it('renders unit suffix in Outfit font', () => {
    render(<Input variant="numeric" value="250" onChangeText={() => {}} unit="g" />);
    const unit = screen.getByText('g');
    expect(unit).toBeInTheDocument();
    expect(unit.className).toContain("font-['Outfit']");
  });

  it('calls onChangeText when typed into', () => {
    const handleChange = vi.fn();
    render(<Input value="15" onChangeText={handleChange} label="Dose" />);
    const input = screen.getByLabelText('Dose');
    fireEvent.change(input, { target: { value: '18' } });
    expect(handleChange).toHaveBeenCalledWith('18');
  });
});
