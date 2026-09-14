import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './features/auth/AuthContext';
import { RootLayout } from './layouts/RootLayout';
import { TimerRoute } from './routes/TimerRoute';
import { StashRoute } from './routes/StashRoute';
import { RecipesRoute } from './routes/RecipesRoute';
import { RecipeIndexRoute } from './routes/RecipeIndexRoute';
import { RecipeDetailRoute } from './routes/RecipeDetailRoute';
import { EquipmentRoute } from './routes/EquipmentRoute';
import { CuppingRoute } from './routes/CuppingRoute';
import { NotFoundRoute } from './routes/NotFoundRoute';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<Navigate to="/timer" replace />} />
            <Route path="timer" element={<TimerRoute />} />
            <Route path="stash" element={<StashRoute />} />
            <Route path="recipes" element={<RecipesRoute />}>
              <Route index element={<RecipeIndexRoute />} />
              <Route path=":recipeId" element={<RecipeDetailRoute />} />
            </Route>
            <Route path="equipment" element={<EquipmentRoute />} />
            <Route path="cupping" element={<CuppingRoute />} />
            <Route path="*" element={<NotFoundRoute />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
