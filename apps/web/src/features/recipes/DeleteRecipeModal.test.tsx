import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteRecipeModal } from './DeleteRecipeModal';
import { BrewRecipe } from '@brewlog/core';

describe('DeleteRecipeModal', () => {
  const mockRecipe: BrewRecipe = {
    id: 'rec-custom-1',
    name: 'My Custom V60',
    brewMethod: 'v60',
    description: 'Custom recipe description',
    coffeeDoseGrams: 15,
    waterAmountGrams: 250,
    waterTempCelsius: 94,
    ratio: 16.7,
    grindSize: 'Medium',
    totalTimeSeconds: 180,
    stages: [],
    isPreset: false,
    createdAt: '2026-01-01',
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <DeleteRecipeModal
        recipe={mockRecipe}
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog with recipe name and buttons when isOpen is true', () => {
    render(
      <DeleteRecipeModal
        recipe={mockRecipe}
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Delete Custom Recipe?')).toBeDefined();
    expect(screen.getByText(/"My Custom V60"/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Delete Recipe' })).toBeDefined();
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <DeleteRecipeModal
        recipe={mockRecipe}
        isOpen={true}
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Delete Recipe button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <DeleteRecipeModal
        recipe={mockRecipe}
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Recipe' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
