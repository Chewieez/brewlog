/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { RecipeBuilderModal } from './RecipeBuilderModal';
import { BrewRecipe } from '@brewlog/core';

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'test-user', user_metadata: { display_name: 'Test Barista' } },
  }),
}));

describe('RecipeBuilderModal', () => {
  afterEach(() => {
    cleanup();
  });

  const sampleRecipe: BrewRecipe = {
    id: 'sample-custom-1',
    name: 'Sample V60 Profile',
    author: 'Test Barista',
    brewMethod: 'v60',
    description: 'Smooth and clean extraction',
    notes: 'Grind slightly finer if drawdown is fast',
    coffeeDoseGrams: 18,
    waterAmountGrams: 300,
    ratio: 16.67,
    grindSize: 'Medium-Fine',
    waterTempCelsius: 92,
    totalTimeSeconds: 150,
    stages: [
      {
        id: 'stage-1',
        name: 'Bloom Phase',
        stageType: 'bloom',
        startSecond: 0,
        durationSeconds: 45,
        targetWaterWeightGrams: 50,
        instruction: 'Wet grounds completely',
      },
      {
        id: 'stage-2',
        name: 'Main Pour',
        stageType: 'pour',
        startSecond: 45,
        durationSeconds: 105,
        targetWaterWeightGrams: 300,
        instruction: 'Pour up to 300g',
      },
    ],
    isPreset: false,
    createdAt: '2026-01-01',
  };

  it('renders "Create New Custom Recipe" and "SAVE RECIPE" when initialRecipe is null', () => {
    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={null}
      />
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Create New Custom Recipe' })
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /save recipe/i })).toBeDefined();
  });

  it('pre-populates fields, shows "Edit Recipe" and "SAVE CHANGES" when initialRecipe is provided', () => {
    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSaveRecipe={vi.fn()}
        initialRecipe={sampleRecipe}
      />
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Edit Recipe' })
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDefined();

    expect((screen.getByLabelText(/recipe name \*/i) as HTMLInputElement).value).toBe(
      'Sample V60 Profile'
    );
    expect((screen.getByLabelText(/author \/ barista tag/i) as HTMLInputElement).value).toBe(
      'Test Barista'
    );
    expect((screen.getByLabelText(/coffee dose \(g\)/i) as HTMLInputElement).value).toBe(
      '18'
    );
    expect((screen.getByLabelText(/target water \(g\)/i) as HTMLInputElement).value).toBe(
      '300'
    );
    expect(
      (screen.getByLabelText(/description \/ profile notes/i) as HTMLTextAreaElement).value
    ).toBe('Smooth and clean extraction');
  });

  it('submits updated values when saving in edit mode', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <RecipeBuilderModal
        isOpen={true}
        onClose={onClose}
        onSaveRecipe={onSave}
        initialRecipe={sampleRecipe}
      />
    );

    const nameInput = screen.getByLabelText(/recipe name \*/i);
    fireEvent.change(nameInput, { target: { value: 'Modified Profile Name' } });

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Modified Profile Name',
          coffeeDoseGrams: 18,
          waterAmountGrams: 300,
          brewMethod: 'v60',
          isPreset: false,
        })
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
