/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
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

const sampleLog1: TastingLog = {
  id: 'log-1',
  brewMethod: 'v60',
  brewDate: '2026-10-04T12:00:00Z',
  beanNameSnapshot: 'Worka Sakaro',
  roasterSnapshot: 'Sey Coffee',
  recipeNameSnapshot: 'V60 Standard',
  coffeeDoseGrams: 20,
  waterAmountGrams: 300,
  actualTimeSeconds: 210,
  grindSetting: '14 clicks',
  grinderSnapshot: 'Comandante C40 MK4',
  brewerSnapshot: 'Hario V60 02 Ceramic',
  waterTempCelsius: 94,
  calculatedScaScore: 88.5,
  rating: 5,
  flavorTags: ['Peach', 'Jasmine'],
  notes: 'Floral, crisp peach, delicate sweet finish.',
  wouldBrewAgain: true,
  scores: {
    fragranceAroma: 8.5,
    flavor: 8.5,
    aftertaste: 8.0,
    acidity: 8.5,
    body: 8.0,
    balance: 8.0,
    cleanCup: 10,
    sweetness: 10,
    uniformity: 10,
    overall: 8.5,
  },
  createdAt: '2026-10-04T12:00:00Z',
};

const sampleLog2: TastingLog = {
  id: 'log-2',
  brewMethod: 'aeropress',
  brewDate: '2026-10-03T10:00:00Z',
  beanNameSnapshot: 'El Paraiso',
  roasterSnapshot: 'Manhattan',
  recipeNameSnapshot: 'AeroPress Inverted',
  coffeeDoseGrams: 15,
  waterAmountGrams: 250,
  actualTimeSeconds: 165,
  grindSetting: 'Medium-Fine',
  grinderSnapshot: 'Timemore C2',
  brewerSnapshot: 'AeroPress',
  waterTempCelsius: 88,
  calculatedScaScore: 84.0,
  rating: 4,
  flavorTags: ['Strawberry', 'Bubblegum'],
  notes: 'Funky berry punch.',
  wouldBrewAgain: true,
  scores: {
    fragranceAroma: 8.0,
    flavor: 8.0,
    aftertaste: 7.5,
    acidity: 8.0,
    body: 8.0,
    balance: 7.5,
    cleanCup: 9.5,
    sweetness: 10,
    uniformity: 10,
    overall: 8.0,
  },
  createdAt: '2026-10-03T10:00:00Z',
};

