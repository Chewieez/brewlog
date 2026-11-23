/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
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

  it('renders header, summary bar, Add Bean button, search input, shelf tabs, and dynamic process pills', () => {
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Coffee Bean Stash' })).toBeDefined();
    expect(screen.getByRole('button', { name: /ADD BEAN/i })).toBeDefined();
    expect(screen.getByPlaceholderText(/Search by coffee name/i)).toBeDefined();
    expect(screen.getByText('ACTIVE BAGS')).toBeDefined();
    expect(screen.getByRole('tablist', { name: 'Shelf selector' })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Active Cellar/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Freezer Vault/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /Archived/i })).toBeDefined();

    expect(screen.getByRole('group', { name: 'Filter by process method' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'All' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Washed' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Natural' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Anaerobic' })).toBeDefined();
    // MOCK_BEANS has no honey process bean, so Honey pill is omitted
    expect(screen.queryByRole('button', { name: 'Honey' })).toBeNull();
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
    expect(peakBadge.className).toContain('bg-emerald-100');
    expect(peakBadge.className).toContain('dark:bg-emerald-950/70');
    expect(peakBadge.className).toContain('text-emerald-900');
    expect(peakBadge.className).toContain('dark:text-emerald-300');

    // Needs rest badge (Manhattan)
    const restBadge = screen.getByText('Needs Rest (De-gassing)');
    expect(restBadge).toBeDefined();
    expect(restBadge.className).toContain('bg-amber-100');
    expect(restBadge.className).toContain('dark:bg-amber-950/70');
    expect(restBadge.className).toContain('text-amber-950');
    expect(restBadge.className).toContain('dark:text-amber-300');

    // Past peak badge (Classic House)
    const pastPeakBadge = screen.getByText('Past Peak');
    expect(pastPeakBadge).toBeDefined();
    expect(pastPeakBadge.className).toContain('bg-slate-100');
    expect(pastPeakBadge.className).toContain('dark:bg-zinc-800');
  });

  it('calls onSelectBeanForBrew when clicking "BREW →"', () => {
    const onSelect = vi.fn();
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={onSelect}
      />
    );

    const brewButtons = screen.getAllByRole('button', { name: /Brew with/i });
    expect(brewButtons.length).toBe(3);
    expect(brewButtons[0].getAttribute('aria-label')).toBe(`Brew with ${MOCK_BEANS[0].name}`);

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

  it('filters bean cards by process filter pills including anaerobic variants', () => {
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Natural' }));
    expect(screen.getByText('Classic House Blend')).toBeDefined();
    expect(screen.queryByText('Worka Sakaro')).toBeNull();
    expect(screen.queryByText('El Paraiso Lychee')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Anaerobic' }));
    expect(screen.getByText('El Paraiso Lychee')).toBeDefined();
    expect(screen.queryByText('Classic House Blend')).toBeNull();
    expect(screen.queryByText('Worka Sakaro')).toBeNull();
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

  it('opens Add Bean modal and handles form submission', async () => {
    const onAddBean = vi.fn();
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={onAddBean}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    const addBtn = screen.getByRole('button', { name: /ADD BEAN/i });
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

    const saveBtn = screen.getByRole('button', { name: /SAVE BEAN/i });
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
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('submits comprehensive bean attributes including cellar, origin, and inventory fields', async () => {
    const onAddBean = vi.fn();
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={onAddBean}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /ADD BEAN/i }));

    // Required fields
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sey Coffee/i), {
      target: { value: 'Sey Coffee' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Worka Sakaro/i), {
      target: { value: 'Worka' },
    });

    // Extended origin & inventory fields
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Finca El Paraiso/i), {
      target: { value: 'Worka Sakaro Washing Station' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Gesha, Bourbon/i), {
      target: { value: 'Heirloom, Kurume' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 1950/i), {
      target: { value: '2000' },
    });
    fireEvent.change(screen.getByPlaceholderText('5'), {
      target: { value: '14' },
    });

    // Presets
    fireEvent.click(screen.getByRole('button', { name: '250g' }));

    // Freezer toggle
    const freezerCheckbox = screen.getByRole('checkbox');
    fireEvent.click(freezerCheckbox);

    // Save
    fireEvent.click(screen.getByRole('button', { name: /SAVE BEAN/i }));

    expect(onAddBean).toHaveBeenCalledWith(
      expect.objectContaining({
        roaster: 'Sey Coffee',
        name: 'Worka',
        farm: 'Worka Sakaro Washing Station',
        variety: ['Heirloom', 'Kurume'],
        altitudeMeters: 2000,
        recommendedRestDays: 14,
        bagWeightGrams: 250,
        remainingGrams: 250,
        isFrozen: true,
      })
    );

    // Modal closed
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('renders frozen badge and frozen resting status for frozen beans', () => {
    const frozenBean: Bean = {
      id: 'bean-frozen',
      name: 'Frozen Gesha',
      roaster: 'Onyx',
      originCountry: 'Panama',
      process: 'washed',
      roastLevel: 'light',
      roastDate: '2026-08-01',
      isFrozen: true,
      frozenDate: '2026-08-10',
      flavorNotes: ['Bergamot'],
      bagWeightGrams: 250,
      remainingGrams: 250,
      createdAt: '2026-08-01',
    };

    render(
      <StashView
        beans={[frozenBean]}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /Freezer Vault/i }));

    expect(screen.getByText('FROZEN')).toBeDefined();
    expect(screen.getByText(/Frozen at Day 9/i)).toBeDefined();
  });

  it('preserves 0g bag weight without resetting to default 340g', async () => {
    const onAddBean = vi.fn();
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={onAddBean}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /ADD BEAN/i }));

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sey Coffee/i), {
      target: { value: 'Sey Coffee' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Worka Sakaro/i), {
      target: { value: 'Empty Worka Bag' },
    });

    // Enter 0 for bag weight
    const bagWeightInput = screen.getByLabelText('Bag Weight (grams)');
    fireEvent.change(bagWeightInput, { target: { value: '0' } });

    fireEvent.click(screen.getByRole('button', { name: /SAVE BEAN/i }));

    expect(onAddBean).toHaveBeenCalledWith(
      expect.objectContaining({
        bagWeightGrams: 0,
        bagWeightOz: 0,
      })
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('awaits asynchronous onAddBean and shows error banner if submission rejects', async () => {
    const onAddBean = vi.fn().mockRejectedValue(new Error('Database offline'));
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={onAddBean}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /ADD BEAN/i }));

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sey Coffee/i), {
      target: { value: 'Sey Coffee' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Worka Sakaro/i), {
      target: { value: 'Worka' },
    });

    fireEvent.click(screen.getByRole('button', { name: /SAVE BEAN/i }));

    // Wait for the rejection to process
    expect(await screen.findByText('Database offline')).toBeDefined();

    // Modal should remain open
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('displays "No roast date" and neutral gray badge when roastDate is unspecified', () => {
    const noRoastBean: Bean = {
      id: 'bean-no-roast',
      name: 'Mystery Roast',
      roaster: 'Sey Coffee',
      roastDate: undefined,
      flavorNotes: [],
      createdAt: '2026-01-01',
    };

    render(
      <StashView
        beans={[noRoastBean]}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    expect(screen.getByText('No roast date')).toBeDefined();
    expect(screen.queryByText(/0 days off roast/i)).toBeNull();

    const badge = screen.getByText('No Date Specified');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('bg-panel-recessed');
    expect(badge.className).not.toContain('bg-amber-500');
  });

  it('renders "0g" for 0g bag weight instead of falling back to default 12 oz', () => {
    const zeroWeightBean: Bean = {
      id: 'bean-zero-weight',
      name: 'Zero Gram Bean',
      roaster: 'Sey Coffee',
      bagWeightGrams: 0,
      flavorNotes: [],
      createdAt: '2026-01-01',
    };

    render(
      <StashView
        beans={[zeroWeightBean]}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    expect(screen.getByText('0g')).toBeDefined();
    expect(screen.queryByText('12 oz')).toBeNull();
  });

  it('renders origin cleanly without leading comma and omits location when both country and region are empty', () => {
    const regionOnlyBean: Bean = {
      id: 'bean-region-only',
      name: 'Region Bean',
      roaster: 'Sey Coffee',
      region: 'Antioquia',
      flavorNotes: [],
      createdAt: '2026-01-01',
    };

    const emptyOriginBean: Bean = {
      id: 'bean-empty-origin',
      name: 'Blank Origin Bean',
      roaster: 'Sey Coffee',
      flavorNotes: [],
      createdAt: '2026-01-01',
    };

    const { rerender } = render(
      <StashView
        beans={[regionOnlyBean]}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    // Region only: should be "Antioquia", not ", Antioquia"
    expect(screen.getByTestId('bean-origin').textContent).toBe('Antioquia');

    rerender(
      <StashView
        beans={[emptyOriginBean]}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    // No country and no region: origin block is completely omitted
    expect(screen.queryByTestId('bean-origin')).toBeNull();
  });

  it('renders aging badge with terracotta bg-orange-500 class', () => {
    const agingBean: Bean = {
      id: 'bean-aging',
      name: 'Aging Lot',
      roaster: 'Sey Coffee',
      // 40 days ago = aging window
      roastDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      flavorNotes: [],
      createdAt: '2026-01-01',
    };

    render(
      <StashView
        beans={[agingBean]}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    const agingBadge = screen.getByText('Good (Drink Soon)');
    expect(agingBadge).toBeDefined();
    expect(agingBadge.className).toContain('orange');
  });

  it('closes Add Bean modal when Escape key is pressed', () => {
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /ADD BEAN/i }));
    expect(screen.getByRole('dialog')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('configures form labels with htmlFor pairings and number inputs with min="0"', () => {
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /ADD BEAN/i }));

    const altitudeInput = screen.getByLabelText(/Altitude \(m\)/i);
    expect(altitudeInput.getAttribute('min')).toBe('0');
    expect(altitudeInput.id).toBe('add-bean-altitude');

    const bagWeightInput = screen.getByLabelText('Bag Weight (grams)');
    expect(bagWeightInput.getAttribute('min')).toBe('0');
    expect(bagWeightInput.id).toBe('add-bean-bag-weight');

    const remainingWeightInput = screen.getByLabelText('Remaining Weight (grams)');
    expect(remainingWeightInput.getAttribute('min')).toBe('0');
    expect(remainingWeightInput.id).toBe('add-bean-remaining-weight');

    const priceInput = screen.getByLabelText(/Price \(\$\)/i);
    expect(priceInput.getAttribute('min')).toBe('0');
    expect(priceInput.id).toBe('add-bean-price');
  });

  it('opens edit modal pre-filled with bean details and saves changes via onUpdateBean', async () => {
    const onUpdateBean = vi.fn();
    const targetBean = MOCK_BEANS[0];

    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onUpdateBean={onUpdateBean}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    // Click EDIT on the first bean card
    const editBtn = screen.getByRole('button', { name: `Edit ${targetBean.name}` });
    fireEvent.click(editBtn);

    // Modal title indicates edit mode
    expect(screen.getByRole('heading', { level: 3, name: 'Edit Coffee Bean' })).toBeDefined();

    // Verify fields are pre-populated
    const roasterInput = screen.getByLabelText(/Roaster Name/i) as HTMLInputElement;
    expect(roasterInput.value).toBe(targetBean.roaster);

    const nameInput = screen.getByLabelText(/Coffee \/ Lot Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe(targetBean.name);

    // Make an edit
    fireEvent.change(nameInput, { target: { value: 'Worka Sakaro Natural' } });

    // Submit button shows SAVE CHANGES
    const saveBtn = screen.getByRole('button', { name: /SAVE CHANGES/i });
    fireEvent.click(saveBtn);

    expect(onUpdateBean).toHaveBeenCalledTimes(1);
    expect(onUpdateBean).toHaveBeenCalledWith(
      expect.objectContaining({
        id: targetBean.id,
        name: 'Worka Sakaro Natural',
        roaster: targetBean.roaster,
        rating: 4.8,
        isFavorite: false,
        isArchived: false,
      })
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('preserves rating, isFavorite, and isArchived when editing a bean with active flags', async () => {
    const onUpdateBean = vi.fn();
    const flaggedBean: Bean = {
      ...MOCK_BEANS[0],
      id: 'bean-flagged',
      rating: 4.9,
      isFavorite: true,
      isArchived: true,
    };

    render(
      <StashView
        beans={[flaggedBean]}
        onAddBean={vi.fn()}
        onUpdateBean={onUpdateBean}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /Archived/i }));

    const editBtn = screen.getByRole('button', { name: `Edit ${flaggedBean.name}` });
    fireEvent.click(editBtn);

    const saveBtn = screen.getByRole('button', { name: /SAVE CHANGES/i });
    fireEvent.click(saveBtn);

    expect(onUpdateBean).toHaveBeenCalledTimes(1);
    expect(onUpdateBean).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'bean-flagged',
        rating: 4.9,
        isFavorite: true,
        isArchived: true,
      })
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('prompts confirmation modal before deleting bean and calls onDeleteBean upon confirmation', async () => {
    const onDeleteBean = vi.fn().mockResolvedValue(undefined);
    const targetBean = MOCK_BEANS[0];

    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onUpdateBean={vi.fn()}
        onDeleteBean={onDeleteBean}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    // Open edit modal
    const editBtn = screen.getByRole('button', { name: `Edit ${targetBean.name}` });
    fireEvent.click(editBtn);

    // Click DELETE BEAN
    const deleteBtn = screen.getByRole('button', { name: /DELETE BEAN/i });
    expect(deleteBtn).toBeDefined();
    fireEvent.click(deleteBtn);

    // Confirmation modal should be visible, onDeleteBean should not be called yet
    expect(screen.getByText('Delete Coffee Bean?')).toBeDefined();
    expect(onDeleteBean).not.toHaveBeenCalled();

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: 'Delete Bean' });
    fireEvent.click(confirmBtn);

    expect(onDeleteBean).toHaveBeenCalledTimes(1);
    expect(onDeleteBean).toHaveBeenCalledWith(targetBean.id);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('does not call onDeleteBean if delete confirmation modal is cancelled', async () => {
    const onDeleteBean = vi.fn().mockResolvedValue(undefined);
    const targetBean = MOCK_BEANS[0];

    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onUpdateBean={vi.fn()}
        onDeleteBean={onDeleteBean}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    // Open edit modal
    const editBtn = screen.getByRole('button', { name: `Edit ${targetBean.name}` });
    fireEvent.click(editBtn);

    // Click DELETE BEAN
    const deleteBtn = screen.getByRole('button', { name: /DELETE BEAN/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByText('Delete Coffee Bean?')).toBeDefined();

    // Click Cancel in confirmation modal
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    // Confirmation modal dismissed, onDeleteBean not called
    expect(screen.queryByText('Delete Coffee Bean?')).toBeNull();
    expect(onDeleteBean).not.toHaveBeenCalled();
    // Edit modal remains open
    expect(screen.getByRole('heading', { level: 3, name: 'Edit Coffee Bean' })).toBeDefined();
  });

  it('offsets roast date using offsetRoastDateForThaw when unfreezing a bean in edit modal', async () => {
    const onUpdateBean = vi.fn();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const frozenBean: Bean = {
      ...MOCK_BEANS[0],
      id: 'bean-frozen-thaw',
      isFrozen: true,
      frozenDate: thirtyDaysAgo,
      roastDate: fortyDaysAgo,
    };

    render(
      <StashView
        beans={[frozenBean]}
        onAddBean={vi.fn()}
        onUpdateBean={onUpdateBean}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /Freezer Vault/i }));

    const editBtn = screen.getByRole('button', { name: `Edit ${frozenBean.name}` });
    fireEvent.click(editBtn);

    const freezerCheckbox = screen.getByLabelText(/Freezer Vault Storage/i);
    expect((freezerCheckbox as HTMLInputElement).checked).toBe(true);
    fireEvent.click(freezerCheckbox);
    expect((freezerCheckbox as HTMLInputElement).checked).toBe(false);

    const saveBtn = screen.getByRole('button', { name: /SAVE CHANGES/i });
    fireEvent.click(saveBtn);

    expect(onUpdateBean).toHaveBeenCalledTimes(1);
    const updatedPayload = onUpdateBean.mock.calls[0][0];
    expect(updatedPayload.isFrozen).toBe(false);
    expect(updatedPayload.frozenDate).toBeUndefined();
    expect(updatedPayload.roastDate).not.toBe(fortyDaysAgo);
    expect(new Date(updatedPayload.roastDate).getTime()).toBeGreaterThan(new Date(fortyDaysAgo).getTime());

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('computes CellarSummaryBar metrics strictly from active non-frozen non-archived beans', () => {
    const peakDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const mixedBeans: Bean[] = [
      { ...MOCK_BEANS[0], id: 'a1', remainingGrams: 120, roastDate: peakDate },
      { ...MOCK_BEANS[1], id: 'a2', remainingGrams: undefined, bagWeightGrams: 250 },
      { ...MOCK_BEANS[0], id: 'a3', remainingGrams: 0, bagWeightGrams: 250, roastDate: '2025-01-01' },
      { ...MOCK_BEANS[0], id: 'f1', isFrozen: true, remainingGrams: 500, roastDate: peakDate },
      { ...MOCK_BEANS[0], id: 'ar1', isArchived: true, remainingGrams: 300, roastDate: peakDate },
    ];

    render(
      <StashView
        beans={mixedBeans}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    const summary = screen.getByTestId('cellar-summary-bar');
    expect(summary.getAttribute('aria-label')).toBe(
      'Cellar summary: 3 active bags, 1 at peak, 370g total stash'
    );
  });

  it('partitions beans into shelves and renders shelf-specific empty states', () => {
    const activeOnly: Bean[] = [MOCK_BEANS[0]];
    render(
      <StashView
        beans={activeOnly}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    expect(screen.getByText('Worka Sakaro')).toBeDefined();

    fireEvent.click(screen.getByRole('tab', { name: /Freezer Vault/i }));
    expect(screen.getByText('Freezer Vault is Empty')).toBeDefined();

    fireEvent.click(screen.getByRole('tab', { name: /Archived/i }));
    expect(screen.getByText('No Archived Coffees')).toBeDefined();
  });

  it('renders Cellar is Empty state with CTA when active shelf is empty', () => {
    render(
      <StashView
        beans={[]}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    expect(screen.getByText('Cellar is Empty')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Add your first bean/i }));
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('hides FilterPills when active shelf only has non-mobile or undefined processes', () => {
    const nonMobileBeans: Bean[] = [
      { ...MOCK_BEANS[0], id: 'c1', name: 'Carbonic Lot', process: 'carbonic-maceration' },
      { ...MOCK_BEANS[0], id: 'c2', name: 'Unknown Process Lot', process: undefined },
    ];

    render(
      <StashView
        beans={nonMobileBeans}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    expect(screen.getByRole('tablist', { name: 'Shelf selector' })).toBeDefined();
    expect(screen.queryByRole('group', { name: 'Filter by process method' })).toBeNull();
    expect(screen.getByText('Carbonic Lot')).toBeDefined();
    expect(screen.getByText('Unknown Process Lot')).toBeDefined();
  });

  it('resets selectedProcess to all when switching to a shelf without that process without a one-frame empty flash', () => {
    const beansAcrossShelves: Bean[] = [
      { ...MOCK_BEANS[0], id: 'active-washed', name: 'Active Washed', process: 'washed' },
      { ...MOCK_BEANS[2], id: 'frozen-natural', name: 'Frozen Natural', process: 'natural', isFrozen: true },
    ];

    let sawEmptyFlash = false;
    render(
      <React.Profiler
        id="stash-switch"
        onRender={() => {
          if (document.body.textContent?.includes('No coffee beans found matching your search.')) {
            sawEmptyFlash = true;
          }
        }}
      >
        <StashView
          beans={beansAcrossShelves}
          onAddBean={vi.fn()}
          onSelectBeanForBrew={vi.fn()}
        />
      </React.Profiler>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Washed' }));
    expect(screen.getByText('Active Washed')).toBeDefined();

    fireEvent.click(screen.getByRole('tab', { name: /Freezer Vault/i }));
    expect(sawEmptyFlash).toBe(false);
    expect(screen.getByText('Frozen Natural')).toBeDefined();
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('supports arrow-key focus navigation across shelf tabs and process pills', () => {
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    const activeTab = screen.getByRole('tab', { name: /Active Cellar/i });
    const frozenTab = screen.getByRole('tab', { name: /Freezer Vault/i });
    activeTab.focus();
    fireEvent.keyDown(activeTab, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(frozenTab);

    const allPill = screen.getByRole('button', { name: 'All' });
    const washedPill = screen.getByRole('button', { name: 'Washed' });
    allPill.focus();
    fireEvent.keyDown(allPill, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(washedPill);
  });

  it('clears search input via clear button and matches flavor notes, farm, and variety', () => {
    const richBeans: Bean[] = [
      {
        ...MOCK_BEANS[0],
        farm: 'Worka Washing Station',
        variety: ['Kurume', 'Dega'],
      },
      MOCK_BEANS[1],
    ];
    render(
      <StashView
        beans={richBeans}
        onAddBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search by coffee name/i) as HTMLInputElement;

    // Flavor note match
    fireEvent.change(searchInput, { target: { value: 'Bergamot' } });
    expect(screen.getByText('Worka Sakaro')).toBeDefined();
    expect(screen.queryByText('El Paraiso Lychee')).toBeNull();

    // Farm match
    fireEvent.change(searchInput, { target: { value: 'Worka Washing' } });
    expect(screen.getByText('Worka Sakaro')).toBeDefined();
    expect(screen.queryByText('El Paraiso Lychee')).toBeNull();

    // Variety match
    fireEvent.change(searchInput, { target: { value: 'Kurume' } });
    expect(screen.getByText('Worka Sakaro')).toBeDefined();
    expect(screen.queryByText('El Paraiso Lychee')).toBeNull();

    const clearBtn = screen.getByRole('button', { name: 'Clear search' });
    expect(clearBtn.className).toContain('focus-visible:outline-none');
    expect(clearBtn.className).toContain('focus-visible:ring-2');
    expect(clearBtn.className).toContain('focus-visible:ring-accent');
    fireEvent.click(clearBtn);
    expect(searchInput.value).toBe('');
    expect(screen.getByText('El Paraiso Lychee')).toBeDefined();
  });

  it('shows Archive Bean checkbox only in edit mode and moves beans across shelves and summary bar on archive, unarchive, and freeze', async () => {
    const StatefulStashWrapper = () => {
      const [items, setItems] = React.useState<Bean[]>([MOCK_BEANS[0], MOCK_BEANS[1]]);
      return (
        <StashView
          beans={items}
          onAddBean={(b) => setItems((prev) => [b, ...prev])}
          onUpdateBean={(updated) =>
            setItems((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
          }
          onSelectBeanForBrew={vi.fn()}
        />
      );
    };

    render(<StatefulStashWrapper />);

    // Initially 2 active bags (MOCK_BEANS[0] at peak, 250g + 200g = 450g)
    expect(screen.getByTestId('cellar-summary-bar').getAttribute('aria-label')).toBe(
      'Cellar summary: 2 active bags, 1 at peak, 450g total stash'
    );

    // Add mode does not render Archive checkbox
    fireEvent.click(screen.getByRole('button', { name: /ADD BEAN/i }));
    expect(screen.queryByLabelText(/Archive Bean/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    // Edit Worka Sakaro -> Archive it
    fireEvent.click(screen.getByRole('button', { name: `Edit ${MOCK_BEANS[0].name}` }));
    const archiveCheckbox = screen.getByLabelText(/Archive Bean/i) as HTMLInputElement;
    expect(archiveCheckbox.checked).toBe(false);
    fireEvent.click(archiveCheckbox);
    fireEvent.click(screen.getByRole('button', { name: /SAVE CHANGES/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // Leaves Active Cellar & updates summary bar (1 active bag, 0 at peak, 200g)
    expect(screen.queryByText(MOCK_BEANS[0].name)).toBeNull();
    expect(screen.getByTestId('cellar-summary-bar').getAttribute('aria-label')).toBe(
      'Cellar summary: 1 active bags, 0 at peak, 200g total stash'
    );

    // Appears in Archived shelf; unarchive it back to Active Cellar
    fireEvent.click(screen.getByRole('tab', { name: /Archived/i }));
    expect(screen.getByText(MOCK_BEANS[0].name)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: `Edit ${MOCK_BEANS[0].name}` }));
    fireEvent.click(screen.getByLabelText(/Archive Bean/i));
    fireEvent.click(screen.getByRole('button', { name: /SAVE CHANGES/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('No Archived Coffees')).toBeDefined();

    // Return to Active Cellar and freeze El Paraiso Lychee -> moves to Freezer Vault & updates summary bar
    fireEvent.click(screen.getByRole('tab', { name: /Active Cellar/i }));
    expect(screen.getByText(MOCK_BEANS[0].name)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: `Edit ${MOCK_BEANS[1].name}` }));
    fireEvent.click(screen.getByLabelText(/Freezer Vault Storage/i));
    fireEvent.click(screen.getByRole('button', { name: /SAVE CHANGES/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    expect(screen.queryByText(MOCK_BEANS[1].name)).toBeNull();
    expect(screen.getByTestId('cellar-summary-bar').getAttribute('aria-label')).toBe(
      'Cellar summary: 1 active bags, 1 at peak, 250g total stash'
    );
    fireEvent.click(screen.getByRole('tab', { name: /Freezer Vault/i }));
    expect(screen.getByText(MOCK_BEANS[1].name)).toBeDefined();
  });

  it('pins the add bean modal header and footer outside the scrollable form body', () => {
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onUpdateBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /ADD BEAN/i }));

    const modal = screen.getByTestId('stash-bean-modal');
    const header = screen.getByTestId('stash-bean-modal-header');
    const body = screen.getByTestId('stash-bean-modal-body');
    const footer = screen.getByTestId('stash-bean-modal-footer');
    const title = screen.getByRole('heading', { name: /add new whole bean/i });
    const closeBtn = screen.getByRole('button', { name: /close dialog/i });

    expect(modal.className).toContain('flex-col');
    expect(modal.className).toContain('overflow-hidden');
    expect(header.className).toContain('shrink-0');
    expect(header.contains(title)).toBe(true);
    expect(header.contains(closeBtn)).toBe(true);
    expect(body.className).toContain('overflow-y-auto');
    expect(body.contains(header)).toBe(false);
    expect(footer.className).toContain('shrink-0');
    expect(body.contains(footer)).toBe(false);
  });

  it('keeps bean modal open on Escape and backdrop click while delete confirmation modal is open', () => {
    render(
      <StashView
        beans={MOCK_BEANS}
        onAddBean={vi.fn()}
        onUpdateBean={vi.fn()}
        onDeleteBean={vi.fn()}
        onSelectBeanForBrew={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: `Edit ${MOCK_BEANS[0].name}` }));
    fireEvent.click(screen.getByRole('button', { name: /DELETE BEAN/i }));

    expect(screen.getByText('Delete Coffee Bean?')).toBeDefined();
    expect(screen.getByTestId('stash-bean-modal')).toBeDefined();

    // Pressing Escape closes only the confirmation dialog, leaving Edit Bean modal open
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Delete Coffee Bean?')).toBeNull();
    expect(screen.getByTestId('stash-bean-modal')).toBeDefined();

    // Re-open confirm modal and click outer bean modal backdrop: bean modal stays open
    fireEvent.click(screen.getByRole('button', { name: /DELETE BEAN/i }));
    const dialogs = screen.getAllByRole('dialog');
    fireEvent.click(dialogs[0]);
    expect(screen.getByTestId('stash-bean-modal')).toBeDefined();
  });
});





