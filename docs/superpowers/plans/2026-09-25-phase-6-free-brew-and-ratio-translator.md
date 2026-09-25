# Phase 6: Free Brew (Manual Timer) & Nested Ratio Translator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a cross-platform Free Brew (manual stopwatch) timer mode with live split/milestone markers and a nested proportional ratio translator across `@brewlog/core`, `apps/mobile`, and `apps/web`.

**Architecture:** We use Approach 1 (Unified Timer Engine with Mode Switcher). We expand `@brewlog/core/src/calculator.ts` with pure bidirectional math (`calculateTargetWater`, `calculateTargetCoffee`, `solveProportionalScale`, `splitsToRecipeStages`). The timer hooks (`useMobileBrewTimer` and `useBrewTimer`) support a `mode: 'recipe' | 'free_brew'` configuration with split tracking. Both mobile and web Timer screens incorporate a top segmented toggle `[ GUIDED RECIPE ] | [ FREE BREW ]`, active session reset protection, dynamic split timelines, and a multi-action finish banner (Stash deduction, Cupping log, Save as Custom Recipe).

**Tech Stack:** React Native (Expo SDK 57), React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Vitest / React Native Testing Library.

**Spec:** [`docs/superpowers/specs/2026-09-25-phase-6-free-brew-and-ratio-translator-design.md`](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-09-25-phase-6-free-brew-and-ratio-translator-design.md)

## Global Constraints

- Strict TypeScript with zero `any` declarations.
- Visual continuity strictly conforming to `INDUSTRIAL_PRECISION_THEME` design tokens. Zero hardcoded colors.
- Interactive touch targets must meet or exceed Apple HIG 44×44pt minimum on mobile.
- Native mobile tests must reside outside `apps/mobile/app/` to prevent Expo Router route leakage.
- Clean floating-point precision: coffee doses rounded to 1 decimal place, water weights rounded to integers, ratios rounded to 1 decimal place.
- All division operations must guard against division by zero and negative inputs.

---

### Task 1: Core Domain Math & Types (`@brewlog/core`)

**Files:**
- Modify: `packages/core/src/types.ts:1-35`
- Modify: `packages/core/src/calculator.ts:1-35`
- Modify: `packages/core/src/calculator.test.ts:1-120`

**Interfaces:**
- Produces:
  ```typescript
  export type TimerMode = 'recipe' | 'free_brew';
  export type SplitTag = 'bloom' | 'pour' | 'drawdown' | 'custom';
  export interface BrewSplit {
    id: string;
    second: number;
    intervalSeconds: number;
    label: string;
    tag?: SplitTag;
    waterWeightGrams?: number;
  }
  export function calculateTargetWater(coffeeDoseGrams: number, ratio: number): number;
  export function calculateTargetCoffee(waterAmountGrams: number, ratio: number): number;
  export interface ProportionalScaleParams {
    sourceCoffee: number;
    sourceWater: number;
    targetCoffee?: number;
    targetWater?: number;
  }
  export interface ProportionalScaleResult {
    ratio: number;
    targetCoffee: number;
    targetWater: number;
  }
  export function solveProportionalScale(params: ProportionalScaleParams): ProportionalScaleResult;
  export function splitsToRecipeStages(
    splits: BrewSplit[],
    totalElapsedSeconds: number,
    totalWaterAmountGrams: number
  ): BrewStage[];
  ```

- [ ] **Step 1: Write failing tests for domain math helpers and split-to-stage converter**