describe('ReviewsView Master-Detail Cupping Journal', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders master feed cards and detail pane for selected review', () => {
    render(
      <ReviewsView
        logs={[sampleLog1, sampleLog2]}
        beans={INITIAL_BEANS}
        equipment={mockEquipment}
        onAddTastingLog={vi.fn()}
      />
    );

    const masterFeed = screen.getByTestId('master-feed');
    const detailPane = screen.getByTestId('detail-pane');

    // Both cards exist in master feed
    expect(within(masterFeed).getByText('Worka Sakaro')).toBeDefined();
    expect(within(masterFeed).getByText('El Paraiso')).toBeDefined();

    // Selected detail pane defaults to Worka Sakaro
    expect(within(detailPane).getByText('Worka Sakaro')).toBeDefined();
    expect(within(detailPane).getByText('Sey Coffee')).toBeDefined();
    expect(within(detailPane).getByText('88.5')).toBeDefined();
    expect(within(detailPane).getByText('Peach')).toBeDefined();
    expect(within(detailPane).getByText('Jasmine')).toBeDefined();
  });

  it('updates detail pane when selecting another card in master feed', () => {
    render(
      <ReviewsView
        logs={[sampleLog1, sampleLog2]}
        beans={INITIAL_BEANS}
        equipment={mockEquipment}
        onAddTastingLog={vi.fn()}
      />
    );

    const masterFeed = screen.getByTestId('master-feed');
    const elParaisoCard = within(masterFeed).getByText('El Paraiso');
    fireEvent.click(elParaisoCard);

    // Detail pane now reflects El Paraiso
    const detailPane = screen.getByTestId('detail-pane');
    expect(within(detailPane).getByText('El Paraiso')).toBeDefined();
    expect(within(detailPane).getByText('Manhattan')).toBeDefined();
    expect(within(detailPane).getByText('84.0')).toBeDefined();
    expect(within(detailPane).getByText('Strawberry')).toBeDefined();
    expect(within(detailPane).getByText('Bubblegum')).toBeDefined();
  });

  it('toggles into create mode when clicking + LOG REVIEW and verifies typography and neutral brew time', () => {
    render(
      <ReviewsView
        logs={[sampleLog1]}
        beans={INITIAL_BEANS}
        equipment={mockEquipment}
        onAddTastingLog={vi.fn()}
      />
    );

    const logReviewBtn = screen.getByRole('button', { name: /\+ LOG REVIEW/i });
    fireEvent.click(logReviewBtn);

    // Editor is visible
    expect(screen.getByText('Log New Brew Review')).toBeDefined();

    // All 10 official SCA attribute sliders are present
    expect(screen.getByText('Fragrance / Aroma')).toBeDefined();
    expect(screen.getByText('Flavor')).toBeDefined();
    expect(screen.getByText('Aftertaste / Finish')).toBeDefined();
    expect(screen.getByText('Acidity (Brightness)')).toBeDefined();
    expect(screen.getByText('Body (Mouthfeel)')).toBeDefined();
    expect(screen.getByText('Balance')).toBeDefined();
    expect(screen.getByText('Overall Impression')).toBeDefined();
    expect(screen.getByText('Clean Cup')).toBeDefined();
    expect(screen.getByText('Sweetness')).toBeDefined();
    expect(screen.getByText('Uniformity')).toBeDefined();

    // Score reset button label is 'Clear' (not 'Clear (0)')
    const clearButton = screen.getByRole('button', { name: /^Clear$/i });
    expect(clearButton).toBeDefined();
    fireEvent.click(clearButton);

    const baselineButton = screen.getByRole('button', { name: /Baseline \(82\.5\)/i });
    expect(baselineButton).toBeDefined();
    fireEvent.click(baselineButton);

    // Actual brew time input has text-zinc-100 and NOT text-accent
    const brewTimeInput = screen.getByDisplayValue('210');
    expect(brewTimeInput.className).toContain('text-zinc-100');
    expect(brewTimeInput.className).not.toContain('text-accent');
  });

  it('submits a new review and calls onAddTastingLog with 10 attributes and equipment snapshots', async () => {
    const handleAdd = vi.fn();
    render(
      <ReviewsView
        logs={[]}
        beans={INITIAL_BEANS}
        equipment={mockEquipment}
        onAddTastingLog={handleAdd}
      />
    );

    // Empty state has LOG FIRST REVIEW button
    const firstReviewBtn = screen.getByRole('button', { name: /LOG FIRST REVIEW/i });
    fireEvent.click(firstReviewBtn);

    const grinderSelect = screen.getByLabelText(/Grinder/i);
    fireEvent.change(grinderSelect, { target: { value: 'grinder-1' } });

    const brewerSelect = screen.getByLabelText(/Brewer/i);
    fireEvent.change(brewerSelect, { target: { value: 'brewer-1' } });

    const submitButtons = screen.getAllByRole('button', { name: /SAVE REVIEW/i });
    await act(async () => {
      fireEvent.click(submitButtons[0]);
    });

    expect(handleAdd).toHaveBeenCalledTimes(1);
    const saved = handleAdd.mock.calls[0][0];
    expect(saved.scores.fragranceAroma).toBe(7.5);
    expect(saved.scores.cleanCup).toBe(10);
    expect(saved.calculatedScaScore).toBe(82.5);
    expect(saved.grinderSnapshot).toBe('Comandante C40 MK4');
    expect(saved.brewerSnapshot).toBe('Hario V60 02 Ceramic');
  });

  it('loads review into edit mode and calls onUpdateTastingLog on save', async () => {
    const handleUpdate = vi.fn();
    render(
      <ReviewsView
        logs={[sampleLog1]}
        beans={INITIAL_BEANS}
        equipment={mockEquipment}
        onAddTastingLog={vi.fn()}
        onUpdateTastingLog={handleUpdate}
      />
    );

    const editBtn = screen.getByRole('button', { name: /Edit Review/i });
    fireEvent.click(editBtn);

    expect(screen.getByText(/Edit Review: Worka Sakaro/i)).toBeDefined();

    const notesInput = screen.getByPlaceholderText(/Vibrant peach and white tea/i);
    fireEvent.change(notesInput, { target: { value: 'Refined tea-like body and jasmine finish.' } });

    const saveChangesButtons = screen.getAllByRole('button', { name: /Save Changes/i });
    await act(async () => {
      fireEvent.click(saveChangesButtons[0]);
    });

    expect(handleUpdate).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({
        notes: 'Refined tea-like body and jasmine finish.',
      })
    );
  });

  it('calls onDeleteTastingLog when confirming delete in modal', async () => {
    const handleDelete = vi.fn();
    render(
      <ReviewsView
        logs={[sampleLog1]}
        beans={INITIAL_BEANS}
        equipment={mockEquipment}
        onAddTastingLog={vi.fn()}
        onDeleteTastingLog={handleDelete}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByText(/Delete Tasting Log/i)).toBeDefined();

    const confirmBtn = screen.getByRole('button', { name: /Confirm Delete/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(handleDelete).toHaveBeenCalledWith('log-1');
  });

  it('filters cards by search query', () => {
    render(
      <ReviewsView
        logs={[sampleLog1, sampleLog2]}
        beans={INITIAL_BEANS}
        equipment={mockEquipment}
        onAddTastingLog={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search coffee, roaster, tags/i);
    fireEvent.change(searchInput, { target: { value: 'El Paraiso' } });

    const masterFeed = screen.getByTestId('master-feed');
    expect(within(masterFeed).getByText('El Paraiso')).toBeDefined();
    expect(within(masterFeed).queryByText('Worka Sakaro')).toBeNull();
  });

  it('filters cards by method filter pills', () => {
    render(
      <ReviewsView
        logs={[sampleLog1, sampleLog2]}
        beans={INITIAL_BEANS}
        equipment={mockEquipment}
        onAddTastingLog={vi.fn()}
      />
    );

    const aeroPressChip = screen.getByRole('button', { name: /^AeroPress$/i });
    fireEvent.click(aeroPressChip);

    const masterFeed = screen.getByTestId('master-feed');
    expect(within(masterFeed).getByText('El Paraiso')).toBeDefined();
    expect(within(masterFeed).queryByText('Worka Sakaro')).toBeNull();
  });

  it('auto-activates create mode when pendingBrewSession is passed', () => {
    const handleClearPending = vi.fn();
    render(
      <ReviewsView
        logs={[sampleLog1]}
        beans={INITIAL_BEANS}
        equipment={mockEquipment}
        onAddTastingLog={vi.fn()}
        pendingBrewSession={{
          recipe: DEFAULT_PRESET_RECIPES[0],
          actualTimeSeconds: 210,
          bean: INITIAL_BEANS[0],
        }}
        onClearPendingSession={handleClearPending}
      />
    );

    expect(screen.getByText('Log New Brew Review')).toBeDefined();
    expect(screen.getAllByRole('button', { name: /Save Review/i }).length).toBeGreaterThan(0);
  });
});
