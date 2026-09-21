import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { RecipeDetailScreen } from '../../src/features/recipes/screens/RecipeDetailScreen';

export default function RecipeDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipeDetailScreen recipeId={id || ''} />;
}