Add to `packages/core/src/calculator.test.ts`:
```typescript
import {
  calculateWaterAmount,
  calculateCoffeeDose,
  calculateRatio,
  calculateTargetWater,
  calculateTargetCoffee,
  solveProportionalScale,
  splitsToRecipeStages,
  rescaleRecipeDose,
  calculateScaScore,
} from "./calculator";
import { BrewSplit } from "./types";

describe("Phase 6 Proportional Math & Split Converter", () => {
  describe("calculateTargetWater & calculateTargetCoffee", () => {
    it("calculates target water correctly", () => {
      expect(calculateTargetWater(18, 16)).toBe(288);
      expect(calculateTargetWater(15.5, 15)).toBe(233);
      expect(calculateTargetWater(0, 16)).toBe(0);
      expect(calculateTargetWater(18, 0)).toBe(0);
    });

    it("calculates target coffee correctly with 1 decimal place", () => {
      expect(calculateTargetCoffee(288, 16)).toBe(18);
      expect(calculateTargetCoffee(250, 16.5)).toBe(15.2);
      expect(calculateTargetCoffee(0, 16)).toBe(0);
      expect(calculateTargetCoffee(250, 0)).toBe(0);
    });
  });

  describe("solveProportionalScale", () => {
    it("solves target water given target coffee from source baseline", () => {
      const result = solveProportionalScale({
        sourceCoffee: 20,
        sourceWater: 320,
        targetCoffee: 15,
      });
      expect(result.ratio).toBe(16);
      expect(result.targetCoffee).toBe(15);
      expect(result.targetWater).toBe(240);
    });

    it("solves target coffee given target water from source baseline", () => {
      const result = solveProportionalScale({
        sourceCoffee: 22,
        sourceWater: 350,
        targetWater: 250,
      });
      expect(result.ratio).toBe(15.9);
      expect(result.targetWater).toBe(250);
      expect(result.targetCoffee).toBe(15.7);
    });

    it("handles zero and negative inputs safely without throwing", () => {
      const zeroResult = solveProportionalScale({
        sourceCoffee: 0,
        sourceWater: 300,
        targetCoffee: 15,
      });
      expect(zeroResult.ratio).toBe(0);
      expect(zeroResult.targetWater).toBe(0);

      const negResult = solveProportionalScale({
        sourceCoffee: -10,
        sourceWater: 150,
        targetWater: 200,
      });
      expect(negResult.ratio).toBe(0);
      expect(negResult.targetCoffee).toBe(0);
    });
  });

  describe("splitsToRecipeStages", () => {
    it("creates a single full extraction stage when no splits are provided", () => {
      const stages = splitsToRecipeStages([], 180, 300);
      expect(stages).toHaveLength(1);
      expect(stages[0].name).toBe("Full Extraction");
      expect(stages[0].startSecond).toBe(0);
      expect(stages[0].durationSeconds).toBe(180);
      expect(stages[0].targetWaterWeightGrams).toBe(300);
    });

    it("converts multiple splits into progressive stages with correct durations", () => {
      const splits: BrewSplit[] = [
        { id: "s1", second: 45, intervalSeconds: 45, label: "Bloom", tag: "bloom" },
        { id: "s2", second: 105, intervalSeconds: 60, label: "First Pour", tag: "pour" },
        { id: "s3", second: 180, intervalSeconds: 75, label: "Drawdown", tag: "drawdown" },
      ];
      const stages = splitsToRecipeStages(splits, 210, 300);
      expect(stages).toHaveLength(4);
      expect(stages[0].name).toBe("Bloom");
      expect(stages[0].startSecond).toBe(0);
      expect(stages[0].durationSeconds).toBe(45);

      expect(stages[1].name).toBe("First Pour");
      expect(stages[1].startSecond).toBe(45);
      expect(stages[1].durationSeconds).toBe(60);

      expect(stages[2].name).toBe("Drawdown");
      expect(stages[2].startSecond).toBe(105);
      expect(stages[2].durationSeconds).toBe(75);

      expect(stages[3].name).toBe("Finish & Drain");
      expect(stages[3].startSecond).toBe(180);
      expect(stages[3].durationSeconds).toBe(30);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=@brewlog/core`
Expected: FAIL with missing exports `calculateTargetWater`, `calculateTargetCoffee`, `solveProportionalScale`, `splitsToRecipeStages`.

- [ ] **Step 3: Implement domain types and math helpers**

In `packages/core/src/types.ts`, add:
```typescript
export type TimerMode = 'recipe' | 'free_brew';

export type SplitTag = 'bloom' | 'pour' | 'drawdown' | 'custom';

export interface BrewSplit {
  id: string;
  second: number;
  intervalSeconds: number;
  label: string;
  tag?: SplitTag;
  waterWeightGrams?: number;
}
```

