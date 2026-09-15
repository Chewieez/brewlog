/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StashView } from './StashView';
import { Bean } from '@brewlog/core';

const MOCK_BEANS: Bean[] = [
  {
    id: 'bean-1',
    name: 'Worka Sakaro',
    roaster: 'Sey Coffee',
    originCountry: 'Ethiopia',
    region: 'Gedeb, Yirgacheffe',
    process: 'washed',
    roastLevel: 'light',
    // 14 days ago = peak flavor window (5-28 days)
    roastDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    flavorNotes: ['Jasmine', 'Peach', 'Bergamot'],
    bagWeightGrams: 250,
    bagWeightOz: 8.8,
    remainingGrams: 250,
    rating: 4.8,
    createdAt: '2026-01-01',
  },
  {
    id: 'bean-2',
    name: 'El Paraiso Lychee',
    roaster: 'Manhattan Coffee',
    originCountry: 'Colombia',
    region: 'Cauca',
    process: 'anaerobic-natural',
    roastLevel: 'light',
    // 2 days ago = needs rest (< 5 days)
    roastDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    flavorNotes: ['Lychee', 'Rose Water'],
    bagWeightGrams: 250,
    bagWeightOz: 8.8,
    remainingGrams: 200,
    createdAt: '2026-01-05',
  },
  {
    id: 'bean-3',
    name: 'Classic House Blend',
    roaster: 'Local Roaster',
    originCountry: 'Brazil',
    region: 'Cerrado',
    process: 'natural',
    roastLevel: 'medium',
    // 90 days ago = past peak (> 60 days)
    roastDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    flavorNotes: ['Chocolate', 'Nutty'],
    bagWeightGrams: 340,
    bagWeightOz: 12,
    remainingGrams: 50,
    createdAt: '2025-10-01',
  },
];

describe('StashView', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders header, Add Coffee Bean button, search input, and process filter', () => {
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Coffee Bean Stash' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Add Coffee Bean/i })).toBeDefined();
    expect(screen.getByPlaceholderText(/Search by coffee name/i)).toBeDefined();
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('renders bean cards with roaster, name, flavor notes, and rating', () => {
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    expect(screen.getByText('Sey Coffee')).toBeDefined();
    expect(screen.getByText('Worka Sakaro')).toBeDefined();
    expect(screen.getByText('Jasmine')).toBeDefined();
    expect(screen.getByText('Peach')).toBeDefined();
    expect(screen.getByText('4.8')).toBeDefined();
  });

  it('renders solid resting status badges with correct state classes', () => {
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    // Peak badge (Sey)
    const peakBadge = screen.getByText('Peak Flavor Window');
    expect(peakBadge).toBeDefined();
    expect(peakBadge.className).toContain('bg-emerald-500');
    expect(peakBadge.className).toContain('text-zinc-950');

    // Needs rest badge (Manhattan)
    const restBadge = screen.getByText('Needs Rest (De-gassing)');
    expect(restBadge).toBeDefined();
    expect(restBadge.className).toContain('bg-amber-500');
    expect(restBadge.className).toContain('text-zinc-950');

    // Past peak badge (Classic House)
    const pastPeakBadge = screen.getByText('Past Peak');
    expect(pastPeakBadge).toBeDefined();
    expect(pastPeakBadge.className).toContain('bg-slate-600');
    expect(pastPeakBadge.className).toContain('text-zinc-100');
  });

  it('calls onSelectBeanForBrew when clicking "Brew This Bean →"', () => {
    const onSelect = vi.fn();
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={onSelect}
      />
    );

    const brewButtons = screen.getAllByRole('button', { name: /Brew This Bean →/i });
    expect(brewButtons.length).toBe(3);

    fireEvent.click(brewButtons[0]);
    expect(onSelect).toHaveBeenCalledWith(MOCK_BEANS[0]);
  });

  it('filters bean cards by search query', () => {
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search by coffee name/i);
    fireEvent.change(searchInput, { target: { value: 'Sey' } });

    expect(screen.getByText('Worka Sakaro')).toBeDefined();
    expect(screen.queryByText('El Paraiso Lychee')).toBeNull();
    expect(screen.queryByText('Classic House Blend')).toBeNull();
  });

  it('filters bean cards by process method', () => {
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'natural' } });

    expect(screen.getByText('Classic House Blend')).toBeDefined();
    expect(screen.queryByText('Worka Sakaro')).toBeNull();
    expect(screen.queryByText('El Paraiso Lychee')).toBeNull();
  });

  it('shows empty state when no beans match filter', () => {
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search by coffee name/i);
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Coffee' } });

    expect(screen.getByText(/No coffee beans found matching your search/i)).toBeDefined();
  });

  it('opens Add Bean modal and handles form submission', () => {
    const onAddBean = vi.fn();
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={onAddBean}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    const addBtn = screen.getByRole('button', { name: /Add Coffee Bean/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('heading', { level: 3, name: 'Add New Whole Bean' })).toBeDefined();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sey Coffee/i), {
      target: { value: 'Square Mile' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Worka Sakaro/i), {
      target: { value: 'Red Brick' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Jasmine/i), {
      target: { value: 'Chocolate, Citrus' },
    });

    const saveBtn = screen.getByRole('button', { name: 'Save Bean' });
    fireEvent.click(saveBtn);

    expect(onAddBean).toHaveBeenCalledTimes(1);
    expect(onAddBean).toHaveBeenCalledWith(
      expect.objectContaining({
        roaster: 'Square Mile',
        name: 'Red Brick',
        flavorNotes: ['Chocolate', 'Citrus'],
      })
    );

    // Modal closed
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
