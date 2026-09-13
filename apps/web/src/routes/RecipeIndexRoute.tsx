import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router';
import { useRecipeOutletContext } from './RecipesRoute';

export const RecipeIndexRoute: React.FC = () => {
  const { recipes } = useRecipeOutletContext();
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(min-width: 1024px)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (isDesktop && recipes.length > 0) {
    const defaultRecipeId = recipes[0]?.id || 'preset-v60-hoffmann';
    return <Navigate replace to={`/recipes/${defaultRecipeId}`} />;
  }

  return null;
};
