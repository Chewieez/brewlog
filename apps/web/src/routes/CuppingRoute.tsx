import React from 'react';
import { CuppingView } from '../features/cupping/CuppingView';
import { useRootOutletContext } from '../layouts/RootLayout';

export const CuppingRoute: React.FC = () => {
  const {
    tastingLogs,
    beans,
    pendingBrewSession,
    setPendingBrewSession,
    onAddTastingLog,
  } = useRootOutletContext();

  return (
    <CuppingView
      logs={tastingLogs}
      beans={beans}
      pendingBrewSession={pendingBrewSession}
      onClearPendingSession={() => setPendingBrewSession(null)}
      onAddTastingLog={async (log) => {
        await onAddTastingLog(log);
        setPendingBrewSession(null);
      }}
    />
  );
};
