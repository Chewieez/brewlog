import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import * as Sentry from '@sentry/react';
import { wrapReactRouterRouting } from './lib/sentry';
import { AuthProvider } from './features/auth/AuthContext';
import { SettingsProvider } from './features/settings/SettingsContext';
import { RecipeProvider } from './features/recipes/RecipeContext';
import { BeansProvider } from './features/stash/BeansContext';
import { EquipmentProvider } from './features/equipment/EquipmentContext';
import { ReviewsProvider } from './features/reviews/ReviewsContext';
import { SentryFeedbackFallback } from './components/SentryFeedbackFallback';
import { RootLayout } from './layouts/RootLayout';
import { TimerRoute } from './routes/TimerRoute';
import { StashRoute } from './routes/StashRoute';
import { RecipesRoute } from './routes/RecipesRoute';
import { RecipeIndexRoute } from './routes/RecipeIndexRoute';
import { RecipeDetailRoute } from './routes/RecipeDetailRoute';
import { EquipmentRoute } from './routes/EquipmentRoute';
import { ReviewsRoute } from './routes/ReviewsRoute';
import { SettingsRoute } from './routes/SettingsRoute';
import { NotFoundRoute } from './routes/NotFoundRoute';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <RecipeProvider>
          <BeansProvider>
            <EquipmentProvider>
              <ReviewsProvider>
                {children}
              </ReviewsProvider>
            </EquipmentProvider>
          </BeansProvider>
        </RecipeProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

const SentryRoutes = wrapReactRouterRouting(Routes);

export const App: React.FC = () => {
  return (
    <AppProviders>
      <Sentry.ErrorBoundary fallback={SentryFeedbackFallback}>
        <BrowserRouter>
          <SentryRoutes>
            <Route element={<RootLayout />}>
              <Route index element={<Navigate to="/timer" replace />} />
              <Route path="timer" element={<TimerRoute />} />
              <Route path="stash" element={<StashRoute />} />
              <Route path="recipes" element={<RecipesRoute />}>
                <Route index element={<RecipeIndexRoute />} />
                <Route path=":recipeId" element={<RecipeDetailRoute />} />
              </Route>
              <Route path="equipment" element={<EquipmentRoute />} />
              <Route path="reviews" element={<ReviewsRoute />} />
              <Route path="settings" element={<SettingsRoute />} />
              <Route path="cupping" element={<Navigate to="/reviews" replace />} />
              <Route path="*" element={<NotFoundRoute />} />
            </Route>
          </SentryRoutes>
        </BrowserRouter>
      </Sentry.ErrorBoundary>
    </AppProviders>
  );
};
