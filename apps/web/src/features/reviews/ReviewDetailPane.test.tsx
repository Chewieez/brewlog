/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReviewDetailPane } from './ReviewDetailPane';
import { TastingLog, Bean } from '@brewlog/core';

const mockLog: TastingLog = {
  id: 'log-test-1',
  userId: 'user-1',
  beanNameSnapshot: 'Worka Sakaro',
  roasterSnapshot: 'Sey Coffee',
  recipeNameSnapshot: 'V60 Standard',
  brewMethod: 'v60',
  brewDate: '2026-10-04T12:00:00Z',
  coffeeDoseGrams: 20,
  waterAmountGrams: 300,
  actualTimeSeconds: 210,
  grindSetting: 'Medium-Fine',
  grinderSnapshot: 'Comandante C40',
  brewerSnapshot: 'Hario V60 02 Plastic',
  waterTempCelsius: 94,
  scores: {
    fragranceAroma: 8.75,
    flavor: 8.75,
    aftertaste: 8.5,
    acidity: 9.0,
    body: 8.25,
    balance: 8.5,
    uniformity: 10.0,
    cleanCup: 10.0,
    sweetness: 10.0,
    overall: 8.75,
  },
  calculatedScaScore: 91.5,
  rating: 5,
  flavorTags: ['Peach', 'Jasmine', 'Bergamot'],
  notes: 'Superb floral cup with intense peach sweetness and tea-like elegance.',
  wouldBrewAgain: true,
  createdAt: '2026-10-04T12:00:00Z',
};

describe('ReviewDetailPane component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders coffee title, roaster, brew method, and formatted date', () => {
    render(
      <ReviewDetailPane
        log={mockLog}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onBrewAgain={vi.fn()}
      />
    );

    expect(screen.getByText('Worka Sakaro')).toBeDefined();
    expect(screen.getByText(/Sey Coffee/i)).toBeDefined();
    expect(screen.getByTestId('method-badge').textContent).toContain('v60');
  });

  it('renders hero SCA score and tier badge in a whitespace-nowrap container', () => {
    render(
      <ReviewDetailPane
        log={mockLog}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('91.5')).toBeDefined();
    expect(screen.getByText(/Outstanding/i)).toBeDefined();

    const heroContainer = screen.getByTestId('hero-score-badge');
    expect(heroContainer.className).toContain('whitespace-nowrap');
  });

  it('renders 10-attribute score breakdown meter bars', () => {
    render(
      <ReviewDetailPane
        log={mockLog}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Fragrance / Aroma')).toBeDefined();
    expect(screen.getByText('Flavor')).toBeDefined();
    expect(screen.getByText('Aftertaste')).toBeDefined();
    expect(screen.getByText('Acidity')).toBeDefined();
    expect(screen.getByText('Body')).toBeDefined();
    expect(screen.getByText('Balance')).toBeDefined();
    expect(screen.getByText('Uniformity')).toBeDefined();
    expect(screen.getByText('Clean Cup')).toBeDefined();
    expect(screen.getByText('Sweetness')).toBeDefined();
    expect(screen.getByText('Overall')).toBeDefined();
  });

  it('renders brew telemetry with dose, water, ratio, and neutral brew time text', () => {
    render(
      <ReviewDetailPane
        log={mockLog}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(/20g/)).toBeDefined();
    expect(screen.getByText(/300g/)).toBeDefined();
    expect(screen.getByText(/1:15/)).toBeDefined();

    const timeElement = screen.getByTestId('brew-time-telemetry');
    expect(timeElement.className).toContain('text-zinc-100');
    expect(timeElement.className).not.toContain('text-accent');
  });

  it('renders sensory panel defaulting to Descriptors tab and allows toggling to Wheel', () => {
    render(
      <ReviewDetailPane
        log={mockLog}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Descriptors default
    expect(screen.getByText('Peach')).toBeDefined();
    expect(screen.getByText('Jasmine')).toBeDefined();
    expect(screen.getByText('Bergamot')).toBeDefined();

    // Toggle to Wheel
    const wheelTab = screen.getByRole('button', { name: /Wheel/i });
    fireEvent.click(wheelTab);

    expect(screen.getByRole('button', { name: /Descriptors/i })).toBeDefined();
  });

  it('triggers onEdit and onBrewAgain when buttons are clicked', () => {
    const handleEdit = vi.fn();
    const handleBrewAgain = vi.fn();

    render(
      <ReviewDetailPane
        log={mockLog}
        onEdit={handleEdit}
        onDelete={vi.fn()}
        onBrewAgain={handleBrewAgain}
      />
    );

    const editBtn = screen.getByRole('button', { name: /^Edit$/i });
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockLog);

    const brewAgainBtn = screen.getByRole('button', { name: /Brew Again/i });
    fireEvent.click(brewAgainBtn);
    expect(handleBrewAgain).toHaveBeenCalledWith(mockLog);
  });

  it('opens confirmation modal before calling onDelete', () => {
    const handleDelete = vi.fn();

    render(
      <ReviewDetailPane
        log={mockLog}
        onEdit={vi.fn()}
        onDelete={handleDelete}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByText(/Delete Tasting Log/i)).toBeDefined();
    expect(handleDelete).not.toHaveBeenCalled();

    const confirmBtn = screen.getByRole('button', { name: /Confirm Delete/i });
    fireEvent.click(confirmBtn);
    expect(handleDelete).toHaveBeenCalledWith(mockLog);
  });

  it('prioritizes bean and roaster snapshots over stash beans', () => {
    const stashBeans: Bean[] = [
      {
        id: 'bean-stash-1',
        name: 'Stash Bean Name',
        roaster: 'Stash Roaster',
        originCountry: 'Colombia',
        process: 'washed',
        variety: ['Caturra'],
        altitudeMeters: 1800,
        roastLevel: 'light',
        flavorNotes: ['Caramel'],
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    const logWithSnapshots: TastingLog = {
      ...mockLog,
      beanId: 'bean-stash-1',
      beanNameSnapshot: 'Historical Snapshot Bean',
      roasterSnapshot: 'Historical Roaster',
    };

    render(
      <ReviewDetailPane
        log={logWithSnapshots}
        beans={stashBeans}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Historical Snapshot Bean')).toBeDefined();
    expect(screen.getByText(/Historical Roaster/i)).toBeDefined();
    expect(screen.queryByText('Stash Bean Name')).toBeNull();
  });

  it('renders delete confirmation modal with accessible dialog role and label', () => {
    render(
      <ReviewDetailPane
        log={mockLog}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('delete-dialog-title');
    expect(screen.getByRole('heading', { level: 2, name: /Delete Tasting Log/i })).toBeDefined();
  });

  it('closes delete confirmation modal when Escape key is pressed', () => {
    render(
      <ReviewDetailPane
        log={mockLog}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByRole('dialog')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('falls back cleanly to raw date string when brewDate is invalid', () => {
    const logWithInvalidDate: TastingLog = {
      ...mockLog,
      brewDate: 'not-a-valid-date',
    };

    render(
      <ReviewDetailPane
        log={logWithInvalidDate}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('not-a-valid-date')).toBeDefined();
    expect(screen.queryByText('Invalid Date')).toBeNull();
  });
});
