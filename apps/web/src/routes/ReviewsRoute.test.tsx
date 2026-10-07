/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router';
import { ReviewsRoute } from './ReviewsRoute';
import { RootOutletContext } from '../layouts/RootLayout';
import { TastingLog, INITIAL_BEANS, DEFAULT_PRESET_RECIPES } from '@brewlog/core';

let mockOutletContext: Partial<RootOutletContext>;

const renderReviewsRoute = () => {
  return render(
    <MemoryRouter initialEntries={['/reviews']}>
      <Routes>
        <Route element={<Outlet context={mockOutletContext} />}>
          <Route path="reviews" element={<ReviewsRoute />} />
          <Route path="/" element={<div>Timer Home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('ReviewsRoute', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockOutletContext = {
      tastingLogs: [],
      beans: INITIAL_BEANS,
      recipes: DEFAULT_PRESET_RECIPES,
      equipment: [],
      pendingBrewSession: null,
      setPendingBrewSession: vi.fn(),
      setSelectedBean: vi.fn(),
      setSelectedRecipe: vi.fn(),
      onAddTastingLog: vi.fn(),
      onUpdateTastingLog: vi.fn(),
      onDeleteTastingLog: vi.fn(),
    };
  });

  it('renders ReviewsView inside the route', () => {
    renderReviewsRoute();
    expect(screen.getByText(/Reviews & Cupping Journal/i)).toBeDefined();
  });

  it('passes onAddTastingLog that returns the created log and clears pendingBrewSession', async () => {
    const createdLog: TastingLog = {
      id: 'log-created-test',
      brewMethod: 'v60',
      brewDate: '2026-10-06T12:00:00Z',
      beanNameSnapshot: 'Ethiopia Yirgacheffe',
      roasterSnapshot: 'Sey',
      recipeNameSnapshot: 'V60 Standard',
      coffeeDoseGrams: 15,
      waterAmountGrams: 250,
      actualTimeSeconds: 180,
      grindSetting: '14 clicks',
      waterTempCelsius: 93,
      calculatedScaScore: 88,
      rating: 5,
      flavorTags: ['Floral'],
      notes: 'Crisp floral notes.',
      wouldBrewAgain: true,
      scores: {
        fragranceAroma: 8.5,
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
      createdAt: '2026-10-06T12:00:00Z',
    };

    mockOutletContext.onAddTastingLog = vi.fn().mockResolvedValue(createdLog);

    renderReviewsRoute();

    // Trigger log review
    const logReviewBtn = screen.getByRole('button', { name: /LOG FIRST REVIEW/i });
    fireEvent.click(logReviewBtn);

    const saveButtons = screen.getAllByRole('button', { name: /SAVE REVIEW/i });
    const form = saveButtons[0].closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockOutletContext.onAddTastingLog).toHaveBeenCalledTimes(1);
    expect(mockOutletContext.setPendingBrewSession).toHaveBeenCalledWith(null);
  });
});
