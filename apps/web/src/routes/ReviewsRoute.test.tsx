/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ReviewsRoute } from './ReviewsRoute';
import { TastingLog, DEFAULT_PRESET_RECIPES, DEFAULT_USER_SETTINGS } from '@brewlog/core';
import { INITIAL_BEANS } from '../lib/sampleData';

let mockLogs: TastingLog[] = [];
const mockSetPendingBrewSession = vi.fn();
const mockSetSelectedBean = vi.fn();
const mockSetSelectedRecipe = vi.fn();
const mockAddReview = vi.fn();
const mockUpdateReview = vi.fn();
const mockDeleteReview = vi.fn();

vi.mock('../features/settings/SettingsContext', () => ({
  useSettings: () => ({
    settings: DEFAULT_USER_SETTINGS,
    loading: false,
    updateSettings: vi.fn(),
    resetToDefaults: vi.fn(),
  }),
}));

vi.mock('../features/reviews/ReviewsContext', () => ({
  useReviews: () => ({
    logs: mockLogs,
    loading: false,
    pendingBrewSession: null,
    setPendingBrewSession: mockSetPendingBrewSession,
    addReview: mockAddReview,
    updateReview: mockUpdateReview,
    deleteReview: mockDeleteReview,
    refreshLogs: vi.fn(),
  }),
}));

vi.mock('../features/stash/BeansContext', () => ({
  useBeans: () => ({
    beans: INITIAL_BEANS,
    selectedBean: null,
    setSelectedBean: mockSetSelectedBean,
    loading: false,
    addBean: vi.fn(),
    updateBean: vi.fn(),
    deleteBean: vi.fn(),
    refreshBeans: vi.fn(),
  }),
}));

vi.mock('../features/recipes/RecipeContext', () => ({
  useRecipes: () => ({
    recipes: DEFAULT_PRESET_RECIPES,
    customRecipes: [],
    presets: DEFAULT_PRESET_RECIPES,
    selectedRecipe: DEFAULT_PRESET_RECIPES[0],
    setSelectedRecipe: mockSetSelectedRecipe,
    loading: false,
    addRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    refreshRecipes: vi.fn(),
  }),
}));

vi.mock('../features/equipment/EquipmentContext', () => ({
  useEquipment: () => ({
    equipment: [],
    grinders: [],
    brewers: [],
    scales: [],
    kettles: [],
    other: [],
    loading: false,
    addEquipment: vi.fn(),
    updateEquipment: vi.fn(),
    deleteEquipment: vi.fn(),
    toggleFavorite: vi.fn(),
    refreshEquipment: vi.fn(),
  }),
}));

const renderReviewsRoute = () => {
  return render(
    <MemoryRouter initialEntries={['/reviews']}>
      <Routes>
        <Route path="reviews" element={<ReviewsRoute />} />
        <Route path="timer" element={<div>Timer Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ReviewsRoute', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockLogs = [];
    mockSetPendingBrewSession.mockReset();
    mockSetSelectedBean.mockReset();
    mockSetSelectedRecipe.mockReset();
    mockAddReview.mockReset();
    mockUpdateReview.mockReset();
    mockDeleteReview.mockReset();
  });

  it('renders ReviewsView inside the route', () => {
    renderReviewsRoute();
    expect(screen.getByText(/Reviews & Cupping Journal/i)).toBeDefined();
  });

  it('passes addReview that returns the created log and clears pendingBrewSession', async () => {
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

    mockAddReview.mockResolvedValue(createdLog);

    renderReviewsRoute();

    // Trigger log review
    const logReviewBtn = screen.getByRole('button', { name: /LOG FIRST REVIEW/i });
    fireEvent.click(logReviewBtn);

    const saveButtons = screen.getAllByRole('button', { name: /SAVE REVIEW/i });
    const form = saveButtons[0].closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockAddReview).toHaveBeenCalledTimes(1);
    expect(mockSetPendingBrewSession).toHaveBeenCalledWith(null);
  });

  it('navigates directly to /timer and preselects bean and recipe on onBrewAgain', () => {
    const existingLog: TastingLog = {
      id: 'log-existing',
      brewMethod: 'v60',
      beanId: INITIAL_BEANS[0].id,
      recipeId: DEFAULT_PRESET_RECIPES[0].id,
      brewDate: '2026-10-06T12:00:00Z',
      beanNameSnapshot: INITIAL_BEANS[0].name,
      roasterSnapshot: INITIAL_BEANS[0].roaster,
      recipeNameSnapshot: DEFAULT_PRESET_RECIPES[0].name,
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

    mockLogs = [existingLog];

    renderReviewsRoute();

    const brewAgainBtn = screen.getByRole('button', { name: /Brew Again/i });
    fireEvent.click(brewAgainBtn);

    expect(mockSetSelectedBean).toHaveBeenCalledWith(INITIAL_BEANS[0]);
    expect(mockSetSelectedRecipe).toHaveBeenCalledWith(DEFAULT_PRESET_RECIPES[0]);
    expect(screen.getByText('Timer Page')).toBeDefined();
  });
});
