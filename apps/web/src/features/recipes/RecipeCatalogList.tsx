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
                ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
          >
            {method.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Recipe Cards List */}
      <div className="space-y-3">
        {filteredRecipes.length === 0 ? (
          <div className="p-8 rounded-2xl bg-stone-900/40 border border-dashed border-stone-800 text-center text-xs text-stone-500">
            No recipes found for this brew method.
          </div>
        ) : (
          filteredRecipes.map((r) => {
            const isSelected = r.id === activeRecipeId;
            const isCustom = isCustomRecipe(r);

            return (
              <Link
                key={r.id}
                to={`/recipes/${r.id}`}
                onClick={() => onSelectRecipe?.(r)}
                className={`block p-4 rounded-2xl border transition-all duration-200 relative group cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'bg-stone-900/60 border-stone-800/80 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-800 text-amber-400 border border-amber-500/20">
                      {r.brewMethod}
                    </span>
                    {isCustom ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Custom
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Preset
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {r.author && (
                      <span className="text-xs text-stone-400 truncate max-w-[120px]">
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
                        className="p-1 rounded text-stone-500 hover:text-red-400 hover:bg-stone-800/80 transition-colors cursor-pointer"
                        title="Delete Recipe"
                        aria-label={`Delete custom recipe ${r.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-stone-100 mt-2">{r.name}</h3>
                <p className="text-xs text-stone-400 mt-1 line-clamp-2">
                  {r.description || 'No description provided.'}
                </p>

                <div className="mt-3 flex items-center space-x-4 text-xs font-mono text-stone-300">
                  <span>1:{r.ratio}</span>
                  <span>•</span>
                  <span>
                    {r.coffeeDoseGrams}g : {r.waterAmountGrams}g
                  </span>
                  <span>•</span>
                  <span>
                    {`${Math.floor(r.totalTimeSeconds / 60)}m ${(r.totalTimeSeconds % 60).toString().padStart(2, '0')}s`}
                  </span>
                </div>
              </Link>
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
            <strong className="text-stone-200">"{recipeToDelete?.name}"</strong>? This
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
