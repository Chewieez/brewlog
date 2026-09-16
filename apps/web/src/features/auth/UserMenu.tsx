import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { LogIn, LogOut, ChevronDown } from "lucide-react";

interface UserMenuProps {
  onOpenAuthModal: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onOpenAuthModal }) => {
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "Coffee Enthusiast";

  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenAuthModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider font-semibold bg-panel-recessed text-text-primary border border-border-subtle hover:border-border-active hover:bg-panel cursor-pointer whitespace-nowrap transition-colors"
        >
          <LogIn className="w-3.5 h-3.5 text-accent" />
          <span>Sign In</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-label="User account menu"
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
        className="flex items-center space-x-2 px-2.5 py-1.5 rounded bg-panel border border-border-subtle hover:border-border-active cursor-pointer transition-colors"
      >
        <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-zinc-950 font-bold text-xs font-mono">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-mono text-text-primary hidden sm:inline max-w-[100px] truncate">
          {displayName}
        </span>
        <ChevronDown className="w-3 h-3 text-text-muted" />
      </button>

      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 p-2 rounded-xl bg-panel border border-border-subtle shadow-2xl z-50 space-y-1 text-xs font-mono animate-fade-in">
            <div className="px-3 py-2 border-b border-border-subtle">
              <div className="font-bold text-text-primary truncate">{displayName}</div>
              <div className="text-[11px] text-text-muted truncate">{user.email}</div>
            </div>

            <button
              onClick={() => {
                setDropdownOpen(false);
                signOut();
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
