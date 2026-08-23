import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { LogIn, UserPlus, Sparkles, AlertCircle, CheckCircle2, Mail, Info, ArrowRight } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithEmail, signUpWithEmail, isConfigured } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setNeedsEmailConfirmation(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setNeedsEmailConfirmation(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setNeedsEmailConfirmation(false);
    setSubmitting(true);

    if (mode === "signin") {
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
    } else {
      const { error } = await signUpWithEmail(email, password, displayName);
      if (error) {
        setErrorMsg(error.message);
      } else {
        // Prominently trigger the email confirmation alert screen
        setNeedsEmailConfirmation(true);
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
              {mode === "signin" ? "Sign In to BrewLog" : "Create Account"}
            </h3>
          </div>
          <button onClick={handleClose} className="text-stone-400 hover:text-stone-200 cursor-pointer">
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-stone-950 p-1 border border-stone-800">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMsg(null);
              setSuccessMsg(null);
              setNeedsEmailConfirmation(false);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              mode === "signin"
                ? "bg-amber-500 text-stone-950 shadow-sm"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
              setSuccessMsg(null);
              setNeedsEmailConfirmation(false);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              mode === "signup"
                ? "bg-amber-500 text-stone-950 shadow-sm"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Create Account
          </button>
        </div>

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
                onClick={() => {
                  setMode("signin");
                  setNeedsEmailConfirmation(false);
                }}
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
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === "signup" && (
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
              {mode === "signup" && (
                <span className="text-[11px] text-stone-400 mt-1 flex items-center space-x-1">
                  <Info className="w-3 h-3 text-amber-400/80 flex-shrink-0" />
                  <span>A verification email will be sent to this address.</span>
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Password *</label>
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-bold shadow-lg shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
              >
                {mode === "signin" ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{submitting ? "Signing In..." : "Sign In"}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{submitting ? "Creating Account..." : "Create Account"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
