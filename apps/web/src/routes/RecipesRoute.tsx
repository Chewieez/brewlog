import React from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { RecipeStudioView } from '../features/recipes/RecipeStudioView';
import { useRootOutletContext } from '../layouts/RootLayout';
import { BrewRecipe } from '@brewlog/core';

export interface RecipeOutletContext {
  recipes: BrewRecipe[];
  onSelectRecipeForTimer: (recipe: BrewRecipe) => void;
  onDeleteRecipe?: (id: string) => Promise<void> | void;
}

export const useRecipeOutletContext = () => useOutletContext<RecipeOutletContext>();

export const RecipesRoute: React.FC = () => {
  const { recipes, setSelectedRecipe, onAddRecipe, onDeleteRecipe } = useRootOutletContext();
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
