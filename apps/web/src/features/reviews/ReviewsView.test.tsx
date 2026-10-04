/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { ReviewsView } from './ReviewsView';
import { INITIAL_BEANS } from '../../lib/sampleData';
import { DEFAULT_PRESET_RECIPES, Equipment, TastingLog } from '@brewlog/core';

const mockEquipment: Equipment[] = [
  {
    id: 'grinder-1',
    type: 'grinder',
    brand: 'Comandante',
    model: 'C40 MK4',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'brewer-1',
    type: 'brewer',
    brand: 'Hario',
    model: 'V60 02 Ceramic',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('ReviewsView', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders all 10 official SCA attribute sliders with their labels', () => {
    render(<ReviewsView logs={[]} beans={INITIAL_BEANS} onAddTastingLog={vi.fn()} />);

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
    render(<ReviewsView logs={[]} beans={INITIAL_BEANS} onAddTastingLog={vi.fn()} />);

    expect(screen.getByText('82.5')).toBeDefined();
    expect(screen.getByText(/Very Good \(Specialty\)/i)).toBeDefined();
  });

  it('clears scores to 0.0 and restores baseline on quick action button clicks', () => {
    render(<ReviewsView logs={[]} beans={INITIAL_BEANS} onAddTastingLog={vi.fn()} />);

    const clearButton = screen.getByRole('button', { name: /Clear \(0\)/i });
    fireEvent.click(clearButton);

    expect(screen.getAllByText('0.0').length).toBeGreaterThan(0);
    expect(screen.getByText(/Commercial \/ Below Specialty/i)).toBeDefined();

    const baselineButton = screen.getByRole('button', { name: /Baseline \(82\.5\)/i });
    fireEvent.click(baselineButton);

    expect(screen.getAllByText('82.5').length).toBeGreaterThan(0);
    expect(screen.getByText(/Very Good \(Specialty\)/i)).toBeDefined();
  });

  it('submits review containing all 10 SCA attributes and equipment snapshots when form is saved', async () => {
    const handleAddTastingLog = vi.fn();
    render(
      <ReviewsView
        logs={[]}
        beans={INITIAL_BEANS}
        equipment={mockEquipment}
        onAddTastingLog={handleAddTastingLog}
      />
    );

    // Select grinder & brewer
    const grinderSelect = screen.getByLabelText(/Grinder/i);
    fireEvent.change(grinderSelect, { target: { value: 'grinder-1' } });

    const brewerSelect = screen.getByLabelText(/Brewer \(Equipment\)/i);
    fireEvent.change(brewerSelect, { target: { value: 'brewer-1' } });

    const submitButton = screen.getByRole('button', { name: /SAVE REVIEW/i });
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

    // Equipment tracking parity verification
    expect(savedPayload.grinderId).toBe('grinder-1');
    expect(savedPayload.grinderSnapshot).toBe('Comandante C40 MK4');
    expect(savedPayload.brewerId).toBe('brewer-1');
    expect(savedPayload.brewerSnapshot).toBe('Hario V60 02 Ceramic');
  });

  it('renders CLEAR button with standardized styles when pendingBrewSession is provided', () => {
    const onClearPendingSession = vi.fn();
    render(
      <ReviewsView
        logs={[]}
        beans={INITIAL_BEANS}
        onAddTastingLog={vi.fn()}
        pendingBrewSession={{
          recipe: DEFAULT_PRESET_RECIPES[0],
          actualTimeSeconds: 210,
          bean: INITIAL_BEANS[0],
        }}
        onClearPendingSession={onClearPendingSession}
      />
    );

    const clearButton = screen.getByRole('button', { name: 'CLEAR' });
    expect(clearButton).toBeDefined();
    expect(clearButton.className).toContain('font-mono');
    expect(clearButton.className).toContain('uppercase');
    expect(clearButton.className).toContain('tracking-wider');

    fireEvent.click(clearButton);
    expect(onClearPendingSession).toHaveBeenCalledTimes(1);
  });

  it('renders equipment snapshot strings in past review history cards', () => {
    const sampleLog: TastingLog = {
      id: 'log-1',
      brewMethod: 'v60',
      brewDate: new Date().toISOString(),
      beanNameSnapshot: 'Ethiopia Yirgacheffe',
      roasterSnapshot: 'Onyx Coffee Lab',
      recipeNameSnapshot: 'V60 Standard',
      coffeeDoseGrams: 20,
      waterAmountGrams: 300,
      actualTimeSeconds: 210,
      grindSetting: '18 clicks',
      grinderSnapshot: 'Comandante C40 MK4',
      brewerSnapshot: 'Hario V60 02 Ceramic',
      waterTempCelsius: 93,
      calculatedScaScore: 88,
      rating: 5,
      flavorTags: ['Floral', 'Peach'],
      notes: 'Delicious bloom',
      wouldBrewAgain: true,
      scores: {
        fragranceAroma: 8,
        flavor: 8.5,
        aftertaste: 8,
        acidity: 8.5,
        body: 8,
        balance: 8,
        cleanCup: 10,
        sweetness: 10,
        uniformity: 10,
        overall: 8.5,
      },
      createdAt: new Date().toISOString(),
    };

    render(
      <ReviewsView
        logs={[sampleLog]}
        beans={INITIAL_BEANS}
        onAddTastingLog={vi.fn()}
      />
    );

    expect(screen.getByText(/Comandante C40 MK4 @ 18 clicks/)).toBeDefined();
    expect(screen.getByText('Hario V60 02 Ceramic')).toBeDefined();
  });
});
