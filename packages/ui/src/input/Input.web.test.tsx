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

  it('applies border-status-error when error prop is provided', () => {
    render(<Input value="" onChangeText={() => {}} label="Dose" error="Dose required" testID="dose-input" />);
    const inputWrapper = screen.getByTestId('dose-input').parentElement;
    expect(inputWrapper?.className).toContain('border-status-error');
    expect(inputWrapper?.className).toContain('focus-within:border-status-error');
    expect(screen.getByText('Dose required')).toBeInTheDocument();
  });

  it('associates label with input using htmlFor and id', () => {
    render(<Input value="" onChangeText={() => {}} label="Grind Size" testID="grind-input" />);
    const label = screen.getByText('Grind Size');
    const input = screen.getByTestId('grind-input');
    expect(label.getAttribute('for')).toBe('grind-input');
    expect(input.getAttribute('id')).toBe('grind-input');
  });
});
