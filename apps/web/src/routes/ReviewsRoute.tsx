import React from 'react';
import { useNavigate } from 'react-router';
import { ReviewsView } from '../features/reviews/ReviewsView';
import { useRootOutletContext } from '../layouts/RootLayout';
import { TastingLog } from '@brewlog/core';

export const ReviewsRoute: React.FC = () => {
  const navigate = useNavigate();
  const {
    tastingLogs,
    beans,
    recipes,
    equipment,
    pendingBrewSession,
    setPendingBrewSession,
    setSelectedBean,
    setSelectedRecipe,
    onAddTastingLog,
    onUpdateTastingLog,
    onDeleteTastingLog,
  } = useRootOutletContext();

  const handleClearPendingSession = () => {
    setPendingBrewSession(null);
  };

  const handleSaveTastingLog = async (log: Omit<TastingLog, 'id' | 'createdAt'>) => {
    const created = await onAddTastingLog(log);
    setPendingBrewSession(null);
    return created;
  };

  const handleBrewAgain = (log: TastingLog) => {
    if (log.beanId && beans) {
      const matchedBean = beans.find((b) => b.id === log.beanId);
      if (matchedBean) setSelectedBean(matchedBean);
    } else if (log.beanNameSnapshot && beans) {
      const matchedBean = beans.find(
        (b) => b.name.toLowerCase() === log.beanNameSnapshot.toLowerCase()
      );
      if (matchedBean) setSelectedBean(matchedBean);
    }

    if (log.recipeId && recipes) {
      const matchedRecipe = recipes.find((r) => r.id === log.recipeId);
      if (matchedRecipe) setSelectedRecipe(matchedRecipe);
    } else if (log.brewMethod && recipes) {
      const matchedRecipe = recipes.find((r) => r.brewMethod === log.brewMethod);
      if (matchedRecipe) setSelectedRecipe(matchedRecipe);
    }

    navigate('/');
  };

  return (
    <ReviewsView
      logs={tastingLogs}
      beans={beans}
      equipment={equipment}
      pendingBrewSession={pendingBrewSession}
      onClearPendingSession={handleClearPendingSession}
      onAddTastingLog={handleSaveTastingLog}
      onUpdateTastingLog={onUpdateTastingLog}
      onDeleteTastingLog={onDeleteTastingLog}
      onBrewAgain={handleBrewAgain}
    />
  );
};

export const CuppingRoute = ReviewsRoute;
