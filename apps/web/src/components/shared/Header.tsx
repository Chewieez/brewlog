import { UserMenu } from "../../features/auth/UserMenu";
import React from 'react';
import { Coffee, Timer, Bean, Scale, BookOpen, Award } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { ThemeToggle } from './ThemeToggle';

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
    { id: 'timer', path: '/timer', label: 'Brew Timer', icon: Timer },
    { id: 'stash', path: '/stash', label: 'Bean Stash', icon: Bean, badge: beanCount },
    { id: 'recipes', path: '/recipes', label: 'Recipes', icon: BookOpen },
    { id: 'equipment', path: '/equipment', label: 'Equipment', icon: Scale },
    { id: 'reviews', path: '/reviews', label: 'Reviews', icon: Award, badge: brewCount },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-canvas/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo */}
          <Link
            to="/timer"
            className="group flex items-center space-x-2.5 cursor-pointer select-none flex-shrink-0 bg-transparent border-0 p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-xl"
            aria-label="BrewLog Home, switch to Brew Timer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-panel border border-border-subtle group-hover:border-accent/60 transition-colors flex items-center justify-center flex-shrink-0 shadow-sm">
              <Coffee className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">
              BrewLog
            </span>
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
                        ? 'bg-panel-recessed text-accent border border-border-subtle shadow-xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-panel-recessed border border-transparent'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-accent' : 'text-text-muted'}`} />
                      <span>{tab.label}</span>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 text-[10px] lg:text-[11px] font-mono font-medium rounded bg-panel-recessed text-text-muted border border-border-subtle flex-shrink-0">
                          {tab.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action: Theme Toggle & User Auth / Profile */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <ThemeToggle />
            <UserMenu
              onOpenAuthModal={onOpenAuthModal}
            />
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex lg:hidden overflow-x-auto py-2 space-x-1.5 border-t border-border-subtle scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={({ isActive }) =>
                  `flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium cursor-pointer transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-panel-recessed text-accent border border-border-subtle shadow-xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-panel-recessed border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-text-muted'}`} />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono font-medium rounded bg-panel-recessed text-text-muted border border-border-subtle">
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
