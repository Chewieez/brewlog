import React from 'react';
import { Button } from '@brewlog/ui';
import { AlertTriangle } from 'lucide-react';
import { ModalShell } from './ModalShell';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  titleId?: string;
  headingLevel?: 2 | 3;
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
  titleId = 'confirmation-modal-title',
  headingLevel = 3,
  onClose,
  onConfirm,
}) => {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      titleId={titleId}
      headingLevel={headingLevel}
      icon={<AlertTriangle className="w-5 h-5" />}
      iconTone={variant === 'danger' ? 'danger' : 'accent'}
      closeButtonLabel="Close dialog"
      maxWidthClassName="max-w-md"
      testIdPrefix="confirmation-modal"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            label={cancelLabel}
          />
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="md"
            onClick={onConfirm}
            label={confirmLabel}
          />
        </>
      }
    >
      <div className="text-sm text-foreground-secondary leading-relaxed">{message}</div>
    </ModalShell>
  );
};
