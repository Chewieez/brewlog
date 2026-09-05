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
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer whitespace-nowrap transition-colors"
        >
          <LogIn className="w-3.5 h-3.5 text-amber-400" />
          <span>Sign In</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-amber-500/40 cursor-pointer transition-colors"
      >
        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-stone-950 font-bold text-xs">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-semibold text-stone-200 hidden sm:inline max-w-[100px] truncate">
          {displayName}
        </span>
        <ChevronDown className="w-3 h-3 text-stone-400" />
      </button>

      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 p-2 rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl z-50 space-y-1 text-xs animate-fade-in">
            <div className="px-3 py-2 border-b border-stone-800">
              <div className="font-bold text-stone-100 truncate">{displayName}</div>
              <div className="text-[11px] text-stone-400 truncate">{user.email}</div>
            </div>

            <button
              onClick={() => {
                setDropdownOpen(false);
                signOut();
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-colors"
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
