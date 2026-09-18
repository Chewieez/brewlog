import React from 'react';
import { useNavigate } from 'react-router';
import { TimerView } from '../features/timer/TimerView';
import { useRootOutletContext } from '../layouts/RootLayout';
import { BrewRecipe, Bean } from '@brewlog/core';

export const TimerRoute: React.FC = () => {
  const {
    selectedRecipe,
    selectedBean,
    beans,
    setSelectedBean,
    setPendingBrewSession,
  } = useRootOutletContext();
  const navigate = useNavigate();

  const handleLogCompletedBrew = (recipe: BrewRecipe, actualTimeSeconds: number, bean: Bean | null) => {
    setPendingBrewSession({
      bean: bean || selectedBean,
      recipe,
      actualTimeSeconds,
    });
    navigate('/cupping');
  };

  const handleSelectOtherRecipe = () => {
    navigate('/recipes');
  };

  return (
    <TimerView
      key={selectedRecipe.id}
      recipe={selectedRecipe}
      selectedBean={selectedBean}
      beans={beans}
      onSelectBean={setSelectedBean}
      onSelectOtherRecipe={handleSelectOtherRecipe}
      onLogCompletedBrew={handleLogCompletedBrew}
    />
  );
};
