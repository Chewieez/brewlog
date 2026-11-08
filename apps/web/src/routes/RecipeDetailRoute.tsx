import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { BrewRecipe } from '@brewlog/core';
import { useRecipes } from '../features/recipes/RecipeContext';
import { useRecipeOutletContext } from './RecipesRoute';
import { RecipeDetailPane } from '../features/recipes/RecipeDetailPane';
import { NotFoundRoute } from './NotFoundRoute';

export const RecipeDetailRoute: React.FC = () => {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const { recipes, setSelectedRecipe, deleteRecipe } = useRecipes();
  const outletContext = useRecipeOutletContext();

  const recipe = recipes.find((r) => r.id === recipeId);

  const handleSelectRecipeForTimer = useCallback(
    (selectedRecipe: BrewRecipe) => {
      setSelectedRecipe(selectedRecipe);
      navigate('/timer?mode=recipe');
    },
    [setSelectedRecipe, navigate]
  );

  const handleDeleteRecipe = useCallback(
    async (recipeToDelete: BrewRecipe) => {
      await deleteRecipe(recipeToDelete.id);
      navigate('/recipes');
    },
    [deleteRecipe, navigate]
  );

  if (!recipe) {
    return <NotFoundRoute />;
  }

  return (
    <RecipeDetailPane
      recipe={recipe}
      onSelectRecipeForTimer={handleSelectRecipeForTimer}
      onEditRecipe={outletContext?.onEditRecipe}
      onDeleteRecipe={handleDeleteRecipe}
      showMobileBackButton={true}
    />
  );
};
