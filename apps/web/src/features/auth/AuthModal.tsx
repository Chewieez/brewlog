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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md p-6 rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-stone-100">
              {MODAL_TITLES[mode]}
            </h3>
          </div>
          <button onClick={handleClose} className="text-stone-400 hover:text-stone-200 cursor-pointer">
            ✕
          </button>
        </div>

        {/* Tab Switcher for Sign In / Sign Up */}
        {isCredentialMode ? (
          <div className="flex rounded-xl bg-stone-950 p-1 border border-stone-800">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                isSignIn
                  ? "bg-amber-500 text-stone-950 shadow-sm"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                isSignUp
                  ? "bg-amber-500 text-stone-950 shadow-sm"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              Create Account
            </button>
          </div>
        ) : isForgot ? (
          <p className="text-xs text-stone-400 leading-relaxed">
            Enter your registered email address below. We'll send you a link to reset your password.
          </p>
        ) : (
          <p className="text-xs text-stone-400 leading-relaxed">
            Enter and confirm your new account password below.
          </p>
        )}

        {!isConfigured && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Supabase credentials not detected yet in <code>apps/web/.env</code>.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <div className="space-y-1">
              <span className="font-semibold block">Authentication Notice</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {needsEmailConfirmation ? (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-stone-200 space-y-4 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/10">
              <Mail className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-stone-100">Check Your Inbox</h4>
              <p className="text-xs text-stone-300">
                We sent a verification link to <strong className="text-amber-300">{email}</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 text-[11px] text-stone-400 text-left space-y-1.5">
              <div className="flex items-center space-x-1.5 text-stone-300 font-semibold">
                <Info className="w-3.5 h-3.5 text-amber-400" />
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
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 cursor-pointer transition-colors"
              >
                <span>Go to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded-xl text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : isUpdatePassword && successMsg ? (
          <div className="py-8 text-center space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-stone-100">Password Updated!</h4>
              <p className="text-xs text-stone-300">
                Your new password has been saved and your session is active.
              </p>
            </div>
            <div className="text-xs font-semibold text-amber-400 pt-1">
              Taking you to your coffee journal...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Your Name / Barista Tag</label>
                <input
                  type="text"
                  placeholder="e.g. Greg"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {!isUpdatePassword && (
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                />
                {isSignUp && (
                  <span className="text-[11px] text-stone-400 mt-1 flex items-center space-x-1">
                    <Info className="w-3 h-3 text-amber-400/80 flex-shrink-0" />
                    <span>A verification email will be sent to this address.</span>
                  </span>
                )}
              </div>
            )}

            {isCredentialMode && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-stone-300">Password *</label>
                  {isSignIn && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
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
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {isUpdatePassword && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">New Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Enter at least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Re-type your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-bold shadow-lg shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSignIn ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{submitting ? "Signing In..." : "Sign In"}</span>
                  </>
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{submitting ? "Creating Account..." : "Create Account"}</span>
                  </>
                ) : isForgot ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{submitting ? "Sending Link..." : "Send Password Reset Link"}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{submitting ? "Updating Password..." : "Save New Password"}</span>
                  </>
                )}
              </button>

              {isForgot && (
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 text-xs text-stone-400 hover:text-stone-200 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
