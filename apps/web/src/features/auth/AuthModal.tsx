import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  LogIn,
  UserPlus,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Mail,
  Info,
  ArrowRight,
  KeyRound,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

export type AuthMode = "signin" | "signup" | "forgot" | "update_password";

const MODAL_TITLES: Record<AuthMode, string> = {
  signin: "Sign In to BrewLog",
  signup: "Create Account",
  forgot: "Reset Your Password",
  update_password: "Choose New Password",
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    signInWithEmail,
    signUpWithEmail,
    resetPasswordForEmail,
    updatePassword,
    isConfigured,
    isPasswordRecovery,
    authUrlError,
    clearAuthUrlError,
    setIsPasswordRecovery,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Derived state booleans for readable JSX
  const isSignIn = mode === "signin";
  const isSignUp = mode === "signup";
  const isForgot = mode === "forgot";
  const isUpdatePassword = mode === "update_password";
  const isCredentialMode = isSignIn || isSignUp;

  useEffect(() => {
    if (isPasswordRecovery) {
      setMode("update_password");
      setErrorMsg(null);
    } else if (authUrlError) {
      setMode("forgot");
      setErrorMsg(authUrlError);
    }
  }, [isPasswordRecovery, authUrlError]);

  useEffect(() => {
    if (isOpen) {
      if (!isPasswordRecovery && !authUrlError) {
        setErrorMsg(null);
        setSuccessMsg(null);
      }
      setNeedsEmailConfirmation(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setNeedsEmailConfirmation(false);
    clearAuthUrlError();
  };

  const handleClose = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setNeedsEmailConfirmation(false);
    clearAuthUrlError();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setNeedsEmailConfirmation(false);
    setSubmitting(true);

    if (isSignIn) {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setErrorMsg("Your email has not been verified yet. Please check your inbox for the confirmation email link.");
        } else {
          setErrorMsg(error.message);
        }
      } else {
        setSuccessMsg("Signed in successfully!");
        setEmail("");
        setPassword("");
        setTimeout(() => handleClose(), 700);
      }
    } else if (isSignUp) {
      const { error } = await signUpWithEmail(email, password, displayName);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setNeedsEmailConfirmation(true);
      }
    } else if (isForgot) {
      const { error } = await resetPasswordForEmail(email);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg("Password reset email sent! Check your inbox for the reset link.");
      }
    } else if (isUpdatePassword) {
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match. Please re-type them.");
        setSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        setSubmitting(false);
        return;
      }
      const { error } = await updatePassword(password);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg("Your password has been updated! Logging you in...");
        setTimeout(() => {
          setIsPasswordRecovery(false);
          handleClose();
        }, 1200);
      }
    }

    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md p-6 rounded-xl bg-panel border border-border-subtle shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h3 className="text-base font-bold text-text-primary font-mono tracking-tight">
              {MODAL_TITLES[mode]}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-text-muted hover:text-text-primary cursor-pointer text-sm"
            aria-label="Close authentication modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher for Sign In / Sign Up */}
        {isCredentialMode ? (
          <div className="flex rounded bg-panel-recessed p-1 border border-border-subtle">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`flex-1 py-1.5 rounded text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer transition-all ${
                isSignIn
                  ? "bg-accent text-zinc-950 shadow-sm font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 py-1.5 rounded text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer transition-all ${
                isSignUp
                  ? "bg-accent text-zinc-950 shadow-sm font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              CREATE ACCOUNT
            </button>
          </div>
        ) : isForgot ? (
          <p className="text-xs text-text-secondary leading-relaxed font-mono">
            Enter your registered email address below. We'll send you a link to reset your password.
          </p>
        ) : (
          <p className="text-xs text-text-secondary leading-relaxed font-mono">
            Enter and confirm your new account password below.
          </p>
        )}

        {!isConfigured && (
          <div className="p-3 rounded bg-panel-recessed border border-border-subtle text-accent text-xs flex items-start space-x-2 font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Supabase credentials not detected yet in <code>apps/web/.env</code>.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start space-x-2.5 font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <div className="space-y-1">
              <span className="font-semibold block uppercase tracking-wider text-[11px]">Authentication Notice</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {needsEmailConfirmation ? (
          <div className="p-5 rounded-xl bg-panel border border-border-subtle text-text-primary space-y-4 text-center animate-fade-in">
            <div className="w-12 h-12 rounded bg-panel-recessed border border-border-subtle flex items-center justify-center mx-auto text-accent shadow-sm">
              <Mail className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-text-primary font-mono">Check Your Inbox</h4>
              <p className="text-xs text-text-secondary">
                We sent a verification link to <strong className="text-accent">{email}</strong>.
              </p>
            </div>

            <div className="p-3 rounded bg-panel-recessed border border-border-subtle text-[11px] text-text-secondary text-left space-y-1.5 font-mono">
              <div className="flex items-center space-x-1.5 text-text-primary font-semibold">
                <Info className="w-3.5 h-3.5 text-accent" />
                <span>Next Steps:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Open the confirmation email from Supabase / BrewLog.</li>
                <li>Click the verification link to confirm your email.</li>
                <li>Return here to log into your account!</li>
              </ol>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="flex items-center space-x-1.5 px-4 py-2 rounded bg-accent text-zinc-950 font-mono text-xs uppercase tracking-wider font-bold hover:bg-accent-hover cursor-pointer transition-colors"
              >
                <span>Go to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded text-xs font-mono text-text-muted hover:text-text-primary cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : isUpdatePassword && successMsg ? (
          <div className="py-8 text-center space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-text-primary font-mono">Password Updated!</h4>
              <p className="text-xs text-text-secondary font-mono">
                Your new password has been saved and your session is active.
              </p>
            </div>
            <div className="text-xs font-mono text-accent pt-1">
              Taking you to your coffee journal...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
            {successMsg && (
              <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-2 font-mono">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">Your Name / Barista Tag</label>
                <input
                  type="text"
                  placeholder="e.g. Greg"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-panel-recessed border border-border-subtle text-text-primary focus:outline-none focus:border-accent text-xs font-mono"
                />
              </div>
            )}

            {!isUpdatePassword && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-panel-recessed border border-border-subtle text-text-primary focus:outline-none focus:border-accent text-xs font-mono"
                />
                {isSignUp && (
                  <span className="text-[11px] text-text-muted mt-1 flex items-center space-x-1 font-mono">
                    <Info className="w-3 h-3 text-accent flex-shrink-0" />
                    <span>A verification email will be sent to this address.</span>
                  </span>
                )}
              </div>
            )}

            {isCredentialMode && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-muted">Password *</label>
                  {isSignIn && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer font-mono"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-panel-recessed border border-border-subtle text-text-primary focus:outline-none focus:border-accent text-xs font-mono"
                />
              </div>
            )}

            {isUpdatePassword && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">New Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Enter at least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-panel-recessed border border-border-subtle text-text-primary focus:outline-none focus:border-accent text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-text-muted mb-1">Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Re-type your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-panel-recessed border border-border-subtle text-text-primary focus:outline-none focus:border-accent text-xs font-mono"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded bg-accent hover:bg-accent-hover text-zinc-950 font-mono text-xs uppercase tracking-wider font-bold shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isSignIn ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{submitting ? "SIGNING IN..." : "SIGN IN"}</span>
                  </>
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{submitting ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}</span>
                  </>
                ) : isForgot ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{submitting ? "SENDING LINK..." : "SEND PASSWORD RESET LINK"}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{submitting ? "UPDATING PASSWORD..." : "SAVE NEW PASSWORD"}</span>
                  </>
                )}
              </button>

              {isForgot && (
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-text-primary cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>BACK TO SIGN IN</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
