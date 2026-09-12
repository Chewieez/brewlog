import React from 'react';
import { useOutletContext } from 'react-router';
import { CuppingView } from '../features/cupping/CuppingView';
import { RootOutletContext } from '../layouts/RootLayout';

export const CuppingRoute: React.FC = () => {
  const {
    tastingLogs,
    beans,
    pendingBrewSession,
    setPendingBrewSession,
    onAddTastingLog,
  } = useOutletContext<RootOutletContext>();

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
