import { createContext, useContext } from 'react';

export interface AuthModalContextType {
  openAuthSheet: () => void;
  closeAuthSheet: () => void;
  isAuthSheetVisible: boolean;
}

export const AuthModalContext = createContext<AuthModalContextType>({
  openAuthSheet: () => {},
  closeAuthSheet: () => {},
  isAuthSheetVisible: false,
});

export const useAuthModal = (): AuthModalContextType => useContext(AuthModalContext);
