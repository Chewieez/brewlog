import React, { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "./AuthContext";
import { LogIn, LogOut, ChevronDown, Settings } from "lucide-react";

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
        <Link
          to="/settings"
          aria-label="Settings"
          title="Settings"
          className="btn-tactile-secondary w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        >
          <Settings className="w-4 h-4" />
        </Link>
        <button
          onClick={onOpenAuthModal}
          className="btn-tactile-secondary h-8 flex items-center space-x-1.5 px-3 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold whitespace-nowrap"
        >
          <LogIn className="w-4 h-4 text-accent" />
          <span>SIGN IN</span>
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
        className="btn-tactile-secondary h-8 flex items-center space-x-2 px-2.5 rounded-lg"
      >
        <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-zinc-950 font-bold text-xs font-mono">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-mono text-foreground hidden sm:inline max-w-[100px] truncate">
          {displayName}
        </span>
        <ChevronDown className="w-3 h-3 text-foreground-muted" />
      </button>

      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 p-2 rounded-xl bg-panel border border-border-subtle shadow-2xl z-50 space-y-1 text-xs font-mono animate-fade-in">
            <div className="px-3 py-2 border-b border-border-subtle">
              <div className="font-bold text-foreground truncate">{displayName}</div>
              <div className="text-[11px] text-foreground-muted truncate">{user.email}</div>
            </div>

            <Link
              to="/settings"
              onClick={() => setDropdownOpen(false)}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded text-foreground hover:bg-panel-recessed font-mono text-xs uppercase tracking-wider font-semibold cursor-pointer transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-foreground" />
              <span>SETTINGS</span>
            </Link>

            <button
              onClick={() => {
                setDropdownOpen(false);
                signOut();
              }}
              className="group w-full flex items-center space-x-2 px-3 py-2 rounded text-foreground hover:bg-panel-recessed font-mono text-xs uppercase tracking-wider font-semibold cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-foreground group-hover:text-red-400 transition-colors" />
              <span>SIGN OUT</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
