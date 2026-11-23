/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, createEvent } from '@testing-library/react';
import { TastingLog } from '@brewlog/core';
import { ReviewCard } from './ReviewCard';

const sampleLog: TastingLog = {
  id: 'log-card-1',
  beanNameSnapshot: 'Worka Sakaro',
  roasterSnapshot: 'Sey Coffee',
  recipeNameSnapshot: 'V60 Standard',
  brewMethod: 'v60',
  brewDate: '2026-10-04T12:00:00Z',
  coffeeDoseGrams: 20,
  waterAmountGrams: 300,
  actualTimeSeconds: 210,
  grindSetting: '14 clicks',
  waterTempCelsius: 94,
  scores: {
    fragranceAroma: 9,
    flavor: 9,
    aftertaste: 8.5,
    acidity: 9,
    body: 8,
    balance: 8.5,
    uniformity: 10,
    cleanCup: 10,
    sweetness: 9,
    overall: 9,
  },
  calculatedScaScore: 90.0,
  rating: 5,
  flavorTags: ['Peach', 'Jasmine', 'Bergamot', 'Honey'],
  notes: 'Floral, crisp peach, delicate sweet finish.',
  wouldBrewAgain: true,
  createdAt: '2026-10-04T12:00:00Z',
};

describe('ReviewCard (web)', () => {
  afterEach(cleanup);

  it('renders 5-part canonical hierarchy including notes snippet and +N overflow', () => {
    render(
      <ReviewCard
        log={sampleLog}
        isSelected={false}
        dateFormat="YYYY-MM-DD"
        onSelect={vi.fn()}
      />
    );

    const header = screen.getByTestId('review-card-header');
    const identity = screen.getByTestId('review-card-identity');
    const tags = screen.getByTestId('review-card-tags');
    const notes = screen.getByTestId('review-card-notes');
    const footer = screen.getByTestId('review-card-footer');

    expect(header.compareDocumentPosition(identity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(identity.compareDocumentPosition(tags) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tags.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notes.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(header.textContent).toContain('5');
    expect(header.textContent).toContain('90.0');
    expect(header.textContent).toContain('Outstanding');
    expect(identity.textContent).toContain('Worka Sakaro');
    expect(identity.textContent).toContain('Sey Coffee');
    expect(tags.textContent).toContain('Peach');
    expect(tags.textContent).toContain('Jasmine');
    expect(tags.textContent).toContain('Bergamot');
    expect(tags.textContent).toContain('+1');
    expect(notes.textContent).toContain('Floral, crisp peach, delicate sweet finish.');
    expect(notes.className).toContain('line-clamp-2');
    expect(footer.textContent).toContain('v60');
    expect(footer.textContent).toContain('20g:300g');
    expect(footer.textContent).toContain('3m 30s');
    expect(footer.textContent).toContain('2026-10-04');
  });

  it('renders 0.0 and Commercial badge for unscored logs and omits notes when empty', () => {
    const unscoredLog: TastingLog = {
      ...sampleLog,
      calculatedScaScore: 0,
      rating: 0,
      flavorTags: [],
      notes: '',
    };

    render(
      <ReviewCard
        log={unscoredLog}
        isSelected={false}
        dateFormat="locale"
        onSelect={vi.fn()}
      />
    );

    const header = screen.getByTestId('review-card-header');
    expect(header.textContent).toContain('0.0');
    expect(header.textContent).toContain('Commercial');
    expect(screen.queryByTestId('review-card-notes')).toBeNull();
    expect(screen.queryByTestId('review-card-tags')).toBeNull();
  });

  it('handles click, Enter, and Space (with preventDefault) and selected styles', () => {
    const onSelect = vi.fn();
    render(
      <ReviewCard
        log={sampleLog}
        isSelected={true}
        dateFormat="locale"
        onSelect={onSelect}
      />
    );

    const card = screen.getByRole('button');
    expect(card.className).toContain('border-accent');
    expect(card.className).toContain('bg-panel-recessed');

    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(2);

    const spaceEvent = createEvent.keyDown(card, { key: ' ' });
    fireEvent(card, spaceEvent);
    expect(spaceEvent.defaultPrevented).toBe(true);
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it('omits brew duration from telemetry footer when actualTimeSeconds is 0', () => {
    render(
      <ReviewCard
        log={{ ...sampleLog, actualTimeSeconds: 0 }}
        isSelected={false}
        dateFormat="YYYY-MM-DD"
        onSelect={vi.fn()}
      />
    );

    const footer = screen.getByTestId('review-card-footer');
    expect(footer.textContent).toContain('20g:300g');
    expect(footer.textContent).not.toContain('0s');
  });
});
