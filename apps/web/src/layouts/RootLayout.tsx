import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router';
import { Header } from '../components/shared/Header';
import { AuthModal } from '../features/auth/AuthModal';
import { useAuth } from '../features/auth/AuthContext';
import { useBeans } from '../features/stash/BeansContext';
import { useReviews } from '../features/reviews/ReviewsContext';
export { WEB_LAST_ACTIVE_RECIPE_STORAGE_KEY } from '../features/recipes/RecipeContext';

export const RootLayout: React.FC = () => {
  const { beans } = useBeans();
  const { logs: tastingLogs } = useReviews();
  const { isPasswordRecovery, authUrlError } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (isPasswordRecovery || authUrlError) {
      setIsAuthModalOpen(true);
    }
  }, [isPasswordRecovery, authUrlError]);

  const handleOpenAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-foreground flex flex-col font-sans selection:bg-accent/30 selection:text-foreground">
      <Header
        beanCount={beans.length}
        brewCount={tastingLogs.length}
        onOpenAuthModal={handleOpenAuthModal}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuthModal}
      />
    </div>
  );
};
