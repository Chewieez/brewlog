import React from 'react';
import { Link } from 'react-router';
import { Coffee, ArrowLeft } from 'lucide-react';

export const NotFoundRoute: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-400">
        <Coffee className="w-8 h-8" />
      </div>
      <span className="text-xs font-semibold tracking-wider uppercase text-amber-400 mb-2">
        Error 404
      </span>
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-100 mb-3">
        Brew Spilled — Page Not Found
      </h1>
      <p className="text-stone-400 max-w-md mb-8 text-sm sm:text-base">
        Looks like this grind setting went a bit too fine or the link expired. Let's get you back to brewing.
      </p>
      <Link
        to="/timer"
        className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm transition-colors shadow-lg shadow-amber-500/20"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Brew Assistant</span>
      </Link>
    </div>
  );
};
