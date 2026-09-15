import React, { useState } from 'react';
import { Link } from 'react-router';
import { BrewRecipe } from '@brewlog/core';
import { Trash2 } from 'lucide-react';
import { ConfirmationModal } from '../../components/shared/ConfirmationModal';

export interface RecipeCatalogListProps {
  recipes: BrewRecipe[];
  activeRecipeId?: string;
  selectedMethodFilter: string;
  onSelectMethodFilter: (method: string) => void;
  onSelectRecipe?: (recipe: BrewRecipe) => void;
  onDeleteRecipe?: (recipe: BrewRecipe) => void;
}

const METHODS = ['all', 'v60', 'aeropress', 'flair', 'chemex', 'french-press', 'kalita-wave'] as const;

export const RecipeCatalogList: React.FC<RecipeCatalogListProps> = ({
  recipes,
  activeRecipeId,
  selectedMethodFilter,
  onSelectMethodFilter,
  onSelectRecipe,
  onDeleteRecipe,
}) => {
  const [recipeToDelete, setRecipeToDelete] = useState<BrewRecipe | null>(null);

  const filteredRecipes = recipes.filter((r) => {
    return selectedMethodFilter === 'all' || r.brewMethod === selectedMethodFilter;
  });

  const isCustomRecipe = (recipe: BrewRecipe) =>
    !recipe.isPreset && !recipe.id.startsWith('preset-');

  return (
    <div className="space-y-4">
      {/* Method Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {METHODS.map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => onSelectMethodFilter(method)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              selectedMethodFilter === method
                ? 'bg-[#202024] border border-[#d97736] text-[#d97736]'
                : 'bg-zinc-800/90 border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600'
            }`}
          >
            {method.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Recipe Cards List */}
      <div className="space-y-3">
        {filteredRecipes.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#18181b] border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
            No recipes found for this brew method.
          </div>
        ) : (
          filteredRecipes.map((r) => {
            const isSelected = r.id === activeRecipeId;
            const isCustom = isCustomRecipe(r);

            return (
              <div
                key={r.id}
                className={`p-4 rounded-2xl border transition-all duration-200 relative group overflow-hidden ${
                  isSelected
                    ? 'bg-[#202024] border-zinc-600'
                    : 'bg-[#18181b] border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Active Copper Indicator */}
                {isSelected && (
                  <div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-[#d97736] rounded-r" />
                )}

                {/* Overlay Link for navigation and accessible card click */}
                <Link
                  to={`/recipes/${r.id}`}
                  aria-label={r.name}
                  onClick={() => onSelectRecipe?.(r)}
                  className="absolute inset-0 rounded-2xl z-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#d97736]/50"
                />

                <div className="relative z-10 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {r.brewMethod}
                    </span>
                    {isCustom ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider bg-[#d97736]/10 text-[#d97736] border border-[#d97736]/30">
                        Custom
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                        Preset
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {r.author && (
                      <span className="text-xs text-zinc-400 font-mono truncate max-w-[120px]">
                        {r.author}
                      </span>
                    )}
                    {isCustom && onDeleteRecipe && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setRecipeToDelete(r);
                        }}
                        className="pointer-events-auto p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Delete Recipe"
                        aria-label={`Delete custom recipe ${r.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative z-10 pointer-events-none">
                  <h3 className="text-base font-bold text-zinc-100 mt-2">{r.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {r.description || 'No description provided.'}
                  </p>

                  <div className="mt-3 flex items-center space-x-4 text-xs font-mono text-zinc-300">
                    <span>1:{r.ratio}</span>
                    <span className="text-zinc-600">•</span>
                    <span>
                      {r.coffeeDoseGrams}g : {r.waterAmountGrams}g
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span>
                      {`${Math.floor(r.totalTimeSeconds / 60)}m ${(r.totalTimeSeconds % 60).toString().padStart(2, '0')}s`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(recipeToDelete)}
        title="Delete Custom Recipe?"
        message={
          <>
            Are you sure you want to delete{' '}
            <strong className="text-zinc-200">"{recipeToDelete?.name}"</strong>? This
            action cannot be undone.
          </>
        }
        confirmLabel="Delete Recipe"
        variant="danger"
        onClose={() => setRecipeToDelete(null)}
        onConfirm={() => {
          if (recipeToDelete && onDeleteRecipe) {
            onDeleteRecipe(recipeToDelete);
          }
          setRecipeToDelete(null);
        }}
      />
    </div>
  );
};
