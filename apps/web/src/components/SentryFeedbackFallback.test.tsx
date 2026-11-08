/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SentryFeedbackFallback } from './SentryFeedbackFallback';

describe('SentryFeedbackFallback', () => {
  it('renders recovery screen with error info and triggers reset & reload', () => {
    const resetErrorMock = vi.fn();
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadMock },
    });

    render(
      <SentryFeedbackFallback
        error={new Error('Test render crash')}
        resetError={resetErrorMock}
        eventId="event-abc-123"
      />
    );

    expect(screen.getByText(/Something went wrong/i)).toBeDefined();
    expect(screen.getByText(/event-abc-123/i)).toBeDefined();

    const tryAgainBtn = screen.getByRole('button', { name: /Try Again/i });
    fireEvent.click(tryAgainBtn);
    expect(resetErrorMock).toHaveBeenCalledTimes(1);

    const reloadBtn = screen.getByRole('button', { name: /Reload App/i });
    fireEvent.click(reloadBtn);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
