import React, { useEffect } from 'react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-500 text-white'
      : 'bg-accent hover:bg-accent-hover text-zinc-950';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-sm p-6 rounded-xl bg-panel border border-border-subtle shadow-2xl space-y-4">
        <h3
          id="confirmation-modal-title"
          className="text-base font-bold text-text-primary tracking-tight font-mono"
        >
          {title}
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-panel-recessed text-text-secondary text-xs font-mono uppercase tracking-wider hover:bg-zinc-800 hover:text-text-primary border border-border-subtle cursor-pointer transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded text-xs font-mono uppercase tracking-wider font-bold shadow-md cursor-pointer transition-all active:scale-95 ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