In `packages/core/src/calculator.ts`, export the new helpers:
```typescript
export function calculateTargetWater(coffeeDoseGrams: number, ratio: number): number {
  if (coffeeDoseGrams <= 0 || ratio <= 0) return 0;
  return Math.round(coffeeDoseGrams * ratio);
}

export function calculateTargetCoffee(waterAmountGrams: number, ratio: number): number {
  if (waterAmountGrams <= 0 || ratio <= 0) return 0;
  return Number((waterAmountGrams / ratio).toFixed(1));
}

export interface ProportionalScaleParams {
  sourceCoffee: number;
  sourceWater: number;
  targetCoffee?: number;
  targetWater?: number;
}

export interface ProportionalScaleResult {
  ratio: number;
  targetCoffee: number;
  targetWater: number;
}

export function solveProportionalScale(params: ProportionalScaleParams): ProportionalScaleResult {
  const { sourceCoffee, sourceWater, targetCoffee, targetWater } = params;
  if (sourceCoffee <= 0 || sourceWater <= 0) {
    return {
      ratio: 0,
      targetCoffee: targetCoffee ?? 0,
      targetWater: targetWater ?? 0,
    };
  }

  const ratio = Number((sourceWater / sourceCoffee).toFixed(1));

  if (targetCoffee !== undefined && targetCoffee > 0) {
    const calculatedWater = Math.round(targetCoffee * ratio);
    return {
      ratio,
      targetCoffee,
      targetWater: calculatedWater,
    };
  }

  if (targetWater !== undefined && targetWater > 0) {
    const calculatedCoffee = Number((targetWater / ratio).toFixed(1));
    return {
      ratio,
      targetCoffee: calculatedCoffee,
      targetWater,
    };
  }

  return {
    ratio,
    targetCoffee: sourceCoffee,
    targetWater: sourceWater,
  };
}

export function splitsToRecipeStages(
  splits: BrewSplit[],
  totalElapsedSeconds: number,
  totalWaterAmountGrams: number
): BrewStage[] {
  const safeTotalTime = Math.max(1, totalElapsedSeconds);

  if (!splits || splits.length === 0) {
    return [
      {
        id: 'stage-1',
        name: 'Full Extraction',
        startSecond: 0,
        durationSeconds: safeTotalTime,
        targetWaterWeightGrams: totalWaterAmountGrams,
        instruction: 'Pour total water and allow drawdown.',
        stageType: 'pour',
      },
    ];
  }

  const sortedSplits = [...splits].sort((a, b) => a.second - b.second);
  const stages: BrewStage[] = [];
  let prevSecond = 0;

  sortedSplits.forEach((split, idx) => {
    const startSecond = prevSecond;
    const duration = Math.max(1, split.second - startSecond);
    const stageWater = split.waterWeightGrams !== undefined
      ? split.waterWeightGrams
      : Math.round(((idx + 1) / (sortedSplits.length + 1)) * totalWaterAmountGrams);

    stages.push({
      id: `stage-${idx + 1}`,
      name: split.label || `Stage ${idx + 1}`,
      startSecond,
      durationSeconds: duration,
      targetWaterWeightGrams: stageWater,
      instruction: `Execute ${split.label.toLowerCase()} phase.`,
      stageType: split.tag === 'bloom' ? 'bloom' : split.tag === 'drawdown' ? 'wait' : 'pour',
    });

    prevSecond = split.second;
  });

  if (safeTotalTime > prevSecond) {
    stages.push({
      id: `stage-${stages.length + 1}`,
      name: 'Finish & Drain',
      startSecond: prevSecond,
      durationSeconds: safeTotalTime - prevSecond,
      targetWaterWeightGrams: totalWaterAmountGrams,
      instruction: 'Final drawdown and decant.',
      stageType: 'wait',
    });
  }

  return stages;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=@brewlog/core`
