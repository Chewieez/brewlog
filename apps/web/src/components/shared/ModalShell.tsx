import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalShellProps {
  /** Whether the modal dialog is rendered. */
  isOpen: boolean;
  /** Invoked when closing via the header close button or backdrop click. */
  onClose: () => void;
  /** Accessible title rendered in the pinned header. */
  title: React.ReactNode;
  /** Optional subtitle rendered directly beneath the title. */
  subtitle?: React.ReactNode;
  /** Icon element rendered inside the recessed header icon badge. */
  icon?: React.ReactNode;
  /** Color tone for the header icon badge. */
  iconTone?: 'accent' | 'danger';
  /** DOM id for the heading element referenced by `aria-labelledby`. */
  titleId: string;
  /** Heading tag level for semantic hierarchy compatibility. */
  headingLevel?: 2 | 3;
  /** Aria label for the header close button. */
  closeButtonLabel?: string;
  /** Optional alert banner pinned immediately below the header. */
  alert?: React.ReactNode;
  /** Optional pinned footer rendered at the bottom of the dialog. */
  footer?: React.ReactNode;
  /** Scrollable dialog body content. */
  children: React.ReactNode;
  /** When provided, wraps body and footer in a `<form>` element. */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  /** Tailwind max-width class (e.g. `max-w-md`, `max-w-xl`, `max-w-3xl`). */
  maxWidthClassName?: string;
  /** Extra classes applied to the scrollable body container. */
  bodyClassName?: string;
  /** Extra classes applied to the `<form>` wrapper when `onSubmit` is set. */
  formClassName?: string;
  /** Extra classes applied to the pinned footer container. */
  footerClassName?: string;
  /** Base `data-testid` prefix producing `*-header`, `*-body`, and `*-footer`. */
  testIdPrefix?: string;
  /** Explicit `data-testid` for the modal shell container (defaults to `testIdPrefix`). */
  modalTestId?: string;
  /** Controls whether clicking the backdrop triggers `onClose`. */
  closeOnBackdropClick?: boolean;
  /** Controls whether pressing Escape triggers `onClose`. */
  closeOnEscape?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true'
  );
}

/**
 * Shared desktop/web modal frame matching the Recipe Builder layout:
 * pinned header (icon badge, title, optional subtitle, X button), optional pinned alert,
 * independently scrollable body, and pinned footer.
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconTone = 'accent',
  titleId,
  headingLevel = 3,
  closeButtonLabel = 'Close modal',
  alert,
  footer,
  children,
  onSubmit,
  maxWidthClassName = 'max-w-xl',
  bodyClassName = 'space-y-4',
  formClassName = '',
  footerClassName = 'justify-end space-x-3',
  testIdPrefix,
  modalTestId,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  const wasOpenRef = useRef(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      wasOpenRef.current = true;

      const dialogEl = dialogRef.current;
      if (dialogEl && !dialogEl.contains(document.activeElement)) {
        const bodyFocusables = getFocusableElements(bodyRef.current);
        const dialogFocusables = getFocusableElements(dialogEl);
        const initialTarget = bodyFocusables[0] ?? dialogFocusables[0] ?? dialogEl;
        initialTarget.focus();
      }
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      const prev = previousFocusRef.current;
      previousFocusRef.current = null;
      if (prev && prev.isConnected) {
        prev.focus();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        const prev = previousFocusRef.current;
        previousFocusRef.current = null;
        if (prev && prev.isConnected) {
          prev.focus();
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (closeOnEscape) {
          onClose();
        }
        return;
      }

      if (e.key !== 'Tab') return;

      // Yield focus trapping to the topmost dialog when modals are nested.
      const openDialogs = document.querySelectorAll('[role="dialog"]');
      if (openDialogs.length > 0 && openDialogs[openDialogs.length - 1] !== backdropRef.current) {
        return;
      }

      const dialogEl = dialogRef.current;
      if (!dialogEl) return;

      const focusables = getFocusableElements(dialogEl);
      if (focusables.length === 0) {
        e.preventDefault();
        dialogEl.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!active || !dialogEl.contains(active) || active === dialogEl) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const HeadingTag = headingLevel === 2 ? 'h2' : 'h3';
  const iconColorClass = iconTone === 'danger' ? 'text-rose-500 dark:text-rose-400' : 'text-accent';

  const resolvedModalTestId = modalTestId ?? testIdPrefix;
  const headerTestId = testIdPrefix ? `${testIdPrefix}-header` : undefined;
  const bodyTestId = testIdPrefix ? `${testIdPrefix}-body` : undefined;
  const footerTestId = testIdPrefix ? `${testIdPrefix}-footer` : undefined;

  const content = (
    <>
      <div
        ref={bodyRef}
        data-testid={bodyTestId}
        className={`flex-1 min-h-0 overflow-y-auto px-6 py-5 ${bodyClassName}`.trim()}
      >
        {children}
      </div>

      {footer && (
        <div
          data-testid={footerTestId}
          className={`shrink-0 flex items-center px-6 py-4 border-t border-border-subtle bg-panel ${footerClassName}`.trim()}
        >
          {footer}
        </div>
      )}
    </>
  );

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        data-testid={resolvedModalTestId}
        className={`w-full ${maxWidthClassName} max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-panel border border-border-subtle shadow-2xl focus:outline-none`.trim()}
      >
        {/* Pinned Header */}
        <div
          data-testid={headerTestId}
          className="shrink-0 flex items-center justify-between gap-3 px-6 py-5 border-b border-border-subtle bg-panel"
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            {icon && (
              <div
                className={`p-2 rounded-lg bg-panel-recessed border border-border-subtle shrink-0 ${iconColorClass}`}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <HeadingTag id={titleId} className="text-xl font-bold tracking-tight text-foreground truncate">
                {title}
              </HeadingTag>
              {subtitle && <p className="text-xs text-foreground-secondary mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-panel-recessed transition-colors cursor-pointer shrink-0"
            aria-label={closeButtonLabel}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {alert && <div className="shrink-0 mx-6 mt-4">{alert}</div>}

        {onSubmit ? (
          <form
            onSubmit={onSubmit}
            className={`flex-1 min-h-0 flex flex-col ${formClassName}`.trim()}
          >
            {content}
          </form>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">{content}</div>
        )}
      </div>
    </div>
  );
};
