import React from 'react';
import { useNavigate } from 'react-router';
import { TimerView } from '../features/timer/TimerView';
import { useRootOutletContext } from '../layouts/RootLayout';
import { useRecipes } from '../features/recipes/useRecipes';
import { BrewRecipe, Bean } from '@brewlog/core';

export const TimerRoute: React.FC = () => {
  const {
    selectedRecipe,
    selectedBean,
    beans,
    setSelectedBean,
    setPendingBrewSession,
    onAddRecipe,
  } = useRootOutletContext();
  const { addRecipe } = useRecipes();
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

  const handleSaveAsRecipe = async (recipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => {
    if (onAddRecipe) {
      await onAddRecipe(recipe);
    } else {
      await addRecipe(recipe);
    }
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
      onSaveAsRecipe={handleSaveAsRecipe}
    />
  );
};
