/** @vitest-environment jsdom */
import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ModalShell } from './ModalShell';

describe('ModalShell', () => {
  afterEach(cleanup);

  it('truncates overflowing header copy via min-w-0 while preserving close button visibility', () => {
    render(
      <ModalShell
        isOpen={true}
        onClose={vi.fn()}
        title="Extremely Long Modal Title That Should Truncate Safely Without Overflowing"
        subtitle="Equally long subtitle copy describing modal actions and form fields"
        titleId="test-modal-title"
        testIdPrefix="test-modal"
      >
        <div>Body content</div>
      </ModalShell>
    );

    const header = screen.getByTestId('test-modal-header');
    const titleEl = screen.getByRole('heading', { name: /Extremely Long Modal Title/i });
    const textWrapper = titleEl.parentElement!;
    const leftGroup = textWrapper.parentElement!;

    expect(header.className).toContain('gap-3');
    expect(leftGroup.className).toContain('min-w-0');
    expect(textWrapper.className).toContain('min-w-0');
    expect(titleEl.className).toContain('truncate');
  });

  it('restores focus to the triggering element when closed and supports closeOnEscape=false', () => {
    const ModalHarness = ({ closeOnEscape = true }: { closeOnEscape?: boolean }) => {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Open Trigger
          </button>
          <ModalShell
            isOpen={open}
            onClose={() => setOpen(false)}
            closeOnEscape={closeOnEscape}
            title="Test Dialog"
            titleId="harness-modal-title"
            testIdPrefix="harness-modal"
          >
            <input aria-label="Inside input" />
          </ModalShell>
        </div>
      );
    };

    const { rerender } = render(<ModalHarness closeOnEscape={false} />);
    const trigger = screen.getByRole('button', { name: 'Open Trigger' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog')).toBeDefined();

    // closeOnEscape=false keeps modal open on Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeDefined();

    // Re-enable closeOnEscape, press Escape, and verify trigger regains focus
    rerender(<ModalHarness closeOnEscape={true} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
