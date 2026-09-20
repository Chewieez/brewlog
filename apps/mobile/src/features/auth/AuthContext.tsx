import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { AppState, AppStateStatus } from "react-native";
import { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

export interface MobileAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, pass: string, displayName?: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<MobileAuthContextType | undefined>(undefined);

function sanitizeAuthError(error: Error | null): Error | null {
  if (!error) return null;
  const msg = error.message.toLowerCase();

  if (msg.includes("invalid login credentials") || msg.includes("invalid_grant")) {
    return new Error("Invalid email or password.");
  }
  if (msg.includes("user already registered") || msg.includes("user_already_exists")) {
    return new Error("An account with this email already exists.");
  }
  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return new Error("Unable to reach BrewLog cloud. Please check your internet connection.");
  }
  return error;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Hydrate existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Real-time auth subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // AppState auto-refresh handler
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === "active") {
        supabase?.auth.startAutoRefresh();
      } else {
        supabase?.auth.stopAutoRefresh();
      }
    };

    const appStateSub = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    if (!supabase) {
      return { error: new Error("Supabase is not configured yet in .env.") };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });
    return { error: sanitizeAuthError(error) };
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, pass: string, displayName?: string) => {
      if (!supabase) {
        return { error: new Error("Supabase is not configured yet in .env.") };
      }
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            display_name: displayName?.trim() || email.split("@")[0],
          },
        },
      });
      return { error: sanitizeAuthError(error) };
    },
    []
  );

  const resetPasswordForEmail = useCallback(async (email: string) => {
    if (!supabase) {
      return { error: new Error("Supabase is not configured yet in .env.") };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    return { error: sanitizeAuthError(error) };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  }, []);

  const value = useMemo<MobileAuthContextType>(
    () => ({
      user,
      session,
      loading,
      isConfigured: isSupabaseConfigured,
      signInWithEmail,
      signUpWithEmail,
      resetPasswordForEmail,
      signOut,
    }),
    [
      user,
      session,
      loading,
      signInWithEmail,
      signUpWithEmail,
      resetPasswordForEmail,
      signOut,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