Expected: PASS with 4 new test suites passing.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/calculator.ts packages/core/src/calculator.test.ts
git commit -m "feat(core): add bidirectional proportional math and split stage converter"
```

---

### Task 2: Nested Ratio Translator Drawer (`CollapsibleCalculator` in `apps/mobile`)

**Files:**
- Modify: `apps/mobile/src/components/timer/CollapsibleCalculator.tsx:1-250`
- Modify: `apps/mobile/src/components/timer/CollapsibleCalculator.test.tsx:1-120`

**Interfaces:**
- Consumes: `solveProportionalScale`, `calculateRatio`, `INDUSTRIAL_PRECISION_THEME`, `mobileFeedback`.
- Produces: `CollapsibleCalculator` component with nested accordion drawer (`RATIO TRANSLATOR / CONVERTER`), source baseline inputs, target solver inputs, and `APPLY TO TIMER` callback.

- [ ] **Step 1: Write failing tests for nested ratio translator drawer**

Add to `apps/mobile/src/components/timer/CollapsibleCalculator.test.tsx`:
```typescript
describe("Nested Ratio Translator Accordion", () => {
  it("expands nested translator drawer when clicked", () => {
    const { getByText, queryByText } = render(
      <CollapsibleCalculator initialDose={18} initialRatio={16} />
    );

    // Expand main calculator
    fireEvent.press(getByText("RATIO CALCULATOR"));
    expect(getByText("RATIO TRANSLATOR / CONVERTER")).toBeTruthy();

    // Drawer starts collapsed
    expect(queryByText("BASELINE RECIPE")).toBeNull();

    // Expand translator drawer
    fireEvent.press(getByText("RATIO TRANSLATOR / CONVERTER"));
    expect(getByText("BASELINE RECIPE")).toBeTruthy();
    expect(getByText("TARGET SOLVER")).toBeTruthy();
  });

  it("calculates implied ratio and solves target water from target coffee", () => {
    const onApplyDose = vi.fn();
    const { getByText, getByLabelText } = render(
      <CollapsibleCalculator initialDose={18} initialRatio={16} onApplyDose={onApplyDose} />
    );

    fireEvent.press(getByText("RATIO CALCULATOR"));
    fireEvent.press(getByText("RATIO TRANSLATOR / CONVERTER"));

    const sourceCoffeeInput = getByLabelText("Baseline coffee dose in grams");
    const sourceWaterInput = getByLabelText("Baseline water amount in grams");
    const targetCoffeeInput = getByLabelText("Target coffee dose in grams");

    fireEvent.changeText(sourceCoffeeInput, "20");
    fireEvent.changeText(sourceWaterInput, "300");

    // Implied ratio should be 1:15.0
    expect(getByText(/1:15/)).toBeTruthy();

    fireEvent.changeText(targetCoffeeInput, "16");

    // Target water should solve to 240g
    expect(getByText(/Target Water: 240g/i)).toBeTruthy();

    // Apply solved dose to timer
    const applyTranslatorBtn = getByText("APPLY TRANSLATOR DOSE (16g)");
    fireEvent.press(applyTranslatorBtn);
    expect(onApplyDose).toHaveBeenCalledWith(16);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=@brewlog/mobile -- src/components/timer/CollapsibleCalculator.test.tsx`
Expected: FAIL with "Unable to find element with text: RATIO TRANSLATOR / CONVERTER".

- [ ] **Step 3: Implement nested translator accordion in CollapsibleCalculator**

In `apps/mobile/src/components/timer/CollapsibleCalculator.tsx`:
- Import `solveProportionalScale`, `calculateRatio`, and `ChevronRight` / `ChevronDown` from `lucide-react-native`.
- Maintain state:
  ```typescript
  const [isTranslatorOpen, setIsTranslatorOpen] = useState(false);
  const [sourceCoffee, setSourceCoffee] = useState('20');
  const [sourceWater, setSourceWater] = useState('320');
  const [targetCoffee, setTargetCoffee] = useState('18');
  const [targetWater, setTargetWater] = useState('288');
  ```
- Derive implied ratio:
  ```typescript
  const parsedSourceCoffee = parseFloat(sourceCoffee) || 0;
  const parsedSourceWater = parseFloat(sourceWater) || 0;
  const impliedRatio = calculateRatio(parsedSourceCoffee, parsedSourceWater);
  ```
- Add handler for `targetCoffee` change (solves for `targetWater` using `solveProportionalScale`).
- Add handler for `targetWater` change (solves for `targetCoffee` using `solveProportionalScale`).
- Render accordion header and body with Industrial Precision tokens.
- Add `APPLY TRANSLATOR DOSE` button that invokes `onApplyDose(solvedCoffee)` and triggers `mobileFeedback.triggerHapticTap()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test --workspace=@brewlog/mobile -- src/components/timer/CollapsibleCalculator.test.tsx`
Expected: PASS with 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/timer/CollapsibleCalculator.tsx apps/mobile/src/components/timer/CollapsibleCalculator.test.tsx
git commit -m "feat(mobile): add nested ratio translator drawer to CollapsibleCalculator"
```

---

### Task 3: Mobile Free Brew Timer Hook Extension & Split Timeline Component (`apps/mobile`)

**Files:**
- Modify: `apps/mobile/src/hooks/useMobileBrewTimer.ts:1-120`
- Modify: `apps/mobile/src/hooks/useMobileBrewTimer.test.ts:1-100`
- Create: `apps/mobile/src/components/timer/FreeBrewSplitTimeline.tsx`
- Create: `apps/mobile/src/components/timer/FreeBrewSplitTimeline.test.tsx`

**Interfaces:**
- Consumes: `TimerMode`, `BrewSplit`, `SplitTag`, `mobileFeedback`, `INDUSTRIAL_PRECISION_THEME`, `FONTS`.
- Produces:
  - `useMobileBrewTimer(recipe, mode?: TimerMode)`: adds `splits: BrewSplit[]`, `recordSplit(label?: string, tag?: SplitTag)`, `removeSplit(id: string)`.
  - `<FreeBrewSplitTimeline splits={splits} onRemoveSplit={removeSplit} />`.

- [ ] **Step 1: Write failing tests for Free Brew timer hook and Split Timeline**

Add to `apps/mobile/src/hooks/useMobileBrewTimer.test.ts`:
```typescript
it("supports free_brew mode with split recording and interval calculation", () => {
  const { result } = renderHook(() => useMobileBrewTimer(mockRecipe, "free_brew"));

  expect(result.current.splits).toEqual([]);

  act(() => {
    result.current.start();
  });

  // Advance clock by 45 seconds
  act(() => {
    vi.advanceTimersByTime(45000);
  });

  act(() => {
    result.current.recordSplit("Bloom", "bloom");
  });

  expect(result.current.splits).toHaveLength(1);
  expect(result.current.splits[0].label).toBe("Bloom");
  expect(result.current.splits[0].second).toBe(45);
  expect(result.current.splits[0].intervalSeconds).toBe(45);

  // Advance by another 30 seconds
  act(() => {
    vi.advanceTimersByTime(30000);
  });

  act(() => {
    result.current.recordSplit("First Pour", "pour");
  });

  expect(result.current.splits).toHaveLength(2);
  expect(result.current.splits[1].second).toBe(75);
  expect(result.current.splits[1].intervalSeconds).toBe(30);

  // Test remove split
  const splitId = result.current.splits[0].id;
  act(() => {
    result.current.removeSplit(splitId);
  });
  expect(result.current.splits).toHaveLength(1);
  expect(result.current.splits[0].label).toBe("First Pour");
});
```

Create `apps/mobile/src/components/timer/FreeBrewSplitTimeline.test.tsx`:
```typescript
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { describe, it, expect, vi } from "vitest";
import { FreeBrewSplitTimeline } from "./FreeBrewSplitTimeline";
import { BrewSplit } from "@brewlog/core";

describe("FreeBrewSplitTimeline", () => {
  it("renders empty state message when splits array is empty", () => {
    const { getByText } = render(
      <FreeBrewSplitTimeline splits={[]} onRemoveSplit={vi.fn()} />
    );
    expect(getByText(/No splits recorded yet/i)).toBeTruthy();
  });

  it("renders chronological splits with tag labels and interval times", () => {
    const splits: BrewSplit[] = [
      { id: "s1", second: 45, intervalSeconds: 45, label: "Bloom", tag: "bloom" },
      { id: "s2", second: 95, intervalSeconds: 50, label: "Pour 1", tag: "pour" },
    ];
    const onRemoveSplit = vi.fn();

    const { getByText, getByLabelText } = render(
      <FreeBrewSplitTimeline splits={splits} onRemoveSplit={onRemoveSplit} />
    );

    expect(getByText("Bloom")).toBeTruthy();
    expect(getByText("00:45")).toBeTruthy();
    expect(getByText("+45s")).toBeTruthy();

    expect(getByText("Pour 1")).toBeTruthy();
    expect(getByText("01:35")).toBeTruthy();
    expect(getByText("+50s")).toBeTruthy();

    // Click delete on first split
    fireEvent.press(getByLabelText("Delete split Bloom"));
    expect(onRemoveSplit).toHaveBeenCalledWith("s1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test --workspace=@brewlog/mobile -- src/hooks/useMobileBrewTimer.test.ts src/components/timer/FreeBrewSplitTimeline.test.tsx`
Expected: FAIL with missing `splits` property and missing component file.

- [ ] **Step 3: Implement free brew logic in useMobileBrewTimer and create FreeBrewSplitTimeline**

In `apps/mobile/src/hooks/useMobileBrewTimer.ts`:
- Extend hook signature: `useMobileBrewTimer(recipe: BrewRecipe, mode: TimerMode = 'recipe')`.
- Add `splits: BrewSplit[]` state.
- In timer loop, only fire recipe stage chimes if `mode === 'recipe'`.
- Implement `recordSplit(label?: string, tag?: SplitTag)`:
  ```typescript
  const recordSplit = useCallback((label?: string, tag?: SplitTag) => {
    const id = `split-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const lastSplitSecond = splits.length > 0 ? splits[splits.length - 1].second : 0;
    const intervalSeconds = Math.max(0, elapsedSeconds - lastSplitSecond);
    const newSplit: BrewSplit = {
      id,
      second: elapsedSeconds,
      intervalSeconds,
      label: label || `Split ${splits.length + 1}`,
      tag: tag || 'custom',
    };
    setSplits((prev) => [...prev, newSplit]);
    mobileFeedback.triggerHapticTap();
  }, [elapsedSeconds, splits]);
  ```
- Implement `removeSplit(id: string)`.

Create `apps/mobile/src/components/timer/FreeBrewSplitTimeline.tsx`:
- Render header with `"RECORDED SPLITS"` and count.
- Render empty state card with instructions.
- Render cards for each split with index, tag badge, label, formatted timestamp (`mm:ss`), interval delta (`+Xxs`), and delete `Pressable` with `Trash2` or `X`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=@brewlog/mobile -- src/hooks/useMobileBrewTimer.test.ts src/components/timer/FreeBrewSplitTimeline.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/hooks/useMobileBrewTimer.ts apps/mobile/src/hooks/useMobileBrewTimer.test.ts apps/mobile/src/components/timer/FreeBrewSplitTimeline.tsx apps/mobile/src/components/timer/FreeBrewSplitTimeline.test.tsx
git commit -m "feat(mobile): add free brew mode to timer hook and create FreeBrewSplitTimeline"
```

---

### Task 4: Mobile Timer Screen Mode Switcher & Free Brew Integration (`apps/mobile`)

**Files:**
- Modify: `apps/mobile/src/components/timer/TimerHero.tsx:1-250`
- Modify: `apps/mobile/src/components/timer/TimerHero.test.tsx:1-120`
- Modify: `apps/mobile/app/(tabs)/index.tsx:1-280`
- Create: `apps/mobile/__tests__/tabs/freeBrewIntegration.test.tsx`

**Interfaces:**
- Consumes: `TimerMode`, `BrewSplit`, `SplitTag`, `splitsToRecipeStages`, `FreeBrewSplitTimeline`, `useMobileBrewTimer`.
- Produces: Integrated Timer Screen supporting top segmented switch between Guided Recipe and Free Brew, Split stamping chips, and full completion flow.

- [ ] **Step 1: Write integration tests for TimerScreen with Free Brew mode**

Create `apps/mobile/__tests__/tabs/freeBrewIntegration.test.tsx`:
```typescript
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TimerScreen from "../../app/(tabs)/index";
import { RecipeProvider } from "../../src/features/recipes/RecipeContext";
import { StashProvider } from "../../src/features/stash/StashContext";

// Mock router
const mockPush = vi.fn();
vi.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("TimerScreen Free Brew Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("switches to Free Brew mode and renders stopwatch faceplate with split controls", () => {
    const { getByText, getByRole } = render(
      <RecipeProvider>
        <StashProvider>
          <TimerScreen />
        </StashProvider>
      </RecipeProvider>
    );

    // Initial state: GUIDED RECIPE selected
    expect(getByText("GUIDED RECIPE")).toBeTruthy();
    expect(getByText("FREE BREW")).toBeTruthy();

    // Switch to Free Brew
    fireEvent.press(getByText("FREE BREW"));

    expect(getByText("FREE BREW · MANUAL STOPWATCH")).toBeTruthy();
    expect(getByText("+ BLOOM")).toBeTruthy();
    expect(getByText("+ POUR 1")).toBeTruthy();
    expect(getByText("+ DRAWDOWN")).toBeTruthy();
  });

  it("records splits via quick tags and finishes brew with Save as Recipe CTA", () => {
    const { getByText } = render(
      <RecipeProvider>
        <StashProvider>
          <TimerScreen />
        </StashProvider>
      </RecipeProvider>
    );

    fireEvent.press(getByText("FREE BREW"));

    // Start stopwatch
    fireEvent.press(getByText("START BREW"));

    // Tap Bloom tag chip
    fireEvent.press(getByText("+ BLOOM"));
    expect(getByText("Bloom")).toBeTruthy();

    // Tap Finish Brew
    fireEvent.press(getByText("FINISH BREW"));

    expect(getByText("BREW COMPLETE")).toBeTruthy();
    expect(getByText("SAVE AS CUSTOM RECIPE")).toBeTruthy();
    expect(getByText("LOG TO CUPPING JOURNAL")).toBeTruthy();

    // Click Save as Custom Recipe
    fireEvent.press(getByText("SAVE AS CUSTOM RECIPE"));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/recipes/modal",
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=@brewlog/mobile -- __tests__/tabs/freeBrewIntegration.test.tsx`
Expected: FAIL with missing segmented mode elements and Free Brew controls.

- [ ] **Step 3: Update TimerHero and TimerScreen for Free Brew mode**

In `apps/mobile/src/components/timer/TimerHero.tsx`:
- Add `mode?: TimerMode`, `onSplit?: () => void`, `onTagSplit?: (tag: SplitTag, label: string) => void`, `splitsCount?: number` to props.
- When `mode === 'free_brew'`:
  - Show subtitle `FREE BREW · MANUAL STOPWATCH`.
  - In metrics grid, show `RATIO` and `SPLITS` count instead of target pour.
  - Next to Start/Pause/Reset, render `SPLIT` button when running.
  - Render quick tag chips bar: `[ + BLOOM ]`, `[ + POUR 1 ]`, `[ + POUR 2 ]`, `[ + DRAWDOWN ]`.

In `apps/mobile/app/(tabs)/index.tsx`:
- Add state `timerMode: TimerMode = 'recipe'`.
- Add segmented control at the top:
  ```tsx
  <View style={styles.modeToggleContainer}>
    <Pressable
      onPress={() => handleSwitchMode('recipe')}
      style={[styles.modeButton, timerMode === 'recipe' && styles.modeButtonActive]}
    >
      <Text style={[styles.modeButtonText, timerMode === 'recipe' && styles.modeButtonTextActive]}>
        GUIDED RECIPE
      </Text>
    </Pressable>
    <Pressable
      onPress={() => handleSwitchMode('free_brew')}
      style={[styles.modeButton, timerMode === 'free_brew' && styles.modeButtonActive]}
    >
      <Text style={[styles.modeButtonText, timerMode === 'free_brew' && styles.modeButtonTextActive]}>
        FREE BREW
      </Text>
    </Pressable>
  </View>
  ```
- Implement `handleSwitchMode` with `Alert.alert` safety confirmation if `isRunning || (elapsedSeconds > 0 && !isFinished)`.
- Pass `timerMode` into `useMobileBrewTimer`.
- In Free Brew mode, render `<FreeBrewSplitTimeline>` instead of `<ActiveStageCard>` and `<StageTimeline>`.
- In Finished banner:
  - Add `SAVE AS CUSTOM RECIPE` CTA that calls `splitsToRecipeStages(splits, elapsedSeconds, activeRecipe.waterAmountGrams)` and navigates to `/recipes/modal` with generated stages.
  - In `LOG TO CUPPING JOURNAL`, format splits into notes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace=@brewlog/mobile -- __tests__/tabs/freeBrewIntegration.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run all mobile tests to verify no regressions**

Run: `npm run test --workspace=@brewlog/mobile`
Expected: PASS (all tests pass).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/timer/TimerHero.tsx apps/mobile/src/components/timer/TimerHero.test.tsx apps/mobile/app/\(tabs\)/index.tsx apps/mobile/__tests__/tabs/freeBrewIntegration.test.tsx
git commit -m "feat(mobile): integrate Free Brew mode, split capture, and recipe conversion into Timer screen"
```

---

### Task 5: Web Parity — Timer Engine & Free Brew View (`apps/web`)

**Files:**
- Modify: `apps/web/src/features/timer/useBrewTimer.ts:1-120`
- Modify: `apps/web/src/features/timer/useBrewTimer.test.ts:1-100`
- Create: `apps/web/src/features/timer/WebRatioTranslator.tsx`
- Create: `apps/web/src/features/timer/WebRatioTranslator.test.tsx`
- Modify: `apps/web/src/features/timer/TimerView.tsx:1-350`
- Modify: `apps/web/src/features/timer/TimerView.test.tsx:1-100`

**Interfaces:**
- Consumes: `TimerMode`, `BrewSplit`, `SplitTag`, `solveProportionalScale`, `splitsToRecipeStages`.
- Produces: Web Free Brew timer mode, live split controls, split log table, web ratio translator drawer, and completion actions.

- [ ] **Step 1: Write failing tests for web timer hook and WebRatioTranslator**

Add to `apps/web/src/features/timer/useBrewTimer.test.ts`:
```typescript
it("records splits in free_brew mode and calculates interval seconds", () => {
  const { result } = renderHook(() => useBrewTimer(mockRecipe, "free_brew"));

  act(() => {
    result.current.start();
  });

  act(() => {
    vi.advanceTimersByTime(30000);
  });

  act(() => {
    result.current.recordSplit("Bloom", "bloom");
  });

  expect(result.current.splits).toHaveLength(1);
  expect(result.current.splits[0].label).toBe("Bloom");
  expect(result.current.splits[0].second).toBe(30);

  act(() => {
    result.current.removeSplit(result.current.splits[0].id);
  });
  expect(result.current.splits).toHaveLength(0);
});
```

Create `apps/web/src/features/timer/WebRatioTranslator.test.tsx`:
```typescript
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WebRatioTranslator } from "./WebRatioTranslator";

describe("WebRatioTranslator", () => {
  it("renders and translates proportional dose", () => {
    const onApplyDose = vi.fn();
    render(<WebRatioTranslator currentDose={18} onApplyDose={onApplyDose} />);

    // Expand translator
    fireEvent.click(screen.getByText(/RATIO TRANSLATOR/i));

    const sourceCoffee = screen.getByLabelText(/baseline coffee/i);
    const sourceWater = screen.getByLabelText(/baseline water/i);
    const targetCoffee = screen.getByLabelText(/target coffee/i);

    fireEvent.change(sourceCoffee, { target: { value: "20" } });
    fireEvent.change(sourceWater, { target: { value: "300" } });
    fireEvent.change(targetCoffee, { target: { value: "15" } });

    expect(screen.getByText(/Target Water: 225g/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/APPLY 15g TO TIMER/i));
    expect(onApplyDose).toHaveBeenCalledWith(15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace=@brewlog/web -- src/features/timer/useBrewTimer.test.ts src/features/timer/WebRatioTranslator.test.tsx`
Expected: FAIL with missing properties/components.

- [ ] **Step 3: Implement web Free Brew timer engine, WebRatioTranslator, and TimerView**

In `apps/web/src/features/timer/useBrewTimer.ts`:
- Add `mode: TimerMode = 'recipe'` argument.
- Add `splits: BrewSplit[]`, `recordSplit(label?: string, tag?: SplitTag)`, `removeSplit(id: string)`.
- Play audio chime on split record; suppress countdown chimes when `mode === 'free_brew'`.

Create `apps/web/src/features/timer/WebRatioTranslator.tsx`:
- Collapsible drawer styled with Tailwind and Industrial Precision tokens.
- Inputs for source coffee/water and target coffee/water.
- Implied ratio display and 1-tap Apply button.

In `apps/web/src/features/timer/TimerView.tsx`:
- Add top segmented switch `[ GUIDED RECIPE ] | [ FREE BREW ]`.
- In Free Brew mode:
  - Left column: Stopwatch display, Split button, quick tag chips (`Bloom`, `Pour 1`, `Drawdown`), and `WebRatioTranslator`.
  - Right column: Split log table showing index, label, interval time, and cumulative time.
  - Finish banner: Rate & Log to Cupping Sheet, and "SAVE AS CUSTOM RECIPE" (triggering `onSaveAsRecipe` or opening `RecipeBuilderModal`).

- [ ] **Step 4: Run web tests to verify they pass**

Run: `npm run test --workspace=@brewlog/web`
Expected: PASS (all web tests pass).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/timer/useBrewTimer.ts apps/web/src/features/timer/useBrewTimer.test.ts apps/web/src/features/timer/WebRatioTranslator.tsx apps/web/src/features/timer/WebRatioTranslator.test.tsx apps/web/src/features/timer/TimerView.tsx apps/web/src/features/timer/TimerView.test.tsx
git commit -m "feat(web): add Free Brew stopwatch mode, split log table, and Ratio Translator to web timer"
```

---

### Task 6: Monorepo Integration & Verification

**Files:**
- Modify: `docs/ROADMAP.md:143-146`

- [ ] **Step 1: Update Roadmap documentation**

Mark Phase 6 complete in `docs/ROADMAP.md`:
```markdown
- [x] **Phase 6: Free Brew (Manual Timer) & Nested Ratio Translator (Complete ✅)** *(Design Spec: [docs/superpowers/specs/2026-09-25-phase-6-free-brew-and-ratio-translator-design.md](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-09-25-phase-6-free-brew-and-ratio-translator-design.md))*:
  - **Core Domain Math (`@brewlog/core`)**: Expand `calculator.ts` with bidirectional proportional calculation helpers (`calculateRatio`, `calculateTargetWater`, `calculateTargetCoffee`, `solveProportionalScale`, `splitsToRecipeStages`).
  - **Nested Ratio Translator (`CollapsibleCalculator`)**: Nested collapsible drawer inside the existing calculator card solving for target coffee/water with 1-tap dose application.
  - **Free Brew Mode (Timer Subsystem)**: Dedicated recipe-free mode directly on the Timer screen (web and mobile) with precision stopwatch, manual split/lap markers (bloom, first pour, draw-down), stash deduction, cupping journal logging, and custom recipe creation.
```

- [ ] **Step 2: Run full monorepo test suite**

Run: `npm run test --workspaces`
Expected: PASS across all packages.

- [ ] **Step 3: Run full monorepo typecheck**

Run: `npm run typecheck --workspaces --if-present`
Expected: PASS with 0 type errors.

- [ ] **Step 4: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: mark Phase 6 complete in ROADMAP.md"
```
