import React from 'react';
import { Coffee, Timer, Package, Sliders, BookOpen, Sparkles, Database } from 'lucide-react';

export type ActiveTab = 'timer' | 'stash' | 'recipes' | 'equipment' | 'cupping';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  beanCount: number;
  brewCount: number;
  onOpenDatabaseSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  beanCount,
  brewCount,
  onOpenDatabaseSettings,
}) => {
  const tabs = [
    { id: 'timer' as ActiveTab, label: 'Brew Assistant', icon: Timer },
    { id: 'stash' as ActiveTab, label: 'Coffee Stash', icon: Package, badge: beanCount },
    { id: 'recipes' as ActiveTab, label: 'Recipe Studio', icon: BookOpen },
    { id: 'equipment' as ActiveTab, label: 'Gear & Grinders', icon: Sliders },
    { id: 'cupping' as ActiveTab, label: 'Cupping & Wheel', icon: Sparkles, badge: brewCount },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-800/80 bg-stone-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => setActiveTab('timer')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center">
                <Coffee className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-stone-100 via-amber-100 to-amber-400 bg-clip-text text-transparent">
                BrewLog
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Specialty
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium cursor-pointer select-none transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action / Supabase Sync Status */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenDatabaseSettings}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-300 bg-stone-900/90 border border-stone-800 hover:border-amber-500/40 hover:text-amber-300 cursor-pointer transition-colors"
              title="Configure Supabase Database"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Supabase Cloud</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-stone-800/50 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-medium cursor-pointer transition-all ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
