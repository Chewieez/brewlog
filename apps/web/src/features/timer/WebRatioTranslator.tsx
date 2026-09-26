import React, { useState, useEffect } from "react";
import { solveProportionalScale, calculateRatio } from "@brewlog/core";
import { ChevronDown, ChevronUp, Scale, Check } from "lucide-react";

export interface WebRatioTranslatorProps {
  currentDose?: number;
  onApplyDose: (dose: number, ratio?: number, water?: number) => void;
  className?: string;
}

export const WebRatioTranslator: React.FC<WebRatioTranslatorProps> = ({
  currentDose = 18,
  onApplyDose,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceCoffee, setSourceCoffee] = useState("20");
  const [sourceWater, setSourceWater] = useState("300");
  const [targetCoffee, setTargetCoffee] = useState(String(currentDose || 15));
  const [targetWater, setTargetWater] = useState(() => {
    const sc = 20;
    const sw = 300;
    const tc = currentDose || 15;
    const res = solveProportionalScale({ sourceCoffee: sc, sourceWater: sw, targetCoffee: tc });
    return String(res.targetWater);
  });
  const [isApplied, setIsApplied] = useState(false);

  useEffect(() => {
    if (currentDose && currentDose > 0) {
      setTargetCoffee(String(currentDose));
      const sc = parseFloat(sourceCoffee) || 0;
      const sw = parseFloat(sourceWater) || 0;
      if (sc > 0 && sw > 0) {
        const res = solveProportionalScale({
          sourceCoffee: sc,
          sourceWater: sw,
          targetCoffee: currentDose,
        });
        setTargetWater(String(res.targetWater));
      }
    }
  }, [currentDose]);

  const handleSourceCoffeeChange = (val: string) => {
    setSourceCoffee(val);
    setIsApplied(false);
    const sc = parseFloat(val) || 0;
    const sw = parseFloat(sourceWater) || 0;
    const tc = parseFloat(targetCoffee) || 0;
    if (sc > 0 && sw > 0 && tc > 0) {
      const res = solveProportionalScale({ sourceCoffee: sc, sourceWater: sw, targetCoffee: tc });
      setTargetWater(String(res.targetWater));
    }
  };

  const handleSourceWaterChange = (val: string) => {
    setSourceWater(val);
    setIsApplied(false);
    const sw = parseFloat(val) || 0;
    const sc = parseFloat(sourceCoffee) || 0;
    const tc = parseFloat(targetCoffee) || 0;
    if (sc > 0 && sw > 0 && tc > 0) {
      const res = solveProportionalScale({ sourceCoffee: sc, sourceWater: sw, targetCoffee: tc });
      setTargetWater(String(res.targetWater));
    }
  };

  const handleTargetCoffeeChange = (val: string) => {
    setTargetCoffee(val);
    setIsApplied(false);
    const tc = parseFloat(val) || 0;
    const sc = parseFloat(sourceCoffee) || 0;
    const sw = parseFloat(sourceWater) || 0;
    if (tc > 0 && sc > 0 && sw > 0) {
      const res = solveProportionalScale({ sourceCoffee: sc, sourceWater: sw, targetCoffee: tc });
      setTargetWater(String(res.targetWater));
    } else if (tc <= 0) {
      setTargetWater("0");
    }
  };

  const handleTargetWaterChange = (val: string) => {
    setTargetWater(val);
    setIsApplied(false);
    const tw = parseFloat(val) || 0;
    const sc = parseFloat(sourceCoffee) || 0;
    const sw = parseFloat(sourceWater) || 0;
    if (tw > 0 && sc > 0 && sw > 0) {
      const res = solveProportionalScale({ sourceCoffee: sc, sourceWater: sw, targetWater: tw });
      setTargetCoffee(String(res.targetCoffee));
    } else if (tw <= 0) {
      setTargetCoffee("0");
    }
  };

  const scNum = parseFloat(sourceCoffee) || 0;
  const swNum = parseFloat(sourceWater) || 0;
  const impliedRatio = calculateRatio(scNum, swNum);
  const tcNum = parseFloat(targetCoffee) || 0;

  const handleApply = () => {
    const dose = parseFloat(targetCoffee) || 0;
    if (dose > 0) {
      const doseToApply = Number(dose.toFixed(1));
      const waterVal = parseFloat(targetWater) || 0;
      const waterToApply = waterVal > 0 ? Math.round(waterVal) : undefined;
      const ratioToApply = impliedRatio > 0 ? impliedRatio : undefined;
      onApplyDose(doseToApply, ratioToApply, waterToApply);
      setTargetCoffee(doseToApply.toString());
      setIsApplied(true);
      setTimeout(() => setIsApplied(false), 2000);
    }
  };

  return (
    <div className={`border border-border-subtle rounded bg-panel-recessed ${className}`}>
      {/* Header Accordion Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-mono uppercase tracking-wider text-text-secondary hover:text-text-primary hover:bg-panel transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2">
          <Scale className="w-3.5 h-3.5 text-accent" />
          <span className="font-semibold text-text-primary">RATIO TRANSLATOR</span>
          {impliedRatio > 0 && (
            <span className="text-[11px] text-text-muted">
              (Implied 1:{impliedRatio})
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        )}
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-3.5 border-t border-border-subtle space-y-4">
          <p className="text-xs text-text-muted">
            Translate recipe dose & water proportionally to match your target coffee dose.
          </p>

          {/* Baseline Reference Grid */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1.5">
              1. Baseline Recipe Reference
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="baseline-coffee"
                  className="block text-[11px] font-mono uppercase text-text-muted mb-1"
                >
                  Baseline Coffee (g)
                </label>
                <input
                  id="baseline-coffee"
                  aria-label="Baseline Coffee (g)"
                  type="number"
                  min="1"
                  step="0.1"
                  value={sourceCoffee}
                  onChange={(e) => handleSourceCoffeeChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-panel border border-border-subtle rounded text-xs text-text-primary tabular-nums font-mono focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label
                  htmlFor="baseline-water"
                  className="block text-[11px] font-mono uppercase text-text-muted mb-1"
                >
                  Baseline Water (g)
                </label>
                <input
                  id="baseline-water"
                  aria-label="Baseline Water (g)"
                  type="number"
                  min="1"
                  step="1"
                  value={sourceWater}
                  onChange={(e) => handleSourceWaterChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-panel border border-border-subtle rounded text-xs text-text-primary tabular-nums font-mono focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Target Solved Grid */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1.5">
              2. Target Desired Scale
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="target-coffee"
                  className="block text-[11px] font-mono uppercase text-text-muted mb-1"
                >
                  Target Coffee (g)
                </label>
                <input
                  id="target-coffee"
                  aria-label="Target Coffee (g)"
                  type="number"
                  min="1"
                  step="0.1"
                  value={targetCoffee}
                  onChange={(e) => handleTargetCoffeeChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-panel border border-border-subtle rounded text-xs text-text-primary tabular-nums font-mono focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label
                  htmlFor="target-water"
                  className="block text-[11px] font-mono uppercase text-text-muted mb-1"
                >
                  Target Water (g)
                </label>
                <input
                  id="target-water"
                  aria-label="Target Water (g)"
                  type="number"
                  min="1"
                  step="1"
                  value={targetWater}
                  onChange={(e) => handleTargetWaterChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-panel border border-border-subtle rounded text-xs text-text-primary tabular-nums font-mono focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Results readout & Action */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-mono text-accent font-semibold">
              Target Water: {targetWater}g
            </span>
            <span className="text-xs font-mono text-text-muted">
              Target Coffee: {targetCoffee}g
            </span>
          </div>

          <button
            type="button"
            onClick={handleApply}
            disabled={tcNum <= 0}
            className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded bg-accent hover:bg-accent-hover disabled:opacity-50 text-zinc-950 font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
          >
            {isApplied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>APPLIED!</span>
              </>
            ) : (
              <span>APPLY {targetCoffee}g TO TIMER</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
