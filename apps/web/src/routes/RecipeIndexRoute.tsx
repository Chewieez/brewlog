import React from 'react';
import { Coffee } from 'lucide-react';

export const RecipeIndexRoute: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-stone-900/40 border border-stone-800/60 min-h-[400px]">
      <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 text-amber-500 mb-4">
        <Coffee className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-stone-200">Select a Recipe</h3>
      <p className="text-sm text-stone-400 mt-2 max-w-sm">
        Choose a recipe from the catalog to view brew steps and scale doses, or create your own custom recipe.
      </p>
    </div>
  );
};
