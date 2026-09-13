import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmationModal } from './ConfirmationModal';

describe('ConfirmationModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ConfirmationModal
        isOpen={false}
        title="Confirm Action"
        message="Are you sure?"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title, message, and default button labels when isOpen is true', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Delete Item?"
        message="This action cannot be undone."
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Delete Item?')).toBeDefined();
    expect(screen.getByText('This action cannot be undone.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDefined();
  });

  it('renders custom confirm and cancel button labels', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Delete Custom Recipe?"
        message="Are you sure?"
        confirmLabel="Delete Recipe"
        cancelLabel="Go Back"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Go Back' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Delete Recipe' })).toBeDefined();
  });

  it('supports rich JSX in message', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        title="Delete Item?"
        message={
          <span>
            Are you sure you want to delete <strong data-testid="item-name">Special Blend</strong>?
          </span>
        }
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    const strongElement = screen.getByTestId('item-name');
    expect(strongElement.textContent).toBe('Special Blend');
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        title="Delete Item?"
        message="Are you sure?"
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmationModal
        isOpen={true}
        title="Delete Item?"
        message="Are you sure?"
        confirmLabel="Delete Recipe"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Recipe' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

