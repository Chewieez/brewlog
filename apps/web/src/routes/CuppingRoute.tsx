import React from 'react';
import { CuppingView } from '../features/cupping/CuppingView';
import { useRootOutletContext } from '../layouts/RootLayout';
import { TastingLog } from '@brewlog/core';

export const CuppingRoute: React.FC = () => {
  const {
    tastingLogs,
    beans,
    pendingBrewSession,
    setPendingBrewSession,
    onAddTastingLog,
  } = useRootOutletContext();

  const handleClearPendingSession = () => {
    setPendingBrewSession(null);
  };

  const handleSaveTastingLog = async (log: Omit<TastingLog, 'id' | 'createdAt'>) => {
    await onAddTastingLog(log);
    setPendingBrewSession(null);
  };

  return (
    <CuppingView
      logs={tastingLogs}
      beans={beans}
      pendingBrewSession={pendingBrewSession}
      onClearPendingSession={handleClearPendingSession}
      onAddTastingLog={handleSaveTastingLog}
    />
  );
};
