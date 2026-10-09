import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { BrewRecipe } from '@brewlog/core';
import { useRecipeOutletContext } from './RecipesRoute';
import { RecipeDetailPane } from '../features/recipes/RecipeDetailPane';
import { NotFoundRoute } from './NotFoundRoute';

export const RecipeDetailRoute: React.FC = () => {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const { recipes, equipment, onSelectRecipeForTimer, onEditRecipe, onDeleteRecipe } = useRecipeOutletContext();

  const recipe = recipes.find((r) => r.id === recipeId);

  const handleSelectRecipeForTimer = useCallback(
    (selectedRecipe: BrewRecipe) => {
      onSelectRecipeForTimer(selectedRecipe);
      navigate('/timer');
    },
    [onSelectRecipeForTimer, navigate]
  );

  const handleDeleteRecipe = useCallback(
    async (recipeToDelete: BrewRecipe) => {
      if (onDeleteRecipe) {
        await onDeleteRecipe(recipeToDelete.id);
      }
      navigate('/recipes');
    },
    [onDeleteRecipe, navigate]
  );

  if (!recipe) {
    return <NotFoundRoute />;
  }

  return (
    <RecipeDetailPane
      recipe={recipe}
      equipment={equipment}
      onSelectRecipeForTimer={handleSelectRecipeForTimer}
      onEditRecipe={onEditRecipe}
      onDeleteRecipe={handleDeleteRecipe}
      showMobileBackButton={true}
    />
  );
};
