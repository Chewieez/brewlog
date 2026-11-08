import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

export interface SentryFeedbackFallbackProps {
  error?: Error | null;
  resetError?: () => void;
  eventId?: string | null;
}

export const SentryFeedbackFallback: React.FC<SentryFeedbackFallbackProps> = ({
  resetError,
  eventId,
}) => {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="bg-panel border border-border text-foreground rounded-xl p-6 sm:p-8 max-w-md w-full shadow-lg">
        <div className="flex items-center gap-3 text-red-500 mb-4">
          <AlertTriangle className="w-8 h-8 flex-shrink-0" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">Something went wrong</h2>
        </div>
        <p className="text-sm text-foreground/70 mb-4">
          BrewLog encountered an unexpected issue while rendering this view. Your local data remains safe in offline storage.
        </p>

        {eventId && (
          <div className="mb-6 p-2.5 bg-canvas rounded border border-border text-xs font-mono text-foreground/60 select-all">
            Event ID: {eventId}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {resetError && (
            <button
              type="button"
              onClick={resetError}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-panel border border-border hover:bg-canvas text-foreground transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
};
