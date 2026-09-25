import { UserMenu } from "../../features/auth/UserMenu";
import React from 'react';
import { Coffee, Timer, Package, Sliders, BookOpen, Sparkles } from 'lucide-react';
import { Link, NavLink } from 'react-router';

export interface HeaderProps {
  beanCount: number;
  brewCount: number;
  onOpenAuthModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  beanCount,
  brewCount,
  onOpenAuthModal,
}) => {
  const tabs = [
    { id: 'timer', path: '/timer', label: 'Brew Assistant', icon: Timer },
    { id: 'stash', path: '/stash', label: 'Coffee Stash', icon: Package, badge: beanCount },
    { id: 'recipes', path: '/recipes', label: 'Recipe Studio', icon: BookOpen },
    { id: 'equipment', path: '/equipment', label: 'Gear & Grinders', icon: Sliders },
    { id: 'cupping', path: '/cupping', label: 'Cupping & Wheel', icon: Sparkles, badge: brewCount },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/90 bg-canvas/95">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo */}
          <Link
            to="/timer"
            className="group flex items-center space-x-2.5 cursor-pointer select-none flex-shrink-0 bg-transparent border-0 p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-xl"
            aria-label="BrewLog Home, switch to Brew Assistant"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-panel border border-border-subtle group-hover:border-accent/60 transition-colors flex items-center justify-center flex-shrink-0 shadow-sm">
              <Coffee className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100">
                BrewLog
              </span>
              <span className="hidden xl:inline-block ml-2 px-2 py-0.5 text-[10px] font-mono font-medium tracking-wider uppercase rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                Precision
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Tabs: Responsive, no shrinking, no text wrap */}
          <nav className="hidden lg:flex items-center space-x-1 lg:space-x-2 flex-shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.id}
                  to={tab.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 lg:space-x-2 px-2.5 lg:px-3.5 py-2 rounded-lg text-xs lg:text-sm font-medium cursor-pointer select-none whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? 'bg-zinc-800/90 text-accent border border-zinc-700 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-accent' : 'text-zinc-400'}`} />
                      <span>{tab.label}</span>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 text-[10px] lg:text-[11px] font-mono font-medium rounded bg-zinc-800 text-zinc-300 border border-zinc-700 flex-shrink-0">
                          {tab.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action: User Auth & Profile */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <UserMenu
              onOpenAuthModal={onOpenAuthModal}
            />
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex lg:hidden overflow-x-auto py-2 space-x-1.5 border-t border-zinc-800/80 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium cursor-pointer transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-zinc-800/90 text-accent border border-zinc-700 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-zinc-400'}`} />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono font-medium rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {tab.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </header>
  );
};
