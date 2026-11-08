import React from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { TimerView } from '../features/timer/TimerView';
import { useRecipes } from '../features/recipes/RecipeContext';
import { useBeans } from '../features/stash/BeansContext';
import { useReviews } from '../features/reviews/ReviewsContext';
import { BrewRecipe, Bean, TimerMode } from '@brewlog/core';

export const TimerRoute: React.FC = () => {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
  const initialMode: TimerMode | undefined =
    modeParam === 'recipe' || modeParam === 'free_brew' ? (modeParam as TimerMode) : undefined;

  const { selectedRecipe, addRecipe } = useRecipes();
  const { beans, selectedBean, setSelectedBean } = useBeans();
  const { setPendingBrewSession } = useReviews();
  const navigate = useNavigate();

  const handleLogCompletedBrew = (recipe: BrewRecipe, actualTimeSeconds: number, bean: Bean | null) => {
    setPendingBrewSession({
      bean: bean || selectedBean,
      recipe,
      actualTimeSeconds,
    });
    navigate('/reviews');
  };

  const handleSelectOtherRecipe = () => {
    navigate('/recipes');
  };

  const handleSaveAsRecipe = async (recipe: Omit<BrewRecipe, 'id' | 'createdAt'>) => {
    await addRecipe(recipe);
    navigate('/recipes');
  };

  return (
    <TimerView
      key={`${selectedRecipe.id}-${initialMode ?? 'default'}`}
      recipe={selectedRecipe}
      initialMode={initialMode}
      selectedBean={selectedBean}
      beans={beans}
      onSelectBean={setSelectedBean}
      onSelectOtherRecipe={handleSelectOtherRecipe}
      onLogCompletedBrew={handleLogCompletedBrew}
      onSaveAsRecipe={handleSaveAsRecipe}
    />
  );
};
