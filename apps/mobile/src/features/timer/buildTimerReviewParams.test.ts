import { describe, it, expect } from 'vitest';
import { DEFAULT_PRESET_RECIPES, Equipment } from '@brewlog/core';
import { buildTimerReviewParams } from './buildTimerReviewParams';

describe('buildTimerReviewParams', () => {
  it('prefills review from primary grinder on active recipe when present', () => {
    const activeRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      grindSize: 'Medium',
      recommendedGrinderId: 'fallback-grinder',
      grinderSettings: [
        { grinderId: 'primary-ode', setting: '5.1' },
        { grinderId: 'secondary-c40', setting: '18 clicks' },
      ],
    };

    const params = buildTimerReviewParams({
      activeRecipe,
      activeTimerDose: 15,
      elapsedSeconds: 150,
    });

    expect(params.grinderId).toBe('primary-ode');
    expect(params.grind).toBe('5.1');
  });

  it('falls back to recommendedGrinderId and activeRecipe.grindSize when no primary grinder is present', () => {
    const activeRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      grindSize: 'Medium-Coarse',
      recommendedGrinderId: 'rec-grinder-42',
      grinderSettings: [],
    };

    const params = buildTimerReviewParams({
      activeRecipe,
      activeTimerDose: 15,
      elapsedSeconds: 150,
    });

    expect(params.grinderId).toBe('rec-grinder-42');
    expect(params.grind).toBe('Medium-Coarse');
  });

  it('falls back to activeRecipe.grindSize and does not prefill erased primary grinder when absent from equipment', () => {
    const activeRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      grindSize: 'Medium-Fine',
      recommendedGrinderId: 'fallback-valid-grinder',
      grinderSettings: [
        { grinderId: 'erased-grinder-999', setting: '2.5' },
      ],
    };

    const mockEquipment: Equipment[] = [
      {
        id: 'fallback-valid-grinder',
        type: 'grinder',
        brand: 'Timemore',
        model: 'C2',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const params = buildTimerReviewParams({
      activeRecipe,
      activeTimerDose: 15,
      elapsedSeconds: 150,
      equipment: mockEquipment,
    });

    expect(params.grinderId).toBe('fallback-valid-grinder');
    expect(params.grind).toBe('Medium-Fine');
  });

  it('omits grinderId entirely when both primary and recommended grinders are absent from equipment', () => {
    const activeRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      grindSize: 'Medium',
      recommendedGrinderId: 'also-erased-grinder',
      grinderSettings: [
        { grinderId: 'erased-grinder-999', setting: '2.5' },
      ],
    };

    const params = buildTimerReviewParams({
      activeRecipe,
      activeTimerDose: 15,
      elapsedSeconds: 150,
      equipment: [],
    });

    expect(params.grinderId).toBeUndefined();
    expect(params.grind).toBe('Medium');
  });

  it('prefills remaining active grinder when first grinder in grinderSettings is erased but subsequent grinder is in equipment', () => {
    const activeRecipe = {
      ...DEFAULT_PRESET_RECIPES[0],
      grindSize: 'Medium',
      recommendedGrinderId: 'fallback-grinder',
      grinderSettings: [
        { grinderId: 'erased-grinder-1', setting: '2.5' },
        { grinderId: 'active-grinder-2', setting: '18 clicks' },
      ],
    };

    const mockEquipment: Equipment[] = [
      {
        id: 'active-grinder-2',
        type: 'grinder',
        brand: 'Comandante',
        model: 'C40 MK4',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const params = buildTimerReviewParams({
      activeRecipe,
      activeTimerDose: 15,
      elapsedSeconds: 150,
      equipment: mockEquipment,
    });

    expect(params.grinderId).toBe('active-grinder-2');
    expect(params.grind).toBe('18 clicks');
  });
});
