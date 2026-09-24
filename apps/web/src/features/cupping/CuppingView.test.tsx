/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { CuppingView } from './CuppingView';
import { INITIAL_BEANS } from '../../lib/sampleData';

describe('CuppingView', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders all 10 official SCA attribute sliders with their labels', () => {
    render(<CuppingView logs={[]} beans={INITIAL_BEANS} onAddTastingLog={vi.fn()} />);

    // 7 Sensory attributes
    expect(screen.getByText('Fragrance / Aroma')).toBeDefined();
    expect(screen.getByText('Flavor')).toBeDefined();
    expect(screen.getByText('Aftertaste / Finish')).toBeDefined();
    expect(screen.getByText('Acidity (Brightness)')).toBeDefined();
    expect(screen.getByText('Body (Mouthfeel)')).toBeDefined();
    expect(screen.getByText('Balance')).toBeDefined();
    expect(screen.getByText('Overall Impression')).toBeDefined();

    // 3 Cup purity & consistency attributes
    expect(screen.getByText('Clean Cup')).toBeDefined();
    expect(screen.getByText('Sweetness')).toBeDefined();
    expect(screen.getByText('Uniformity')).toBeDefined();
  });

  it('renders initial specialty baseline score (82.5 pts) and classification', () => {
    render(<CuppingView logs={[]} beans={INITIAL_BEANS} onAddTastingLog={vi.fn()} />);

    expect(screen.getByText('82.5')).toBeDefined();
    expect(screen.getByText(/Very Good \(Specialty\)/i)).toBeDefined();
  });

  it('clears scores to 0.0 and restores baseline on quick action button clicks', () => {
    render(<CuppingView logs={[]} beans={INITIAL_BEANS} onAddTastingLog={vi.fn()} />);

    const clearButton = screen.getByRole('button', { name: /Clear \(0\)/i });
    fireEvent.click(clearButton);

    expect(screen.getAllByText('0.0').length).toBeGreaterThan(0);
    expect(screen.getByText(/Commercial \/ Below Specialty/i)).toBeDefined();

    const baselineButton = screen.getByRole('button', { name: /Baseline \(82\.5\)/i });
    fireEvent.click(baselineButton);

    expect(screen.getAllByText('82.5').length).toBeGreaterThan(0);
    expect(screen.getByText(/Very Good \(Specialty\)/i)).toBeDefined();
  });

  it('submits tasting log containing all 10 SCA attributes when form is saved', async () => {
    const handleAddTastingLog = vi.fn();
    render(
      <CuppingView
        logs={[]}
        beans={INITIAL_BEANS}
        onAddTastingLog={handleAddTastingLog}
      />
    );

    const submitButton = screen.getByRole('button', { name: /SAVE TASTING LOG/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(handleAddTastingLog).toHaveBeenCalledTimes(1);
    const savedPayload = handleAddTastingLog.mock.calls[0][0];

    expect(savedPayload.scores).toBeDefined();
    expect(savedPayload.scores.fragranceAroma).toBe(7.5);
    expect(savedPayload.scores.flavor).toBe(7.5);
    expect(savedPayload.scores.aftertaste).toBe(7.5);
    expect(savedPayload.scores.acidity).toBe(7.5);
    expect(savedPayload.scores.body).toBe(7.5);
    expect(savedPayload.scores.balance).toBe(7.5);
    expect(savedPayload.scores.overall).toBe(7.5);
    expect(savedPayload.scores.cleanCup).toBe(10);
    expect(savedPayload.scores.sweetness).toBe(10);
    expect(savedPayload.scores.uniformity).toBe(10);
    expect(savedPayload.calculatedScaScore).toBe(82.5);
  });
});
