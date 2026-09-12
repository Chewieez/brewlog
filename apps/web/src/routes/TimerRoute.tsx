import React from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import { TimerView } from '../features/timer/TimerView';
import { RootOutletContext } from '../layouts/RootLayout';
import { BrewRecipe, Bean } from '@brewlog/core';

export const TimerRoute: React.FC = () => {
  const {
    selectedRecipe,
    selectedBean,
    beans,
    setSelectedBean,
    setPendingBrewSession,
  } = useOutletContext<RootOutletContext>();
  const navigate = useNavigate();

  const handleLogCompletedBrew = (recipe: BrewRecipe, actualTimeSeconds: number, bean: Bean | null) => {
    setPendingBrewSession({
      bean: bean || selectedBean,
      recipe,
      actualTimeSeconds,
    });
    navigate('/cupping');
  };

  return (
    <TimerView
      recipe={selectedRecipe}
      selectedBean={selectedBean}
      beans={beans}
      onSelectBean={setSelectedBean}
      onSelectOtherRecipe={() => navigate('/recipes')}
      onLogCompletedBrew={handleLogCompletedBrew}
    />
  );
};
