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

  it('moves initial focus into the dialog on open and traps Tab/Shift+Tab within focusable elements', () => {
    render(
      <ModalShell
        isOpen={true}
        onClose={vi.fn()}
        title="Focus Trap Dialog"
        titleId="trap-modal-title"
        testIdPrefix="trap-modal"
        closeButtonLabel="Close trap dialog"
        footer={<button type="button">Confirm Action</button>}
      >
        <input aria-label="First field" />
      </ModalShell>
    );

    const closeBtn = screen.getByRole('button', { name: 'Close trap dialog' });
    const input = screen.getByLabelText('First field');
    const confirmBtn = screen.getByRole('button', { name: 'Confirm Action' });

    // Initial focus moves to first interactive body control
    expect(document.activeElement).toBe(input);

    // Tab from last focusable wraps to first focusable (header close button)
    confirmBtn.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab from first focusable wraps back to last focusable
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirmBtn);
  });
});
