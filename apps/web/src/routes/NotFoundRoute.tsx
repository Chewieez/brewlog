import React from 'react';
import { Link } from 'react-router';
import { Coffee, ArrowLeft } from 'lucide-react';

export const NotFoundRoute: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-lg bg-panel-recessed border border-border-subtle flex items-center justify-center mb-6 text-accent">
        <Coffee className="w-8 h-8" />
      </div>
      <span className="text-xs font-mono uppercase tracking-widest text-accent mb-2">
        Error 404
      </span>
      <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-3">
        Brew Spilled — Page Not Found
      </h1>
      <p className="text-text-secondary max-w-md mb-8 text-sm sm:text-base leading-relaxed">
        Looks like this grind setting went a bit too fine or the link expired. Let's get you back to brewing.
      </p>
      <Link
        to="/timer"
        className="inline-flex items-center space-x-2 px-5 py-2.5 rounded bg-accent hover:bg-accent-hover text-zinc-950 font-mono text-xs uppercase tracking-wider font-bold transition-all active:scale-95 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Brew Assistant</span>
      </Link>
    </div>
  );
};
