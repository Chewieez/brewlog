import React from 'react';
import { BrewRecipe } from '@brewlog/core';

export interface DeleteRecipeModalProps {
  recipe: BrewRecipe | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteRecipeModal: React.FC<DeleteRecipeModalProps> = ({
  recipe,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !recipe) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-recipe-title"
    >
      <div className="w-full max-w-sm p-6 rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl space-y-4">
        <h3
          id="delete-recipe-title"
          className="text-base font-bold text-stone-100"
        >
          Delete Custom Recipe?
        </h3>
        <p className="text-xs text-stone-400 leading-relaxed">
          Are you sure you want to delete{' '}
          <strong className="text-stone-200">"{recipe.name}"</strong>? This action
          cannot be undone.
        </p>
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 cursor-pointer"
          >
            Delete Recipe
          </button>
        </div>
      </div>
    </div>
  );
};
