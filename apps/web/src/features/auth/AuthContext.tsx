import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isPasswordRecovery: boolean;
  authUrlError: string | null;
  clearAuthUrlError: () => void;
  setIsPasswordRecovery: (val: boolean) => void;
  signInWithEmail: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, pass: string, displayName?: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [authUrlError, setAuthUrlError] = useState<string | null>(null);

  useEffect(() => {
    // Check URL hash for error or recovery type on initial page load and on hash change
    const checkHash = () => {
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get("error");
        const errorCode = hashParams.get("error_code");
        const errorDescription = hashParams.get("error_description");
        const type = hashParams.get("type");

        if (error || errorCode) {
          if (errorCode === "otp_expired" || errorDescription?.includes("expired")) {
            setAuthUrlError("This password reset link has expired or has already been used. Please request a fresh reset link below.");
          } else {
            setAuthUrlError(errorDescription?.replace(/\+/g, " ") || error || "Authentication error occurred.");
          }
          // Clean hash from URL so it doesn't stay in browser bar
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        } else if (type === "recovery") {
          setIsPasswordRecovery(true);
        }
      }
    };

    checkHash();
    window.addEventListener("hashchange", checkHash);

    if (!supabase) {
      setLoading(false);
      return () => {
        window.removeEventListener("hashchange", checkHash);
      };
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen to live auth changes (e.g. PASSWORD_RECOVERY event from Supabase reset link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      window.removeEventListener("hashchange", checkHash);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    if (!supabase) return { error: new Error("Supabase is not configured yet.") };
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    return { error };
  };

  const signUpWithEmail = async (email: string, pass: string, displayName?: string) => {
    if (!supabase) return { error: new Error("Supabase is not configured yet.") };
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
        },
      },
    });
    return { error };
  };

  const resetPasswordForEmail = async (email: string) => {
    if (!supabase) return { error: new Error("Supabase is not configured yet.") };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    if (!supabase) return { error: new Error("Supabase is not configured yet.") };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    return { error };
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setIsPasswordRecovery(false);
  };

  const clearAuthUrlError = () => {
    setAuthUrlError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        isPasswordRecovery,
        authUrlError,
        clearAuthUrlError,
        setIsPasswordRecovery,
        signInWithEmail,
        signUpWithEmail,
        resetPasswordForEmail,
        updatePassword,
        signOut,
      }}
    >
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
