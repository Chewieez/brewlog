import React from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import { RecipeStudioView } from '../features/recipes/RecipeStudioView';
import { RootOutletContext } from '../layouts/RootLayout';
import { BrewRecipe } from '@brewlog/core';

export const RecipesRoute: React.FC = () => {
  const { recipes, setSelectedRecipe, onAddRecipe, onDeleteRecipe } = useOutletContext<RootOutletContext>();
  const navigate = useNavigate();

  const handleSelectRecipeForTimer = (recipe: BrewRecipe) => {
    setSelectedRecipe(recipe);
    navigate('/timer');
  };

  return (
    <RecipeStudioView
      recipes={recipes}
      onSelectRecipeForTimer={handleSelectRecipeForTimer}
      onAddCustomRecipe={onAddRecipe}
      onDeleteRecipe={onDeleteRecipe}
    />
  );
};
