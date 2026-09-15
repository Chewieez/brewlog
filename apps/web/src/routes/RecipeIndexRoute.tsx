import React from 'react';
import { Coffee } from 'lucide-react';

export const RecipeIndexRoute: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-[#18181b] border border-zinc-800 min-h-[400px]">
      <div className="p-4 rounded-xl bg-[#202024] border border-zinc-800 text-[#d97736] mb-4">
        <Coffee className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-zinc-100">Select a Recipe</h3>
      <p className="text-sm text-zinc-400 mt-2 max-w-sm">
        Choose a recipe from the catalog to view brew steps and scale doses, or create your own custom recipe.
      </p>
    </div>
  );
};
