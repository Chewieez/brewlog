import React from 'react';
import { ReviewsView } from '../features/reviews/ReviewsView';
import { useRootOutletContext } from '../layouts/RootLayout';
import { TastingLog } from '@brewlog/core';

export const ReviewsRoute: React.FC = () => {
  const {
    tastingLogs,
    beans,
    equipment,
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
    <ReviewsView
      logs={tastingLogs}
      beans={beans}
      equipment={equipment}
      pendingBrewSession={pendingBrewSession}
      onClearPendingSession={handleClearPendingSession}
      onAddTastingLog={handleSaveTastingLog}
    />
  );
};

export const CuppingRoute = ReviewsRoute;
