import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { BrewRecipe, matchesRecipeSearch } from '@brewlog/core';
import { Button, FilterPills, type FilterPillsOption } from '@brewlog/ui';
import { Search, X, Trash2, Pencil } from 'lucide-react';
import { ConfirmationModal } from '../../components/shared/ConfirmationModal';

export interface RecipeCatalogListProps {
  recipes: BrewRecipe[];
  activeRecipeId?: string;
  selectedMethodFilter: string;
  onSelectMethodFilter: (method: string) => void;
  onSelectRecipe?: (recipe: BrewRecipe) => void;
  onEditRecipe?: (recipe: BrewRecipe) => void;
  onDeleteRecipe?: (recipe: BrewRecipe) => void;
}

const METHOD_FILTER_OPTIONS: FilterPillsOption<string>[] = [
  { value: 'all', label: 'All' },
  { value: 'v60', label: 'V60' },
  { value: 'aeropress', label: 'AeroPress' },
  { value: 'flair', label: 'Flair' },
  { value: 'chemex', label: 'Chemex' },
  { value: 'french-press', label: 'French Press' },
  { value: 'kalita-wave', label: 'Kalita Wave' },
  { value: 'espresso', label: 'Espresso' },
  { value: 'origami', label: 'Origami' },
  { value: 'clever-dripper', label: 'Clever Dripper' },
  { value: 'moka-pot', label: 'Moka Pot' },
  { value: 'cold-brew', label: 'Cold Brew' },
  { value: 'custom', label: 'Custom' },
];

function formatFallbackMethodLabel(method: string): string {
  return method
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export const RecipeCatalogList: React.FC<RecipeCatalogListProps> = ({
  recipes,
  activeRecipeId,
  selectedMethodFilter,
  onSelectMethodFilter,
  onSelectRecipe,
  onEditRecipe,
  onDeleteRecipe,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recipeToDelete, setRecipeToDelete] = useState<BrewRecipe | null>(null);

  const availableMethodOptions = useMemo(() => {
    const presentMethods = new Set<string>(recipes.map((r) => r.brewMethod));
    const knownOptions = METHOD_FILTER_OPTIONS.filter(
      (opt) => opt.value !== 'all' && presentMethods.has(opt.value)
    );
    const knownValues = new Set(knownOptions.map((opt) => opt.value));
    const extraOptions: FilterPillsOption<string>[] = Array.from(presentMethods)
      .filter((method) => Boolean(method) && !knownValues.has(method))
      .map((method) => ({
        value: method,
        label: formatFallbackMethodLabel(method),
      }));

    return [METHOD_FILTER_OPTIONS[0], ...knownOptions, ...extraOptions];
  }, [recipes]);

  const effectiveMethodFilter = useMemo(
    () =>
      availableMethodOptions.some((opt) => opt.value === selectedMethodFilter)
        ? selectedMethodFilter
        : 'all',
    [availableMethodOptions, selectedMethodFilter]
  );

  useEffect(() => {
    if (selectedMethodFilter !== effectiveMethodFilter) {
      onSelectMethodFilter(effectiveMethodFilter);
    }
  }, [selectedMethodFilter, effectiveMethodFilter, onSelectMethodFilter]);

  const filteredRecipes = useMemo(
    () =>
      recipes.filter((r) => {
        const matchesMethod =
          effectiveMethodFilter === 'all' || r.brewMethod === effectiveMethodFilter;
        return matchesMethod && matchesRecipeSearch(r, searchQuery);
      }),
    [recipes, effectiveMethodFilter, searchQuery]
  );

  const isCustomRecipe = (recipe: BrewRecipe) =>
    !recipe.isPreset && !recipe.id.startsWith('preset-');

  const isSearchEmpty =
    recipes.length > 0 && filteredRecipes.length === 0 && searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
        <input
          type="text"
          placeholder="Search name, author, method..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search recipes"
          className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-panel border border-border-subtle text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent/60 transition-colors"
        />
        {searchQuery.length > 0 && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-panel-recessed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Method Filter Bar */}
      {availableMethodOptions.length > 1 && (
        <FilterPills
          size="sm"
          value={effectiveMethodFilter}
          onChange={onSelectMethodFilter}
          options={availableMethodOptions}
          ariaLabel="Filter recipes by brew method"
          testID="recipe-method-filters"
        />
      )}

      {/* Recipe Cards List */}
      <div className="space-y-3">
        {isSearchEmpty ? (
          <div className="p-8 rounded-xl bg-panel border border-dashed border-border-subtle text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-panel-recessed border border-border-subtle flex items-center justify-center">
              <Search className="w-5 h-5 text-foreground-muted" />
            </div>
            <p className="text-xs text-foreground-muted">No recipes match your search.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSearchQuery('')}
              label="CLEAR SEARCH"
            />
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="p-8 rounded-xl bg-panel border border-dashed border-border-subtle text-center text-xs text-foreground-muted">
            No recipes found for this brew method.
          </div>
        ) : (
          filteredRecipes.map((r) => {
            const isSelected = r.id === activeRecipeId;
            const isCustom = isCustomRecipe(r);

            return (
              <div
                key={r.id}
                data-testid="recipe-catalog-card"
                className={`p-4 rounded-xl border transition-all duration-200 relative group overflow-hidden ${
                  isSelected
                    ? 'bg-panel-recessed border-border-active'
                    : 'bg-panel border-border-subtle hover:border-border-active'
                }`}
              >
                {/* Active Copper Indicator */}
                {isSelected && (
                  <div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-accent rounded-r" />
                )}

                {/* Overlay Link for navigation and accessible card click */}
                <Link
                  to={`/recipes/${r.id}`}
                  aria-label={r.name}
                  onClick={() => onSelectRecipe?.(r)}
                  className="absolute inset-0 rounded-xl z-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50"
                />

                <div className="relative z-10 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider bg-panel-recessed text-foreground-secondary">
                      {r.brewMethod}
                    </span>
                    {isCustom ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider bg-accent/15 text-accent">
                        Custom
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider bg-panel-recessed text-foreground-muted">
                        Preset
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {r.author && (
                      <span className="text-xs text-foreground-muted font-mono truncate max-w-[120px]">
                        {r.author}
                      </span>
                    )}
                    {isCustom && onEditRecipe && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEditRecipe(r);
                        }}
                        className="pointer-events-auto w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-panel-recessed transition-colors cursor-pointer"
                        title="Edit Recipe"
                        aria-label={`Edit custom recipe ${r.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isCustom && onDeleteRecipe && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setRecipeToDelete(r);
                        }}
                        className="pointer-events-auto w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-status-error hover:bg-panel-recessed transition-colors cursor-pointer"
                        title="Delete Recipe"
                        aria-label={`Delete custom recipe ${r.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative z-10 pointer-events-none">
                  <h3 className="text-base font-bold text-foreground mt-2">{r.name}</h3>
                  <p className="text-xs text-foreground-secondary mt-1 line-clamp-2">
                    {r.description || 'No description provided.'}
                  </p>

                  <div className="mt-3 flex items-center space-x-3 text-xs font-light text-foreground-secondary tabular-nums">
                    <span>1:{r.ratio}</span>
                    <span className="text-foreground-muted">•</span>
                    <span>
                      {r.coffeeDoseGrams}g : {r.waterAmountGrams}g
                    </span>
                    <span className="text-foreground-muted">•</span>
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
            <strong className="text-foreground">"{recipeToDelete?.name}"</strong>? This
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
